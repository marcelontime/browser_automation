# Error Recovery Framework

## Overview

The Error Recovery Framework is a comprehensive system for handling, classifying, and recovering from errors in AI RPA automation workflows. It implements intelligent error classification, recovery strategy selection, automatic retry with exponential backoff, and detailed diagnostic reporting.

## Features

### 🔍 Comprehensive Error Classification
- **Pattern-based classification** using regex patterns
- **Context-aware analysis** considering execution environment
- **Confidence scoring** for classification accuracy
- **Extensible classification system** for custom error types

### 🛠️ Intelligent Recovery Strategies
- **Priority-based strategy selection** for optimal recovery
- **Multiple recovery approaches** per error type
- **Self-healing capabilities** with fallback mechanisms
- **Custom strategy support** for domain-specific errors

### 🔄 Automatic Retry with Exponential Backoff
- **Configurable retry attempts** with intelligent delays
- **Exponential backoff** with jitter to prevent thundering herd
- **Circuit breaker pattern** to prevent cascading failures
- **Adaptive timing** based on error type and context

### 📊 Detailed Diagnostic Reporting
- **Comprehensive error analysis** with root cause identification
- **Contextual information capture** including system state
- **Recommendation generation** for error prevention
- **Historical tracking** for pattern analysis

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Error Recovery Framework                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Error           │  │ Recovery        │  │ Diagnostic      │ │
│  │ Classification  │  │ Strategy        │  │ Reporting       │ │
│  │                 │  │ Execution       │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Retry           │  │ Statistics      │  │ Configuration   │ │
│  │ Management      │  │ Tracking        │  │ Management      │ │
│  │                 │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Error Classifications

### Built-in Error Types

| Error Type | Category | Severity | Recoverable | Common Causes |
|------------|----------|----------|-------------|---------------|
| `element-not-found` | element | medium | ✅ | DOM changes, timing issues, selector specificity |
| `timeout` | timing | medium | ✅ | Slow network, heavy page load, server delays |
| `network-error` | network | high | ✅ | Connectivity issues, server downtime, DNS problems |
| `permission-denied` | security | high | ❌ | Expired credentials, insufficient permissions |
| `page-error` | browser | high | ✅ | Browser crashes, memory issues, JavaScript errors |
| `data-error` | data | medium | ✅ | Format changes, validation failures, type mismatches |
| `resource-error` | system | high | ✅ | Memory exhaustion, disk space, file system issues |
| `unknown` | unknown | medium | ✅ | Unclassified errors, new error types |

### Custom Error Classifications

You can add custom error classifications:

```javascript
framework.addErrorClassification('custom-api-error', {
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
```

## Recovery Strategies

### Element Recovery Strategies

1. **Wait and Retry** (Priority 1)
   - Waits for a configurable delay before retrying
   - Useful for timing-related element issues

2. **Alternative Selector** (Priority 2)
   - Uses alternative selectors when primary selector fails
   - Requires `alternativeSelectors` in context

3. **Visual Matching** (Priority 3)
   - Attempts visual similarity matching
   - Requires `visualFingerprint` in context

### Timeout Recovery Strategies

1. **Increase Timeout** (Priority 1)
   - Increases timeout by 50% up to maximum limit
   - Adapts to slow-loading content

2. **Wait for Stability** (Priority 2)
   - Waits for page stability before retrying
   - Useful for dynamic content loading

### Network Recovery Strategies

1. **Exponential Backoff** (Priority 1)
   - Implements exponential backoff with jitter
   - Handles temporary network issues

2. **Circuit Breaker** (Priority 2)
   - Prevents cascading failures
   - Triggers after multiple consecutive failures

## Usage Examples

### Basic Usage

```javascript
const ErrorRecoveryFramework = require('./error-recovery-framework');

// Initialize framework
const errorRecovery = new ErrorRecoveryFramework({
    maxRetryAttempts: 5,
    baseRetryDelay: 1000,
    maxRetryDelay: 30000,
    exponentialBackoffFactor: 2
});

// Handle an error
const error = new Error('Element not found for selector: .submit-button');
const context = {
    selector: '.submit-button',
    action: 'click',
    alternativeSelectors: ['#submit', '[data-test="submit"]']
};

const result = await errorRecovery.handleError(error, context);

if (result.success) {
    console.log(`Error recovered using: ${result.recoveryResult.strategy}`);
    // Apply recovery action based on result.recoveryResult.action
} else {
    console.log('Error could not be recovered');
}
```

