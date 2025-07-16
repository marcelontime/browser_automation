const { Variable, VariableUsage, VariableTypes } = require('./models');
const RedisStorage = require('./redis-storage');

/**
 * 🗄️ VARIABLE STORE SERVICE
 * 
 * Centralized variable storage service with caching, templates, and analytics
 */
class VariableStore {
    constructor(redisClient) {
        this.redis = new RedisStorage(redisClient);
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.templates = this.initializeTemplates();
    }

    /**
     * Initialize variable templates for common patterns
     */
    initializeTemplates() {
        return {
            email: {
                type: VariableTypes.EMAIL,
                validation: {
                    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                    customMessage: 'Please enter a valid email address'
                },
                examples: ['user@example.com', 'test.email@domain.co.uk'],
                category: 'contact'
            },
            phone: {
                type: VariableTypes.PHONE,
                validation: {
                    pattern: '^\\+?1?[-.\\s]?\\(?[0-9]{3}\\)?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{4}$',
                    customMessage: 'Please enter a valid phone number'
                },
                examples: ['(555) 123-4567', '+1-555-123-4567', '555.123.4567'],
                category: 'contact'
            },
            name: {
                type: VariableTypes.NAME,
                validation: {
                    pattern: '^[a-zA-Z\\s\\-\\.]{2,50}$',
                    minLength: 2,
                    maxLength: 50,
                    customMessage: 'Please enter a valid name'
                },
                examples: ['John Doe', 'Mary Smith-Johnson', 'Dr. Sarah Wilson'],
                category: 'personal'
            },
            date: {
                type: VariableTypes.DATE,
                validation: {
                    customMessage: 'Please enter a valid date'
                },
                examples: ['2024-01-15', '01/15/2024', 'January 15, 2024'],
                category: 'temporal'
            },
            url: {
                type: VariableTypes.URL,
                validation: {
                    pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$',
                    customMessage: 'Please enter a valid URL'
                },
                examples: ['https://example.com', 'http://www.site.org/path'],
                category: 'web'
            },
            currency: {
                type: VariableTypes.CURRENCY,
                validation: {
                    pattern: '^\\$?\\d{1,3}(,\\d{3})*(\\.\\d{2})?$',
                    customMessage: 'Please enter a valid currency amount'
                },
                examples: ['$1,234.56', '1234.56', '$1,000'],
                category: 'financial'
            },
            password: {
                type: VariableTypes.SENSITIVE,
                validation: {
                    minLength: 8,
                    customMessage: 'Password must be at least 8 characters'
                },
                examples: ['SecurePass123!', 'MyP@ssw0rd'],
                category: 'security',
                sensitive: true
            }
        };
    }

    /**
     * Create a new variable
     */
    async createVariable(automationId, variableData) {
        try {
            // Apply template if specified
            if (variableData.template && this.templates[variableData.template]) {
                const template = this.templates[variableData.template];
                variableData = { ...template, ...variableData };
            }

            const variable = new Variable({
                ...variableData,
                automationId
            });

            // Validate the variable
            const validation = variable.validate();
            if (!validation.valid && validation.errors.some(e => e.code !== 'REQUIRED')) {
                throw new Error(`Variable validation failed: ${validation.errors[0].message}`);
            }

            // Store in Redis
            const key = `variable:${variable.id}`;
            await this.redis.setHash(key, variable.toJSONWithValue());
            
            // Add to automation's variable list
            const automationKey = `automation:${automationId}:variables`;
            await this.redis.addToSet(automationKey, variable.id);

            // Update cache
            this.cache.set(variable.id, {
                data: variable,
                timestamp: Date.now()
            });

            // Track creation analytics
            await this.trackVariableEvent('created', variable.id, {
                type: variable.type,
                category: variable.category,
                automationId
            });

            return variable;
        } catch (error) {
            console.error('Error creating variable:', error);
            throw error;
        }
    }

