const { SharedAutomationPackage } = require('../storage/models');
const crypto = require('crypto');
const zlib = require('zlib');

/**
 * 📦 SHARE GENERATOR
 * 
 * Creates shareable automation packages with variable definitions and metadata
 */
class ShareGenerator {
    constructor(variableStore, automationStore) {
        this.variableStore = variableStore;
        this.automationStore = automationStore;
        this.compressionLevel = 6; // zlib compression level
    }

    /**
     * Generate a shareable automation package
     */
    async generateSharePackage(automationId, options = {}) {
        try {
            const {
                includeVariables = true,
                includeSensitiveData = false,
                includeMetadata = true,
                includePrompts = true,
                customName = null,
                customDescription = null,
                version = '1.0.0',
                author = 'Anonymous',
                tags = []
            } = options;

            // Get automation data
            const automation = await this.automationStore.getAutomation(automationId);
            if (!automation) {
                throw new Error('Automation not found');
            }

            // Get variables if requested
            let variables = [];
            if (includeVariables) {
                const allVariables = await this.variableStore.getVariablesByAutomation(automationId);
                variables = this.filterVariablesForSharing(allVariables, includeSensitiveData);
            }

            // Generate prompts if requested
            let prompts = [];
            if (includePrompts) {
                prompts = await this.generatePrompts(automation, variables);
            }

            // Create package metadata
            const packageMetadata = this.createPackageMetadata(automation, variables, {
                includeVariables,
                includeSensitiveData,
                includeMetadata,
                includePrompts
            });

            // Create the share package
            const sharePackage = new SharedAutomationPackage({
                name: customName || automation.name,
                description: customDescription || automation.description,
                version,
                author,
                originalAutomationId: automationId,
                variables: variables.map(v => this.sanitizeVariableForSharing(v, includeSensitiveData)),
                prompts,
                metadata: packageMetadata,
                dependencies: this.extractDependencies(automation, variables),
                tags: [...tags, ...this.generateAutoTags(automation, variables)]
            });

            // Compress the package if it's large
            const packageData = sharePackage.toJSON ? sharePackage.toJSON() : sharePackage;
            const compressedPackage = await this.compressPackage(packageData);

            return {
                package: sharePackage,
                compressed: compressedPackage,
                size: {
                    original: JSON.stringify(packageData).length,
                    compressed: compressedPackage.length
                },
                checksum: this.generateChecksum(packageData)
            };
        } catch (error) {
            console.error('Error generating share package:', error);
            throw error;
        }
    }

    /**
     * Filter variables for sharing based on sensitivity settings
     */
    filterVariablesForSharing(variables, includeSensitiveData) {
        return variables.filter(variable => {
            // Always exclude sensitive data unless explicitly requested
            if (variable.sensitive && !includeSensitiveData) {
                return false;
            }

            // Exclude variables with no meaningful data
            if (!variable.name || variable.name.trim() === '') {
                return false;
            }

            return true;
        });
    }

    /**
     * Sanitize variable data for sharing
     */
    sanitizeVariableForSharing(variable, includeSensitiveData) {
        const sanitized = {
            id: variable.id,
            name: variable.name,
            type: variable.type,
            description: variable.description,
            examples: variable.examples || [],
            validation: variable.validation || {},
            required: variable.required || false,
            category: variable.category || 'general',
            elementInfo: this.sanitizeElementInfo(variable.elementInfo)
        };

        // Include default value if not sensitive
        if (!variable.sensitive || includeSensitiveData) {
            sanitized.defaultValue = variable.defaultValue;
        }

        // Never include actual values in shared packages for security
        // Users will need to provide their own values when importing

        return sanitized;
    }

    /**
     * Sanitize element info to remove potentially sensitive data
     */
    sanitizeElementInfo(elementInfo) {
        if (!elementInfo) return {};

        return {
            tagName: elementInfo.tagName,
            type: elementInfo.type,
            placeholder: elementInfo.placeholder,
            label: elementInfo.label,
            name: elementInfo.name,
            id: elementInfo.id ? this.hashString(elementInfo.id) : undefined,
            className: elementInfo.className,
            // Remove potentially sensitive attributes
            selector: elementInfo.selector ? this.sanitizeSelector(elementInfo.selector) : undefined
        };
    }

