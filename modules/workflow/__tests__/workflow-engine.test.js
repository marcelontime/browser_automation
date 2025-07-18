const WorkflowEngine = require('../workflow-engine');
const ExecutionContext = require('../execution-context');

describe('WorkflowEngine', () => {
    let engine;
    let mockWorkflow;

    beforeEach(() => {
        engine = new WorkflowEngine();
        mockWorkflow = {
            id: 'test-workflow',
            name: 'Test Workflow',
            steps: [
                {
                    id: 'step1',
                    type: 'navigation',
                    action: 'goto',
                    target: 'https://example.com'
                },
                {
                    id: 'step2',
                    type: 'interaction',
                    action: 'click',
                    target: '#button'
                }
            ]
        };
    });

    afterEach(() => {
        // Cleanup any active workflows
        for (const [executionId] of engine.activeWorkflows) {
            engine.stopExecution(executionId, 'test_cleanup');
        }
    });

    describe('Workflow Validation', () => {
        test('should validate valid workflow', () => {
            expect(() => engine.validateWorkflow(mockWorkflow)).not.toThrow();
        });

        test('should reject workflow without id', () => {
            delete mockWorkflow.id;
            expect(() => engine.validateWorkflow(mockWorkflow)).toThrow('Workflow must have a valid id');
        });

        test('should reject workflow without steps', () => {
            delete mockWorkflow.steps;
            expect(() => engine.validateWorkflow(mockWorkflow)).toThrow('Workflow must have steps array');
        });

        test('should reject workflow with empty steps', () => {
            mockWorkflow.steps = [];
            expect(() => engine.validateWorkflow(mockWorkflow)).toThrow('Workflow must have at least one step');
        });

        test('should reject step without id', () => {
            delete mockWorkflow.steps[0].id;
            expect(() => engine.validateWorkflow(mockWorkflow)).toThrow('Step 0 must have a valid id');
        });

        test('should reject step without type', () => {
            delete mockWorkflow.steps[0].type;
            expect(() => engine.validateWorkflow(mockWorkflow)).toThrow('Step 0 must have a valid type');
        });

        test('should reject step without action', () => {
            delete mockWorkflow.steps[0].action;
            expect(() => engine.validateWorkflow(mockWorkflow)).toThrow('Step 0 must have a valid action');
        });
    });

    describe('Execution Context Creation', () => {
        test('should create execution context with default values', () => {
            const context = engine.createExecutionContext('exec-1', mockWorkflow, {});
            
            expect(context.executionId).toBe('exec-1');
            expect(context.workflowId).toBe('test-workflow');
            expect(context.workflow).toBe(mockWorkflow);
            expect(context.currentStep).toBe(0);
            expect(context.executionState).toBe('running');
            expect(context.variables).toBeInstanceOf(Map);
            expect(context.results).toEqual([]);
            expect(context.errors).toEqual([]);
        });

        test('should create execution context with initial variables', () => {
            const initialContext = {
                variables: { testVar: 'testValue' },
                sessionId: 'session-123'
            };
            
            const context = engine.createExecutionContext('exec-1', mockWorkflow, initialContext);
            
            expect(context.sessionId).toBe('session-123');
            expect(context.variables.get('testVar')).toBe('testValue');
        });
    });

    describe('Workflow Execution Management', () => {
        test('should track active workflows', async () => {
            // Mock the executeStep method to avoid actual execution
            engine.executeStep = jest.fn().mockResolvedValue({ success: true });
            
            const executionPromise = engine.executeWorkflow(mockWorkflow);
            
            // Check that workflow is tracked as active
            expect(engine.activeWorkflows.size).toBe(1);
            
            await executionPromise;
            
            // Check that workflow is removed after completion
            expect(engine.activeWorkflows.size).toBe(0);
        });

        test('should emit workflow events', async () => {
            engine.executeStep = jest.fn().mockResolvedValue({ success: true });
            
            const startedSpy = jest.fn();
            const completedSpy = jest.fn();
            
            engine.on('workflowStarted', startedSpy);
            engine.on('workflowCompleted', completedSpy);
            
            await engine.executeWorkflow(mockWorkflow);
            
            expect(startedSpy).toHaveBeenCalledWith(expect.objectContaining({
                workflowId: 'test-workflow'
            }));
            
            expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({
                result: expect.objectContaining({
                    status: 'completed'
                })
            }));
        });

        test('should handle workflow execution errors', async () => {
            engine.executeStep = jest.fn().mockRejectedValue(new Error('Step failed'));
            
            const failedSpy = jest.fn();
            engine.on('workflowFailed', failedSpy);
            
            await expect(engine.executeWorkflow(mockWorkflow)).rejects.toThrow('Step failed');
            
            expect(failedSpy).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.any(Error)
            }));
        });
    });

    describe('Execution Control', () => {
        test('should pause workflow execution', async () => {
            let resolveStep;
            engine.executeStep = jest.fn(() => new Promise(resolve => {
                resolveStep = resolve;
            }));
            
            const executionPromise = engine.executeWorkflow(mockWorkflow);
            
            // Wait a bit for execution to start
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const executionId = Array.from(engine.activeWorkflows.keys())[0];
            await engine.pauseExecution(executionId);
            
            const status = engine.getExecutionStatus(executionId);
            expect(status.state).toBe('paused');
            
            // Resolve the step to allow cleanup
            resolveStep({ success: true });
            await executionPromise.catch(() => {}); // Ignore errors for cleanup
        });

        test('should resume paused workflow', async () => {
            engine.executeStep = jest.fn().mockResolvedValue({ success: true });
            
            const executionPromise = engine.executeWorkflow(mockWorkflow);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const executionId = Array.from(engine.activeWorkflows.keys())[0];
            await engine.pauseExecution(executionId);
            
            const resumedSpy = jest.fn();
            engine.on('workflowResumed', resumedSpy);
            
            await engine.resumeExecution(executionId);
            
            expect(resumedSpy).toHaveBeenCalled();
            
            await executionPromise;
        });

        test('should stop workflow execution', async () => {
            let resolveStep;
            engine.executeStep = jest.fn(() => new Promise(resolve => {
                resolveStep = resolve;
            }));
            
            const executionPromise = engine.executeWorkflow(mockWorkflow);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const executionId = Array.from(engine.activeWorkflows.keys())[0];
            
            const stoppedSpy = jest.fn();
            engine.on('workflowStopped', stoppedSpy);
            
            await engine.stopExecution(executionId, 'user_requested');
            
            expect(stoppedSpy).toHaveBeenCalledWith(expect.objectContaining({
                reason: 'user_requested'
            }));
            
            // Resolve the step to allow cleanup
            resolveStep({ success: true });
            await executionPromise.catch(() => {}); // Ignore errors for cleanup
        });
    });

    describe('Execution Status', () => {
        test('should return execution status', async () => {
            let resolveStep;
            engine.executeStep = jest.fn(() => new Promise(resolve => {
                resolveStep = resolve;
            }));
            
            const executionPromise = engine.executeWorkflow(mockWorkflow);
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const executionId = Array.from(engine.activeWorkflows.keys())[0];
            const status = engine.getExecutionStatus(executionId);
            
            expect(status).toMatchObject({
                executionId,
                workflowId: 'test-workflow',
                state: 'running',
                currentStep: 0,
                totalSteps: 2,
                progress: 0
            });
            
            // Resolve the step to allow cleanup
            resolveStep({ success: true });
            await executionPromise;
        });

        test('should return null for non-existent workflow', () => {
            const status = engine.getExecutionStatus('non-existent');
            expect(status).toBeNull();
        });

        test('should return all active workflow statuses', async () => {
            engine.executeStep = jest.fn().mockResolvedValue({ success: true });
            
            const workflow2 = { ...mockWorkflow, id: 'test-workflow-2' };
            
            const promise1 = engine.executeWorkflow(mockWorkflow);
            const promise2 = engine.executeWorkflow(workflow2);
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const statuses = engine.getAllExecutionStatuses();
            expect(statuses).toHaveLength(2);
            
            await Promise.all([promise1, promise2]);
        });
    });

    describe('Error Handling', () => {
        test('should determine retryable errors', () => {
            const retryableError = new Error('timeout occurred');
            const nonRetryableError = new Error('invalid selector');
            
            expect(engine.isRetryableError(retryableError)).toBe(true);
            expect(engine.isRetryableError(nonRetryableError)).toBe(false);
        });

        test('should handle step retry logic', async () => {
            const step = {
                id: 'test-step',
                retryOptions: { maxRetries: 2 }
            };
            
            const context = {
                errors: []
            };
            
            const retryableError = new Error('timeout');
            expect(await engine.shouldRetryStep(step, retryableError, context)).toBe(true);
            
            // Add some errors to simulate retries
            context.errors = [
                { stepId: 'test-step', type: 'step_error' },
                { stepId: 'test-step', type: 'step_error' }
            ];
            
            expect(await engine.shouldRetryStep(step, retryableError, context)).toBe(false);
        });
    });
});

