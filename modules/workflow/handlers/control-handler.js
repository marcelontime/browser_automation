/**
 * Control flow step handler for conditional logic, loops, and flow control
 */
class ControlHandler {
    constructor(options = {}) {
        this.options = {
            defaultTimeout: options.defaultTimeout || 30000,
            maxLoopIterations: options.maxLoopIterations || 1000,
            ...options
        };
    }

    /**
     * Execute control flow step
     */
    async execute(step, context) {
        const { action, value } = step;
        const startTime = Date.now();

        try {
            let result;

            switch (action) {
                case 'if':
                    result = await this.handleIf(step, context);
                    break;
                    
                case 'loop':
                    result = await this.handleLoop(step, context);
                    break;
                    
                case 'parallel':
                    result = await this.handleParallel(step, context);
                    break;
                    
                case 'delay':
                    result = await this.handleDelay(step, context);
                    break;
                    
                case 'checkpoint':
                    result = await this.handleCheckpoint(step, context);
                    break;
                    
                case 'break':
                    result = await this.handleBreak(step, context);
                    break;
                    
                case 'continue':
                    result = await this.handleContinue(step, context);
                    break;
                    
                case 'return':
                    result = await this.handleReturn(step, context);
                    break;
                    
                default:
                    throw new Error(`Unsupported control action: ${action}`);
            }

            const executionTime = Date.now() - startTime;
            
            return {
                success: true,
                action,
                result,
                executionTime,
                executedAt: new Date()
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            throw new Error(`Control flow ${action} failed: ${error.message}`, {
                cause: error,
                executionTime,
                step: step.id
            });
        }
    }

    /**
     * Handle conditional execution (if/else)
     */
    async handleIf(step, context) {
        const condition = step.condition;
        const thenSteps = step.then || [];
        const elseSteps = step.else || [];
        
        if (!condition) {
            throw new Error('If statement requires condition');
        }
        
        // Evaluate condition
        const conditionResult = await this.evaluateCondition(condition, context);
        
        // Execute appropriate branch
        const stepsToExecute = conditionResult ? thenSteps : elseSteps;
        const branchResults = [];
        
        if (stepsToExecute.length > 0) {
            // Execute steps in the chosen branch
            for (const branchStep of stepsToExecute) {
                try {
                    const stepResult = await this.executeNestedStep(branchStep, context);
                    branchResults.push(stepResult);
                } catch (error) {
                    // Handle error based on step configuration
                    if (branchStep.continueOnError) {
                        branchResults.push({
                            stepId: branchStep.id,
                            success: false,
                            error: error.message
                        });
                    } else {
                        throw error;
                    }
                }
            }
        }
        
        return {
            conditionResult,
            branch: conditionResult ? 'then' : 'else',
            stepsExecuted: stepsToExecute.length,
            results: branchResults
        };
    }

    /**
     * Handle loop execution
     */
    async handleLoop(step, context) {
        const loopType = step.loopType || 'while';
        const maxIterations = step.maxIterations || this.options.maxLoopIterations;
        const loopSteps = step.steps || [];
        
        if (loopSteps.length === 0) {
            throw new Error('Loop requires steps to execute');
        }
        
        const loopResults = [];
        let iteration = 0;
        let shouldContinue = true;
        
        while (shouldContinue && iteration < maxIterations) {
            iteration++;
            
            // Check loop condition
            if (loopType === 'while' && step.condition) {
                shouldContinue = await this.evaluateCondition(step.condition, context);
                if (!shouldContinue) break;
            } else if (loopType === 'for' && step.count) {
                shouldContinue = iteration <= step.count;
            } else if (loopType === 'forEach' && step.array) {
                const arrayData = this.getArrayData(step.array, context);
                shouldContinue = iteration <= arrayData.length;
                
                // Set current item variable
                if (shouldContinue && step.itemVariable) {
                    context.setVariable(step.itemVariable, arrayData[iteration - 1]);
                }
            }
            
            if (!shouldContinue) break;
            
            // Set iteration variable if specified
            if (step.iterationVariable) {
                context.setVariable(step.iterationVariable, iteration);
            }
            
            // Execute loop steps
            const iterationResults = [];
            let breakLoop = false;
            let continueLoop = false;
            
            for (const loopStep of loopSteps) {
                try {
                    const stepResult = await this.executeNestedStep(loopStep, context);
                    iterationResults.push(stepResult);
                    
                    // Check for control flow changes
                    if (stepResult.controlFlow === 'break') {
                        breakLoop = true;
                        break;
                    } else if (stepResult.controlFlow === 'continue') {
                        continueLoop = true;
                        break;
                    }
                } catch (error) {
                    if (loopStep.continueOnError) {
                        iterationResults.push({
                            stepId: loopStep.id,
                            success: false,
                            error: error.message
                        });
                    } else {
                        throw error;
                    }
                }
            }
            
            loopResults.push({
                iteration,
                results: iterationResults,
                completed: !breakLoop && !continueLoop
            });
            
            if (breakLoop) {
                shouldContinue = false;
            }
            
            // Add delay between iterations if specified
            if (step.iterationDelay && shouldContinue) {
                await new Promise(resolve => setTimeout(resolve, step.iterationDelay));
            }
        }
        
        return {
            loopType,
            totalIterations: iteration,
            maxIterations,
            completed: !shouldContinue || iteration >= maxIterations,
            results: loopResults
        };
    }

    /**
     * Handle parallel execution
     */
    async handleParallel(step, context) {
        const parallelSteps = step.steps || [];
        const maxConcurrency = step.maxConcurrency || parallelSteps.length;
        
        if (parallelSteps.length === 0) {
            throw new Error('Parallel execution requires steps');
        }
        
        // Execute steps in parallel with concurrency limit
        const results = [];
        const executing = [];
        let stepIndex = 0;
        
        while (stepIndex < parallelSteps.length || executing.length > 0) {
            // Start new executions up to concurrency limit
            while (executing.length < maxConcurrency && stepIndex < parallelSteps.length) {
                const parallelStep = parallelSteps[stepIndex];
                const execution = this.executeNestedStep(parallelStep, context)
                    .then(result => ({ success: true, stepId: parallelStep.id, result }))
                    .catch(error => ({ success: false, stepId: parallelStep.id, error: error.message }));
                
                executing.push({ execution, stepId: parallelStep.id, index: stepIndex });
                stepIndex++;
            }
            
            // Wait for at least one execution to complete
            if (executing.length > 0) {
                const completed = await Promise.race(executing.map(e => e.execution));
                const completedIndex = executing.findIndex(e => e.stepId === completed.stepId);
                
                if (completedIndex !== -1) {
                    results.push(completed);
                    executing.splice(completedIndex, 1);
                }
            }
        }
        
        // Sort results by original step order
        results.sort((a, b) => {
            const aIndex = parallelSteps.findIndex(s => s.id === a.stepId);
            const bIndex = parallelSteps.findIndex(s => s.id === b.stepId);
            return aIndex - bIndex;
        });
        
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        
        return {
            totalSteps: parallelSteps.length,
            successCount,
            failureCount,
            maxConcurrency,
            results
        };
    }

    /**
     * Handle delay/wait
     */
    async handleDelay(step, context) {
        const delayType = step.delayType || 'fixed';
        let delayTime;
        
        switch (delayType) {
            case 'fixed':
                delayTime = step.duration || step.value || 1000;
                break;
                
            case 'random':
                const min = step.min || 1000;
                const max = step.max || 5000;
                delayTime = Math.floor(Math.random() * (max - min + 1)) + min;
                break;
                
            case 'variable':
                delayTime = parseInt(context.getVariable(step.variable)) || 1000;
                break;
                
            default:
                delayTime = 1000;
        }
        
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, delayTime));
        const actualDelay = Date.now() - startTime;
        
