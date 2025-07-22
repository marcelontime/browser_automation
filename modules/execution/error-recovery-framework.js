const EventEmitter = require('events');

/**
 * Comprehensive Error Recovery Framework
 * Implements intelligent error classification, recovery strategies, and automatic retry mechanisms
 */
class ErrorRecoveryFramework extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            maxRetryAttempts: options.maxRetryAttempts || 5,
            baseRetryDelay: options.baseRetryDelay || 1000,
            maxRetryDelay: options.maxRetryDelay || 30000,
            exponentialBackoffFactor: options.exponentialBackoffFactor || 2,
            enableLearning: options.enableLearning !== false,
            enableDiagnostics: options.enableDiagnostics !== false,
            ...options
        };
        
        this.errorClassifications = new Map();
        this.recoveryStrategies = new Map();
        this.errorHistory = new Map();
        this.recoveryStats = new Map();
        this.diagnosticReports = new Map();
        
        this.initializeErrorClassifications();
        this.initializeRecoveryStrategies();
    }

    /**
     * Initialize comprehensive error classification patterns
     */
    initializeErrorClassifications() {
        // Element-related errors
        this.errorClassifications.set('element-not-found', {
            patterns: [
                /element.*not.*found/i,
                /no.*element.*matches/i,
                /selector.*not.*found/i,
                /element.*does.*not.*exist/i,
                /cannot.*find.*element/i,
                /element.*is.*not.*attached/i
            ],
            severity: 'medium',
            recoverable: true,
            category: 'element',
            priority: 2,
            commonCauses: ['DOM changes', 'timing issues', 'selector specificity', 'dynamic content loading'],
            suggestedActions: ['retry with delay', 'use alternative selector', 'wait for DOM stability', 'check element visibility']
        });
        
        // Timing-related errors
        this.errorClassifications.set('timeout', {
            patterns: [
                /timeout/i,
                /timed.*out/i,
                /exceeded.*timeout/i,
                /operation.*timeout/i,
                /wait.*timeout/i,
                /navigation.*timeout/i
            ],
            severity: 'medium',
            recoverable: true,
            category: 'timing',
            priority: 2,
            commonCauses: ['slow network', 'heavy page load', 'server delays', 'resource loading'],
            suggestedActions: ['increase timeout', 'retry with exponential backoff', 'check network conditions', 'optimize wait strategy']
        });

        // Network-related errors
        this.errorClassifications.set('network-error', {
            patterns: [
                /network.*error/i,
                /connection.*refused/i,
                /connection.*reset/i,
                /dns.*resolution.*failed/i,
                /net::ERR_/i,
                /fetch.*failed/i,
                /request.*failed/i
            ],
            severity: 'high',
            recoverable: true,
            category: 'network',
            priority: 1,
            commonCauses: ['network connectivity', 'server downtime', 'DNS issues', 'firewall blocking'],
            suggestedActions: ['retry with exponential backoff', 'check network connectivity', 'use alternative endpoint', 'implement circuit breaker']
        });

        // Permission and security errors
        this.errorClassifications.set('permission-denied', {
            patterns: [
                /permission.*denied/i,
                /access.*denied/i,
                /unauthorized/i,
                /forbidden/i,
                /authentication.*failed/i,
                /invalid.*credentials/i
            ],
            severity: 'high',
            recoverable: false,
            category: 'security',
            priority: 1,
            commonCauses: ['expired credentials', 'insufficient permissions', 'authentication failure', 'security policy changes'],
            suggestedActions: ['refresh credentials', 'check permissions', 'contact administrator', 'update authentication']
        });

        // Browser and page errors
        this.errorClassifications.set('page-error', {
            patterns: [
                /page.*crashed/i,
                /page.*not.*responding/i,
                /browser.*crashed/i,
                /navigation.*failed/i,
                /page.*load.*failed/i,
                /script.*error/i
            ],
            severity: 'high',
            recoverable: true,
            category: 'browser',
            priority: 1,
            commonCauses: ['browser instability', 'memory issues', 'JavaScript errors', 'resource conflicts'],
            suggestedActions: ['restart browser', 'clear cache', 'reduce memory usage', 'update browser']
        });

        // Data and validation errors
        this.errorClassifications.set('data-error', {
            patterns: [
                /validation.*failed/i,
                /invalid.*data/i,
                /data.*format.*error/i,
                /parsing.*error/i,
                /serialization.*error/i,
                /type.*error/i
            ],
            severity: 'medium',
            recoverable: true,
            category: 'data',
            priority: 2,
            commonCauses: ['data format changes', 'validation rule updates', 'type mismatches', 'encoding issues'],
            suggestedActions: ['validate data format', 'update validation rules', 'transform data', 'check encoding']
        });

        // Resource and system errors
        this.errorClassifications.set('resource-error', {
            patterns: [
                /out.*of.*memory/i,
                /resource.*exhausted/i,
                /disk.*full/i,
                /file.*not.*found/i,
                /permission.*error/i,
                /system.*error/i
            ],
            severity: 'high',
            recoverable: true,
            category: 'system',
            priority: 1,
            commonCauses: ['resource exhaustion', 'file system issues', 'memory leaks', 'disk space'],
            suggestedActions: ['free resources', 'restart process', 'clean temporary files', 'increase limits']
        });

        // Unknown/Generic errors
        this.errorClassifications.set('unknown', {
            patterns: [/.*/],
            severity: 'medium',
            recoverable: true,
            category: 'unknown',
            priority: 3,
            commonCauses: ['unexpected conditions', 'new error types', 'system changes'],
            suggestedActions: ['retry with delay', 'collect more diagnostics', 'escalate to support']
        });
    }
       
 /**
     * Initialize recovery strategies for different error types
     */
    initializeRecoveryStrategies() {
        // Element recovery strategies
        this.recoveryStrategies.set('element-not-found', [
            {
                name: 'wait-and-retry',
                priority: 1,
                execute: async (context) => {
                    await this.delay(context.retryDelay || 2000);
                    return { success: true, action: 'retry' };
                }
            },
            {
                name: 'alternative-selector',
                priority: 2,
                execute: async (context) => {
                    if (context.alternativeSelectors && context.alternativeSelectors.length > 0) {
                        const nextSelector = context.alternativeSelectors.shift();
                        return { success: true, action: 'use-alternative', data: { selector: nextSelector } };
                    }
                    return { success: false, reason: 'No alternative selectors available' };
                }
            },
            {
                name: 'visual-matching',
                priority: 3,
                execute: async (context) => {
                    if (context.visualFingerprint) {
                        // Attempt visual similarity matching
                        return { success: true, action: 'visual-match', data: { fingerprint: context.visualFingerprint } };
                    }
                    return { success: false, reason: 'No visual fingerprint available' };
                }
            }
        ]);

        // Timeout recovery strategies
        this.recoveryStrategies.set('timeout', [
            {
                name: 'increase-timeout',
                priority: 1,
                execute: async (context) => {
                    const newTimeout = Math.min((context.currentTimeout || 30000) * 1.5, 120000);
                    return { success: true, action: 'increase-timeout', data: { timeout: newTimeout } };
                }
            },
            {
                name: 'wait-for-stability',
                priority: 2,
                execute: async (context) => {
                    await this.delay(5000); // Wait for page stability
                    return { success: true, action: 'retry' };
                }
            }
        ]);

        // Network error recovery strategies
        this.recoveryStrategies.set('network-error', [
            {
                name: 'exponential-backoff',
                priority: 1,
                execute: async (context) => {
                    const delay = this.calculateExponentialBackoff(context.attemptNumber || 1);
                    await this.delay(delay);
                    return { success: true, action: 'retry' };
                }
            },
            {
                name: 'circuit-breaker',
                priority: 2,
                execute: async (context) => {
                    if (this.shouldTriggerCircuitBreaker(context)) {
                        return { success: false, action: 'circuit-break', reason: 'Too many consecutive failures' };
                    }
                    return { success: true, action: 'continue' };
                }
            }
        ]);

        // Page error recovery strategies
        this.recoveryStrategies.set('page-error', [
            {
                name: 'refresh-page',
                priority: 1,
                execute: async (context) => {
                    return { success: true, action: 'refresh-page' };
                }
            },
            {
                name: 'restart-browser',
                priority: 2,
                execute: async (context) => {
                    return { success: true, action: 'restart-browser' };
                }
            }
        ]);

        // Data error recovery strategies
        this.recoveryStrategies.set('data-error', [
            {
                name: 'data-transformation',
                priority: 1,
                execute: async (context) => {
                    return { success: true, action: 'transform-data', data: { transformation: 'auto-detect' } };
                }
            },
            {
                name: 'fallback-data',
                priority: 2,
                execute: async (context) => {
                    if (context.fallbackData) {
                        return { success: true, action: 'use-fallback', data: context.fallbackData };
                    }
                    return { success: false, reason: 'No fallback data available' };
                }
            }
        ]);

        // Generic recovery strategies
        this.recoveryStrategies.set('unknown', [
            {
                name: 'generic-retry',
                priority: 1,
                execute: async (context) => {
                    const delay = this.calculateExponentialBackoff(context.attemptNumber || 1);
                    await this.delay(delay);
                    return { success: true, action: 'retry' };
                }
            }
        ]);
    }

    /**
     * Main error handling method
     * @param {Error} error - The error to handle
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Recovery result
     */
    async handleError(error, context = {}) {
        const startTime = Date.now();
        
        try {
            // Step 1: Classify the error
            const classification = await this.classifyError(error, context);
            
            // Step 2: Generate diagnostic report
            const diagnostics = await this.generateDiagnostics(error, context, classification);
            
            // Step 3: Select and execute recovery strategy
            const recoveryResult = await this.executeRecoveryStrategy(error, context, classification);
            
            // Step 4: Update statistics and learning data
            await this.updateRecoveryStats(classification, recoveryResult);
            
            // Step 5: Emit events for monitoring
            this.emit('error-handled', {
                error,
                context,
                classification,
                diagnostics,
                recoveryResult,
                duration: Date.now() - startTime
            });

            return {
                success: recoveryResult.success,
                classification,
                diagnostics,
                recoveryResult,
                duration: Date.now() - startTime
            };

        } catch (handlingError) {
            this.emit('error-handling-failed', {
                originalError: error,
                handlingError,
                context
            });
            
            return {
                success: false,
                error: handlingError,
                classification: { type: 'unknown', severity: 'high' },
                diagnostics: { message: 'Error handling failed' },
                recoveryResult: { success: false, reason: 'Handler failure' }
            };
        }
    }

    /**
     * Classify error based on patterns and context
     * @param {Error} error - The error to classify
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Error classification
     */
    async classifyError(error, context) {
        const errorMessage = error.message || error.toString();
        const errorStack = error.stack || '';
        
        // Find matching classification
        for (const [type, classification] of this.errorClassifications) {
            if (type === 'unknown') continue; // Skip unknown, use as fallback
            
            for (const pattern of classification.patterns) {
                if (pattern.test(errorMessage) || pattern.test(errorStack)) {
                    return {
                        type,
                        ...classification,
                        confidence: this.calculateClassificationConfidence(error, classification, context),
                        timestamp: new Date().toISOString(),
                        errorMessage,
                        context: this.sanitizeContext(context)
                    };
                }
            }
        }
        
        // Fallback to unknown classification
        const unknownClassification = this.errorClassifications.get('unknown');
        return {
            type: 'unknown',
            ...unknownClassification,
            confidence: 0.5,
            timestamp: new Date().toISOString(),
            errorMessage,
            context: this.sanitizeContext(context)
        };
    }

    /**
     * Generate comprehensive diagnostic report
     * @param {Error} error - The error
     * @param {Object} context - Execution context
     * @param {Object} classification - Error classification
     * @returns {Promise<Object>} Diagnostic report
     */
    async generateDiagnostics(error, context, classification) {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            errorId: this.generateErrorId(),
            classification,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context: {
                url: context.url,
                selector: context.selector,
                action: context.action,
                step: context.step,
                sessionId: context.sessionId,
                userId: context.userId,
                browser: context.browser,
                viewport: context.viewport,
                userAgent: context.userAgent
            },
            system: {
                timestamp: Date.now(),
                memory: process.memoryUsage ? process.memoryUsage() : null,
                platform: process.platform,
                nodeVersion: process.version
            },
            analysis: {
                possibleCauses: classification.commonCauses || [],
                suggestedActions: classification.suggestedActions || [],
                severity: classification.severity,
                recoverable: classification.recoverable,
                priority: classification.priority
            },
            history: this.getErrorHistory(classification.type),
            recommendations: await this.generateRecommendations(error, context, classification)
        };

        // Store diagnostic report
        this.diagnosticReports.set(diagnostics.errorId, diagnostics);
        
        return diagnostics;
    }

    /**
     * Execute recovery strategy based on error classification
     * @param {Error} error - The error
     * @param {Object} context - Execution context
     * @param {Object} classification - Error classification
     * @returns {Promise<Object>} Recovery result
     */
    async executeRecoveryStrategy(error, context, classification) {
        const strategies = this.recoveryStrategies.get(classification.type) || 
                          this.recoveryStrategies.get('unknown');
        
        if (!strategies || strategies.length === 0) {
            return {
                success: false,
                reason: 'No recovery strategies available',
                action: 'escalate'
            };
        }

        // Sort strategies by priority
        const sortedStrategies = strategies.sort((a, b) => a.priority - b.priority);
        
        for (const strategy of sortedStrategies) {
            try {
                const result = await strategy.execute({
                    ...context,
                    error,
                    classification,
                    attemptNumber: context.attemptNumber || 1
                });
                
                if (result.success) {
                    return {
                        success: true,
                        strategy: strategy.name,
                        action: result.action,
                        data: result.data,
                        reason: result.reason
                    };
                }
            } catch (strategyError) {
                console.warn(`Recovery strategy ${strategy.name} failed:`, strategyError);
                continue;
            }
        }
        
        return {
            success: false,
            reason: 'All recovery strategies failed',
            action: 'escalate',
            strategiesAttempted: sortedStrategies.map(s => s.name)
        };
    }

    /**
     * Implement automatic retry with exponential backoff
     * @param {Function} operation - Operation to retry
     * @param {Object} options - Retry options
     * @returns {Promise<any>} Operation result
     */
    async retryWithBackoff(operation, options = {}) {
        const {
            maxAttempts = this.options.maxRetryAttempts,
            baseDelay = this.options.baseRetryDelay,
            maxDelay = this.options.maxRetryDelay,
            factor = this.options.exponentialBackoffFactor,
            onRetry = null
        } = options;

        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await operation(attempt);
                
                // Success - update stats
                this.updateRetryStats('success', attempt);
                return result;
                
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    // Final attempt failed
                    this.updateRetryStats('failure', attempt);
                    break;
                }
                
                // Calculate delay for next attempt
                const delay = Math.min(
                    baseDelay * Math.pow(factor, attempt - 1),
                    maxDelay
                );
                
                // Add jitter to prevent thundering herd
                const jitteredDelay = delay + (Math.random() * delay * 0.1);
                
                // Notify about retry
                if (onRetry) {
                    await onRetry(error, attempt, jitteredDelay);
                }
                
                this.emit('retry-attempt', {
                    attempt,
                    maxAttempts,
                    delay: jitteredDelay,
                    error: error.message
                });
                
                // Wait before next attempt
                await this.delay(jitteredDelay);
            }
        }
        
        throw lastError;
    } 
   /**
     * Calculate exponential backoff delay
     * @param {number} attemptNumber - Current attempt number
     * @returns {number} Delay in milliseconds
     */
    calculateExponentialBackoff(attemptNumber) {
        const delay = this.options.baseRetryDelay * Math.pow(this.options.exponentialBackoffFactor, attemptNumber - 1);
        return Math.min(delay, this.options.maxRetryDelay);
    }

    /**
     * Calculate classification confidence based on error and context
     * @param {Error} error - The error
     * @param {Object} classification - Error classification
     * @param {Object} context - Execution context
     * @returns {number} Confidence score (0-1)
     */
    calculateClassificationConfidence(error, classification, context) {
        let confidence = 0.7; // Base confidence
        
        // Increase confidence for exact pattern matches
        const errorMessage = error.message || error.toString();
        for (const pattern of classification.patterns) {
            if (pattern.test(errorMessage)) {
                confidence += 0.1;
                break;
            }
        }
        
        // Increase confidence based on context relevance
        if (context.action && classification.category === 'element' && context.selector) {
            confidence += 0.1;
        }
        
        if (context.url && classification.category === 'network') {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Generate recommendations based on error analysis
     * @param {Error} error - The error
     * @param {Object} context - Execution context
     * @param {Object} classification - Error classification
     * @returns {Promise<Array>} Recommendations
     */
    async generateRecommendations(error, context, classification) {
        const recommendations = [];
        
        // Add classification-based recommendations
        if (classification.suggestedActions) {
            recommendations.push(...classification.suggestedActions.map(action => ({
                type: 'immediate',
                action,
                priority: 'high',
                source: 'classification'
            })));
        }
        
        // Add context-specific recommendations
        if (context.selector && classification.category === 'element') {
            recommendations.push({
                type: 'optimization',
                action: 'Consider using more robust selectors (data attributes, accessibility labels)',
                priority: 'medium',
                source: 'context-analysis'
            });
        }
        
        if (context.url && classification.category === 'network') {
            recommendations.push({
                type: 'monitoring',
                action: 'Monitor network connectivity and server response times',
                priority: 'medium',
                source: 'context-analysis'
            });
        }
        
        // Add historical recommendations
        const history = this.getErrorHistory(classification.type);
        if (history.length > 3) {
            recommendations.push({
                type: 'pattern',
                action: 'Frequent occurrence detected - consider systematic fix',
                priority: 'high',
                source: 'historical-analysis',
                data: { frequency: history.length }
            });
        }
        
        return recommendations;
    }

    /**
     * Check if circuit breaker should be triggered
     * @param {Object} context - Execution context
     * @returns {boolean} Whether to trigger circuit breaker
     */
    shouldTriggerCircuitBreaker(context) {
        const key = `${context.url || 'unknown'}-${context.action || 'unknown'}`;
        const history = this.errorHistory.get(key) || [];
        
        // Trigger if more than 5 failures in last 10 minutes
        const recentFailures = history.filter(
            entry => Date.now() - entry.timestamp < 10 * 60 * 1000
        );
        
        return recentFailures.length >= 5;
    }

    /**
     * Update recovery statistics
     * @param {Object} classification - Error classification
     * @param {Object} recoveryResult - Recovery result
     */
    async updateRecoveryStats(classification, recoveryResult) {
        const key = classification.type;
        const stats = this.recoveryStats.get(key) || {
            total: 0,
            successful: 0,
            failed: 0,
            strategies: new Map()
        };
        
        stats.total++;
        if (recoveryResult.success) {
            stats.successful++;
            
            // Update strategy stats
            const strategyStats = stats.strategies.get(recoveryResult.strategy) || { used: 0, successful: 0 };
            strategyStats.used++;
            strategyStats.successful++;
            stats.strategies.set(recoveryResult.strategy, strategyStats);
        } else {
            stats.failed++;
        }
        
        this.recoveryStats.set(key, stats);
        
        // Emit stats update event
        this.emit('stats-updated', { type: key, stats });
    }

    /**
     * Update retry statistics
     * @param {string} outcome - 'success' or 'failure'
     * @param {number} attempts - Number of attempts made
     */
    updateRetryStats(outcome, attempts) {
        const stats = this.recoveryStats.get('retry') || {
            total: 0,
            successful: 0,
            failed: 0,
            averageAttempts: 0
        };
        
        stats.total++;
        if (outcome === 'success') {
            stats.successful++;
        } else {
            stats.failed++;
        }
        
        // Update average attempts
        stats.averageAttempts = (stats.averageAttempts * (stats.total - 1) + attempts) / stats.total;
        
        this.recoveryStats.set('retry', stats);
    }

    /**
     * Get error history for a specific error type
     * @param {string} errorType - Error type
     * @returns {Array} Error history
     */
    getErrorHistory(errorType) {
        return this.errorHistory.get(errorType) || [];
    }

    /**
     * Add error to history
     * @param {string} errorType - Error type
     * @param {Object} errorData - Error data
     */
    addToErrorHistory(errorType, errorData) {
        const history = this.errorHistory.get(errorType) || [];
        history.push({
            timestamp: Date.now(),
            ...errorData
        });
        
        // Keep only last 100 entries
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
        
        this.errorHistory.set(errorType, history);
    }

    /**
     * Generate unique error ID
     * @returns {string} Unique error ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sanitize context for logging (remove sensitive data)
     * @param {Object} context - Original context
     * @returns {Object} Sanitized context
     */
    sanitizeContext(context) {
        const sanitized = { ...context };
        
        // Remove sensitive fields
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.apiKey;
        delete sanitized.credentials;
        
        // Truncate long values
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
                sanitized[key] = sanitized[key].substring(0, 1000) + '...';
            }
        });
        
        return sanitized;
    }

    /**
     * Utility method for delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get comprehensive recovery statistics
     * @returns {Object} Recovery statistics
     */
    getRecoveryStatistics() {
        const stats = {};
        
        for (const [type, typeStats] of this.recoveryStats) {
            stats[type] = {
                ...typeStats,
                successRate: typeStats.total > 0 ? (typeStats.successful / typeStats.total) : 0,
                strategies: typeStats.strategies ? Object.fromEntries(typeStats.strategies) : {}
            };
        }
        
        return {
            overall: stats,
            totalErrors: Object.values(stats).reduce((sum, s) => sum + s.total, 0),
            overallSuccessRate: this.calculateOverallSuccessRate(stats),
            mostCommonErrors: this.getMostCommonErrors(),
            diagnosticReports: this.diagnosticReports.size
        };
    }

    /**
     * Calculate overall success rate
     * @param {Object} stats - Statistics object
     * @returns {number} Overall success rate
     */
    calculateOverallSuccessRate(stats) {
        const totals = Object.values(stats).reduce(
            (acc, s) => ({
                total: acc.total + s.total,
                successful: acc.successful + s.successful
            }),
            { total: 0, successful: 0 }
        );
        
        return totals.total > 0 ? (totals.successful / totals.total) : 0;
    }

    /**
     * Get most common error types
     * @returns {Array} Most common errors
     */
    getMostCommonErrors() {
        return Array.from(this.recoveryStats.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([type, stats]) => ({
                type,
                count: stats.total,
                successRate: stats.total > 0 ? (stats.successful / stats.total) : 0
            }));
    }

    /**
     * Get diagnostic report by ID
     * @param {string} errorId - Error ID
     * @returns {Object|null} Diagnostic report
     */
    getDiagnosticReport(errorId) {
        return this.diagnosticReports.get(errorId) || null;
    }

    /**
     * Clear old diagnostic reports (keep last 1000)
     */
    cleanupDiagnosticReports() {
        if (this.diagnosticReports.size > 1000) {
            const entries = Array.from(this.diagnosticReports.entries());
            const toKeep = entries.slice(-1000);
            this.diagnosticReports.clear();
            toKeep.forEach(([id, report]) => {
                this.diagnosticReports.set(id, report);
            });
        }
    }

    /**
     * Export error recovery framework configuration
     * @returns {Object} Configuration object
     */
    exportConfiguration() {
        return {
            options: this.options,
            errorClassifications: Object.fromEntries(this.errorClassifications),
            recoveryStrategies: Object.fromEntries(
                Array.from(this.recoveryStrategies.entries()).map(([key, strategies]) => [
                    key,
                    strategies.map(s => ({ name: s.name, priority: s.priority }))
                ])
            )
        };
    }

    /**
     * Import error recovery framework configuration
     * @param {Object} config - Configuration object
     */
    importConfiguration(config) {
        if (config.options) {
            this.options = { ...this.options, ...config.options };
        }
        
        if (config.errorClassifications) {
            this.errorClassifications.clear();
            Object.entries(config.errorClassifications).forEach(([key, value]) => {
                this.errorClassifications.set(key, value);
            });
        }
        
        // Note: Recovery strategies contain functions and cannot be easily serialized/imported
        // This would require a more sophisticated plugin system
    }
}

module.exports = ErrorRecoveryFramework;