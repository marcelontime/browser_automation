/**
 * 🧪 TEST ENHANCED LEFT PANEL
 * 
 * Test the enhanced left panel with real-time execution status and controls
 */

const StagehandBrowserAutomationServer = require('./server');

async function testEnhancedLeftPanel() {
    console.log('🧪 Testing Enhanced Left Panel...');
    
    try {
        // Create server instance
        const server = new StagehandBrowserAutomationServer({
            port: 7083 // Use different port for testing
        });
        
        console.log('\n1️⃣ Testing automation creation and storage...');
        
        // Create test automations with different states
        const testAutomations = [
            {
                id: 'automation-ready',
                name: 'Ready Automation',
                description: 'Test automation in ready state',
                status: 'ready',
                stepCount: 5,
                variableCount: 2,
                steps: [
                    { id: 'step1', action: { type: 'navigate', url: '${LOGIN_URL}' } },
                    { id: 'step2', action: { type: 'fill', selector: 'input[type="email"]', text: '${EMAIL}' } },
                    { id: 'step3', action: { type: 'fill', selector: 'input[type="password"]', text: '${PASSWORD}' } },
                    { id: 'step4', action: { type: 'click', selector: 'button[type="submit"]' } },
                    { id: 'step5', action: { type: 'wait', duration: 2000 } }
                ],
                variables: [
                    { id: 'var1', name: 'LOGIN_URL', type: 'url', value: 'https://example.com/login' },
                    { id: 'var2', name: 'EMAIL', type: 'email', value: 'test@example.com' }
                ],
                createdAt: new Date().toISOString()
            },
            {
                id: 'automation-running',
                name: 'Running Automation',
                description: 'Test automation in running state',
                status: 'running',
                stepCount: 3,
                variableCount: 1,
                steps: [
                    { id: 'step1', action: { type: 'navigate', url: 'https://example.com' } },
                    { id: 'step2', action: { type: 'click', selector: '.button' } },
                    { id: 'step3', action: { type: 'wait', duration: 1000 } }
                ],
                variables: [
                    { id: 'var1', name: 'URL', type: 'url', value: 'https://example.com' }
                ],
                createdAt: new Date().toISOString()
            },
            {
                id: 'automation-error',
                name: 'Error Automation',
                description: 'Test automation in error state',
                status: 'error',
                stepCount: 2,
                variableCount: 0,
                steps: [
                    { id: 'step1', action: { type: 'navigate', url: 'https://invalid-url' } },
                    { id: 'step2', action: { type: 'click', selector: '.nonexistent' } }
                ],
                variables: [],
                createdAt: new Date().toISOString()
            }
        ];
        
        // Add automations to server storage
        testAutomations.forEach(automation => {
            server.savedAutomations.set(automation.id, automation);
        });
        
        console.log(`✅ Created ${testAutomations.length} test automations`);
        
        console.log('\n2️⃣ Testing execution status management...');
        
        // Create execution statuses for different automations
        const executionStatuses = [];
        
        // Running automation execution
        const runningExecutionId = server.executionProgressManager.startExecution(
            'automation-running',
            'test-session',
            {
                totalSteps: 3,
                automationName: 'Running Automation',
                variables: { URL: 'https://example.com' },
                metadata: {
                    userAgent: 'Test Browser',
                    hasVariables: true
                }
            }
        );
        
        // Simulate progress
        server.executionProgressManager.updateProgress(runningExecutionId, 2, {
            success: true,
            action: 'click',
            duration: 1000
        });
        
        // Paused automation execution
        const pausedExecutionId = server.executionProgressManager.startExecution(
            'automation-paused',
            'test-session',
            {
                totalSteps: 5,
                automationName: 'Paused Automation',
                variables: {},
                metadata: {
                    userAgent: 'Test Browser',
                    hasVariables: false
                }
            }
        );
        
        server.executionProgressManager.updateProgress(pausedExecutionId, 3, {
            success: true,
            action: 'fill',
            duration: 500
        });
        
        server.executionProgressManager.pauseExecution(pausedExecutionId);
        
        console.log('✅ Created execution statuses for testing');
        
        console.log('\n3️⃣ Testing execution status retrieval...');
        
        // Get all active executions (simulating what the UI would receive)
        const activeExecutions = server.executionProgressManager.getActiveExecutions();
        console.log(`✅ Active executions: ${activeExecutions.length}`);
        
        activeExecutions.forEach(execution => {
            console.log(`📊 Execution ${execution.executionId.slice(0, 8)}...`, {
                automationId: execution.automationId,
                status: execution.status,
                progress: execution.progress,
                currentStep: execution.currentStep,
                totalSteps: execution.totalSteps
            });
        });
        
        console.log('\n4️⃣ Testing execution control operations...');
        
        // Test pause operation
        console.log('⏸️ Testing pause operation...');
        const pauseResult = server.executionProgressManager.pauseExecution(runningExecutionId);
        console.log(`✅ Pause result: ${pauseResult}`);
        
        // Test resume operation
        console.log('▶️ Testing resume operation...');
        const resumeResult = server.executionProgressManager.resumeExecution(runningExecutionId);
        console.log(`✅ Resume result: ${resumeResult}`);
        
        // Test stop operation
        console.log('🛑 Testing stop operation...');
        const stopResult = server.executionProgressManager.stopExecution(pausedExecutionId, 'user_requested');
        console.log(`✅ Stop result: ${stopResult}`);
        
        console.log('\n5️⃣ Testing WebSocket broadcasting for UI updates...');
        
        // Create mock WebSocket clients to simulate UI connections
        const mockUIClients = [];
        for (let i = 0; i < 2; i++) {
            const mockWs = {
                readyState: 1, // WebSocket.OPEN
                send: (data) => {
                    const message = JSON.parse(data);
                    console.log(`📤 UI Client ${i+1} received: ${message.type} (${message.executionId?.slice(0, 8) || 'N/A'}...)`);
                },
                on: (event, handler) => {
                    // Mock event handler registration
                }
            };
            mockUIClients.push(mockWs);
            server.executionProgressManager.addClient(mockWs);
        }
        
        console.log(`✅ Added ${mockUIClients.length} mock UI clients`);
        
        // Simulate a new execution that would trigger UI updates
        console.log('\n6️⃣ Testing real-time UI updates...');
        
        const uiTestExecutionId = server.executionProgressManager.startExecution(
            'automation-ui-test',
            'ui-test-session',
            {
                totalSteps: 4,
                automationName: 'UI Update Test Automation',
                variables: { test: 'value' },
                metadata: {
                    userAgent: 'Test Browser',
                    hasVariables: true
                }
            }
        );
        
        // Simulate step-by-step execution with UI updates
        for (let step = 1; step <= 4; step++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            server.executionProgressManager.updateProgress(uiTestExecutionId, step, {
                success: true,
                action: `ui_test_step_${step}`,
                duration: 300
            });
            
            console.log(`📊 Step ${step}/4 completed - UI clients notified`);
        }
        
        // Complete the execution
        server.executionProgressManager.completeExecution(uiTestExecutionId, {
            success: true,
            totalSteps: 4
        });
        
        console.log('\n7️⃣ Testing automation state management...');
        
        // Test automation status updates (simulating what happens when automations start/stop)
        const testAutomation = server.savedAutomations.get('automation-ready');
        if (testAutomation) {
            console.log('📋 Original automation status:', testAutomation.status);
            
            // Simulate status change to running
            testAutomation.status = 'running';
            console.log('🏃 Updated automation status to running');
            
            // Simulate status change back to ready
            testAutomation.status = 'ready';
            testAutomation.lastRun = new Date();
            console.log('✅ Updated automation status to ready with last run time');
        }
        
        console.log('\n8️⃣ Testing error scenarios...');
        
        // Test error handling in execution
        const errorExecutionId = server.executionProgressManager.startExecution(
            'automation-error',
            'error-test-session',
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
            message: 'Element not found: .nonexistent',
            type: 'element_not_found',
            recoverable: false
        });
        
        // Fail the execution
        server.executionProgressManager.failExecution(errorExecutionId, new Error('Automation failed'));
        
        const failedExecution = server.executionProgressManager.getExecutionStatus(errorExecutionId);
        console.log('❌ Failed execution status:', {
            status: failedExecution.status,
            errorCount: failedExecution.errorCount
        });
        
        console.log('\n9️⃣ Testing final state summary...');
        
        // Get final state summary
        const finalActiveExecutions = server.executionProgressManager.getActiveExecutions();
        const executionHistory = server.executionProgressManager.getExecutionHistory(10);
        
        console.log('📊 Final State Summary:');
        console.log(`  - Active executions: ${finalActiveExecutions.length}`);
        console.log(`  - Execution history: ${executionHistory.length}`);
        console.log(`  - Total automations: ${server.savedAutomations.size}`);
        
        // Display automation states
        console.log('\n📋 Automation States:');
        for (const [id, automation] of server.savedAutomations) {
            console.log(`  - ${automation.name}: ${automation.status} (${automation.stepCount} steps, ${automation.variableCount} variables)`);
        }
        
        console.log('\n✅ Enhanced Left Panel test completed successfully!');
        
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
    testEnhancedLeftPanel().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testEnhancedLeftPanel;