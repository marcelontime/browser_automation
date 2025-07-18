const StepExecutor = require('../step-executor');
const ExecutionContext = require('../execution-context');

describe('StepExecutor', () => {
    let executor;
    let mockContext;
    let mockStep;
    let mockHandler;

    beforeEach(() => {
        executor = new StepExecutor();
        
        mockContext = {
            getVariable: jest.fn(),
            setVariable: jest.fn(),
            getAllVariables: jest.fn().mockReturnValue({}),
            getCurrentStep: jest.fn().mockReturnValue({ id: 'step1' }),
            workflow: { id: 'test-workflow' }
        };
        
        mockStep = {
            id: 'test-step',
            type: 'test',
            action: 'test-action',
            target: '#test-element'
        };
        
        mockHandler = {
            execute: jest.fn().mockResolvedValue({ success: true, data: 'test-result' })
        };
        
        executor.registerStepHandler('test', mockHandler);
    });

    describe('Step Handler Registration', () => {
        test('should register step handler', () => {
            const newHandler = { execute: jest.fn() };
            executor.registerStepHandler('new-type', newHandler);
            
            expect(executor.stepHandlers.has('new-type')).toBe(true);
            expect(executor.stepHandlers.get('new-type')).toBe(newHandler);
        });

        test('should throw error for invalid handler', () => {
            expect(() => {
                executor.registerStepHandler('invalid', {});
            }).toThrow('Step handler for invalid must have execute method');
        });

        test('should get registered handler', () => {
            const handler = executor.getStepHandler('test');
            expect(handler).toBe(mockHandler);
        });

        test('should throw error for unregistered handler', () => {
            expect(() => {
                executor.getStepHandler('unregistered');
            }).toThrow('No handler registered for step type: unregistered');
        });
    });

    describe('Step Validation', () => {
        test('should validate valid step', async () => {
            await expect(executor.validateStepPreconditions(mockStep, mockContext))
                .resolves.toBe(true);
        });

        test('should reject step without id', async () => {
            delete mockStep.id;
            await expect(executor.validateStepPreconditions(mockStep, mockContext))
                .rejects.toThrow('Step must have a valid id');
        });

        test('should reject step without type', async () => {
            delete mockStep.type;
            await expect(executor.validateStepPreconditions(mockStep, mockContext))
                .rejects.toThrow('Step must have a valid type');
        });

        test('should reject step without action', async () => {
            delete mockStep.action;
            await expect(executor.validateStepPreconditions(mockStep, mockContext))
                .rejects.toThrow('Step must have a valid action');
        });

        test('should reject step with unregistered type', async () => {
            mockStep.type = 'unregistered';
            await expect(executor.validateStepPreconditions(mockStep, mockContext))
                .rejects.toThrow('No handler registered for step type: unregistered');
        });
    });

    describe('Type-Specific Validation', () => {
        test('should validate navigation goto step', async () => {
            const navStep = {
                id: 'nav-step',
                type: 'navigation',
                action: 'goto',
                target: 'https://example.com'
            };
            
            await expect(executor.validateStepTypeSpecific(navStep, mockContext))
                .resolves.toBe(true);
        });

        test('should reject navigation goto without target', async () => {
            const navStep = {
                id: 'nav-step',
                type: 'navigation',
                action: 'goto'
            };
            
            await expect(executor.validateStepTypeSpecific(navStep, mockContext))
                .rejects.toThrow('Navigation goto step requires target URL');
        });

        test('should validate interaction click step', async () => {
            const clickStep = {
                id: 'click-step',
                type: 'interaction',
                action: 'click',
                target: '#button'
            };
            
            await expect(executor.validateStepTypeSpecific(clickStep, mockContext))
                .resolves.toBe(true);
        });

        test('should reject interaction click without target', async () => {
            const clickStep = {
                id: 'click-step',
                type: 'interaction',
                action: 'click'
            };
            
            await expect(executor.validateStepTypeSpecific(clickStep, mockContext))
                .rejects.toThrow('click step requires target selector');
        });

        test('should validate interaction type step', async () => {
            const typeStep = {
                id: 'type-step',
                type: 'interaction',
                action: 'type',
                target: '#input',
                value: 'test text'
            };
            
            await expect(executor.validateStepTypeSpecific(typeStep, mockContext))
                .resolves.toBe(true);
        });

        test('should reject interaction type without value', async () => {
            const typeStep = {
                id: 'type-step',
                type: 'interaction',
                action: 'type',
                target: '#input'
            };
            
            await expect(executor.validateStepTypeSpecific(typeStep, mockContext))
                .rejects.toThrow('type step requires value');
        });
    });

    describe('Step Execution', () => {
        test('should execute step successfully', async () => {
            const result = await executor.executeStep(mockStep, mockContext);
            
            expect(mockHandler.execute).toHaveBeenCalledWith(mockStep, mockContext);
            expect(result).toMatchObject({
                stepId: 'test-step',
                status: 'completed',
                result: { success: true, data: 'test-result' }
            });
        });

        test('should emit step events', async () => {
            const startedSpy = jest.fn();
            const completedSpy = jest.fn();
            
            executor.on('stepStarted', startedSpy);
            executor.on('stepCompleted', completedSpy);
            
            await executor.executeStep(mockStep, mockContext);
            
            expect(startedSpy).toHaveBeenCalledWith(expect.objectContaining({
                stepId: 'test-step',
                step: mockStep
            }));
            
            expect(completedSpy).toHaveBeenCalledWith(expect.objectContaining({
                stepId: 'test-step',
                step: mockStep
            }));
        });

        test('should handle step execution error', async () => {
            const error = new Error('Step execution failed');
            mockHandler.execute.mockRejectedValue(error);
            
            const failedSpy = jest.fn();
            executor.on('stepFailed', failedSpy);
            
            await expect(executor.executeStep(mockStep, mockContext))
                .rejects.toThrow('Step execution failed');
            
            expect(failedSpy).toHaveBeenCalledWith(expect.objectContaining({
                stepId: 'test-step',
                error
            }));
        });

        test('should handle step timeout', async () => {
            mockHandler.execute.mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 2000))
            );
            
            mockStep.timeout = 100;
            
            await expect(executor.executeStep(mockStep, mockContext))
                .rejects.toThrow('Step test-step timed out after 100ms');
        });

        test('should track active steps', async () => {
            let resolveExecution;
            mockHandler.execute.mockImplementation(() => 
                new Promise(resolve => { resolveExecution = resolve; })
            );
            
            const executionPromise = executor.executeStep(mockStep, mockContext);
            
            // Check active steps
            const activeSteps = executor.getActiveSteps();
            expect(activeSteps).toHaveLength(1);
            expect(activeSteps[0].stepId).toBe('test-step');
            expect(activeSteps[0].status).toBe('running');
            
            // Resolve execution
            resolveExecution({ success: true });
            await executionPromise;
            
            // Check active steps after completion
            const activeStepsAfter = executor.getActiveSteps();
            expect(activeStepsAfter).toHaveLength(0);
        });
    });

    describe('Condition Evaluation', () => {
        test('should evaluate variable condition - equals', async () => {
            mockContext.getVariable.mockReturnValue('test-value');
            
            const condition = {
                type: 'variable',
                variable: 'testVar',
                operator: 'equals',
                value: 'test-value'
            };
            
            const result = await executor.evaluateCondition(condition, mockContext);
            expect(result).toBe(true);
        });

        test('should evaluate variable condition - not equals', async () => {
            mockContext.getVariable.mockReturnValue('test-value');
            
            const condition = {
                type: 'variable',
                variable: 'testVar',
                operator: 'not_equals',
                value: 'other-value'
            };
            
            const result = await executor.evaluateCondition(condition, mockContext);
            expect(result).toBe(true);
        });

        test('should evaluate variable condition - contains', async () => {
            mockContext.getVariable.mockReturnValue('test-value-string');
            
            const condition = {
                type: 'variable',
                variable: 'testVar',
                operator: 'contains',
                value: 'value'
            };
            
            const result = await executor.evaluateCondition(condition, mockContext);
            expect(result).toBe(true);
        });

        test('should evaluate variable condition - greater than', async () => {
            mockContext.getVariable.mockReturnValue(10);
            
            const condition = {
                type: 'variable',
                variable: 'testVar',
                operator: 'greater_than',
                value: 5
            };
            
            const result = await executor.evaluateCondition(condition, mockContext);
            expect(result).toBe(true);
        });

        test('should evaluate custom condition', async () => {
            mockContext.getAllVariables.mockReturnValue({ testVar: 'test-value' });
            
            const condition = {
                type: 'custom',
                expression: 'context.variables.testVar === "test-value"'
            };
            
            const result = await executor.evaluateCondition(condition, mockContext);
            expect(result).toBe(true);
        });

        test('should handle condition evaluation errors', async () => {
            const condition = {
                type: 'custom',
                expression: 'invalid.javascript.expression'
            };
            
            const result = await executor.evaluateCondition(condition, mockContext);
            expect(result).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should determine retry strategy for retryable error', async () => {
            const error = new Error('timeout occurred');
            const strategy = await executor.determineErrorStrategy(error, mockStep, mockContext);
            expect(strategy).toBe('retry');
        });

        test('should determine skip strategy for continue on error', async () => {
            mockStep.continueOnError = true;
            const error = new Error('some error');
            const strategy = await executor.determineErrorStrategy(error, mockStep, mockContext);
            expect(strategy).toBe('skip');
        });

        test('should determine custom strategy from step config', async () => {
            mockStep.onError = { action: 'pause' };
            const error = new Error('some error');
            const strategy = await executor.determineErrorStrategy(error, mockStep, mockContext);
            expect(strategy).toBe('pause');
        });

        test('should identify retryable errors', () => {
            expect(executor.isRetryableError(new Error('timeout occurred'))).toBe(true);
            expect(executor.isRetryableError(new Error('network error'))).toBe(true);
            expect(executor.isRetryableError(new Error('element not found'))).toBe(true);
            expect(executor.isRetryableError(new Error('invalid selector'))).toBe(false);
        });

        test('should handle step error with error info', async () => {
            const error = new Error('test error');
            const errorSpy = jest.fn();
            
            executor.on('stepError', errorSpy);
            
            const result = await executor.handleStepError(error, mockStep, mockContext);
            
            expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
                stepId: 'test-step',
                error: expect.objectContaining({
                    message: 'test error'
                })
            }));
            
            expect(result).toHaveProperty('action');
        });
    });

    describe('Step Control', () => {
        test('should cancel active step', async () => {
            let resolveExecution;
            mockHandler.execute.mockImplementation(() => 
                new Promise(resolve => { resolveExecution = resolve; })
            );
            
            const executionPromise = executor.executeStep(mockStep, mockContext);
            
            const cancelledSpy = jest.fn();
            executor.on('stepCancelled', cancelledSpy);
            
            const cancelled = await executor.cancelStep('test-step');
            expect(cancelled).toBe(true);
            
            expect(cancelledSpy).toHaveBeenCalledWith(expect.objectContaining({
                stepId: 'test-step'
            }));
            
            // Resolve to cleanup
            resolveExecution({ success: true });
            await executionPromise.catch(() => {}); // Ignore errors for cleanup
        });

        test('should return false for non-existent step cancellation', async () => {
            const cancelled = await executor.cancelStep('non-existent');
            expect(cancelled).toBe(false);
        });

        test('should wait for step completion', async () => {
            const stepWithWait = {
                ...mockStep,
                waitAfter: 100
            };
            
            const startTime = Date.now();
            await executor.waitForStepCompletion(stepWithWait, mockContext);
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeGreaterThanOrEqual(100);
        });
    });

    describe('Statistics and Monitoring', () => {
        test('should get execution statistics', () => {
            const stats = executor.getExecutionStats();
            
            expect(stats).toMatchObject({
                activeSteps: 0,
                registeredHandlers: 1,
                handlerTypes: ['test']
            });
        });

        test('should track active steps count', async () => {
            let resolveExecution;
            mockHandler.execute.mockImplementation(() => 
                new Promise(resolve => { resolveExecution = resolve; })
            );
            
            const executionPromise = executor.executeStep(mockStep, mockContext);
            
            const stats = executor.getExecutionStats();
            expect(stats.activeSteps).toBe(1);
            
            // Resolve to cleanup
            resolveExecution({ success: true });
            await executionPromise;
            
            const statsAfter = executor.getExecutionStats();
            expect(statsAfter.activeSteps).toBe(0);
        });
    });
});