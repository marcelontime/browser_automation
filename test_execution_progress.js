/**
 * 🧪 TEST EXECUTION PROGRESS MANAGER
 * 
 * Simple test to verify ExecutionProgressManager functionality
 */

const ExecutionProgressManager = require('./modules/execution/progress-manager');
const { createExecutionContext } = require('./modules/execution/execution-context');

async function testExecutionProgressManager() {
    console.log('🧪 Testing ExecutionProgressManager...');
    
    // Create progress manager
    const progressManager = new ExecutionProgressManager({
        maxConcurrentExecutions: 5,
        executionTimeout: 30000
    });
    
    // Test event listeners
    progressManager.on('executionStarted', (data) => {
        console.log('✅ Event: executionStarted', data.executionId);
    });
    
    progressManager.on('executionProgress', (data) => {
        console.log(`📊 Event: executionProgress ${data.executionId} - Step ${data.stepIndex}/${data.context.totalSteps} (${data.progress}%)`);
    });
    
    progressManager.on('executionCompleted', (data) => {
        console.log('🎉 Event: executionCompleted', data.executionId, `Duration: ${data.duration}ms`);
    });
    
    // Test 1: Start execution
    console.log('\n1️⃣ Testing execution start...');
    const executionId = progressManager.startExecution('test-automation-123', 'session-456', {
        totalSteps: 5,
        automationName: 'Test Login Automation',
        variables: { email: 'test@example.com', password: 'secret' }
    });
    
    console.log(`Started execution: ${executionId}`);
    
    // Test 2: Update progress
    console.log('\n2️⃣ Testing progress updates...');
    for (let step = 1; step <= 5; step++) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate step execution time
        
        progressManager.updateProgress(executionId, step, {
            success: true,
            action: `Step ${step} action`,
            duration: 500
        });
        
        // Add some logs
        progressManager.addLog(executionId, {
            level: 'info',
            message: `Completed step ${step}`,
            data: { stepNumber: step }
        });
    }
    
    // Test 3: Complete execution
    console.log('\n3️⃣ Testing execution completion...');
    progressManager.completeExecution(executionId, {
        success: true,
        extractedData: { loginResult: 'success' }
    });
    
    // Test 4: Get execution status
    console.log('\n4️⃣ Testing status retrieval...');
    const status = progressManager.getExecutionStatus(executionId);
    console.log('Execution status:', JSON.stringify(status, null, 2));
    
    // Test 5: Test pause/resume functionality
    console.log('\n5️⃣ Testing pause/resume functionality...');
    const executionId2 = progressManager.startExecution('test-automation-456', 'session-789', {
        totalSteps: 3,
        automationName: 'Test Pause/Resume'
    });
    
    // Start and pause
    progressManager.updateProgress(executionId2, 1, { success: true });
    console.log('Pausing execution...');
    progressManager.pauseExecution(executionId2);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Resuming execution...');
    progressManager.resumeExecution(executionId2);
    
    progressManager.updateProgress(executionId2, 2, { success: true });
    progressManager.completeExecution(executionId2);
    
    // Test 6: Test error handling
    console.log('\n6️⃣ Testing error handling...');
    const executionId3 = progressManager.startExecution('test-automation-789', 'session-abc', {
        totalSteps: 2,
        automationName: 'Test Error Handling'
    });
    
    progressManager.updateProgress(executionId3, 1, { success: true });
    
    // Add an error
    progressManager.addError(executionId3, {
        message: 'Element not found',
        type: 'element_not_found',
        recoverable: true
    });
    
    // Fail the execution
    progressManager.failExecution(executionId3, new Error('Critical failure'));
    
    // Test 7: Get active executions and history
    console.log('\n7️⃣ Testing execution lists...');
    const activeExecutions = progressManager.getActiveExecutions();
    console.log(`Active executions: ${activeExecutions.length}`);
    
    const history = progressManager.getExecutionHistory();
    console.log(`Execution history: ${history.length}`);
    
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    progressManager.cleanup();
    
    console.log('\n✅ All tests completed successfully!');
}

// Run the test
if (require.main === module) {
    testExecutionProgressManager().catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = testExecutionProgressManager;