### Workflow Integration

```javascript
const ErrorRecoveryIntegration = require('./error-recovery-integration');

// Initialize integration
const integration = new ErrorRecoveryIntegration();
integration.initialize(workflowEngine);

// Execute operation with automatic recovery
const result = await integration.executeWithRecovery(
    async (attempt, context) => {
        // Your operation here
        return await performAutomationStep(context);
    },
    {
        selector: '.target-element',
        alternativeSelectors: ['.alt-selector'],
        url: 'https://example.com'
    },
    {
        maxAttempts: 5,
        enableRecovery: true
    }
);
```

### Retry with Exponential Backoff

```javascript
// Retry an unreliable operation
const result = await errorRecovery.retryWithBackoff(
    async (attempt) => {
        console.log(`Attempt ${attempt}`);
        return await unreliableOperation();
    },
    {
        maxAttempts: 5,
        baseDelay: 1000,
        factor: 2,
        onRetry: async (error, attempt, delay) => {
            console.log(`Retrying in ${delay}ms due to: ${error.message}`);
        }
    }
);
```

### Recovery-Aware Function Wrapper

```javascript
// Create a wrapper that automatically handles errors
const reliableFunction = integration.createRecoveryWrapper(
    unreliableFunction,
    { service: 'api', timeout: 30000 }
);

// Use the wrapped function
const result = await reliableFunction(param1, param2);
```

## Configuration

### Framework Options

```javascript
const options = {
    maxRetryAttempts: 5,           // Maximum retry attempts
    baseRetryDelay: 1000,          // Base delay in milliseconds
    maxRetryDelay: 30000,          // Maximum delay in milliseconds
    exponentialBackoffFactor: 2,   // Backoff multiplier
    enableLearning: true,          // Enable learning from recoveries
    enableDiagnostics: true        // Enable diagnostic reporting
};
```

### Event Listeners

```javascript
// Listen for error recovery events
errorRecovery.on('error-handled', (data) => {
    console.log(`Error ${data.classification.type} recovered using ${data.recoveryResult.strategy}`);
});

errorRecovery.on('retry-attempt', (data) => {
    console.log(`Retry ${data.attempt}/${data.maxAttempts} after ${data.delay}ms`);
});

errorRecovery.on('stats-updated', (data) => {
    console.log(`Recovery stats updated for ${data.type}`);
});
```

## Diagnostic Reports

Each error generates a comprehensive diagnostic report:

```javascript
{
    timestamp: "2024-01-15T10:30:00.000Z",
    errorId: "err_1642248600000_abc123def",
    classification: {
        type: "element-not-found",
        category: "element",
        severity: "medium",
        confidence: 0.85
    },
    error: {
        name: "Error",
        message: "Element not found",
        stack: "...",
        code: "ELEMENT_NOT_FOUND"
    },
    context: {
        url: "https://example.com",
        selector: ".submit-button",
        action: "click",
        // ... other context data
    },
    analysis: {
        possibleCauses: ["DOM changes", "timing issues"],
        suggestedActions: ["retry with delay", "use alternative selector"],
        severity: "medium",
        recoverable: true
    },
    recommendations: [
        {
            type: "immediate",
            action: "retry with delay",
            priority: "high"
        }
    ]
}
```

## Statistics and Monitoring

### Recovery Statistics

```javascript
const stats = errorRecovery.getRecoveryStatistics();

console.log(`Total errors handled: ${stats.totalErrors}`);
console.log(`Overall success rate: ${stats.overallSuccessRate}`);
console.log(`Most common errors:`, stats.mostCommonErrors);
```

### Circuit Breaker

The framework includes circuit breaker functionality to prevent cascading failures:

- Triggers after 5 failures within 10 minutes for the same URL/action combination
- Prevents further attempts until the failure rate decreases
- Automatically resets after the time window expires