        return {
            delayType,
            requestedDelay: delayTime,
            actualDelay,
            completed: true
        };
    }

    /**
     * Handle checkpoint creation
     */
    async handleCheckpoint(step, context) {
        const description = step.description || `Checkpoint at step ${step.id}`;
        const checkpoint = context.createCheckpoint(description);
        
        // Store additional checkpoint data if specified
        if (step.storeVariables) {
            checkpoint.storedVariables = {};
            step.storeVariables.forEach(varName => {
                checkpoint.storedVariables[varName] = context.getVariable(varName);
            });
        }
        
        return {
            checkpointId: checkpoint.id,
            description: checkpoint.description,
            timestamp: checkpoint.timestamp,
            stepIndex: checkpoint.stepIndex,
            variablesStored: step.storeVariables ? step.storeVariables.length : 0
        };
    }

    /**
     * Handle break statement
     */
    async handleBreak(step, context) {
        return {
            controlFlow: 'break',
            message: 'Loop break executed'
        };
    }

    /**
     * Handle continue statement
     */
    async handleContinue(step, context) {
        return {
            controlFlow: 'continue',
            message: 'Loop continue executed'
        };
    }

    /**
     * Handle return statement
     */
    async handleReturn(step, context) {
        const returnValue = step.value ? this.processValue(step.value, context) : null;
        
        return {
            controlFlow: 'return',
            value: returnValue,
            message: 'Return executed'
        };
    }

    /**
     * Execute nested step (placeholder - would need step executor)
     */
    async executeNestedStep(step, context) {
        // This is a placeholder - in the real implementation, this would
        // delegate to the main step executor
        throw new Error('Nested step execution not implemented - requires StepExecutor integration');
    }

    /**
     * Evaluate condition
     */
    async evaluateCondition(condition, context) {
        if (typeof condition === 'boolean') {
            return condition;
        }
        
        if (typeof condition === 'string') {
            // Simple variable check
            return Boolean(context.getVariable(condition));
        }
        
        if (typeof condition === 'object') {
            switch (condition.type) {
                case 'variable':
                    return this.evaluateVariableCondition(condition, context);
                    
                case 'javascript':
                    return this.evaluateJavaScriptCondition(condition, context);
                    
                case 'comparison':
                    return this.evaluateComparisonCondition(condition, context);
                    
                default:
                    throw new Error(`Unknown condition type: ${condition.type}`);
            }
        }
        
        return false;
    }

    /**
     * Evaluate variable condition
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
            case 'greater_than':
                return Number(variableValue) > Number(expectedValue);
            case 'less_than':
                return Number(variableValue) < Number(expectedValue);
            case 'contains':
                return String(variableValue).includes(String(expectedValue));
            case 'exists':
                return variableValue !== undefined && variableValue !== null;
            default:
                return false;
        }
    }

    /**
     * Evaluate JavaScript condition
     */
    evaluateJavaScriptCondition(condition, context) {
        try {
            const evalContext = {
                variables: context.getAllVariables(),
                step: context.getCurrentStep(),
                workflow: context.workflow
            };
            
            const func = new Function('context', `return ${condition.expression}`);
            return Boolean(func(evalContext));
        } catch (error) {
            console.error('Error evaluating JavaScript condition:', error);
            return false;
        }
    }

    /**
     * Evaluate comparison condition
     */
    evaluateComparisonCondition(condition, context) {
        const leftValue = this.processValue(condition.left, context);
        const rightValue = this.processValue(condition.right, context);
        const operator = condition.operator;
        
        switch (operator) {
            case '==':
                return leftValue == rightValue;
            case '===':
                return leftValue === rightValue;
            case '!=':
                return leftValue != rightValue;
            case '!==':
                return leftValue !== rightValue;
            case '>':
                return Number(leftValue) > Number(rightValue);
            case '>=':
                return Number(leftValue) >= Number(rightValue);
            case '<':
                return Number(leftValue) < Number(rightValue);
            case '<=':
                return Number(leftValue) <= Number(rightValue);
            default:
                return false;
        }
    }

    /**
     * Get array data for forEach loops
     */
    getArrayData(arrayConfig, context) {
        if (Array.isArray(arrayConfig)) {
            return arrayConfig;
        }
        
        if (typeof arrayConfig === 'string') {
            // Variable reference
            const arrayData = context.getVariable(arrayConfig);
            return Array.isArray(arrayData) ? arrayData : [];
        }
        
        if (typeof arrayConfig === 'object' && arrayConfig.variable) {
            const arrayData = context.getVariable(arrayConfig.variable);
            return Array.isArray(arrayData) ? arrayData : [];
        }
        
        return [];
    }

    /**
     * Process value with variable substitution
     */
    processValue(value, context) {
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
            const variableName = value.slice(2, -2).trim();
            return context.getVariable(variableName);
        }
        
        return value;
    }

    /**
     * Validate control flow step
     */
    validate(step) {
        const { action } = step;
        
        switch (action) {
            case 'if':
                if (!step.condition) {
                    throw new Error('If statement requires condition');
                }
                if (!step.then && !step.else) {
                    throw new Error('If statement requires then or else branch');
                }
                break;
                
            case 'loop':
                if (!step.steps || !Array.isArray(step.steps)) {
                    throw new Error('Loop requires steps array');
                }
                if (step.loopType === 'while' && !step.condition) {
                    throw new Error('While loop requires condition');
                }
                if (step.loopType === 'for' && !step.count) {
                    throw new Error('For loop requires count');
                }
                if (step.loopType === 'forEach' && !step.array) {
                    throw new Error('ForEach loop requires array');
                }
                break;
                
            case 'parallel':
                if (!step.steps || !Array.isArray(step.steps)) {
                    throw new Error('Parallel execution requires steps array');
                }
                break;
                
            case 'delay':
                if (!step.duration && !step.value && !step.variable) {
                    throw new Error('Delay requires duration, value, or variable');
                }
                break;
                
            case 'checkpoint':
                // Checkpoint doesn't require additional validation
                break;
                
            case 'break':
            case 'continue':
            case 'return':
                // These don't require additional validation
                break;
                
            default:
                throw new Error(`Unknown control action: ${action}`);
        }
        
        return true;
    }
}

module.exports = ControlHandler;