    /**
     * Get variable by ID
     */
    async getVariable(variableId) {
        try {
            // Check cache first
            const cached = this.cache.get(variableId);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.data;
            }

            // Get from Redis
            const key = `variable:${variableId}`;
            const data = await this.redis.getHash(key);
            
            if (!data || Object.keys(data).length === 0) {
                return null;
            }

            const variable = new Variable(data);
            
            // Update cache
            this.cache.set(variableId, {
                data: variable,
                timestamp: Date.now()
            });

            return variable;
        } catch (error) {
            console.error('Error getting variable:', error);
            throw error;
        }
    }

    /**
     * Get all variables for an automation
     */
    async getVariablesByAutomation(automationId) {
        try {
            const automationKey = `automation:${automationId}:variables`;
            const variableIds = await this.redis.getSetMembers(automationKey);
            
            if (!variableIds || variableIds.length === 0) {
                return [];
            }

            const variables = await Promise.all(
                variableIds.map(id => this.getVariable(id))
            );

            return variables.filter(v => v !== null);
        } catch (error) {
            console.error('Error getting variables by automation:', error);
            throw error;
        }
    }

    /**
     * Update variable
     */
    async updateVariable(variableId, updates) {
        try {
            const variable = await this.getVariable(variableId);
            if (!variable) {
                throw new Error('Variable not found');
            }

            // Apply updates
            Object.keys(updates).forEach(key => {
                if (key !== 'id' && key !== 'created') {
                    variable[key] = updates[key];
                }
            });

            variable.updated = new Date().toISOString();

            // Validate updated variable
            const validation = variable.validate();
            if (!validation.valid && validation.errors.some(e => e.code !== 'REQUIRED')) {
                throw new Error(`Variable validation failed: ${validation.errors[0].message}`);
            }

            // Update in Redis
            const key = `variable:${variableId}`;
            await this.redis.setHash(key, variable.toJSONWithValue());

            // Update cache
            this.cache.set(variableId, {
                data: variable,
                timestamp: Date.now()
            });

            // Track update analytics
            await this.trackVariableEvent('updated', variableId, {
                updatedFields: Object.keys(updates),
                automationId: variable.automationId
            });

            return variable;
        } catch (error) {
            console.error('Error updating variable:', error);
            throw error;
        }
    }

    /**
     * Delete variable
     */
    async deleteVariable(variableId) {
        try {
            const variable = await this.getVariable(variableId);
            if (!variable) {
                return false;
            }

            // Remove from Redis
            const key = `variable:${variableId}`;
            await this.redis.deleteKey(key);

            // Remove from automation's variable list
            const automationKey = `automation:${variable.automationId}:variables`;
            await this.redis.removeFromSet(automationKey, variableId);

            // Remove from cache
            this.cache.delete(variableId);

            // Track deletion analytics
            await this.trackVariableEvent('deleted', variableId, {
                type: variable.type,
                category: variable.category,
                automationId: variable.automationId
            });

            return true;
        } catch (error) {
            console.error('Error deleting variable:', error);
            throw error;
        }
    }

    /**
     * Validate variable value
     */
    async validateVariable(variableId, value) {
        try {
            const variable = await this.getVariable(variableId);
            if (!variable) {
                throw new Error('Variable not found');
            }

            return variable.validate(value);
        } catch (error) {
            console.error('Error validating variable:', error);
            throw error;
        }
    }

    /**
     * Batch validate multiple variables
     */
    async validateVariables(validationRequests) {
        try {
            const results = await Promise.all(
                validationRequests.map(async ({ variableId, value }) => {
                    try {
                        const result = await this.validateVariable(variableId, value);
                        return { variableId, ...result };
                    } catch (error) {
                        return {
                            variableId,
                            valid: false,
                            errors: [{ message: error.message, code: 'VALIDATION_ERROR' }],
                            warnings: []
                        };
                    }
                })
            );

            return results;
        } catch (error) {
            console.error('Error batch validating variables:', error);
            throw error;
        }
    }

    /**
     * Get variable templates
     */
    getTemplates() {
        return this.templates;
    }

    /**
     * Create variable from template
     */
    async createFromTemplate(automationId, templateName, customData = {}) {
        const template = this.templates[templateName];
        if (!template) {
            throw new Error(`Template '${templateName}' not found`);
        }

        return await this.createVariable(automationId, {
            ...template,
            ...customData,
            template: templateName
        });
    }

    /**
     * Search variables
     */
    async searchVariables(automationId, query) {
        try {
            const variables = await this.getVariablesByAutomation(automationId);
            
            if (!query || query.trim() === '') {
                return variables;
            }

            const searchTerm = query.toLowerCase();
            return variables.filter(variable => 
                variable.name.toLowerCase().includes(searchTerm) ||
                variable.description.toLowerCase().includes(searchTerm) ||
                variable.type.toLowerCase().includes(searchTerm) ||
                variable.category.toLowerCase().includes(searchTerm)
            );
        } catch (error) {
            console.error('Error searching variables:', error);
            throw error;
        }
    }

    /**
     * Get variable usage statistics
     */
    async getVariableStats(variableId) {
        try {
            const statsKey = `variable:${variableId}:stats`;
            const stats = await this.redis.getHash(statsKey);
            
            return {
                usageCount: parseInt(stats.usageCount || '0'),
                successCount: parseInt(stats.successCount || '0'),
                lastUsed: stats.lastUsed || null,
                averageDuration: parseFloat(stats.averageDuration || '0'),
                successRate: stats.usageCount > 0 ? 
                    (parseInt(stats.successCount || '0') / parseInt(stats.usageCount || '1')) : 0
            };
        } catch (error) {
            console.error('Error getting variable stats:', error);
            return {
                usageCount: 0,
                successCount: 0,
                lastUsed: null,
                averageDuration: 0,
                successRate: 0
            };
        }
    }

    /**
     * Track variable usage
     */
    async trackVariableUsage(variableId, executionId, success, duration = 0, errorMessage = null, valueUsed = null, validationErrors = []) {
        try {
            // Create usage record
            const usage = new VariableUsage({
                variableId,
                executionId,
                success,
                duration,
                errorMessage
            });

            // Store usage record
            const usageKey = `variable:${variableId}:usage:${usage.id}`;
            await this.redis.setHash(usageKey, usage);

            // Update stats
            const statsKey = `variable:${variableId}:stats`;
            const stats = await this.redis.getHash(statsKey);
            
            const currentUsageCount = parseInt(stats.usageCount || '0');
            const currentSuccessCount = parseInt(stats.successCount || '0');
            const currentAvgDuration = parseFloat(stats.averageDuration || '0');

            const newUsageCount = currentUsageCount + 1;
            const newSuccessCount = success ? currentSuccessCount + 1 : currentSuccessCount;
            const newAvgDuration = ((currentAvgDuration * currentUsageCount) + duration) / newUsageCount;

            await this.redis.setHash(statsKey, {
                usageCount: newUsageCount.toString(),
                successCount: newSuccessCount.toString(),
                lastUsed: new Date().toISOString(),
                averageDuration: newAvgDuration.toString()
            });

            // Track with analytics service if available
            if (this.analyticsService) {
                const variable = await this.getVariable(variableId);
                await this.analyticsService.trackVariableUsage(variableId, executionId, {
                    success,
                    duration,
                    errorMessage,
                    automationId: variable?.automationId,
                    valueUsed,
                    validationErrors
                });
            }

            return usage;
        } catch (error) {
            console.error('Error tracking variable usage:', error);
            throw error;
        }
    }

    /**
     * Set analytics service reference
     */
    setAnalyticsService(analyticsService) {
        this.analyticsService = analyticsService;
    }

    /**
     * Track variable events for analytics
     */
    async trackVariableEvent(eventType, variableId, metadata = {}) {
        try {
            const eventKey = `analytics:variable:${eventType}`;
            const event = {
                variableId,
                timestamp: Date.now(),
                metadata
            };

            await this.redis.addToList(eventKey, JSON.stringify(event));
            
            // Keep only last 1000 events per type
            await this.redis.trimList(eventKey, 0, 999);
        } catch (error) {
            console.error('Error tracking variable event:', error);
            // Don't throw - analytics shouldn't break functionality
        }
    }

    /**
     * Get variable analytics
     */
    async getVariableAnalytics(timeRange = '24h') {
        try {
            const events = ['created', 'updated', 'deleted', 'used'];
            const analytics = {};

            for (const eventType of events) {
                const eventKey = `analytics:variable:${eventType}`;
                const eventData = await this.redis.getList(eventKey);
                
                const parsedEvents = eventData
                    .map(data => {
                        try {
                            return JSON.parse(data);
                        } catch {
                            return null;
                        }
                    })
                    .filter(event => event !== null);

                // Filter by time range
                const cutoffTime = this.getTimeRangeCutoff(timeRange);
                const filteredEvents = parsedEvents.filter(event => event.timestamp >= cutoffTime);

                analytics[eventType] = {
                    count: filteredEvents.length,
                    events: filteredEvents
                };
            }

            return analytics;
        } catch (error) {
            console.error('Error getting variable analytics:', error);
            return {};
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get time range cutoff timestamp
     */
    getTimeRangeCutoff(timeRange) {
        const now = Date.now();
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };

        return now - (ranges[timeRange] || ranges['24h']);
    }
}

module.exports = VariableStore;