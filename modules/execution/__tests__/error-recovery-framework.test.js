const ErrorRecoveryFramework = require('../error-recovery-framework');

describe('ErrorRecoveryFramework', () => {
    let framework;

    beforeEach(() => {
        framework = new ErrorRecoveryFramework({
            maxRetryAttempts: 3,
            baseRetryDelay: 100,
            maxRetryDelay: 1000,
            exponentialBackoffFactor: 2
        });
    });

    afterEach(() => {
        if (framework) {
            framework.removeAllListeners();
        }
    });

    describe('Error Classification', () => {
        test('should classify element not found errors correctly', async () => {
            const error = new Error('Element not found for selector: .test-button');
            const context = { selector: '.test-button', action: 'click' };
            
            const classification = await framework.classifyError(error, context);
            
            expect(classification.type).toBe('element-not-found');
            expect(classification.category).toBe('element');
            expect(classification.recoverable).toBe(true);
            expect(classification.severity).toBe('medium');
            expect(classification.confidence).toBeGreaterThan(0.7);
        });

        test('should classify timeout errors correctly', async () => {
            const error = new Error('Operation timed out after 30000ms');
            const context = { url: 'https://example.com', timeout: 30000 };
            
            const classification = await framework.classifyError(error, context);
            
            expect(classification.type).toBe('timeout');
            expect(classification.category).toBe('timing');
            expect(classification.recoverable).toBe(true);
            expect(classification.severity).toBe('medium');
        });

        test('should classify network errors correctly', async () => {
            const error = new Error('net::ERR_CONNECTION_REFUSED');
            const context = { url: 'https://example.com' };
            
            const classification = await framework.classifyError(error, context);
            
            expect(classification.type).toBe('network-error');
            expect(classification.category).toBe('network');
            expect(classification.recoverable).toBe(true);
            expect(classification.severity).toBe('high');
        });

        test('should classify permission errors correctly', async () => {
            const error = new Error('Access denied: insufficient permissions');
            const context = { action: 'file-access' };
            
            const classification = await framework.classifyError(error, context);
            
            expect(classification.type).toBe('permission-denied');
            expect(classification.category).toBe('security');
            expect(classification.recoverable).toBe(false);
            expect(classification.severity).toBe('high');
        });

        test('should fallback to unknown classification for unrecognized errors', async () => {
            const error = new Error('Some completely unknown error type');
            const context = {};
            
            const classification = await framework.classifyError(error, context);
            
            expect(classification.type).toBe('unknown');
            expect(classification.category).toBe('unknown');
            expect(classification.confidence).toBe(0.5);
        });
    });

    describe('Recovery Strategy Execution', () => {
        test('should execute element recovery strategies in priority order', async () => {
            const error = new Error('Element not found');
            const context = { 
                selector: '.test-button',
                alternativeSelectors: ['#test-btn', '[data-test="button"]'],
                retryDelay: 50
            };
            const classification = { type: 'element-not-found', category: 'element' };
            
            const result = await framework.executeRecoveryStrategy(error, context, classification);
            
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('wait-and-retry');
            expect(result.action).toBe('retry');
        });

        test('should try alternative selectors when wait-and-retry is not suitable', async () => {
            const error = new Error('Element not found');
            const context = { 
                selector: '.test-button',
                alternativeSelectors: ['#test-btn', '[data-test="button"]'],
                skipWaitRetry: true
            };
            const classification = { type: 'element-not-found', category: 'element' };
            
            // Mock the wait-and-retry strategy to fail
            const originalStrategies = framework.recoveryStrategies.get('element-not-found');
            framework.recoveryStrategies.set('element-not-found', [
                {
                    name: 'wait-and-retry',
                    priority: 1,
                    execute: async () => ({ success: false, reason: 'Skip wait retry' })
                },
                ...originalStrategies.slice(1)
            ]);
            
            const result = await framework.executeRecoveryStrategy(error, context, classification);
            
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('alternative-selector');
            expect(result.action).toBe('use-alternative');
            expect(result.data.selector).toBe('#test-btn');
        });

        test('should handle network errors with exponential backoff', async () => {
            const error = new Error('Connection refused');
            const context = { url: 'https://example.com', attemptNumber: 2 };
            const classification = { type: 'network-error', category: 'network' };
            
            const result = await framework.executeRecoveryStrategy(error, context, classification);
            
            expect(result.success).toBe(true);
            expect(result.strategy).toBe('exponential-backoff');
            expect(result.action).toBe('retry');
        });

        test('should return failure when no strategies are available', async () => {
            const error = new Error('Test error');
            const context = {};
            const classification = { type: 'non-existent-type', category: 'unknown' };
            
            // Remove the unknown strategy temporarily to test no strategies scenario
            const originalUnknownStrategies = framework.recoveryStrategies.get('unknown');
            framework.recoveryStrategies.delete('unknown');
            
            const result = await framework.executeRecoveryStrategy(error, context, classification);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('No recovery strategies available');
            expect(result.action).toBe('escalate');
            
            // Restore the unknown strategy
            framework.recoveryStrategies.set('unknown', originalUnknownStrategies);
        });
    });

    describe('Diagnostic Report Generation', () => {
        test('should generate comprehensive diagnostic report', async () => {
            const error = new Error('Test error for diagnostics');
            error.code = 'TEST_ERROR';
            const context = {
                url: 'https://example.com',
                selector: '.test-element',
                action: 'click',
                sessionId: 'test-session-123',
                userId: 'user-456'
            };
            const classification = {
                type: 'element-not-found',
                category: 'element',
                severity: 'medium',
                recoverable: true,
                commonCauses: ['DOM changes', 'timing issues'],
                suggestedActions: ['retry with delay', 'use alternative selector']
            };
            
            const diagnostics = await framework.generateDiagnostics(error, context, classification);
            
            expect(diagnostics).toHaveProperty('timestamp');
            expect(diagnostics).toHaveProperty('errorId');
            expect(diagnostics.classification).toEqual(classification);
            expect(diagnostics.error.name).toBe('Error');
            expect(diagnostics.error.message).toBe('Test error for diagnostics');
            expect(diagnostics.error.code).toBe('TEST_ERROR');
            expect(diagnostics.context.url).toBe('https://example.com');
            expect(diagnostics.context.selector).toBe('.test-element');
            expect(diagnostics.analysis.possibleCauses).toContain('DOM changes');
            expect(diagnostics.analysis.suggestedActions).toContain('retry with delay');
            expect(diagnostics.recommendations).toBeInstanceOf(Array);
        });

        test('should sanitize sensitive data from context', async () => {
            const error = new Error('Test error');
            const context = {
                url: 'https://example.com',
                password: 'secret123',
                token: 'bearer-token-xyz',
                apiKey: 'api-key-abc',
                normalData: 'this should remain'
            };
            const classification = { type: 'unknown', category: 'unknown' };
            
            const diagnostics = await framework.generateDiagnostics(error, context, classification);
            
            // Check that sensitive data is removed from the sanitized context
            const sanitizedContext = framework.sanitizeContext(context);
            expect(sanitizedContext.password).toBeUndefined();
            expect(sanitizedContext.token).toBeUndefined();
            expect(sanitizedContext.apiKey).toBeUndefined();
            expect(sanitizedContext.normalData).toBe('this should remain');
            
            // The diagnostics should also have sanitized context
            expect(diagnostics.context.password).toBeUndefined();
            expect(diagnostics.context.token).toBeUndefined();
            expect(diagnostics.context.apiKey).toBeUndefined();
        });
    });

    describe('Retry with Exponential Backoff', () => {
        test('should succeed on first attempt', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            
            const result = await framework.retryWithBackoff(operation, {
                maxAttempts: 3,
                baseDelay: 10
            });
            
            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
            expect(operation).toHaveBeenCalledWith(1);
        });

        test('should retry with exponential backoff on failures', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Attempt 1 failed'))
                .mockRejectedValueOnce(new Error('Attempt 2 failed'))
                .mockResolvedValue('success on attempt 3');
            
            const onRetry = jest.fn();
            const startTime = Date.now();
            
            const result = await framework.retryWithBackoff(operation, {
                maxAttempts: 3,
                baseDelay: 10,
                factor: 2,
                onRetry
            });
            
            const endTime = Date.now();
            
            expect(result).toBe('success on attempt 3');
            expect(operation).toHaveBeenCalledTimes(3);
            expect(onRetry).toHaveBeenCalledTimes(2);
            
            // Check that delays were applied (should be at least 10ms + 20ms = 30ms)
            expect(endTime - startTime).toBeGreaterThan(25);
        });

        test('should fail after max attempts', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Always fails'));
            
            await expect(framework.retryWithBackoff(operation, {
                maxAttempts: 2,
                baseDelay: 10
            })).rejects.toThrow('Always fails');
            
            expect(operation).toHaveBeenCalledTimes(2);
        });

        test('should respect max delay limit', () => {
            const delay1 = framework.calculateExponentialBackoff(1);
            const delay5 = framework.calculateExponentialBackoff(5);
            const delay10 = framework.calculateExponentialBackoff(10);
            
            expect(delay1).toBe(100); // baseRetryDelay
            expect(delay5).toBe(Math.min(100 * Math.pow(2, 4), 1000)); // Should be capped at maxRetryDelay
            expect(delay10).toBe(1000); // maxRetryDelay limit
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle complete error recovery flow', async () => {
            const error = new Error('Element not found for selector: .missing-element');
            const context = {
                selector: '.missing-element',
                action: 'click',
                url: 'https://example.com',
                sessionId: 'test-session'
            };
            
            const handleResult = await framework.handleError(error, context);
            
            expect(handleResult.success).toBe(true);
            expect(handleResult.classification.type).toBe('element-not-found');
            expect(handleResult.diagnostics).toHaveProperty('errorId');
            expect(handleResult.recoveryResult.success).toBe(true);
            expect(handleResult.duration).toBeGreaterThan(0);
        });

        test('should emit error-handled event', async () => {
            const error = new Error('Test error');
            const context = { test: 'context' };
            
            const eventPromise = new Promise(resolve => {
                framework.once('error-handled', resolve);
            });
            
            await framework.handleError(error, context);
            
            const eventData = await eventPromise;
            expect(eventData.error).toBe(error);
            expect(eventData.context).toBe(context);
            expect(eventData.classification).toBeDefined();
            expect(eventData.diagnostics).toBeDefined();
            expect(eventData.recoveryResult).toBeDefined();
        });

        test('should handle framework errors gracefully', async () => {
            // Mock classifyError to throw an error
            const originalClassifyError = framework.classifyError;
            framework.classifyError = jest.fn().mockRejectedValue(new Error('Classification failed'));
            
            const error = new Error('Original error');
            const context = {};
            
            const result = await framework.handleError(error, context);
            
            expect(result.success).toBe(false);
            expect(result.error.message).toBe('Classification failed');
            
            // Restore original method
            framework.classifyError = originalClassifyError;
        });
    });

    describe('Statistics and Monitoring', () => {
        test('should track recovery statistics', async () => {
            const error1 = new Error('Element not found');
            const error2 = new Error('Another element not found');
            const context = { selector: '.test' };
            
            await framework.handleError(error1, context);
            await framework.handleError(error2, context);
            
            const stats = framework.getRecoveryStatistics();
            
            expect(stats.overall['element-not-found'].total).toBe(2);
            expect(stats.overall['element-not-found'].successful).toBe(2);
            expect(stats.overall['element-not-found'].successRate).toBe(1);
            expect(stats.totalErrors).toBe(2);
        });

        test('should track most common errors', async () => {
            // Generate multiple errors of different types
            await framework.handleError(new Error('Element not found'), {});
            await framework.handleError(new Error('Element not found'), {});
            await framework.handleError(new Error('Timeout occurred'), {});
            
            const stats = framework.getRecoveryStatistics();
            const mostCommon = stats.mostCommonErrors;
            
            expect(mostCommon[0].type).toBe('element-not-found');
            expect(mostCommon[0].count).toBe(2);
            expect(mostCommon[1].type).toBe('timeout');
            expect(mostCommon[1].count).toBe(1);
        });

        test('should store and retrieve diagnostic reports', async () => {
            const error = new Error('Test error');
            const context = { test: 'data' };
            
            const result = await framework.handleError(error, context);
            const errorId = result.diagnostics.errorId;
            
            const retrievedReport = framework.getDiagnosticReport(errorId);
            
            expect(retrievedReport).toBeDefined();
            expect(retrievedReport.errorId).toBe(errorId);
            expect(retrievedReport.error.message).toBe('Test error');
        });
    });

    describe('Configuration Management', () => {
        test('should export configuration', () => {
            const config = framework.exportConfiguration();
            
            expect(config).toHaveProperty('options');
            expect(config).toHaveProperty('errorClassifications');
            expect(config).toHaveProperty('recoveryStrategies');
            expect(config.options.maxRetryAttempts).toBe(3);
            expect(config.errorClassifications['element-not-found']).toBeDefined();
        });

        test('should import configuration options', () => {
            const newConfig = {
                options: {
                    maxRetryAttempts: 10,
                    baseRetryDelay: 500
                }
            };
            
            framework.importConfiguration(newConfig);
            
            expect(framework.options.maxRetryAttempts).toBe(10);
            expect(framework.options.baseRetryDelay).toBe(500);
        });
    });

    describe('Circuit Breaker', () => {
        test('should trigger circuit breaker after multiple failures', () => {
            const context = { url: 'https://example.com', action: 'click' };
            
            // Add multiple recent failures
            const key = `${context.url}-${context.action}`;
            const failures = [];
            for (let i = 0; i < 6; i++) {
                failures.push({ timestamp: Date.now() - (i * 1000) });
            }
            framework.errorHistory.set(key, failures);
            
            const shouldTrigger = framework.shouldTriggerCircuitBreaker(context);
            expect(shouldTrigger).toBe(true);
        });

        test('should not trigger circuit breaker for old failures', () => {
            const context = { url: 'https://example.com', action: 'click' };
            
            // Add old failures (more than 10 minutes ago)
            const key = `${context.url}-${context.action}`;
            const oldFailures = [];
            for (let i = 0; i < 6; i++) {
                oldFailures.push({ timestamp: Date.now() - (15 * 60 * 1000) }); // 15 minutes ago
            }
            framework.errorHistory.set(key, oldFailures);
            
            const shouldTrigger = framework.shouldTriggerCircuitBreaker(context);
            expect(shouldTrigger).toBe(false);
        });
    });
});