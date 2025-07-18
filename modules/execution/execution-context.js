/**
 * 🎯 EXECUTION CONTEXT MODELS
 * 
 * Data models and utilities for automation execution tracking
 */

/**
 * Execution status enumeration
 */
const ExecutionStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * Step result status enumeration
 */
const StepStatus = {
    SUCCESS: 'success',
    FAILED: 'failed',
    SKIPPED: 'skipped',
    RETRYING: 'retrying'
};

/**
 * Error types enumeration
 */
const ErrorType = {
    NETWORK_ERROR: 'network_error',
    ELEMENT_NOT_FOUND: 'element_not_found',
    PAGE_LOAD_ERROR: 'page_load_error',
    VALIDATION_ERROR: 'validation_error',
    TIMEOUT_ERROR: 'timeout_error',
    SCRIPT_ERROR: 'script_error',
    CRITICAL_ERROR: 'critical_error'
};

/**
 * Create a new execution context
 */
function createExecutionContext(automationId, sessionId, options = {}) {
    return {
        executionId: options.executionId || require('uuid').v4(),
        automationId,
        sessionId,
        status: ExecutionStatus.PENDING,
        currentStep: 0,
        totalSteps: options.totalSteps || 0,
        startTime: new Date(),
        endTime: null,
        duration: null,
        variables: options.variables || {},
        results: [],
        errors: [],
        logs: [],
        screenshots: [],
        metadata: {
            automationName: options.automationName || 'Unknown',
            userAgent: options.userAgent || 'Unknown',
            browserVersion: options.browserVersion || 'Unknown',
            ...options.metadata
        },
        // Control flags
        pausedAt: null,
        resumedAt: null,
        cancellationReason: null,
        failureReason: null,
        finalResult: null
    };
}

/**
 * Create a step result entry
 */
function createStepResult(stepIndex, stepData = {}) {
    return {
        stepIndex,
        stepId: stepData.stepId || `step_${stepIndex}`,
        action: stepData.action || 'unknown',
        status: stepData.status || StepStatus.SUCCESS,
        startTime: stepData.startTime || new Date(),
        endTime: stepData.endTime || new Date(),
        duration: stepData.duration || 0,
        screenshot: stepData.screenshot || null,
        extractedData: stepData.extractedData || null,
        error: stepData.error || null,
        retryCount: stepData.retryCount || 0,
        metadata: stepData.metadata || {}
    };
}

/**
 * Create an error entry
 */
function createErrorEntry(error, stepIndex = null) {
    return {
        timestamp: new Date(),
        stepIndex,
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        type: error.type || ErrorType.SCRIPT_ERROR,
        recoverable: error.recoverable !== undefined ? error.recoverable : true,
        retryCount: error.retryCount || 0,
        metadata: error.metadata || {}
    };
}

/**
 * Create a log entry
 */
function createLogEntry(message, level = 'info', data = {}) {
    return {
        timestamp: new Date(),
        level,
        message,
        data,
        stepIndex: data.stepIndex || null
    };
}

/**
 * Validate execution context
 */
function validateExecutionContext(context) {
    const errors = [];
    
    if (!context.executionId) {
        errors.push('Missing executionId');
    }
    
    if (!context.automationId) {
        errors.push('Missing automationId');
    }
    
    if (!context.sessionId) {
        errors.push('Missing sessionId');
    }
    
    if (!Object.values(ExecutionStatus).includes(context.status)) {
        errors.push(`Invalid status: ${context.status}`);
    }
    
    if (typeof context.currentStep !== 'number' || context.currentStep < 0) {
        errors.push('Invalid currentStep');
    }
    
    if (typeof context.totalSteps !== 'number' || context.totalSteps < 0) {
        errors.push('Invalid totalSteps');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Calculate execution progress
 */
function calculateProgress(context) {
    if (context.totalSteps === 0) {
        return 0;
    }
    
    return Math.round((context.currentStep / context.totalSteps) * 100);
}

/**
 * Get execution summary
 */
function getExecutionSummary(context) {
    const progress = calculateProgress(context);
    const successfulSteps = context.results.filter(r => r.status === StepStatus.SUCCESS).length;
    const failedSteps = context.results.filter(r => r.status === StepStatus.FAILED).length;
    const skippedSteps = context.results.filter(r => r.status === StepStatus.SKIPPED).length;
    
    return {
        executionId: context.executionId,
        automationId: context.automationId,
        status: context.status,
        progress,
        currentStep: context.currentStep,
        totalSteps: context.totalSteps,
        successfulSteps,
        failedSteps,
        skippedSteps,
        errorCount: context.errors.length,
        duration: context.duration,
        startTime: context.startTime,
        endTime: context.endTime,
        hasVariables: Object.keys(context.variables).length > 0
    };
}

/**
 * Check if execution is active
 */
function isExecutionActive(context) {
    return [ExecutionStatus.PENDING, ExecutionStatus.RUNNING, ExecutionStatus.PAUSED]
        .includes(context.status);
}

/**
 * Check if execution is completed
 */
function isExecutionCompleted(context) {
    return [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED]
        .includes(context.status);
}

/**
 * Check if execution can be paused
 */
function canPauseExecution(context) {
    return context.status === ExecutionStatus.RUNNING;
}

/**
 * Check if execution can be resumed
 */
function canResumeExecution(context) {
    return context.status === ExecutionStatus.PAUSED;
}

/**
 * Check if execution can be stopped
 */
function canStopExecution(context) {
    return [ExecutionStatus.PENDING, ExecutionStatus.RUNNING, ExecutionStatus.PAUSED]
        .includes(context.status);
}

module.exports = {
    ExecutionStatus,
    StepStatus,
    ErrorType,
    createExecutionContext,
    createStepResult,
    createErrorEntry,
    createLogEntry,
    validateExecutionContext,
    calculateProgress,
    getExecutionSummary,
    isExecutionActive,
    isExecutionCompleted,
    canPauseExecution,
    canResumeExecution,
    canStopExecution
};