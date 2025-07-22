const ErrorRecoveryFramework = require('./error-recovery-framework');
const ErrorRecoveryIntegration = require('./error-recovery-integration');

/**
 * Example usage of the Error Recovery Framework
 * This demonstrates how to integrate and use the comprehensive error recovery system
 */

// Example 1: Basic Error Recovery Framework Usage
async function basicErrorRecoveryExample() {
    console.log('=== Basic Error Recovery Example ===');
    
    // Initialize the framework
    const errorRecovery = new ErrorRecoveryFramework({
        maxRetryAttempts: 5,
        baseRetryDelay: 1000,
        maxRetryDelay: 30000,
        exponentialBackoffFactor: 2
    });

    // Set up event listeners
    errorRecovery.on('error-handled', (data) => {
        console.log(`✅ Error recovered: ${data.classification.type} using ${data.recoveryResult.strategy}`);
    });

    errorRecovery.on('retry-attempt', (data) => {
        console.log(`🔄 Retry attempt ${data.attempt}/${data.maxAttempts} (delay: ${data.delay}ms)`);
    });

    // Simulate different types of errors
    const errors = [
        {
            error: new Error('Element not found for selector: .submit-button'),
            context: { 
                selector: '.submit-button', 
                action: 'click',
                alternativeSelectors: ['#submit', '[data-test="submit"]']
            }
        },
        {
            error: new Error('Operation timed out after 30000ms'),
            context: { 
                url: 'https://example.com',
                timeout: 30000,
                currentTimeout: 30000
            }
        },
        {
            error: new Error('net::ERR_CONNECTION_REFUSED'),
            context: { 
                url: 'https://api.example.com',
                method: 'GET'
            }
        }
    ];

    // Handle each error
    for (const { error, context } of errors) {
        try {
            const result = await errorRecovery.handleError(error, context);
            console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            
            if (result.diagnostics) {
                console.log(`Diagnostic ID: ${result.diagnostics.errorId}`);
            }
        } catch (err) {
            console.error('Error handling failed:', err.message);
        }
        console.log('---');
    }

    // Display statistics
    const stats = errorRecovery.getRecoveryStatistics();
    console.log('Recovery Statistics:', JSON.stringify(stats, null, 2));
}

// Example 2: Retry with Exponential Backoff
async function retryWithBackoffExample() {
    console.log('\n=== Retry with Exponential Backoff Example ===');
    
    const errorRecovery = new ErrorRecoveryFramework();
    
    // Simulate an operation that fails a few times then succeeds
    let attemptCount = 0;
    const unreliableOperation = async (attempt) => {
        attemptCount++;
        console.log(`Operation attempt ${attempt} (total: ${attemptCount})`);
        
        if (attemptCount < 3) {
            throw new Error(`Simulated failure on attempt ${attemptCount}`);
        }
        
        return `Success after ${attemptCount} attempts!`;
    };

    try {
        const result = await errorRecovery.retryWithBackoff(unreliableOperation, {
            maxAttempts: 5,
            baseDelay: 500,
            factor: 2,
            onRetry: async (error, attempt, delay) => {
                console.log(`⏳ Retrying in ${delay}ms due to: ${error.message}`);
            }
        });
        
        console.log(`✅ Final result: ${result}`);
    } catch (error) {
        console.error(`❌ Operation failed permanently: ${error.message}`);
    }
}

// Example 3: Integration with Workflow Engine
async function workflowIntegrationExample() {
    console.log('\n=== Workflow Integration Example ===');
    
    // Mock workflow engine
    const mockWorkflowEngine = {
        listeners: {},
        on(event, callback) {
            this.listeners[event] = this.listeners[event] || [];
            this.listeners[event].push(callback);
        },
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => callback(data));
            }
        },
        removeListener(event, callback) {
            if (this.listeners[event]) {
                const index = this.listeners[event].indexOf(callback);
                if (index > -1) {
                    this.listeners[event].splice(index, 1);
                }
            }
        }
    };

    // Initialize integration
    const integration = new ErrorRecoveryIntegration({
        maxRetryAttempts: 3,
        baseRetryDelay: 1000
    });
    
    integration.initialize(mockWorkflowEngine);

    // Simulate workflow errors
    const workflowErrors = [
        {
            error: new Error('Element .login-button not found'),
            step: {
                type: 'click',
                selector: '.login-button',
                index: 1
            },
            context: {
                workflowId: 'login-workflow-123',
                currentUrl: 'https://app.example.com/login'
            }
        },
        {
            error: new Error('Page load timeout'),
            step: {
                type: 'navigation',
                url: 'https://slow-site.example.com',
                index: 0
            },
            context: {
                workflowId: 'navigation-workflow-456',
                timeout: 30000
            }
        }
    ];

    // Process workflow errors
    for (const errorData of workflowErrors) {
        console.log(`Processing workflow error: ${errorData.error.message}`);
        
        const result = await integration.handleWorkflowError(errorData);
        
        if (result.recovered) {
            console.log(`✅ Workflow error recovered using: ${result.result.recoveryResult.strategy}`);
        } else {
            console.log(`❌ Workflow error could not be recovered`);
        }
        console.log('---');
    }

    // Display integration statistics
    const stats = integration.getStatistics();
    console.log('Integration Statistics:', JSON.stringify(stats.integration, null, 2));
    
    // Cleanup
    integration.cleanup();
}