## Best Practices

### 1. Provide Rich Context

Always provide as much context as possible for better error classification and recovery:

```javascript
const context = {
    selector: '.target-element',
    alternativeSelectors: ['.alt-1', '.alt-2'],
    action: 'click',
    url: 'https://example.com',
    sessionId: 'session-123',
    workflowId: 'workflow-456',
    visualFingerprint: 'base64-image-data'
};
```

### 2. Use Appropriate Retry Limits

Configure retry limits based on your use case:

- **Interactive workflows**: 3-5 attempts
- **Background processing**: 5-10 attempts
- **Critical operations**: 10+ attempts with longer delays

### 3. Monitor Recovery Statistics

Regularly monitor recovery statistics to identify patterns:

```javascript
// Set up periodic monitoring
setInterval(() => {
    const stats = errorRecovery.getRecoveryStatistics();
    if (stats.overallSuccessRate < 0.8) {
        console.warn('Low recovery success rate detected');
    }
}, 60000); // Check every minute
```

### 4. Implement Custom Strategies

Add domain-specific recovery strategies for your application:

```javascript
integration.addRecoveryStrategy('custom-error-type', {
    name: 'domain-specific-recovery',
    priority: 1,
    execute: async (context) => {
        // Custom recovery logic
        return { success: true, action: 'custom-action' };
    }
});
```

### 5. Handle Sensitive Data

The framework automatically sanitizes sensitive data, but you can extend this:

```javascript
// Custom sanitization in your context preparation
const sanitizedContext = {
    ...context,
    password: undefined,
    apiKey: undefined,
    // Keep only necessary data
};
```

## Testing

The framework includes comprehensive tests covering:

- Error classification accuracy
- Recovery strategy execution
- Retry mechanisms with exponential backoff
- Diagnostic report generation
- Statistics tracking
- Configuration management
- Circuit breaker functionality

Run tests with:

```bash
npm test modules/execution/__tests__/error-recovery-framework.test.js
```

## Integration with Existing Systems

### Workflow Engine Integration

The framework integrates seamlessly with existing workflow engines:

```javascript
// In your workflow engine
workflowEngine.on('step-error', async (errorData) => {
    const recoveryResult = await errorRecovery.handleError(
        errorData.error,
        errorData.context
    );
    
    if (recoveryResult.success) {
        // Apply recovery and continue workflow
        await applyRecoveryAction(recoveryResult);
        return { action: 'retry' };
    } else {
        // Escalate or fail workflow
        return { action: 'fail', reason: recoveryResult.diagnostics };
    }
});
```

### Monitoring System Integration

```javascript
// Send metrics to monitoring system
errorRecovery.on('error-handled', (data) => {
    metrics.increment('error_recovery.handled', {
        type: data.classification.type,
        strategy: data.recoveryResult.strategy,
        success: data.recoveryResult.success
    });
});
```

## Performance Considerations

- **Memory Usage**: Diagnostic reports are automatically cleaned up (keeps last 1000)
- **CPU Usage**: Error classification uses efficient regex matching
- **Network Impact**: Exponential backoff prevents overwhelming servers
- **Storage**: Statistics are kept in memory; persist to database if needed

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Call `cleanupDiagnosticReports()` periodically
   - Reduce diagnostic report retention

2. **Slow Error Classification**
   - Optimize regex patterns
   - Reduce number of classification patterns

3. **Recovery Strategies Not Working**
   - Verify context contains required data
   - Check strategy priority ordering
   - Add logging to strategy execution

### Debug Mode

Enable debug logging:

```javascript
const errorRecovery = new ErrorRecoveryFramework({
    enableDiagnostics: true,
    enableLearning: true
});

// Add debug event listeners
errorRecovery.on('error-handled', console.log);
errorRecovery.on('retry-attempt', console.log);
```

## Contributing

To extend the framework:

1. Add new error classifications in `initializeErrorClassifications()`
2. Implement recovery strategies in `initializeRecoveryStrategies()`
3. Add comprehensive tests for new functionality
4. Update documentation with examples

## License

This Error Recovery Framework is part of the AI RPA Market Leader Improvements project and follows the same licensing terms as the main project.