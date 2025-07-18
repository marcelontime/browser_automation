/**
 * Workflow system integration methods for StagehandAutomationEngine
 */

/**
 * Initialize workflow system components
 */
async function initializeWorkflowSystem() {
    try {
        console.log('🔧 Initializing workflow system...');
        
        // Initialize timing controller
        this.timingController = new (require('./timing-controller'))({
            defaultTimeout: 30000,
            pageLoadTimeout: 60000,
            adaptiveTimeouts: true
        });
        
        // Initialize step executor
        this.stepExecutor = new (require('./step-executor'))({
            defaultTimeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000
        });
        
        // Initialize workflow parser
        this.workflowParser = new (require('./workflow-parser'))();
        
        // Initialize workflow engine
        this.workflowEngine = new (require('./workflow-engine'))({
            maxConcurrentWorkflows: 3,
            defaultTimeout: 30000,
            retryAttempts: 3
        });
        
        // Register step handlers
        await this.registerStepHandlers();
        
        // Set up workflow event listeners
        this.setupWorkflowEventListeners();
        
        console.log('✅ Workflow system initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Failed to initialize workflow system:', error.message);
        throw error;
    }
}

/**
 * Register step handlers with the step executor
 */
async function registerStepHandlers() {
    const NavigationHandler = require('./handlers/navigation-handler');
    const InteractionHandler = require('./handlers/interaction-handler');
    const ExtractionHandler = require('./handlers/extraction-handler');
    const ValidationHandler = require('./handlers/validation-handler');
    const ControlHandler = require('./handlers/control-handler');
    
    // Create handler instances with automation engine context
    const navigationHandler = new NavigationHandler({
        defaultTimeout: 30000,
        waitForLoad: true
    });
    
    const interactionHandler = new InteractionHandler({
        defaultTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    });
    
    const extractionHandler = new ExtractionHandler({
        defaultTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    });
    
    const validationHandler = new ValidationHandler({
        defaultTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    });
    
    const controlHandler = new ControlHandler({
        defaultTimeout: 30000,
        maxLoopIterations: 1000
    });
    
    // Register handlers with step executor
    this.stepExecutor.registerStepHandler('navigation', navigationHandler);
    this.stepExecutor.registerStepHandler('interaction', interactionHandler);
    this.stepExecutor.registerStepHandler('extraction', extractionHandler);
    this.stepExecutor.registerStepHandler('validation', validationHandler);
    this.stepExecutor.registerStepHandler('control', controlHandler);
    
    // Override step executor's executeStep method to integrate with automation engine
    const originalExecuteStep = this.stepExecutor.executeStep.bind(this.stepExecutor);
    this.stepExecutor.executeStep = async (step, context) => {
        // Enhance context with automation engine
        const enhancedContext = {
            ...context,
            automationEngine: this,
            browser: this,
            page: this.page,
            variables: this.variables,
            getVariable: (name) => this.variables.get(name),
            setVariable: (name, value) => this.variables.set(name, value),
            getAllVariables: () => Object.fromEntries(this.variables)
        };
        
        return await originalExecuteStep(step, enhancedContext);
    };
    
    console.log('✅ Step handlers registered successfully');
}

/**
 * Set up workflow event listeners
 */
function setupWorkflowEventListeners() {
    // Workflow engine events
    this.workflowEngine.on('workflowStarted', (event) => {
        console.log(`🚀 Workflow started: ${event.workflowId} (${event.executionId})`);
        this.activeWorkflows.set(event.executionId, event.context);
    });
    
    this.workflowEngine.on('workflowCompleted', (event) => {
        console.log(`✅ Workflow completed: ${event.executionId}`);
        this.activeWorkflows.delete(event.executionId);
    });
    
    this.workflowEngine.on('workflowFailed', (event) => {
        console.log(`❌ Workflow failed: ${event.executionId} - ${event.error.message}`);
        this.activeWorkflows.delete(event.executionId);
    });
    
    this.workflowEngine.on('workflowPaused', (event) => {
        console.log(`⏸️ Workflow paused: ${event.executionId}`);
    });
    
    this.workflowEngine.on('workflowResumed', (event) => {
        console.log(`▶️ Workflow resumed: ${event.executionId}`);
    });
    
    this.workflowEngine.on('stepStarted', (event) => {
        console.log(`🔄 Step started: ${event.step.id} (${event.step.action})`);
    });
    
    this.workflowEngine.on('stepCompleted', (event) => {
        console.log(`✅ Step completed: ${event.step.id}`);
    });
    
    this.workflowEngine.on('stepFailed', (event) => {
        console.log(`❌ Step failed: ${event.step.id} - ${event.error.message}`);
    });
    
    // Step executor events
    this.stepExecutor.on('stepStarted', (event) => {
        console.log(`🎯 Executing step: ${event.stepId} (${event.step.type}:${event.step.action})`);
    });
    
    this.stepExecutor.on('stepCompleted', (event) => {
        console.log(`✅ Step execution completed: ${event.stepId} in ${event.executionTime}ms`);
    });
    
    this.stepExecutor.on('stepFailed', (event) => {
        console.log(`❌ Step execution failed: ${event.stepId} - ${event.error.message}`);
    });
    
    // Timing controller events
    this.timingController.on('pageLoadStart', (event) => {
        console.log(`🌐 Page load started: ${event.url}`);
    });
    
    this.timingController.on('pageLoadComplete', (event) => {
        console.log(`✅ Page loaded: ${event.url} in ${event.loadTime}ms`);
    });
    
    this.timingController.on('elementWaitStart', (event) => {
        console.log(`⏳ Waiting for element: ${event.selector}`);
    });
    
    this.timingController.on('elementWaitComplete', (event) => {
        console.log(`✅ Element ready: ${event.selector} in ${event.waitTime}ms`);
    });
}

