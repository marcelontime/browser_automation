/**
 * 📊 VARIABLE ANALYTICS SERVICE
 * 
 * Collects and analyzes variable usage statistics and patterns
 */
class VariableAnalyticsService {
    constructor(redisClient, variableStore) {
        this.redis = redisClient;
        this.variableStore = variableStore;
        this.analyticsPrefix = 'analytics:variables:';
        this.metricsCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.maxEventsPerVariable = 1000; // Keep last 1000 events per variable
    }

    /**
     * Track variable usage event
     */
    async trackVariableUsage(variableId, executionId, eventData) {
        try {
            const timestamp = Date.now();
            const event = {
                variableId,
                executionId,
                timestamp,
                success: eventData.success,
                duration: eventData.duration || 0,
                errorMessage: eventData.errorMessage || null,
                automationId: eventData.automationId,
                userId: eventData.userId || 'anonymous',
                valueUsed: eventData.valueUsed || null,
                validationErrors: eventData.validationErrors || []
            };

            // Store individual event in sorted set (by timestamp)
            const eventKey = `${this.analyticsPrefix}events:${variableId}`;
            await this.redis.zadd(eventKey, timestamp, JSON.stringify(event));

            // Keep only recent events (trim to max events)
            const eventCount = await this.redis.zcard(eventKey);
            if (eventCount > this.maxEventsPerVariable) {
                const removeCount = eventCount - this.maxEventsPerVariable;
                await this.redis.zremrangebyrank(eventKey, 0, removeCount - 1);
            }

            // Update aggregated statistics
            await this.updateVariableStats(variableId, event);

            // Update global analytics
            await this.updateGlobalStats(event);

            // Clear cache for this variable
            this.clearVariableCache(variableId);

            return event;
        } catch (error) {
            console.error('Error tracking variable usage:', error);
            throw error;
        }
    }

    /**
     * Update variable-specific statistics
     */
    async updateVariableStats(variableId, event) {
        try {
            const statsKey = `${this.analyticsPrefix}stats:${variableId}`;
            const currentStats = await this.redis.hgetall(statsKey);

            const stats = {
                totalUsage: parseInt(currentStats.totalUsage || '0') + 1,
                successCount: parseInt(currentStats.successCount || '0') + (event.success ? 1 : 0),
                failureCount: parseInt(currentStats.failureCount || '0') + (event.success ? 0 : 1),
                totalDuration: parseFloat(currentStats.totalDuration || '0') + event.duration,
                lastUsed: event.timestamp,
                firstUsed: currentStats.firstUsed || event.timestamp,
                uniqueExecutions: currentStats.uniqueExecutions || '0',
                validationErrorCount: parseInt(currentStats.validationErrorCount || '0') +
                    (event.validationErrors.length > 0 ? 1 : 0)
            };

            // Calculate derived metrics
            stats.successRate = stats.totalUsage > 0 ? (stats.successCount / stats.totalUsage) : 0;
            stats.averageDuration = stats.totalUsage > 0 ? (stats.totalDuration / stats.totalUsage) : 0;
            stats.failureRate = stats.totalUsage > 0 ? (stats.failureCount / stats.totalUsage) : 0;

            // Track unique executions
            const executionKey = `${this.analyticsPrefix}executions:${variableId}`;
            await this.redis.sadd(executionKey, event.executionId);
            stats.uniqueExecutions = await this.redis.scard(executionKey);

            // Store updated stats
            await this.redis.hmset(statsKey, stats);

        } catch (error) {
            console.error('Error updating variable stats:', error);
        }
    }

    /**
     * Update global analytics
     */
    async updateGlobalStats(event) {
        try {
            const globalKey = `${this.analyticsPrefix}global`;
            const dailyKey = `${this.analyticsPrefix}daily:${this.getDayKey(event.timestamp)}`;
            const hourlyKey = `${this.analyticsPrefix}hourly:${this.getHourKey(event.timestamp)}`;

            // Update global counters
            await this.redis.hincrby(globalKey, 'totalEvents', 1);
            await this.redis.hincrby(globalKey, event.success ? 'successEvents' : 'failureEvents', 1);

            // Update daily counters
            await this.redis.hincrby(dailyKey, 'totalEvents', 1);
            await this.redis.hincrby(dailyKey, event.success ? 'successEvents' : 'failureEvents', 1);
            await this.redis.expire(dailyKey, 30 * 24 * 60 * 60); // Expire after 30 days

            // Update hourly counters
            await this.redis.hincrby(hourlyKey, 'totalEvents', 1);
            await this.redis.hincrby(hourlyKey, event.success ? 'successEvents' : 'failureEvents', 1);
            await this.redis.expire(hourlyKey, 7 * 24 * 60 * 60); // Expire after 7 days

            // Track automation usage
            if (event.automationId) {
                const automationKey = `${this.analyticsPrefix}automation:${event.automationId}`;
                await this.redis.hincrby(automationKey, 'variableUsage', 1);
                await this.redis.sadd(`${automationKey}:variables`, event.variableId);
            }

        } catch (error) {
            console.error('Error updating global stats:', error);
        }
    }

