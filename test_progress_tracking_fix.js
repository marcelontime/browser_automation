/**
 * TEST PROGRESS TRACKING FIX
 * 
 * Verifies that progress updates are sent correctly without duplicates
 * and that the UI receives proper execution_progress messages
 */

const StagehandBrowserAutomationServer = require('./server');

async function testProgressTrackingFix() {
    console.log('🧪 Testing Progress Tracking Fix...');
    
    try {
        // Create server instance (don't start HTTP server)
        const server = new StagehandBrowserAutomationServer();
        
        console.log('\n1️⃣ Testing ExecutionProgressManager integration...');
        
        // Mock WebSocket client to capture messages
        const receivedMessages = [];
        const mockWs = {
            readyState: 1, // WebSocket.OPEN
            send: (data) => {
                const message = JSON.parse(data);
                receivedMessages.push(message);
                console.log(`📨 Received: ${message.type} (Step ${message.currentStep || 'N/A'}/${message.totalSteps || 'N/A'}, Progress: ${message.progress || 'N/A'}%, Status: ${message.status || 'N/A'})`);
            },
            on: (event, handler) => {
                console.log(`📝 Registered ${event} handler`);
            }
        };
        
        // Register mock client with ExecutionProgressManager
        server.executionProgressManager.addClient(mockWs);
        console.log('✅ Mock WebSocket client registered');
        
        console.log('\n2️⃣ Testing execution with progress updates...');
        
        // Start execution (should send execution_started)
        const executionId = server.executionProgressManager.startExecution(
            'test-automation-fix',
            'test-session-fix',
            {
                totalSteps: 5, // Include initial navigation
                automationName: 'Progress Fix Test Automation',
                variables: { email: 'test@example.com' },
                metadata: {
                    userAgent: 'Test Browser',
                    hasVariables: true,
                    hasInitialNavigation: true
                }
            }
        );
        
        console.log(`✅ Started execution: ${executionId}`);
        
        // Test progress updates (simulating automation execution)
        console.log('\n3️⃣ Simulating step-by-step execution...');
        
        // Step 1: Initial navigation
        await new Promise(resolve => setTimeout(resolve, 200));
        server.executionProgressManager.updateProgress(executionId, 1, {
            success: true,
            action: 'navigate',
            description: 'Navigate to https://azut1-br-digital.azurewebsites.net/login',
            duration: 1000
        });
        
        // Step 2: Fill CPF
        await new Promise(resolve => setTimeout(resolve, 200));
        server.executionProgressManager.updateProgress(executionId, 2, {
            success: true,
            action: 'fill',
            description: 'Fill CPF field',
            duration: 500
        });
        
        // Step 3: Fill password
        await new Promise(resolve => setTimeout(resolve, 200));
        server.executionProgressManager.updateProgress(executionId, 3, {
            success: true,
            action: 'fill',
            description: 'Fill password field',
            duration: 600
        });
        
        // Step 4: Click login
        await new Promise(resolve => setTimeout(resolve, 200));
        server.executionProgressManager.updateProgress(executionId, 4, {
            success: true,
            action: 'click',
            description: 'Click login button',
            duration: 300
        });
        
        // Step 5: Wait for dashboard
        await new Promise(resolve => setTimeout(resolve, 200));
        server.executionProgressManager.updateProgress(executionId, 5, {
            success: true,
            action: 'wait',
            description: 'Wait for dashboard load',
            duration: 800
        });
        
        // Complete execution
        server.executionProgressManager.completeExecution(executionId, {
            success: true,
            stepsExecuted: 5,
            totalSteps: 5
        });
        
        console.log('\n4️⃣ Analyzing received messages...');
        
        // Analyze received messages
        const executionStarted = receivedMessages.filter(m => m.type === 'execution_started');
        const executionProgress = receivedMessages.filter(m => m.type === 'execution_progress');
        const executionCompleted = receivedMessages.filter(m => m.type === 'execution_completed');
        
        console.log(`📊 Message Summary:`);
        console.log(`   - execution_started: ${executionStarted.length} messages`);
        console.log(`   - execution_progress: ${executionProgress.length} messages`);
        console.log(`   - execution_completed: ${executionCompleted.length} messages`);
        console.log(`   - Total messages: ${receivedMessages.length}`);
        
        // Verify message correctness
        console.log('\n5️⃣ Verifying message correctness...');
        
        let testsPassedCount = 0;
        let totalTests = 0;
        
        // Test 1: Should have exactly 1 execution_started message
        totalTests++;
        if (executionStarted.length === 1) {
            console.log('✅ Test 1: Exactly 1 execution_started message');
            testsPassedCount++;
        } else {
            console.log(`❌ Test 1: Expected 1 execution_started, got ${executionStarted.length}`);
        }
        
        // Test 2: Should have exactly 5 execution_progress messages (one per step)
        totalTests++;
        if (executionProgress.length === 5) {
            console.log('✅ Test 2: Exactly 5 execution_progress messages');
            testsPassedCount++;
        } else {
            console.log(`❌ Test 2: Expected 5 execution_progress, got ${executionProgress.length}`);
        }
        
        // Test 3: Progress messages should have correct step numbers (1, 2, 3, 4, 5)
        totalTests++;
        const progressSteps = executionProgress.map(m => m.currentStep).sort((a, b) => a - b);
        const expectedSteps = [1, 2, 3, 4, 5];
        if (JSON.stringify(progressSteps) === JSON.stringify(expectedSteps)) {
            console.log('✅ Test 3: Correct step numbers in progress messages');
            testsPassedCount++;
        } else {
            console.log(`❌ Test 3: Expected steps [1,2,3,4,5], got [${progressSteps}]`);
        }
        
        // Test 4: Progress percentages should be correct (20%, 40%, 60%, 80%, 100%)
        totalTests++;
        const progressPercentages = executionProgress.map(m => m.progress).sort((a, b) => a - b);
        const expectedProgressPercentages = [20, 40, 60, 80, 100];
        if (JSON.stringify(progressPercentages) === JSON.stringify(expectedProgressPercentages)) {
            console.log('✅ Test 4: Correct progress percentages');
            testsPassedCount++;
        } else {
            console.log(`❌ Test 4: Expected progress [20,40,60,80,100], got [${progressPercentages}]`);
        }
        
        // Test 5: All progress messages should have status 'running'
        totalTests++;
        const allRunning = executionProgress.every(m => m.status === 'running');
        if (allRunning) {
            console.log('✅ Test 5: All progress messages have status "running"');
            testsPassedCount++;
        } else {
            const statuses = executionProgress.map(m => m.status);
            console.log(`❌ Test 5: Expected all "running", got [${statuses}]`);
        }
        
        // Test 6: Should have exactly 1 execution_completed message
        totalTests++;
        if (executionCompleted.length === 1) {
            console.log('✅ Test 6: Exactly 1 execution_completed message');
            testsPassedCount++;
        } else {
            console.log(`❌ Test 6: Expected 1 execution_completed, got ${executionCompleted.length}`);
        }
        
        console.log('\n📋 TEST RESULTS:');
        console.log(`✅ Tests Passed: ${testsPassedCount}/${totalTests}`);
        console.log(`📊 Success Rate: ${Math.round((testsPassedCount / totalTests) * 100)}%`);
        
        if (testsPassedCount === totalTests) {
            console.log('🎉 ALL TESTS PASSED! Progress tracking fix is working correctly!');
        } else {
            console.log('⚠️ Some tests failed. Progress tracking may still have issues.');
        }
        
        // Cleanup
        server.executionProgressManager.cleanup();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testProgressTrackingFix().then(() => {
    console.log('\n🏁 Test completed!');
    process.exit(0);
}).catch(console.error); 