describe('ExecutionContext', () => {
    let context;
    let mockWorkflow;

    beforeEach(() => {
        mockWorkflow = {
            id: 'test-workflow',
            name: 'Test Workflow',
            steps: [
                { id: 'step1', type: 'navigation', action: 'goto' },
                { id: 'step2', type: 'interaction', action: 'click' }
            ]
        };
        
        context = new ExecutionContext('exec-1', mockWorkflow, {
            sessionId: 'session-1',
            variables: { testVar: 'testValue' }
        });
    });

    describe('Variable Management', () => {
        test('should get and set variables', () => {
            expect(context.getVariable('testVar')).toBe('testValue');
            expect(context.getVariable('nonExistent', 'default')).toBe('default');
            
            context.setVariable('newVar', 'newValue');
            expect(context.getVariable('newVar')).toBe('newValue');
        });

        test('should update multiple variables', () => {
            context.updateVariables({
                var1: 'value1',
                var2: 'value2'
            });
            
            expect(context.getVariable('var1')).toBe('value1');
            expect(context.getVariable('var2')).toBe('value2');
        });

        test('should get all variables as object', () => {
            context.setVariable('var1', 'value1');
            const allVars = context.getAllVariables();
            
            expect(allVars).toEqual({
                testVar: 'testValue',
                var1: 'value1'
            });
        });
    });

    describe('Results and Errors', () => {
        test('should add execution results', () => {
            const result = context.addResult('step1', { data: 'test' });
            
            expect(result).toMatchObject({
                stepId: 'step1',
                stepIndex: 0,
                result: { data: 'test' }
            });
            
            expect(context.results).toHaveLength(1);
        });

        test('should add execution errors', () => {
            const error = context.addError('step1', new Error('Test error'));
            
            expect(error).toMatchObject({
                stepId: 'step1',
                stepIndex: 0,
                type: 'step_error',
                message: 'Test error'
            });
            
            expect(context.errors).toHaveLength(1);
        });
    });

    describe('Checkpoints', () => {
        test('should create checkpoints', () => {
            context.setVariable('checkpointVar', 'value');
            const checkpoint = context.createCheckpoint('Test checkpoint');
            
            expect(checkpoint).toMatchObject({
                stepIndex: 0,
                description: 'Test checkpoint'
            });
            
            expect(context.checkpoints).toHaveLength(1);
            expect(context.lastCheckpoint).toBe(checkpoint);
        });

        test('should restore from checkpoint', () => {
            context.setVariable('var1', 'original');
            context.currentStep = 1;
            
            const checkpoint = context.createCheckpoint();
            
            // Modify state
            context.setVariable('var1', 'modified');
            context.currentStep = 2;
            
            // Restore
            context.restoreFromCheckpoint(checkpoint.id);
            
            expect(context.getVariable('var1')).toBe('original');
            expect(context.currentStep).toBe(1);
        });
    });

    describe('Progress Tracking', () => {
        test('should calculate progress', () => {
            const progress = context.getProgress();
            
            expect(progress).toEqual({
                current: 0,
                total: 2,
                percentage: 0,
                remaining: 2
            });
            
            context.currentStep = 1;
            const progress2 = context.getProgress();
            
            expect(progress2.percentage).toBe(50);
        });

        test('should get current and next steps', () => {
            const currentStep = context.getCurrentStep();
            expect(currentStep.id).toBe('step1');
            expect(currentStep.index).toBe(0);
            
            const nextStep = context.getNextStep();
            expect(nextStep.id).toBe('step2');
            expect(nextStep.index).toBe(1);
        });

        test('should detect completion', () => {
            expect(context.isComplete()).toBe(false);
            
            context.currentStep = 2;
            expect(context.isComplete()).toBe(true);
        });
    });

    describe('Serialization', () => {
        test('should serialize and deserialize context', () => {
            context.setVariable('testVar2', 'testValue2');
            context.addResult('step1', { data: 'test' });
            context.addError('step1', new Error('Test error'));
            context.createCheckpoint('Test checkpoint');
            
            const serialized = context.serialize();
            const deserialized = ExecutionContext.deserialize(serialized);
            
            expect(deserialized.executionId).toBe(context.executionId);
            expect(deserialized.workflowId).toBe(context.workflowId);
            expect(deserialized.getVariable('testVar2')).toBe('testValue2');
            expect(deserialized.results).toHaveLength(1);
            expect(deserialized.errors).toHaveLength(1);
            expect(deserialized.checkpoints).toHaveLength(1);
        });
    });
});