    /**
     * Get variable usage statistics
     */
    async getVariableStats(variableId, timeRange = '24h') {
        try {
            // Check cache first
            const cacheKey = `stats:${variableId}:${timeRange}`;
            const cached = this.metricsCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.data;
            }

            const statsKey = `${this.analyticsPrefix}stats:${variableId}`;
            const rawStats = await this.redis.hgetall(statsKey);

            if (!rawStats || Object.keys(rawStats).length === 0) {
                return this.getEmptyStats();
            }

            // Get recent events for time-based analysis
            const events = await this.getVariableEvents(variableId, timeRange);

            const stats = {
                // Basic metrics
                totalUsage: parseInt(rawStats.totalUsage || '0'),
                successCount: parseInt(rawStats.successCount || '0'),
                failureCount: parseInt(rawStats.failureCount || '0'),
                successRate: parseFloat(rawStats.successRate || '0'),
                failureRate: parseFloat(rawStats.failureRate || '0'),

                // Performance metrics
                averageDuration: parseFloat(rawStats.averageDuration || '0'),
                totalDuration: parseFloat(rawStats.totalDuration || '0'),

                // Usage patterns
                uniqueExecutions: parseInt(rawStats.uniqueExecutions || '0'),
                lastUsed: rawStats.lastUsed ? new Date(parseInt(rawStats.lastUsed)) : null,
                firstUsed: rawStats.firstUsed ? new Date(parseInt(rawStats.firstUsed)) : null,

                // Error analysis
                validationErrorCount: parseInt(rawStats.validationErrorCount || '0'),
                validationErrorRate: 0,

                // Time-based analysis
                recentEvents: events.length,
                recentSuccessRate: 0,
                usageFrequency: this.calculateUsageFrequency(events),
                peakUsageHours: this.calculatePeakUsageHours(events),

                // Trends
                usageTrend: this.calculateUsageTrend(events),
                performanceTrend: this.calculatePerformanceTrend(events)
            };

            // Calculate derived metrics
            if (stats.totalUsage > 0) {
                stats.validationErrorRate = stats.validationErrorCount / stats.totalUsage;
            }

            if (events.length > 0) {
                const recentSuccesses = events.filter(e => e.success).length;
                stats.recentSuccessRate = recentSuccesses / events.length;
            }

            // Cache the result
            this.metricsCache.set(cacheKey, {
                data: stats,
                timestamp: Date.now()
            });

            return stats;

        } catch (error) {
            console.error('Error getting variable stats:', error);
            return this.getEmptyStats();
        }
    }

    /**
     * Get variable events within time range
     */
    async getVariableEvents(variableId, timeRange = '24h') {
        try {
            const eventKey = `${this.analyticsPrefix}events:${variableId}`;
            const cutoffTime = this.getTimeRangeCutoff(timeRange);

            // Get events from sorted set within time range
            const eventStrings = await this.redis.zrangebyscore(eventKey, cutoffTime, '+inf');

            return eventStrings.map(eventStr => {
                try {
                    return JSON.parse(eventStr);
                } catch {
                    return null;
                }
            }).filter(event => event !== null);

        } catch (error) {
            console.error('Error getting variable events:', error);
            return [];
        }
    }

    /**
     * Get usage patterns and suggestions
     */
    async getUsagePatterns(automationId) {
        try {
            const variables = await this.variableStore.getVariablesByAutomation(automationId);
            const patterns = [];

            for (const variable of variables) {
                const stats = await this.getVariableStats(variable.id);
                const events = await this.getVariableEvents(variable.id, '7d');

                // Analyze patterns
                const pattern = {
                    variableId: variable.id,
                    variableName: variable.name,
                    type: variable.type,

                    // Usage patterns
                    usageFrequency: stats.usageFrequency,
                    isHighlyUsed: stats.totalUsage > 10,
                    isProblematic: stats.failureRate > 0.2,
                    hasValidationIssues: stats.validationErrorRate > 0.1,

                    // Value patterns
                    commonValues: this.extractCommonValues(events),
                    valueVariability: this.calculateValueVariability(events),

                    // Suggestions
                    suggestions: this.generateSuggestions(variable, stats, events)
                };

                patterns.push(pattern);
            }

            return {
                automationId,
                patterns,
                summary: this.generatePatternSummary(patterns),
                recommendations: this.generateRecommendations(patterns)
            };

        } catch (error) {
            console.error('Error getting usage patterns:', error);
            return { automationId, patterns: [], summary: {}, recommendations: [] };
        }
    }

    /**
     * Generate optimization suggestions
     */
    generateSuggestions(variable, stats, events) {
        const suggestions = [];

        // High failure rate suggestions
        if (stats.failureRate > 0.2) {
            suggestions.push({
                type: 'error_reduction',
                priority: 'high',
                message: `Variable has ${(stats.failureRate * 100).toFixed(1)}% failure rate. Consider improving validation rules.`,
                action: 'review_validation'
            });
        }

        // Validation error suggestions
        if (stats.validationErrorRate > 0.1) {
            suggestions.push({
                type: 'validation_improvement',
                priority: 'medium',
                message: `${(stats.validationErrorRate * 100).toFixed(1)}% of uses have validation errors. Review validation rules.`,
                action: 'update_validation'
            });
        }

        // Performance suggestions
        if (stats.averageDuration > 5000) { // 5 seconds
            suggestions.push({
                type: 'performance',
                priority: 'low',
                message: `Variable processing takes ${(stats.averageDuration / 1000).toFixed(1)}s on average. Consider optimization.`,
                action: 'optimize_processing'
            });
        }

        // Usage pattern suggestions
        if (stats.totalUsage === 0) {
            suggestions.push({
                type: 'unused_variable',
                priority: 'low',
                message: 'Variable is defined but never used. Consider removing if not needed.',
                action: 'review_necessity'
            });
        }

        // Value consistency suggestions
        const commonValues = this.extractCommonValues(events);
        if (commonValues.length === 1 && stats.totalUsage > 5) {
            suggestions.push({
                type: 'static_value',
                priority: 'low',
                message: 'Variable always uses the same value. Consider making it a constant.',
                action: 'convert_to_constant'
            });
        }

        return suggestions;
    }

    /**
     * Get dashboard analytics
     */
    async getDashboardAnalytics(timeRange = '24h') {
        try {
            const cutoffTime = this.getTimeRangeCutoff(timeRange);

            // Get global stats
            const globalStats = await this.redis.hgetall(`${this.analyticsPrefix}global`);

            // Get time-based stats
            const timeBasedStats = await this.getTimeBasedStats(timeRange);

            // Get top variables by usage
            const topVariables = await this.getTopVariables(10, timeRange);

            // Get automation stats
            const automationStats = await this.getAutomationStats(timeRange);

            // Get error analysis
            const errorAnalysis = await this.getErrorAnalysis(timeRange);

            return {
                timeRange,
                generatedAt: new Date().toISOString(),

                // Overview metrics
                overview: {
                    totalEvents: parseInt(globalStats.totalEvents || '0'),
                    successEvents: parseInt(globalStats.successEvents || '0'),
                    failureEvents: parseInt(globalStats.failureEvents || '0'),
                    successRate: this.calculateRate(globalStats.successEvents, globalStats.totalEvents),
                    failureRate: this.calculateRate(globalStats.failureEvents, globalStats.totalEvents)
                },

                // Time-based trends
                trends: timeBasedStats,

                // Top performing variables
                topVariables,

                // Automation insights
                automations: automationStats,

                // Error analysis
                errors: errorAnalysis,

                // Recommendations
                recommendations: await this.generateGlobalRecommendations()
            };

        } catch (error) {
            console.error('Error getting dashboard analytics:', error);
            return this.getEmptyDashboard();
        }
    }

    /**
     * Helper methods
     */
    getEmptyStats() {
        return {
            totalUsage: 0,
            successCount: 0,
            failureCount: 0,
            successRate: 0,
            failureRate: 0,
            averageDuration: 0,
            totalDuration: 0,
            uniqueExecutions: 0,
            lastUsed: null,
            firstUsed: null,
            validationErrorCount: 0,
            validationErrorRate: 0,
            recentEvents: 0,
            recentSuccessRate: 0,
            usageFrequency: 'never',
            peakUsageHours: [],
            usageTrend: 'stable',
            performanceTrend: 'stable'
        };
    }

    getEmptyDashboard() {
        return {
            timeRange: '24h',
            generatedAt: new Date().toISOString(),
            overview: {
                totalEvents: 0,
                successEvents: 0,
                failureEvents: 0,
                successRate: 0,
                failureRate: 0
            },
            trends: [],
            topVariables: [],
            automations: [],
            errors: { commonErrors: [], errorTrends: [] },
            recommendations: []
        };
    }

    getDayKey(timestamp) {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    getHourKey(timestamp) {
        const date = new Date(timestamp);
        return `${this.getDayKey(timestamp)}-${String(date.getHours()).padStart(2, '0')}`;
    }

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

    calculateRate(numerator, denominator) {
        const num = parseInt(numerator || '0');
        const den = parseInt(denominator || '0');
        return den > 0 ? (num / den) : 0;
    }

    calculateUsageFrequency(events) {
        if (events.length === 0) return 'never';
        if (events.length === 1) return 'rarely';

        const timeSpan = events[events.length - 1].timestamp - events[0].timestamp;
        const avgInterval = timeSpan / (events.length - 1);

        if (avgInterval < 60 * 60 * 1000) return 'very_frequent'; // < 1 hour
        if (avgInterval < 24 * 60 * 60 * 1000) return 'frequent'; // < 1 day
        if (avgInterval < 7 * 24 * 60 * 60 * 1000) return 'regular'; // < 1 week
        return 'occasional';
    }

    calculatePeakUsageHours(events) {
        const hourCounts = {};
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        return Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    }

    calculateUsageTrend(events) {
        if (events.length < 4) return 'stable';

        const midpoint = Math.floor(events.length / 2);
        const firstHalf = events.slice(0, midpoint);
        const secondHalf = events.slice(midpoint);

        const firstHalfRate = firstHalf.length / (firstHalf[firstHalf.length - 1].timestamp - firstHalf[0].timestamp);
        const secondHalfRate = secondHalf.length / (secondHalf[secondHalf.length - 1].timestamp - secondHalf[0].timestamp);

        const change = (secondHalfRate - firstHalfRate) / firstHalfRate;

        if (change > 0.2) return 'increasing';
        if (change < -0.2) return 'decreasing';
        return 'stable';
    }

    calculatePerformanceTrend(events) {
        if (events.length < 4) return 'stable';

        const midpoint = Math.floor(events.length / 2);
        const firstHalf = events.slice(0, midpoint);
        const secondHalf = events.slice(midpoint);

        const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e.duration, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e.duration, 0) / secondHalf.length;

        const change = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

        if (change > 0.2) return 'degrading';
        if (change < -0.2) return 'improving';
        return 'stable';
    }

    extractCommonValues(events) {
        const valueCounts = {};
        events.forEach(event => {
            if (event.valueUsed) {
                valueCounts[event.valueUsed] = (valueCounts[event.valueUsed] || 0) + 1;
            }
        });

        return Object.entries(valueCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([value, count]) => ({ value, count, percentage: count / events.length }));
    }

    calculateValueVariability(events) {
        const uniqueValues = new Set(events.map(e => e.valueUsed).filter(v => v));
        return uniqueValues.size / Math.max(events.length, 1);
    }

    generatePatternSummary(patterns) {
        return {
            totalVariables: patterns.length,
            highUsageVariables: patterns.filter(p => p.isHighlyUsed).length,
            problematicVariables: patterns.filter(p => p.isProblematic).length,
            unusedVariables: patterns.filter(p => p.usageFrequency === 'never').length,
            validationIssues: patterns.filter(p => p.hasValidationIssues).length
        };
    }

    generateRecommendations(patterns) {
        const recommendations = [];

        // High-level recommendations based on patterns
        const problematic = patterns.filter(p => p.isProblematic);
        if (problematic.length > 0) {
            recommendations.push({
                type: 'error_reduction',
                priority: 'high',
                message: `${problematic.length} variables have high failure rates. Review and improve validation.`,
                affectedVariables: problematic.map(p => p.variableId)
            });
        }

        const unused = patterns.filter(p => p.usageFrequency === 'never');
        if (unused.length > 0) {
            recommendations.push({
                type: 'cleanup',
                priority: 'low',
                message: `${unused.length} variables are unused. Consider removing them to reduce complexity.`,
                affectedVariables: unused.map(p => p.variableId)
            });
        }

        return recommendations;
    }

    async generateGlobalRecommendations() {
        // This would analyze global patterns and generate system-wide recommendations
        return [
            {
                type: 'system_health',
                priority: 'info',
                message: 'Variable analytics system is collecting data. More insights will be available as usage grows.'
            }
        ];
    }

    async getTimeBasedStats(timeRange) {
        // Implementation for time-based statistics
        return [];
    }

    async getTopVariables(limit, timeRange) {
        // Implementation for top variables by usage
        return [];
    }

    async getAutomationStats(timeRange) {
        // Implementation for automation statistics
        return [];
    }

    async getErrorAnalysis(timeRange) {
        // Implementation for error analysis
        return { commonErrors: [], errorTrends: [] };
    }

    clearVariableCache(variableId) {
        // Clear cache entries for specific variable
        for (const key of this.metricsCache.keys()) {
            if (key.includes(variableId)) {
                this.metricsCache.delete(key);
            }
        }
    }

    clearCache() {
        this.metricsCache.clear();
    }
}

module.exports = VariableAnalyticsService;