// Example 4: Custom Error Classifications and Recovery Strategies
async function customizationExample() {
    console.log('\n=== Customization Example ===');
    
    const integration = new ErrorRecoveryIntegration();
    
    // Add custom error classification
    integration.addErrorClassification('custom-api-error', {
        patterns: [
            /API rate limit exceeded/i,
            /quota exceeded/i,
            /too many requests/i
        ],
        severity: 'medium',
        recoverable: true,
        category: 'api',
        priority: 2,
        commonCauses: ['rate limiting', 'quota exhaustion', 'high traffic'],
        suggestedActions: ['wait and retry', 'use exponential backoff', 'implement circuit breaker']
    });

    // Add custom recovery strategy
    integration.addRecoveryStrategy('custom-api-error', {
        name: 'api-rate-limit-backoff',
        priority: 1,
        execute: async (context) => {
            // Custom logic for API rate limit recovery
            const backoffTime = 60000; // 1 minute
            console.log(`API rate limit detected, backing off for ${backoffTime}ms`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            return { success: true, action: 'retry' };
        }
    });

    // Test custom error handling
    const customError = new Error('API rate limit exceeded: 429 Too Many Requests');
    const context = {
        url: 'https://api.example.com/data',
        method: 'GET',
        apiKey: 'test-key'
    };

    const result = await integration.errorRecovery.handleError(customError, context);
    console.log(`Custom error handling result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Classification: ${result.classification.type}`);
    
    if (result.success) {
        console.log(`Recovery strategy: ${result.recoveryResult.strategy}`);
    }
}

// Example 5: Recovery-Aware Function Wrapper
async function recoveryWrapperExample() {
    console.log('\n=== Recovery Wrapper Example ===');
    
    const integration = new ErrorRecoveryIntegration();
    
    // Original unreliable function
    const unreliableApiCall = async (endpoint, data) => {
        const random = Math.random();
        if (random < 0.6) { // 60% failure rate
            throw new Error(`API call to ${endpoint} failed: ${random < 0.3 ? 'Network error' : 'Timeout'}`);
        }
        return { success: true, data: `Response from ${endpoint}`, timestamp: Date.now() };
    };

    // Create recovery-aware wrapper
    const reliableApiCall = integration.createRecoveryWrapper(unreliableApiCall, {
        service: 'api',
        timeout: 30000
    });

    // Test the wrapped function
    try {
        console.log('Calling unreliable API with recovery wrapper...');
        const result = await reliableApiCall('/users', { limit: 10 });
        console.log('✅ API call succeeded:', result);
    } catch (error) {
        console.error('❌ API call failed permanently:', error.message);
    }
}

// Example 6: Comprehensive Error Recovery with executeWithRecovery
async function executeWithRecoveryExample() {
    console.log('\n=== Execute with Recovery Example ===');
    
    const integration = new ErrorRecoveryIntegration();
    
    // Simulate a complex operation that might fail
    const complexOperation = async (attempt, context) => {
        console.log(`Complex operation attempt ${attempt}`);
        
        // Simulate different types of failures
        const random = Math.random();
        if (random < 0.3) {
            throw new Error('Element not found: .complex-selector');
        } else if (random < 0.6) {
            throw new Error('Operation timed out after 30000ms');
        } else if (random < 0.8) {
            throw new Error('net::ERR_CONNECTION_REFUSED');
        }
        
        return { success: true, attempt, timestamp: Date.now() };
    };

    try {
        const result = await integration.executeWithRecovery(
            complexOperation,
            {
                selector: '.complex-selector',
                alternativeSelectors: ['.alt-selector-1', '.alt-selector-2'],
                url: 'https://complex-app.example.com'
            },
            {
                maxAttempts: 5,
                enableRecovery: true
            }
        );
        
        console.log('✅ Complex operation succeeded:', result);
    } catch (error) {
        console.error('❌ Complex operation failed:', error.message);
        console.error(`Attempts made: ${error.attempts}, Recovery attempts: ${error.recoveryAttempts}`);
    }
}

// Run all examples
async function runAllExamples() {
    try {
        await basicErrorRecoveryExample();
        await retryWithBackoffExample();
        await workflowIntegrationExample();
        await customizationExample();
        await recoveryWrapperExample();
        await executeWithRecoveryExample();
        
        console.log('\n🎉 All error recovery examples completed successfully!');
    } catch (error) {
        console.error('❌ Example execution failed:', error);
    }
}

// Export for use in other modules
module.exports = {
    basicErrorRecoveryExample,
    retryWithBackoffExample,
    workflowIntegrationExample,
    customizationExample,
    recoveryWrapperExample,
    executeWithRecoveryExample,
    runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
    runAllExamples();
}