/**
 * Execute workflow from definition
 */
async function executeWorkflow(workflowDefinition, context = {}) {
    if (!this.workflowEngine) {
        throw new Error('Workflow engine not initialized');
    }
    
    try {
        // Parse workflow if it's a string
        let workflow = workflowDefinition;
        if (typeof workflowDefinition === 'string') {
            workflow = this.workflowParser.parseWorkflow(workflowDefinition);
        }
        
        // Validate workflow
        const validation = this.workflowParser.validateWorkflow(workflow);
        if (!validation.valid) {
            throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
        }
        
        // Create execution context
        const executionContext = {
            sessionId: context.sessionId || Date.now().toString(),
            variables: new Map(Object.entries(context.variables || {})),
            automationEngine: this,
            ...context
        };
        
        // Execute workflow
        const result = await this.workflowEngine.executeWorkflow(workflow, executionContext);
        
        return {
            success: true,
            workflowId: workflow.id,
            result,
            executionTime: result.executionTime
        };
        
    } catch (error) {
        console.error('❌ Workflow execution failed:', error.message);
        throw error;
    }
}

/**
 * Convert automation steps to workflow format
 */
function convertAutomationToWorkflow(automation) {
    if (!this.workflowParser) {
        throw new Error('Workflow parser not initialized');
    }
    
    return this.workflowParser.parseAutomationFormat(automation);
}

/**
 * Execute automation as workflow
 */
async function executeAutomationAsWorkflow(automation, context = {}) {
    try {
        // Convert automation to workflow format
        const workflow = this.convertAutomationToWorkflow(automation);
        
        // Execute as workflow
        return await this.executeWorkflow(workflow, context);
        
    } catch (error) {
        console.error('❌ Automation workflow execution failed:', error.message);
        throw error;
    }
}

/**
 * Get active workflow statuses
 */
function getActiveWorkflows() {
    if (!this.workflowEngine) {
        return [];
    }
    
    return this.workflowEngine.getAllExecutionStatuses();
}

/**
 * Pause workflow execution
 */
async function pauseWorkflow(executionId) {
    if (!this.workflowEngine) {
        throw new Error('Workflow engine not initialized');
    }
    
    return await this.workflowEngine.pauseExecution(executionId);
}

/**
 * Resume workflow execution
 */
async function resumeWorkflow(executionId) {
    if (!this.workflowEngine) {
        throw new Error('Workflow engine not initialized');
    }
    
    return await this.workflowEngine.resumeExecution(executionId);
}

/**
 * Stop workflow execution
 */
async function stopWorkflow(executionId, reason = 'user_requested') {
    if (!this.workflowEngine) {
        throw new Error('Workflow engine not initialized');
    }
    
    return await this.workflowEngine.stopExecution(executionId, reason);
}

/**
 * Get workflow execution status
 */
function getWorkflowStatus(executionId) {
    if (!this.workflowEngine) {
        return null;
    }
    
    return this.workflowEngine.getExecutionStatus(executionId);
}

/**
 * Create workflow from recorded actions
 */
function createWorkflowFromRecording(recordedActions, metadata = {}) {
    const workflow = {
        id: `recorded_${Date.now()}`,
        name: metadata.name || 'Recorded Workflow',
        description: metadata.description || 'Workflow created from recorded actions',
        version: '1.0.0',
        steps: [],
        variables: metadata.variables || [],
        settings: {
            timeout: 30000,
            retryAttempts: 3,
            continueOnError: false
        },
        metadata: {
            created: new Date().toISOString(),
            source: 'recording',
            ...metadata
        }
    };
    
    // Convert recorded actions to workflow steps
    recordedActions.forEach((action, index) => {
        const step = {
            id: `step_${index + 1}`,
            type: this.mapActionTypeToStepType(action.type),
            name: action.description || `Step ${index + 1}`,
            action: action.action || action.type,
            target: action.selector || action.target,
            value: action.value || action.text,
            timeout: action.timeout || 30000,
            retryOptions: {
                maxRetries: 3,
                retryDelay: 1000
            },
            conditions: [],
            continueOnError: false,
            metadata: {
                originalAction: action,
                recordedAt: action.timestamp
            }
        };
        
        workflow.steps.push(step);
    });
    
    return workflow;
}

/**
 * Map action types to workflow step types
 */
function mapActionTypeToStepType(actionType) {
    const typeMapping = {
        'navigate': 'navigation',
        'click': 'interaction',
        'type': 'interaction',
        'select': 'interaction',
        'hover': 'interaction',
        'scroll': 'interaction',
        'extract': 'extraction',
        'validate': 'validation',
        'wait': 'wait',
        'delay': 'control'
    };
    
    return typeMapping[actionType] || 'interaction';
}

/**
 * Get workflow system statistics
 */
function getWorkflowStats() {
    return {
        workflowEngine: this.workflowEngine ? {
            activeWorkflows: this.workflowEngine.activeWorkflows.size,
            totalExecuted: this.workflowEngine.totalExecuted || 0
        } : null,
        stepExecutor: this.stepExecutor ? this.stepExecutor.getExecutionStats() : null,
        timingController: this.timingController ? this.timingController.getTimingStats() : null,
        activeWorkflows: this.activeWorkflows.size
    };
}

module.exports = {
    initializeWorkflowSystem,
    registerStepHandlers,
    setupWorkflowEventListeners,
    executeWorkflow,
    convertAutomationToWorkflow,
    executeAutomationAsWorkflow,
    getActiveWorkflows,
    pauseWorkflow,
    resumeWorkflow,
    stopWorkflow,
    getWorkflowStatus,
    createWorkflowFromRecording,
    mapActionTypeToStepType,
    getWorkflowStats
};