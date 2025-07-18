const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * Core workflow engine for sequential automation execution
 */
class WorkflowEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            maxConcurrentWorkflows: options.maxConcurrentWorkflows || 5,
            defaultTimeout: options.defaultTimeout || 30000,
            retryAttempts: options.retryAttempts || 3,
            ...options
        };
        
        this.activeWorkflows = new Map();
        this.workflowQueue = [];
        this.isProcessing = false;
    }

    /**
     * Execute a complete workflow sequence
     */
    async executeWorkflow(workflowDefinition, context = {}) {
        const executionId = uuidv4();
        
        try {
            // Validate workflow definition
            this.validateWorkflow(workflowDefinition);
            
            // Create execution context
            const executionContext = this.createExecutionContext(
                executionId, 
                workflowDefinition, 
                context
            );
            
            // Register active workflow
            this.activeWorkflows.set(executionId, executionContext);
            
            // Emit workflow started event
            this.emit('workflowStarted', {
                executionId,
                workflowId: workflowDefinition.id,
                context: executionContext
            });
            
            // Execute workflow steps sequentially
            const result = await this.processWorkflowSteps(executionContext);
            
            // Mark workflow as completed
            executionContext.executionState = 'completed';
            executionContext.endTime = new Date();
            
            this.emit('workflowCompleted', {
                executionId,
                result,
                context: executionContext
            });
            
            return result;
            
        } catch (error) {
            // Handle workflow execution error
            const context = this.activeWorkflows.get(executionId);
            if (context) {
                context.executionState = 'failed';
                context.endTime = new Date();
                context.errors.push({
                    type: 'workflow_error',
                    message: error.message,
                    timestamp: new Date(),
                    step: context.currentStep
                });
            }
            
            this.emit('workflowFailed', {
                executionId,
                error,
                context
            });
            
            throw error;
        } finally {
            // Cleanup workflow from active list
            this.activeWorkflows.delete(executionId);
        }
    }

    /**
     * Pause workflow execution
     */
    async pauseExecution(executionId) {
        const context = this.activeWorkflows.get(executionId);
        if (!context) {
            throw new Error(`Workflow ${executionId} not found`);
        }
        
        if (context.executionState !== 'running') {
            throw new Error(`Cannot pause workflow in state: ${context.executionState}`);
        }
        
        context.executionState = 'paused';
        context.pausedAt = new Date();
        
        this.emit('workflowPaused', {
            executionId,
            context
        });
        
        return true;
    }

    /**
     * Resume paused workflow execution
     */
    async resumeExecution(executionId) {
        const context = this.activeWorkflows.get(executionId);
        if (!context) {
            throw new Error(`Workflow ${executionId} not found`);
        }
        
        if (context.executionState !== 'paused') {
            throw new Error(`Cannot resume workflow in state: ${context.executionState}`);
        }
        
        context.executionState = 'running';
        context.resumedAt = new Date();
        
        this.emit('workflowResumed', {
            executionId,
            context
        });
        
        // Continue execution from current step
        try {
            const result = await this.processWorkflowSteps(context);
            
            context.executionState = 'completed';
            context.endTime = new Date();
            
            this.emit('workflowCompleted', {
                executionId,
                result,
                context
            });
            
            return result;
        } catch (error) {
            context.executionState = 'failed';
            context.endTime = new Date();
            context.errors.push({
                type: 'resume_error',
                message: error.message,
                timestamp: new Date(),
                step: context.currentStep
            });
            
            this.emit('workflowFailed', {
                executionId,
                error,
                context
            });
            
            throw error;
        }
    }

    /**
     * Stop workflow execution
     */
    async stopExecution(executionId, reason = 'user_requested') {
        const context = this.activeWorkflows.get(executionId);
        if (!context) {
            throw new Error(`Workflow ${executionId} not found`);
        }
        
        context.executionState = 'cancelled';
        context.endTime = new Date();
        context.cancellationReason = reason;
        
        this.emit('workflowStopped', {
            executionId,
            reason,
            context
        });
        
        // Cleanup resources
        await this.cleanupWorkflowResources(context);
        
        return true;
    }

    /**
     * Get execution status for a workflow
     */
    getExecutionStatus(executionId) {
        const context = this.activeWorkflows.get(executionId);
        if (!context) {
            return null;
        }
        
        return {
            executionId,
            workflowId: context.workflowId,
            state: context.executionState,
            currentStep: context.currentStep,
            totalSteps: context.workflow.steps.length,
            progress: context.currentStep / context.workflow.steps.length,
            startTime: context.startTime,
            errors: context.errors,
            variables: Object.fromEntries(context.variables)
        };
    }

    /**
     * Get all active workflow statuses
     */
    getAllExecutionStatuses() {
        const statuses = [];
        for (const [executionId] of this.activeWorkflows) {
            statuses.push(this.getExecutionStatus(executionId));
        }
        return statuses;
    }

    /**
     * Create execution context for workflow
     */
    createExecutionContext(executionId, workflowDefinition, initialContext) {
        return {
            executionId,
            workflowId: workflowDefinition.id,
            sessionId: initialContext.sessionId || uuidv4(),
            workflow: workflowDefinition,
            variables: new Map(Object.entries(initialContext.variables || {})),
            currentStep: 0,
            executionState: 'running',
            startTime: new Date(),
            endTime: null,
            errors: [],
            results: [],
            checkpoints: [],
            metadata: {
                ...initialContext.metadata,
                engine: 'WorkflowEngine',
                version: '1.0.0'
            }
        };
    }

    /**
     * Process workflow steps sequentially
     */
    async processWorkflowSteps(context) {
        const { workflow } = context;
        const results = [];
        
        while (context.currentStep < workflow.steps.length) {
            // Check if workflow is paused or cancelled
            if (context.executionState === 'paused') {
                return { status: 'paused', results };
            }
            
            if (context.executionState === 'cancelled') {
                return { status: 'cancelled', results };
            }
            
            const step = workflow.steps[context.currentStep];
            
            try {
                // Emit step started event
                this.emit('stepStarted', {
                    executionId: context.executionId,
                    step,
                    stepIndex: context.currentStep,
                    context
                });
                
                // Execute step (this will be implemented by StepExecutor)
                const stepResult = await this.executeStep(step, context);
                
                // Store step result
                results.push(stepResult);
                context.results.push(stepResult);
                
                // Emit step completed event
                this.emit('stepCompleted', {
                    executionId: context.executionId,
                    step,
                    stepIndex: context.currentStep,
                    result: stepResult,
                    context
                });
                
                // Move to next step
                context.currentStep++;
                
            } catch (error) {
                // Handle step execution error
                const stepError = {
                    stepId: step.id,
                    stepIndex: context.currentStep,
                    type: 'step_error',
                    message: error.message,
                    timestamp: new Date(),
                    stack: error.stack
                };
                
                context.errors.push(stepError);
                
                this.emit('stepFailed', {
                    executionId: context.executionId,
                    step,
                    stepIndex: context.currentStep,
                    error: stepError,
                    context
                });
                
                // Determine if error is recoverable
                if (await this.shouldRetryStep(step, error, context)) {
                    // Retry step (don't increment currentStep)
                    continue;
                } else if (await this.shouldContinueOnError(step, error, context)) {
                    // Continue to next step despite error
                    context.currentStep++;
                    continue;
                } else {
                    // Fatal error - stop execution
                    throw error;
                }
            }
        }
        
        return {
            status: 'completed',
            results,
            executionTime: new Date() - context.startTime,
            totalSteps: workflow.steps.length
        };
    }

    /**
     * Execute individual step (placeholder - will be implemented by StepExecutor)
     */
    async executeStep(step, context) {
        // This is a placeholder that will be replaced by the StepExecutor
        throw new Error('StepExecutor not implemented yet');
    }

    /**
     * Validate workflow definition
     */
    validateWorkflow(workflow) {
        if (!workflow || typeof workflow !== 'object') {
            throw new Error('Invalid workflow definition');
        }
        
        if (!workflow.id || typeof workflow.id !== 'string') {
            throw new Error('Workflow must have a valid id');
        }
        
        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            throw new Error('Workflow must have steps array');
        }
        
        if (workflow.steps.length === 0) {
            throw new Error('Workflow must have at least one step');
        }
        
        // Validate each step
        workflow.steps.forEach((step, index) => {
            if (!step.id || typeof step.id !== 'string') {
                throw new Error(`Step ${index} must have a valid id`);
            }
            
            if (!step.type || typeof step.type !== 'string') {
                throw new Error(`Step ${index} must have a valid type`);
            }
            
            if (!step.action || typeof step.action !== 'string') {
                throw new Error(`Step ${index} must have a valid action`);
            }
        });
        
        return true;
    }

    /**
     * Determine if step should be retried
     */
    async shouldRetryStep(step, error, context) {
        const retryOptions = step.retryOptions || {};
        const maxRetries = retryOptions.maxRetries || this.options.retryAttempts;
        
        // Count current retries for this step
        const stepRetries = context.errors.filter(e => 
            e.stepId === step.id && e.type === 'step_error'
        ).length;
        
        return stepRetries < maxRetries && this.isRetryableError(error);
    }

    /**
     * Determine if execution should continue despite error
     */
    async shouldContinueOnError(step, error, context) {
        return step.continueOnError === true;
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'timeout',
            'network',
            'element_not_found',
            'page_load_error'
        ];
        
        return retryableErrors.some(type => 
            error.message.toLowerCase().includes(type)
        );
    }

    /**
     * Cleanup workflow resources
     */
    async cleanupWorkflowResources(context) {
        // Cleanup any resources associated with the workflow
        // This will be expanded as needed
        return true;
    }
}

module.exports = WorkflowEngine;