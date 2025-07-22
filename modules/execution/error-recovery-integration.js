const ErrorRecoveryFramework = require('./error-recovery-framework');

/**
 * Integration layer for Error Recovery Framework with existing workflow systems
 */
class ErrorRecoveryIntegration {
    constructor(options = {}) {
        this.errorRecovery = new ErrorRecoveryFramework(options);
        this.workflowEngine = null;
        this.executionContext = null;
        
        // Set up event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize with workflow engine
     * @param {Object} workflowEngine - Workflow engine instance
     */
    initialize(workflowEngine) {
        this.workflowEngine = workflowEngine;
        
        // Integrate with workflow engine error handling
        if (workflowEngine && typeof workflowEngine.on === 'function') {
            workflowEngine.on('step-error', this.handleWorkflowError.bind(this));
            workflowEngine.on('execution-error', this.handleExecutionError.bind(this));
        }
    }

    /**
     * Set up event listeners for error recovery framework
     */
    setupEventListeners() {
        this.errorRecovery.on('error-handled', (data) => {
            console.log(`Error recovered: ${data.classification.type} - ${data.recoveryResult.strategy}`);
            
            // Emit to workflow engine if available
            if (this.workflowEngine && typeof this.workflowEngine.emit === 'function') {
                this.workflowEngine.emit('error-recovered', data);
            }
        });

        this.errorRecovery.on('retry-attempt', (data) => {
            console.log(`Retry attempt ${data.attempt}/${data.maxAttempts} after ${data.delay}ms delay`);
        });

        this.errorRecovery.on('stats-updated', (data) => {
            // Could integrate with monitoring systems here
            console.log(`Recovery stats updated for ${data.type}:`, data.stats);
        });
    }

    /**
     * Handle workflow step errors
     * @param {Object} errorData - Error data from workflow engine
     */
    async handleWorkflowError(errorData) {
        const { error, step, context } = errorData;
        
        // Enhance context with workflow-specific information
        const enhancedContext = {
            ...context,
            step: step.type,
            stepIndex: step.index,
            workflowId: context.workflowId,
            selector: step.selector,
            action: step.action,
            url: context.currentUrl
        };

        try {
            const recoveryResult = await this.errorRecovery.handleError(error, enhancedContext);
            
            if (recoveryResult.success) {
                // Apply recovery action to workflow
                await this.applyRecoveryAction(recoveryResult, step, context);
                return { recovered: true, result: recoveryResult };
            } else {
                // Escalate to workflow engine
                return { recovered: false, result: recoveryResult };
            }
        } catch (recoveryError) {
            console.error('Error recovery failed:', recoveryError);
            return { recovered: false, error: recoveryError };
        }
    }

    /**
     * Handle general execution errors
     * @param {Object} errorData - Error data
     */
    async handleExecutionError(errorData) {
        const { error, context } = errorData;
        
        const recoveryResult = await this.errorRecovery.handleError(error, context);
        
        if (recoveryResult.success) {
            // Notify workflow engine of successful recovery
            if (this.workflowEngine && typeof this.workflowEngine.emit === 'function') {
                this.workflowEngine.emit('error-auto-recovered', {
                    error,
                    context,
                    recoveryResult
                });
            }
        }
        
        return recoveryResult;
    }

    /**
     * Apply recovery action to workflow execution
     * @param {Object} recoveryResult - Recovery result
     * @param {Object} step - Current workflow step
     * @param {Object} context - Execution context
     */
    async applyRecoveryAction(recoveryResult, step, context) {
        const { action, data } = recoveryResult.recoveryResult;
        
        switch (action) {
            case 'retry':
                // Simply retry the current step
                console.log('Retrying step after recovery');
                break;
                
            case 'use-alternative':
                // Update step with alternative selector
                if (data && data.selector) {
                    step.selector = data.selector;
                    console.log(`Using alternative selector: ${data.selector}`);
                }
                break;
                
            case 'increase-timeout':
                // Update timeout for current step
                if (data && data.timeout) {
                    step.timeout = data.timeout;
                    console.log(`Increased timeout to: ${data.timeout}ms`);
                }
                break;
                
            case 'refresh-page':
                // Refresh the page and retry
                if (context.page && typeof context.page.reload === 'function') {
                    await context.page.reload();
                    console.log('Page refreshed for recovery');
                }
                break;
                
            case 'restart-browser':
                // Signal to restart browser (would need to be handled by higher-level system)
                if (this.workflowEngine && typeof this.workflowEngine.emit === 'function') {
                    this.workflowEngine.emit('restart-browser-requested', { context });
                }
                break;
                
            case 'visual-match':
                // Use visual matching for element detection
                if (data && data.fingerprint) {
                    step.useVisualMatching = true;
                    step.visualFingerprint = data.fingerprint;
                    console.log('Enabled visual matching for element detection');
                }
                break;
                
            case 'transform-data':
                // Apply data transformation
                if (data && data.transformation) {
                    step.dataTransformation = data.transformation;
                    console.log(`Applied data transformation: ${data.transformation}`);
                }
                break;
                
            default:
                console.log(`Unknown recovery action: ${action}`);
        }
    }

    /**
     * Execute operation with automatic error recovery
     * @param {Function} operation - Operation to execute
     * @param {Object} context - Execution context
     * @param {Object} options - Recovery options
     * @returns {Promise<any>} Operation result
     */
    async executeWithRecovery(operation, context = {}, options = {}) {
        const {
            maxAttempts = this.errorRecovery.options.maxRetryAttempts,
            enableRecovery = true
        } = options;

        let lastError;
        let recoveryAttempts = 0;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await operation(attempt, context);
                
                // Success - log recovery stats if this wasn't the first attempt
                if (attempt > 1) {
                    console.log(`Operation succeeded after ${attempt} attempts with recovery`);
                }
                
                return result;
                
            } catch (error) {
                lastError = error;
                
                if (attempt === maxAttempts) {
                    // Final attempt failed
                    break;
                }
                
                if (enableRecovery) {
                    // Attempt error recovery
                    const recoveryResult = await this.errorRecovery.handleError(error, {
                        ...context,
                        attemptNumber: attempt,
                        maxAttempts
                    });
                    
                    if (recoveryResult.success) {
                        recoveryAttempts++;
                        
                        // Apply recovery modifications to context
                        if (recoveryResult.recoveryResult.data) {
                            Object.assign(context, recoveryResult.recoveryResult.data);
                        }
                        
                        // Continue to next attempt
                        continue;
                    } else {
                        // Recovery failed, break early
                        console.log('Error recovery failed, stopping attempts');
                        break;
                    }
                } else {
                    // No recovery enabled, use simple retry with backoff
                    const delay = this.errorRecovery.calculateExponentialBackoff(attempt);
                    await this.errorRecovery.delay(delay);
                }
            }
        }
        
