/**
 * Execution context for workflow runs
 */
class ExecutionContext {
    constructor(executionId, workflowDefinition, initialContext = {}) {
        this.executionId = executionId;
        this.workflowId = workflowDefinition.id;
        this.sessionId = initialContext.sessionId;
        this.workflow = workflowDefinition;
        
        // Execution state
        this.executionState = 'pending';
        this.currentStep = 0;
        this.startTime = new Date();
        this.endTime = null;
        this.pausedAt = null;
        this.resumedAt = null;
        
        // Variables and data
        this.variables = new Map(Object.entries(initialContext.variables || {}));
        this.results = [];
        this.errors = [];
        this.checkpoints = [];
        
        // Metadata
        this.metadata = {
            ...initialContext.metadata,
            engine: 'WorkflowEngine',
            version: '1.0.0',
            userAgent: initialContext.userAgent,
            browserInfo: initialContext.browserInfo
        };
        
        // Runtime state
        this.retryCount = 0;
        this.lastCheckpoint = null;
        this.cancellationReason = null;
    }

    /**
     * Get variable value
     */
    getVariable(name, defaultValue = null) {
        return this.variables.get(name) || defaultValue;
    }

    /**
     * Set variable value
     */
    setVariable(name, value) {
        this.variables.set(name, value);
        return this;
    }

    /**
     * Get all variables as object
     */
    getAllVariables() {
        return Object.fromEntries(this.variables);
    }

    /**
     * Update multiple variables
     */
    updateVariables(variableMap) {
        for (const [name, value] of Object.entries(variableMap)) {
            this.variables.set(name, value);
        }
        return this;
    }

    /**
     * Add execution result
     */
    addResult(stepId, result) {
        const stepResult = {
            stepId,
            stepIndex: this.currentStep,
            result,
            timestamp: new Date(),
            executionTime: result.executionTime || 0
        };
        
        this.results.push(stepResult);
        return stepResult;
    }

    /**
     * Add execution error
     */
    addError(stepId, error, type = 'step_error') {
        const errorRecord = {
            stepId,
            stepIndex: this.currentStep,
            type,
            message: error.message || error,
            stack: error.stack,
            timestamp: new Date()
        };
        
        this.errors.push(errorRecord);
        return errorRecord;
    }

    /**
     * Create checkpoint for state recovery
     */
    createCheckpoint(description = '') {
        const checkpoint = {
            id: `checkpoint_${Date.now()}`,
            stepIndex: this.currentStep,
            variables: new Map(this.variables),
            timestamp: new Date(),
            description,
            state: {
                executionState: this.executionState,
                retryCount: this.retryCount
            }
        };
        
        this.checkpoints.push(checkpoint);
        this.lastCheckpoint = checkpoint;
        
        return checkpoint;
    }

    /**
     * Restore from checkpoint
     */
    restoreFromCheckpoint(checkpointId) {
        const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);
        if (!checkpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }
        
        this.currentStep = checkpoint.stepIndex;
        this.variables = new Map(checkpoint.variables);
        this.executionState = checkpoint.state.executionState;
        this.retryCount = checkpoint.state.retryCount;
        
        return checkpoint;
    }

    /**
     * Get execution progress
     */
    getProgress() {
        const totalSteps = this.workflow.steps.length;
        const completedSteps = this.currentStep;
        
        return {
            current: completedSteps,
            total: totalSteps,
            percentage: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0,
            remaining: totalSteps - completedSteps
        };
    }

    /**
     * Get execution duration
     */
    getExecutionDuration() {
        const endTime = this.endTime || new Date();
        return endTime - this.startTime;
    }

    /**
     * Get current step information
     */
    getCurrentStep() {
        if (this.currentStep >= this.workflow.steps.length) {
            return null;
        }
        
        return {
            ...this.workflow.steps[this.currentStep],
            index: this.currentStep,
            isLast: this.currentStep === this.workflow.steps.length - 1
        };
    }

    /**
     * Get next step information
     */
    getNextStep() {
        const nextIndex = this.currentStep + 1;
        if (nextIndex >= this.workflow.steps.length) {
            return null;
        }
        
        return {
            ...this.workflow.steps[nextIndex],
            index: nextIndex,
            isLast: nextIndex === this.workflow.steps.length - 1
        };
    }

    /**
     * Check if execution is complete
     */
    isComplete() {
        return this.currentStep >= this.workflow.steps.length || 
               this.executionState === 'completed';
    }

    /**
     * Check if execution is paused
     */
    isPaused() {
        return this.executionState === 'paused';
    }

    /**
     * Check if execution is cancelled
     */
    isCancelled() {
        return this.executionState === 'cancelled';
    }

    /**
     * Check if execution has errors
     */
    hasErrors() {
        return this.errors.length > 0;
    }

    /**
     * Get summary of execution
     */
    getSummary() {
        return {
            executionId: this.executionId,
            workflowId: this.workflowId,
            state: this.executionState,
            progress: this.getProgress(),
            duration: this.getExecutionDuration(),
            startTime: this.startTime,
            endTime: this.endTime,
            errorCount: this.errors.length,
            resultCount: this.results.length,
            checkpointCount: this.checkpoints.length,
            variables: this.getAllVariables()
        };
    }

    /**
     * Serialize context for storage
     */
    serialize() {
        return {
            executionId: this.executionId,
            workflowId: this.workflowId,
            sessionId: this.sessionId,
            workflow: this.workflow,
            executionState: this.executionState,
            currentStep: this.currentStep,
            startTime: this.startTime.toISOString(),
            endTime: this.endTime?.toISOString(),
            pausedAt: this.pausedAt?.toISOString(),
            resumedAt: this.resumedAt?.toISOString(),
            variables: Object.fromEntries(this.variables),
            results: this.results,
            errors: this.errors,
            checkpoints: this.checkpoints.map(cp => ({
                ...cp,
                timestamp: cp.timestamp.toISOString(),
                variables: Object.fromEntries(cp.variables)
            })),
            metadata: this.metadata,
            retryCount: this.retryCount,
            cancellationReason: this.cancellationReason
        };
    }

    /**
     * Deserialize context from storage
     */
    static deserialize(data) {
        const context = new ExecutionContext(
            data.executionId,
            data.workflow,
            {
                sessionId: data.sessionId,
                variables: data.variables,
                metadata: data.metadata
            }
        );
        
        context.executionState = data.executionState;
        context.currentStep = data.currentStep;
        context.startTime = new Date(data.startTime);
        context.endTime = data.endTime ? new Date(data.endTime) : null;
        context.pausedAt = data.pausedAt ? new Date(data.pausedAt) : null;
        context.resumedAt = data.resumedAt ? new Date(data.resumedAt) : null;
        context.results = data.results || [];
        context.errors = data.errors || [];
        context.retryCount = data.retryCount || 0;
        context.cancellationReason = data.cancellationReason;
        
        // Restore checkpoints
        context.checkpoints = (data.checkpoints || []).map(cp => ({
            ...cp,
            timestamp: new Date(cp.timestamp),
            variables: new Map(Object.entries(cp.variables))
        }));
        
        return context;
    }
}

module.exports = ExecutionContext;