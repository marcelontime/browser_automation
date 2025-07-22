const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * 🎯 EXECUTION PROGRESS MANAGER
 * 
 * Manages automation execution state, progress tracking, and real-time updates
 */
class ExecutionProgressManager extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            maxConcurrentExecutions: options.maxConcurrentExecutions || 10,
            executionTimeout: options.executionTimeout || 300000, // 5 minutes
            progressUpdateInterval: options.progressUpdateInterval || 1000, // 1 second
            ...options
        };
        
        // Active executions storage
        this.activeExecutions = new Map();
        this.executionHistory = new Map();
        
        // WebSocket clients for broadcasting
        this.connectedClients = new Set();
        
        // Cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupCompletedExecutions();
        }, 60000); // Clean up every minute
    }

    /**
     * Register a WebSocket client for progress updates
     */
    addClient(ws) {
        this.connectedClients.add(ws);
        
        // Remove client when connection closes
        ws.on('close', () => {
            this.connectedClients.delete(ws);
        });
        
        ws.on('error', () => {
            this.connectedClients.delete(ws);
        });
    }

    /**
     * Start tracking a new automation execution
     */
    startExecution(automationId, sessionId, options = {}) {
        const executionId = uuidv4();
        
        const executionContext = {
            executionId,
            automationId,
            sessionId,
            status: 'pending',
            currentStep: 0,
            totalSteps: options.totalSteps || 0,
            startTime: new Date(),
            endTime: null,
            variables: options.variables || {},
            results: [],
            errors: [],
            logs: [],
            metadata: {
                automationName: options.automationName || 'Unknown',
                userAgent: options.userAgent || 'Unknown',
                ...options.metadata
            }
        };
        
        // Store active execution
        this.activeExecutions.set(executionId, executionContext);
        
        // Emit started event
        this.emit('executionStarted', {
            executionId,
            automationId,
            sessionId,
            context: executionContext
        });
        
        // Broadcast to connected clients
        this.broadcastUpdate({
            type: 'execution_started',
            executionId,
            automationId,
            sessionId,
            context: this.getPublicExecutionContext(executionContext)
        });
        
        console.log(`🎯 Started execution tracking: ${executionId} for automation ${automationId}`);
        
        return executionId;
    }

    /**
     * Update execution progress
     */
    updateProgress(executionId, stepIndex, stepResult = {}) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            console.warn(`⚠️ Execution context not found: ${executionId}`);
            return false;
        }
        
        // Update context
        context.currentStep = stepIndex;
        context.status = 'running';
        
        // Add step result if provided
        if (stepResult && Object.keys(stepResult).length > 0) {
            const result = {
                stepIndex,
                timestamp: new Date(),
                ...stepResult
            };
            context.results.push(result);
        }
        
        // Calculate progress percentage
        const progress = context.totalSteps > 0 ? 
            Math.round((stepIndex / context.totalSteps) * 100) : 0;
        
        // Emit progress event
        this.emit('executionProgress', {
            executionId,
            stepIndex,
            progress,
            stepResult,
            context
        });
        
        // Broadcast to connected clients
        this.broadcastUpdate({
            type: 'execution_progress',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            currentStep: stepIndex,
            totalSteps: context.totalSteps,
            progress,
            stepResult,
            status: context.status
        });
        
        return true;
    }

    /**
     * Update total steps for an execution (when initial navigation is added)
     */
    updateTotalSteps(executionId, newTotalSteps) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            console.warn(`⚠️ Execution context not found: ${executionId}`);
            return false;
        }
        
        console.log(`📊 Updating total steps for ${executionId}: ${context.totalSteps} → ${newTotalSteps}`);
        context.totalSteps = newTotalSteps;
        
        // Recalculate progress with new total
        const progress = context.totalSteps > 0 ? 
            Math.round((context.currentStep / context.totalSteps) * 100) : 0;
        
        // Broadcast updated context
        this.broadcastUpdate({
            type: 'execution_total_steps_updated',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            totalSteps: newTotalSteps,
            currentStep: context.currentStep,
            progress,
            status: context.status
        });
        
        return true;
    }

    /**
     * Add execution log entry
     */
    addLog(executionId, logEntry) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            return false;
        }
        
        const log = {
            timestamp: new Date(),
            level: logEntry.level || 'info',
            message: logEntry.message,
            data: logEntry.data || {},
            stepIndex: context.currentStep
        };
        
        context.logs.push(log);
        
        // Broadcast log update
        this.broadcastUpdate({
            type: 'execution_log',
            executionId,
            log
        });
        
        return true;
    }

    /**
     * Add execution error
     */
    addError(executionId, error) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            return false;
        }
        
        const errorEntry = {
            timestamp: new Date(),
            stepIndex: context.currentStep,
            message: error.message || 'Unknown error',
            stack: error.stack,
            type: error.type || 'execution_error',
            recoverable: error.recoverable || false
        };
        
        context.errors.push(errorEntry);
        
        // Emit error event
        this.emit('executionError', {
            executionId,
            error: errorEntry,
            context
        });
        
        // Broadcast error
        this.broadcastUpdate({
            type: 'execution_error',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            error: errorEntry
        });
        
        return true;
    }

    /**
     * Pause execution
     */
    pauseExecution(executionId) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            return false;
        }
        
        if (context.status !== 'running') {
            return false;
        }
        
        context.status = 'paused';
        context.pausedAt = new Date();
        
        // Emit paused event
        this.emit('executionPaused', {
            executionId,
            context
        });
        
        // Broadcast pause
        this.broadcastUpdate({
            type: 'execution_paused',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            pausedAt: context.pausedAt
        });
        
        console.log(`⏸️ Paused execution: ${executionId}`);
        return true;
    }

    /**
     * Resume execution
     */
    resumeExecution(executionId) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            return false;
        }
        
        if (context.status !== 'paused') {
            return false;
        }
        
        context.status = 'running';
        context.resumedAt = new Date();
        
        // Emit resumed event
        this.emit('executionResumed', {
            executionId,
            context
        });
        
        // Broadcast resume
        this.broadcastUpdate({
            type: 'execution_resumed',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            resumedAt: context.resumedAt
        });
        
        console.log(`▶️ Resumed execution: ${executionId}`);
        return true;
    }

    /**
     * Stop execution
     */
    stopExecution(executionId, reason = 'user_requested') {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            return false;
        }
        
        context.status = 'cancelled';
        context.endTime = new Date();
        context.cancellationReason = reason;
        
        // Emit stopped event
        this.emit('executionStopped', {
            executionId,
            reason,
            context
        });
        
        // Broadcast stop
        this.broadcastUpdate({
            type: 'execution_stopped',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            reason,
            endTime: context.endTime
        });
        
        console.log(`🛑 Stopped execution: ${executionId} (${reason})`);
        return true;
    }

    /**
     * Complete execution successfully
     */
    completeExecution(executionId, result = {}) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            return false;
        }
        
        context.status = 'completed';
        context.endTime = new Date();
        context.finalResult = result;
        
        // Calculate execution duration
        const duration = context.endTime - context.startTime;
        context.duration = duration;
        
        // Move to history
        this.executionHistory.set(executionId, { ...context });
        
        // Emit completed event
        this.emit('executionCompleted', {
            executionId,
            result,
            duration,
            context
        });
        
        // Broadcast completion
        this.broadcastUpdate({
            type: 'execution_completed',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            result,
            duration,
            endTime: context.endTime,
            successfulSteps: context.results.filter(r => r.success !== false).length,
            totalSteps: context.totalSteps
        });
        
        console.log(`✅ Completed execution: ${executionId} in ${duration}ms`);
        return true;
    }

    /**
     * Fail execution
     */
    failExecution(executionId, error) {
        const context = this.activeExecutions.get(executionId);
        if (!context) {
            return false;
        }
        
        context.status = 'failed';
        context.endTime = new Date();
        context.failureReason = error.message || 'Unknown error';
        
        // Add final error
        this.addError(executionId, error);
        
        // Calculate execution duration
        const duration = context.endTime - context.startTime;
        context.duration = duration;
        
        // Move to history
        this.executionHistory.set(executionId, { ...context });
        
        // Emit failed event
        this.emit('executionFailed', {
            executionId,
            error,
            duration,
            context
        });
        
        // Broadcast failure
        this.broadcastUpdate({
            type: 'execution_failed',
            executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            error: {
                message: error.message,
                type: error.type || 'execution_error'
            },
            duration,
            endTime: context.endTime
        });
        
        console.log(`❌ Failed execution: ${executionId} - ${error.message}`);
        return true;
    }

    /**
     * Get execution status
     */
    getExecutionStatus(executionId) {
        const context = this.activeExecutions.get(executionId) || 
                       this.executionHistory.get(executionId);
        
        if (!context) {
            return null;
        }
        
        return this.getPublicExecutionContext(context);
    }

    /**
     * Get all active executions
     */
    getActiveExecutions() {
        const executions = [];
        for (const [executionId, context] of this.activeExecutions) {
            executions.push(this.getPublicExecutionContext(context));
        }
        return executions;
    }

    /**
     * Get execution history
     */
    getExecutionHistory(limit = 50) {
        const history = [];
        let count = 0;
        
        for (const [executionId, context] of this.executionHistory) {
            if (count >= limit) break;
            history.push(this.getPublicExecutionContext(context));
            count++;
        }
        
        return history.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }

    /**
     * Get public execution context (without sensitive data)
     */
    getPublicExecutionContext(context) {
        return {
            executionId: context.executionId,
            automationId: context.automationId,
            sessionId: context.sessionId,
            status: context.status,
            currentStep: context.currentStep,
            totalSteps: context.totalSteps,
            progress: context.totalSteps > 0 && context.currentStep > 0 ? 
                Math.round((context.currentStep / context.totalSteps) * 100) : 0,
            startTime: context.startTime.toISOString(),
            endTime: context.endTime ? context.endTime.toISOString() : undefined,
            duration: context.duration,
            successfulSteps: context.results.filter(r => r.success !== false).length,
            errorCount: context.errors.length,
            metadata: {
                automationName: context.metadata.automationName || 'Unknown',
                hasVariables: Object.keys(context.variables).length > 0,
                userAgent: context.metadata.userAgent,
                ...context.metadata
            }
        };
    }

    /**
     * Broadcast update to all connected clients
     */
    broadcastUpdate(message) {
        const messageStr = JSON.stringify(message);
        
        for (const client of this.connectedClients) {
            try {
                // Add null check before accessing readyState
                if (client && client.readyState === 1) { // WebSocket.OPEN
                    client.send(messageStr);
                }
            } catch (error) {
                console.error('Error broadcasting to client:', error.message);
                this.connectedClients.delete(client);
            }
        }
    }

    /**
     * Clean up completed executions from active list
     */
    cleanupCompletedExecutions() {
        const now = new Date();
        const cleanupThreshold = 5 * 60 * 1000; // 5 minutes
        
        for (const [executionId, context] of this.activeExecutions) {
            if (context.status === 'completed' || context.status === 'failed' || context.status === 'cancelled') {
                if (context.endTime && (now - context.endTime) > cleanupThreshold) {
                    // Move to history if not already there
                    if (!this.executionHistory.has(executionId)) {
                        this.executionHistory.set(executionId, { ...context });
                    }
                    
                    // Remove from active executions
                    this.activeExecutions.delete(executionId);
                    console.log(`🧹 Cleaned up completed execution: ${executionId}`);
                }
            }
        }
        
        // Limit history size
        if (this.executionHistory.size > 1000) {
            const entries = Array.from(this.executionHistory.entries());
            entries.sort((a, b) => new Date(b[1].startTime) - new Date(a[1].startTime));
            
            // Keep only the most recent 1000 entries
            this.executionHistory.clear();
            for (let i = 0; i < 1000; i++) {
                this.executionHistory.set(entries[i][0], entries[i][1]);
            }
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.activeExecutions.clear();
        this.connectedClients.clear();
        this.removeAllListeners();
    }
}

module.exports = ExecutionProgressManager;