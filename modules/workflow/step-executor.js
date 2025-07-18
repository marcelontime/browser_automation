const EventEmitter = require('events');

/**
 * Step executor for processing individual workflow steps
 */
class StepExecutor extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            defaultTimeout: options.defaultTimeout || 30000,
            retryDelay: options.retryDelay || 1000,
            maxRetries: options.maxRetries || 3,
            ...options
        };
        
        this.stepHandlers = new Map();
        this.activeSteps = new Map();
    }

    /**
     * Register step handler for specific step type
     */
    registerStepHandler(stepType, handler) {
        if (typeof handler.execute !== 'function') {
            throw new Error(`Step handler for ${stepType} must have execute method`);
        }
        
        this.stepHandlers.set(stepType, handler);
        return this;
    }

    /**
     * Execute a workflow step
     */
    async executeStep(step, context) {
        const stepId = step.id;
        const startTime = Date.now();
        
        try {
            // Validate step preconditions
            await this.validateStepPreconditions(step, context);
            
            // Get step handler
            const handler = this.getStepHandler(step.type);
            
            // Mark step as active
            this.activeSteps.set(stepId, {
                step,
                context,
                startTime,
                status: 'running'
            });
            
            // Emit step started event
            this.emit('stepStarted', {
                stepId,
                step,
                context,
                startTime
            });
            
            // Execute step with timeout
            const timeout = step.timeout || this.options.defaultTimeout;
            const result = await this.executeWithTimeout(
                () => handler.execute(step, context),
                timeout,
                `Step ${stepId} timed out after ${timeout}ms`
            );
            
            // Calculate execution time
            const executionTime = Date.now() - startTime;
            
            // Create step result
            const stepResult = {
                stepId,
                status: 'completed',
                result,
                executionTime,
                timestamp: new Date(),
                metadata: {
                    stepType: step.type,
                    stepAction: step.action,
                    handler: handler.constructor.name
                }
            };
            
            // Update active step status
            const activeStep = this.activeSteps.get(stepId);
            if (activeStep) {
                activeStep.status = 'completed';
                activeStep.result = stepResult;
            }
            
            // Emit step completed event
            this.emit('stepCompleted', {
                stepId,
                step,
                result: stepResult,
                context,
                executionTime
            });
            
            return stepResult;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            // Create error result
            const stepResult = {
                stepId,
                status: 'failed',
                error: {
                    message: error.message,
                    type: error.constructor.name,
                    stack: error.stack
                },
                executionTime,
                timestamp: new Date(),
                metadata: {
                    stepType: step.type,
                    stepAction: step.action
                }
            };
            
            // Update active step status
            const activeStep = this.activeSteps.get(stepId);
            if (activeStep) {
                activeStep.status = 'failed';
                activeStep.error = error;
                activeStep.result = stepResult;
            }
            
            // Emit step failed event
            this.emit('stepFailed', {
                stepId,
                step,
                error,
                result: stepResult,
                context,
                executionTime
            });
            
            throw error;
            
        } finally {
            // Remove from active steps
            this.activeSteps.delete(stepId);
        }
    }

    /**
     * Validate step preconditions
     */
    async validateStepPreconditions(step, context) {
        // Basic validation
        if (!step || typeof step !== 'object') {
            throw new Error('Step must be an object');
        }
        
        if (!step.id || typeof step.id !== 'string') {
            throw new Error('Step must have a valid id');
        }
        
        if (!step.type || typeof step.type !== 'string') {
            throw new Error('Step must have a valid type');
        }
        
        if (!step.action || typeof step.action !== 'string') {
            throw new Error('Step must have a valid action');
        }
        
        // Check if handler exists
        if (!this.stepHandlers.has(step.type)) {
            throw new Error(`No handler registered for step type: ${step.type}`);
        }
        
        // Validate step conditions
        if (step.conditions && Array.isArray(step.conditions)) {
            for (const condition of step.conditions) {
                const conditionMet = await this.evaluateCondition(condition, context);
                if (!conditionMet) {
                    throw new Error(`Step precondition not met: ${condition.description || 'Unknown condition'}`);
                }
            }
        }
        
        // Type-specific validation
        await this.validateStepTypeSpecific(step, context);
        
        return true;
    }

    /**
     * Type-specific step validation
     */
    async validateStepTypeSpecific(step, context) {
        switch (step.type) {
            case 'navigation':
                if (step.action === 'goto' && !step.target) {
                    throw new Error('Navigation goto step requires target URL');
                }
                break;
                
            case 'interaction':
                if (['click', 'hover', 'scroll'].includes(step.action) && !step.target) {
                    throw new Error(`${step.action} step requires target selector`);
                }
                if (['type', 'select'].includes(step.action)) {
                    if (!step.target) {
                        throw new Error(`${step.action} step requires target selector`);
                    }
                    if (!step.value && step.value !== '') {
                        throw new Error(`${step.action} step requires value`);
                    }
                }
                break;
                
            case 'extraction':
                if (!step.target) {
                    throw new Error('Extraction step requires target selector');
                }
                break;
                
            case 'validation':
                if (!step.target && !step.conditions) {
                    throw new Error('Validation step requires target selector or conditions');
                }
                break;
                
            case 'wait':
                if (step.action === 'time' && (!step.value || isNaN(step.value))) {
                    throw new Error('Wait time step requires numeric value');
                }
                if (step.action === 'element' && !step.target) {
                    throw new Error('Wait element step requires target selector');
                }
                break;
        }
        
        return true;
    }

    /**
     * Get step handler for step type
     */
    getStepHandler(stepType) {
        const handler = this.stepHandlers.get(stepType);
        if (!handler) {
            throw new Error(`No handler registered for step type: ${stepType}`);
        }
        return handler;
    }

    /**
     * Execute function with timeout
     */
    async executeWithTimeout(fn, timeout, timeoutMessage) {
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(timeoutMessage));
            }, timeout);
            
            try {
                const result = await fn();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Evaluate step condition
     */
    async evaluateCondition(condition, context) {
        try {
            switch (condition.type) {
                case 'variable':
                    return this.evaluateVariableCondition(condition, context);
                    
                case 'element':
                    return await this.evaluateElementCondition(condition, context);
                    
                case 'url':
                    return this.evaluateUrlCondition(condition, context);
                    
                case 'custom':
                    return await this.evaluateCustomCondition(condition, context);
                    
                default:
                    console.warn(`Unknown condition type: ${condition.type}`);
                    return true;
            }
        } catch (error) {
            console.error(`Error evaluating condition:`, error);
            return false;
        }
    }

    /**
     * Evaluate variable-based condition
     */
    evaluateVariableCondition(condition, context) {
        const variableValue = context.getVariable(condition.variable);
        const expectedValue = condition.value;
        const operator = condition.operator || 'equals';
        
        switch (operator) {
            case 'equals':
                return variableValue === expectedValue;
            case 'not_equals':
                return variableValue !== expectedValue;
            case 'contains':
                return String(variableValue).includes(String(expectedValue));
            case 'greater_than':
                return Number(variableValue) > Number(expectedValue);
            case 'less_than':
                return Number(variableValue) < Number(expectedValue);
            case 'exists':
                return variableValue !== undefined && variableValue !== null;
            default:
                return true;
        }
    }

    /**
     * Evaluate element-based condition (placeholder)
     */
    async evaluateElementCondition(condition, context) {
        // This would need to interact with the browser to check element existence
        // For now, return true as placeholder
        return true;
    }

    /**
     * Evaluate URL-based condition (placeholder)
     */
    evaluateUrlCondition(condition, context) {
        // This would need to check current page URL
        // For now, return true as placeholder
        return true;
    }

    /**
     * Evaluate custom JavaScript condition
     */
    async evaluateCustomCondition(condition, context) {
        try {
            // Create safe evaluation context
            const evalContext = {
                variables: context.getAllVariables(),
                step: context.getCurrentStep(),
                workflow: context.workflow
            };
            
            // Simple evaluation - in production, use a safer sandbox
            const func = new Function('context', `return ${condition.expression}`);
            return Boolean(func(evalContext));
        } catch (error) {
            console.error('Error evaluating custom condition:', error);
            return false;
        }
    }

    /**
     * Handle step execution error
     */
    async handleStepError(error, step, context) {
        const errorInfo = {
            stepId: step.id,
            stepType: step.type,
            stepAction: step.action,
            error: {
                message: error.message,
                type: error.constructor.name,
                stack: error.stack
            },
            timestamp: new Date(),
            context: {
                currentStep: context.currentStep,
                variables: context.getAllVariables()
            }
        };
        
        // Emit error event
        this.emit('stepError', errorInfo);
        
        // Determine error handling strategy
        const strategy = await this.determineErrorStrategy(error, step, context);
        
        switch (strategy) {
            case 'retry':
                return { action: 'retry', delay: this.options.retryDelay };
                
            case 'skip':
                return { action: 'skip', reason: 'Step marked as non-critical' };
                
            case 'pause':
                return { action: 'pause', reason: 'Manual intervention required' };
                
            case 'fail':
            default:
                return { action: 'fail', reason: 'Unrecoverable error' };
        }
    }

    /**
     * Determine error handling strategy
     */
    async determineErrorStrategy(error, step, context) {
        // Check step-specific error handling
        if (step.continueOnError) {
            return 'skip';
        }
        
        if (step.onError) {
            switch (step.onError.action) {
                case 'retry':
                case 'skip':
                case 'pause':
                    return step.onError.action;
            }
        }
        
        // Check error type for automatic retry
        if (this.isRetryableError(error)) {
            return 'retry';
        }
        
        // Default to fail
        return 'fail';
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const retryablePatterns = [
            /timeout/i,
            /network/i,
            /connection/i,
            /element.*not.*found/i,
            /page.*loading/i,
            /temporary/i
        ];
        
        return retryablePatterns.some(pattern => 
            pattern.test(error.message)
        );
    }

    /**
     * Wait for step completion
     */
    async waitForStepCompletion(step, context) {
        // This method can be used for steps that need additional waiting
        // after their main execution (e.g., waiting for animations, network requests)
        
        if (step.waitAfter) {
            const waitTime = typeof step.waitAfter === 'number' ? step.waitAfter : 1000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        return true;
    }

    /**
     * Get active step information
     */
    getActiveSteps() {
        const activeSteps = [];
        for (const [stepId, stepInfo] of this.activeSteps) {
            activeSteps.push({
                stepId,
                step: stepInfo.step,
                status: stepInfo.status,
                startTime: stepInfo.startTime,
                duration: Date.now() - stepInfo.startTime
            });
        }
        return activeSteps;
    }

    /**
     * Cancel active step
     */
    async cancelStep(stepId) {
        const activeStep = this.activeSteps.get(stepId);
        if (!activeStep) {
            return false;
        }
        
        activeStep.status = 'cancelled';
        
        this.emit('stepCancelled', {
            stepId,
            step: activeStep.step,
            context: activeStep.context
        });
        
        return true;
    }

    /**
     * Get step execution statistics
     */
    getExecutionStats() {
        return {
            activeSteps: this.activeSteps.size,
            registeredHandlers: this.stepHandlers.size,
            handlerTypes: Array.from(this.stepHandlers.keys())
        };
    }
}

module.exports = StepExecutor;