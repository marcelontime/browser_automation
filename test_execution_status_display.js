/**
 * 🧪 TEST EXECUTION STATUS DISPLAY
 * 
 * Test the ExecutionStatusDisplay component integration and real-time updates
 */

const StagehandBrowserAutomationServer = require('./server');

async function testExecutionStatusDisplay() {
    console.log('🧪 Testing Execution Status Display...');
    
    try {
        // Create server instance
        const server = new StagehandBrowserAutomationServer({
            port: 7082 // Use different port for testing
        });
        
        console.log('\n1️⃣ Testing ExecutionProgressManager integration...');
        
        // Test execution progress manager
        if (server.executionProgressManager) {
            console.log('✅ ExecutionProgressManager initialized');
            
            // Create a test execution
            const executionId = server.executionProgressManager.startExecution(
                'test-automation-status', 
                'test-session-status', 
                {
                    totalSteps: 5,
                    automationName: 'Test Status Display Automation',
                    variables: { email: 'test@example.com', password: 'secret' },
                    metadata: {
                        userAgent: 'Test Browser',
                        hasVariables: true
                    }
                }
            );
            
            console.log(`✅ Test execution started: ${executionId}`);
            
            // Simulate execution progress with logs
            console.log('\n2️⃣ Simulating execution progress...');
            
            for (let step = 1; step <= 5; step++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Add log entry
                server.executionProgressManager.addLog(executionId, {
                    level: 'info',
                    message: `Executing step ${step}: Navigate to login page`,
                    data: { stepNumber: step }
                });
                
                // Update progress
                server.executionProgressManager.updateProgress(executionId, step, {
                    success: true,
                    action: `step_${step}`,
                    duration: 500,
                    screenshot: 'fake-screenshot-data'
                });
                
                console.log(`📊 Step ${step}/5 completed (${(step/5)*100}%)`);
                
                // Simulate pause/resume on step 3
                if (step === 3) {
                    console.log('⏸️ Pausing execution...');
                    server.executionProgressManager.pauseExecution(executionId);
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    console.log('▶️ Resuming execution...');
                    server.executionProgressManager.resumeExecution(executionId);
                }
            }
            
            // Complete execution
            server.executionProgressManager.completeExecution(executionId, {
                success: true,
                totalSteps: 5,
                extractedData: { loginResult: 'success' }
            });
            
            console.log('✅ Test execution completed');
            
        } else {
            console.error('❌ ExecutionProgressManager not initialized');
        }
        
        console.log('\n3️⃣ Testing WebSocket message broadcasting...');
        
        // Create mock WebSocket clients
        const mockClients = [];
        for (let i = 0; i < 3; i++) {
            const mockWs = {
                readyState: 1, // WebSocket.OPEN
                send: (data) => {
                    const message = JSON.parse(data);
                    console.log(`📤 Client ${i+1} received: ${message.type}`);
                },
                on: (event, handler) => {
                    // Mock event handler registration
                    console.log(`📝 Client ${i+1} registered ${event} handler`);
                }
            };
            mockClients.push(mockWs);
            server.executionProgressManager.addClient(mockWs);
        }
        
        console.log(`✅ Added ${mockClients.length} mock WebSocket clients`);
        
        // Test broadcasting with a new execution
        console.log('\n4️⃣ Testing real-time broadcasting...');
        
        const broadcastExecutionId = server.executionProgressManager.startExecution(
            'broadcast-test', 
            'broadcast-session', 
            {
                totalSteps: 3,
                automationName: 'Broadcast Test Automation',
                variables: {},
                metadata: {
                    userAgent: 'Test Browser',
                    hasVariables: false
                }
            }
        );
        
        // Simulate rapid progress updates
        for (let step = 1; step <= 3; step++) {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            server.executionProgressManager.updateProgress(broadcastExecutionId, step, {
                success: true,
                action: `broadcast_step_${step}`,
                duration: 200
            });
        }
        
        server.executionProgressManager.completeExecution(broadcastExecutionId, {
            success: true,
            totalSteps: 3
        });
        
        console.log('\n5️⃣ Testing execution control methods...');
        
        // Test execution control
        const controlExecutionId = server.executionProgressManager.startExecution(
            'control-test', 
            'control-session', 
            {
                totalSteps: 10,
                automationName: 'Control Test Automation',
                variables: {},
                metadata: {
                    userAgent: 'Test Browser',
                    hasVariables: false
                }
            }
        );
        
        // Test pause
        console.log('⏸️ Testing pause...');
        const pauseResult = server.executionProgressManager.pauseExecution(controlExecutionId);
        console.log(`✅ Pause result: ${pauseResult}`);
        
        // Test resume
        console.log('▶️ Testing resume...');
        const resumeResult = server.executionProgressManager.resumeExecution(controlExecutionId);
        console.log(`✅ Resume result: ${resumeResult}`);
        
        // Test stop
        console.log('🛑 Testing stop...');
        const stopResult = server.executionProgressManager.stopExecution(controlExecutionId, 'test_stop');
        console.log(`✅ Stop result: ${stopResult}`);
        
        console.log('\n6️⃣ Testing execution status retrieval...');
        
        // Test status retrieval
        const activeExecutions = server.executionProgressManager.getActiveExecutions();
        console.log(`✅ Active executions: ${activeExecutions.length}`);
        
        const executionHistory = server.executionProgressManager.getExecutionHistory(10);
        console.log(`✅ Execution history: ${executionHistory.length} entries`);
        
        // Display sample execution status
        if (executionHistory.length > 0) {
            const sampleExecution = executionHistory[0];
            console.log('📊 Sample execution status:', {
                executionId: sampleExecution.executionId.slice(0, 8) + '...',
                status: sampleExecution.status,
                progress: sampleExecution.progress,
                duration: sampleExecution.duration,
                successfulSteps: sampleExecution.successfulSteps,
                totalSteps: sampleExecution.totalSteps
            });
        }
        
        console.log('\n7️⃣ Testing error handling...');
        
        // Test error handling
        const errorExecutionId = server.executionProgressManager.startExecution(
            'error-test', 
            'error-session', 
            {
                totalSteps: 2,
                automationName: 'Error Test Automation',
                variables: {},
                metadata: {
                    userAgent: 'Test Browser',
                    hasVariables: false
                }
            }
        );
        
        // Add some errors
        server.executionProgressManager.addError(errorExecutionId, {
            message: 'Element not found',
            type: 'element_not_found',
            recoverable: true
        });
        
        server.executionProgressManager.addError(errorExecutionId, {
            message: 'Network timeout',
            type: 'network_error',
            recoverable: true
        });
        
        // Fail the execution
        server.executionProgressManager.failExecution(errorExecutionId, new Error('Critical failure'));
        
        const failedExecution = server.executionProgressManager.getExecutionStatus(errorExecutionId);
        console.log('❌ Failed execution status:', {
            status: failedExecution.status,
            errorCount: failedExecution.errorCount
        });
        
        console.log('\n✅ Execution Status Display test completed successfully!');
        
        // Cleanup
        server.executionProgressManager.cleanup();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testExecutionStatusDisplay().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testExecutionStatusDisplay;