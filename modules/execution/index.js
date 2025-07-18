/**
 * 🎯 EXECUTION MODULE
 * 
 * Automation execution management and progress tracking
 */

const ExecutionProgressManager = require('./progress-manager');
const {
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
} = require('./execution-context');

module.exports = {
    ExecutionProgressManager,
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