    /**
     * Sanitize CSS selectors to remove potentially sensitive information
     */
    sanitizeSelector(selector) {
        // Replace specific IDs and values with placeholders
        return selector
            .replace(/id="[^"]*"/g, 'id="[ID]"')
            .replace(/value="[^"]*"/g, 'value="[VALUE]"')
            .replace(/#[\w-]+/g, '#[ID]')
            .replace(/\[data-[\w-]+=["'][^"']*["']\]/g, '[data-attr="[VALUE]"]');
    }

    /**
     * Generate natural language prompts for the automation
     */
    async generatePrompts(automation, variables) {
        const prompts = [];

        // Main automation description
        prompts.push({
            type: 'description',
            title: 'What this automation does',
            content: this.generateMainDescription(automation, variables)
        });

        // Variable setup instructions
        if (variables.length > 0) {
            prompts.push({
                type: 'setup',
                title: 'Before you start',
                content: this.generateSetupInstructions(variables)
            });
        }

        // Step-by-step breakdown
        if (automation.actions && automation.actions.length > 0) {
            prompts.push({
                type: 'steps',
                title: 'Step-by-step breakdown',
                content: this.generateStepBreakdown(automation.actions, variables)
            });
        }

        // Usage tips
        prompts.push({
            type: 'tips',
            title: 'Tips for best results',
            content: this.generateUsageTips(automation, variables)
        });

        return prompts;
    }

    /**
     * Generate main automation description
     */
    generateMainDescription(automation, variables) {
        const variableCount = variables.length;
        const actionCount = automation.actions ? automation.actions.length : 0;
        
        let description = `This automation performs ${actionCount} actions`;
        
        if (variableCount > 0) {
            description += ` and uses ${variableCount} customizable variable${variableCount > 1 ? 's' : ''}`;
        }
        
        description += '. ';
        
        if (automation.description) {
            description += automation.description;
        } else {
            description += 'It automates a web-based workflow to save you time and reduce manual errors.';
        }

        return description;
    }

    /**
     * Generate setup instructions for variables
     */
    generateSetupInstructions(variables) {
        const instructions = ['You\'ll need to provide values for the following variables:'];
        
        variables.forEach((variable, index) => {
            let instruction = `${index + 1}. **${variable.name}**`;
            
            if (variable.description) {
                instruction += `: ${variable.description}`;
            } else {
                instruction += ` (${variable.type})`;
            }
            
            if (variable.examples && variable.examples.length > 0) {
                instruction += ` - Example: ${variable.examples[0]}`;
            }
            
            if (variable.required) {
                instruction += ' *(Required)*';
            }
            
            instructions.push(instruction);
        });

        return instructions.join('\n');
    }

    /**
     * Generate step-by-step breakdown
     */
    generateStepBreakdown(actions, variables) {
        const variableMap = variables.reduce((map, v) => {
            map[v.id] = v;
            return map;
        }, {});

        const steps = actions.map((action, index) => {
            let step = `${index + 1}. ${this.actionToHumanReadable(action)}`;
            
            if (action.variableId && variableMap[action.variableId]) {
                const variable = variableMap[action.variableId];
                step += ` using your **${variable.name}**`;
            }
            
            return step;
        });

        return steps.join('\n');
    }

    /**
     * Convert action to human-readable description
     */
    actionToHumanReadable(action) {
        const actionMap = {
            click: 'Click on',
            type: 'Enter text into',
            select: 'Select option from',
            navigate: 'Navigate to',
            wait: 'Wait for',
            scroll: 'Scroll to',
            hover: 'Hover over'
        };

        const actionText = actionMap[action.action] || action.action;
        const target = action.target || 'element';
        
        return `${actionText} ${target}`;
    }

    /**
     * Generate usage tips
     */
    generateUsageTips(automation, variables) {
        const tips = [
            'Make sure you\'re on the correct website before running this automation.',
            'Double-check that all required variables have valid values.',
            'Test the automation with sample data first.'
        ];

        // Add variable-specific tips
        const sensitiveVars = variables.filter(v => v.sensitive);
        if (sensitiveVars.length > 0) {
            tips.push('This automation handles sensitive data - ensure you\'re in a secure environment.');
        }

        const emailVars = variables.filter(v => v.type === 'email');
        if (emailVars.length > 0) {
            tips.push('Make sure email addresses are valid and properly formatted.');
        }

        const urlVars = variables.filter(v => v.type === 'url');
        if (urlVars.length > 0) {
            tips.push('URLs should include the protocol (http:// or https://).');
        }

        return tips.join('\n');
    }

    /**
     * Create package metadata
     */
    createPackageMetadata(automation, variables, options) {
        return {
            createdAt: new Date().toISOString(),
            originalAutomation: {
                id: automation.id,
                name: automation.name,
                created: automation.created,
                stepCount: automation.actions ? automation.actions.length : 0
            },
            variables: {
                count: variables.length,
                types: this.getVariableTypeDistribution(variables),
                categories: this.getVariableCategoryDistribution(variables),
                sensitiveCount: variables.filter(v => v.sensitive).length
            },
            sharing: {
                includeVariables: options.includeVariables,
                includeSensitiveData: options.includeSensitiveData,
                includeMetadata: options.includeMetadata,
                includePrompts: options.includePrompts
            },
            compatibility: {
                minVersion: '1.0.0',
                features: this.extractRequiredFeatures(automation, variables)
            }
        };
    }

    /**
     * Extract dependencies from automation and variables
     */
    extractDependencies(automation, variables) {
        const dependencies = [];

        // Check for special variable types that might need additional features
        const specialTypes = variables.filter(v => 
            ['file', 'date', 'currency'].includes(v.type)
        );

        if (specialTypes.length > 0) {
            dependencies.push({
                type: 'feature',
                name: 'advanced-variables',
                version: '>=1.0.0',
                reason: 'Required for advanced variable types'
            });
        }

        // Check for complex validation rules
        const complexValidation = variables.some(v => 
            v.validation && (v.validation.pattern || v.validation.options)
        );

        if (complexValidation) {
            dependencies.push({
                type: 'feature',
                name: 'validation-engine',
                version: '>=1.0.0',
                reason: 'Required for custom validation rules'
            });
        }

        return dependencies;
    }

    /**
     * Generate automatic tags based on content
     */
    generateAutoTags(automation, variables) {
        const tags = [];

        // Add tags based on variable types
        const variableTypes = [...new Set(variables.map(v => v.type))];
        tags.push(...variableTypes.map(type => `var-${type}`));

        // Add tags based on variable categories
        const categories = [...new Set(variables.map(v => v.category))];
        tags.push(...categories);

        // Add complexity tags
        if (variables.length > 10) {
            tags.push('complex');
        } else if (variables.length > 5) {
            tags.push('intermediate');
        } else {
            tags.push('simple');
        }

        // Add security tag if sensitive variables
        if (variables.some(v => v.sensitive)) {
            tags.push('sensitive-data');
        }

        return tags;
    }

    /**
     * Compress package data
     */
    async compressPackage(packageData) {
        return new Promise((resolve, reject) => {
            const jsonString = JSON.stringify(packageData);
            zlib.gzip(jsonString, { level: this.compressionLevel }, (err, compressed) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(compressed.toString('base64'));
                }
            });
        });
    }

    /**
     * Generate checksum for package integrity
     */
    generateChecksum(packageData) {
        const jsonString = JSON.stringify(packageData);
        return crypto.createHash('sha256').update(jsonString).digest('hex');
    }

    /**
     * Helper methods
     */
    getVariableTypeDistribution(variables) {
        const distribution = {};
        variables.forEach(v => {
            distribution[v.type] = (distribution[v.type] || 0) + 1;
        });
        return distribution;
    }

    getVariableCategoryDistribution(variables) {
        const distribution = {};
        variables.forEach(v => {
            const category = v.category || 'general';
            distribution[category] = (distribution[category] || 0) + 1;
        });
        return distribution;
    }

    extractRequiredFeatures(automation, variables) {
        const features = ['basic-automation'];

        if (variables.length > 0) {
            features.push('variables');
        }

        if (variables.some(v => v.validation && v.validation.pattern)) {
            features.push('regex-validation');
        }

        if (variables.some(v => v.sensitive)) {
            features.push('sensitive-data-handling');
        }

        return features;
    }

    hashString(str) {
        return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
    }
}

module.exports = ShareGenerator;