        // All attempts failed
        const finalError = new Error(`Operation failed after ${maxAttempts} attempts (${recoveryAttempts} with recovery)`);
        finalError.originalError = lastError;
        finalError.attempts = maxAttempts;
        finalError.recoveryAttempts = recoveryAttempts;
        
        throw finalError;
    }

    /**
     * Get comprehensive error recovery statistics
     * @returns {Object} Statistics including integration metrics
     */
    getStatistics() {
        const baseStats = this.errorRecovery.getRecoveryStatistics();
        
        return {
            ...baseStats,
            integration: {
                workflowEngineConnected: !!this.workflowEngine,
                totalIntegrationHandles: this.totalIntegrationHandles || 0,
                successfulRecoveries: this.successfulRecoveries || 0,
                failedRecoveries: this.failedRecoveries || 0
            }
        };
    }

    /**
     * Create a recovery-aware wrapper for any async function
     * @param {Function} fn - Function to wrap
     * @param {Object} defaultContext - Default context for recovery
     * @returns {Function} Wrapped function with recovery
     */
    createRecoveryWrapper(fn, defaultContext = {}) {
        return async (...args) => {
            const context = { ...defaultContext, args };
            
            return this.executeWithRecovery(
                async (attempt) => {
                    return await fn.apply(this, args);
                },
                context
            );
        };
    }

    /**
     * Add custom error classification
     * @param {string} type - Error type
     * @param {Object} classification - Classification definition
     */
    addErrorClassification(type, classification) {
        this.errorRecovery.errorClassifications.set(type, classification);
    }

    /**
     * Add custom recovery strategy
     * @param {string} errorType - Error type to handle
     * @param {Object} strategy - Recovery strategy
     */
    addRecoveryStrategy(errorType, strategy) {
        const strategies = this.errorRecovery.recoveryStrategies.get(errorType) || [];
        strategies.push(strategy);
        strategies.sort((a, b) => a.priority - b.priority);
        this.errorRecovery.recoveryStrategies.set(errorType, strategies);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.errorRecovery) {
            this.errorRecovery.removeAllListeners();
            this.errorRecovery.cleanupDiagnosticReports();
        }
        
        if (this.workflowEngine && typeof this.workflowEngine.removeListener === 'function') {
            this.workflowEngine.removeListener('step-error', this.handleWorkflowError);
            this.workflowEngine.removeListener('execution-error', this.handleExecutionError);
        }
    }
}

module.exports = ErrorRecoveryIntegration;