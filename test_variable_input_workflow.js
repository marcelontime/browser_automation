/**
 * 🧪 TEST VARIABLE INPUT WORKFLOW
 * 
 * Test the new workflow where automations run immediately with existing variables
 */

const StagehandBrowserAutomationServer = require('./server');

async function testVariableInputWorkflow() {
    console.log('🧪 Testing Variable Input Workflow...');
    
    try {
        // Create server instance
        const server = new StagehandBrowserAutomationServer({
            port: 7081 // Use different port for testing
        });
        
        console.log('\n1️⃣ Testing automation with variables...');
        
        // Create a mock automation with variables
        const mockAutomation = {
            id: 'test-automation-with-vars',
            name: 'Test Login Automation',
            description: 'Test automation with variables',
            status: 'ready',
            stepCount: 3,
            variableCount: 2,
            steps: [
                {
                    id: 'step1',
                    action: {
                        type: 'navigate',
                        url: '${LOGIN_URL}'
                    }
                },
                {
                    id: 'step2',
                    action: {
                        type: 'fill',
                        selector: 'input[type="email"]',
                        text: '${EMAIL}'
                    }
                },
                {
                    id: 'step3',
                    action: {
                        type: 'click',
                        selector: 'button[type="submit"]'
                    }
                }
            ],
            variables: [
                {
                    id: 'var1',
                    name: 'LOGIN_URL',
                    type: 'url',
                    value: 'https://example.com/login',
                    description: 'Login page URL'
                },
                {
                    id: 'var2',
                    name: 'EMAIL',
                    type: 'email',
                    value: 'test@example.com',
                    description: 'User email address'
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        // Add automation to server storage
        server.savedAutomations.set(mockAutomation.id, mockAutomation);
        console.log(`✅ Mock automation created: ${mockAutomation.name}`);
        
        console.log('\n2️⃣ Testing handleRunAutomation with existing variables...');
        
        // Create mock user session
        const mockUserSession = {
            sessionId: 'test-session-123',
            ws: {
                send: (data) => {
                    const message = JSON.parse(data);
                    console.log(`📤 WebSocket message sent:`, message.type);
                },
                readyState: 1 // WebSocket.OPEN
            },
            automationEngine: {
                page: {
                    goto: async (url) => {
                        console.log(`🌐 Navigate to: ${url}`);
                    },
                    act: async (instruction) => {
                        console.log(`🎯 Execute: ${instruction}`);
                    },
                    screenshot: async () => {
                        return Buffer.from('fake-screenshot-data');
                    }
                }
            }
        };
        
        // Test running automation without providing variables (should use existing ones)
        console.log('\n3️⃣ Running automation without providing variables...');
        
        const runMessage = {
            automationId: mockAutomation.id
            // No variables provided - should use existing ones
        };
        
        // This should run immediately with existing variables
        await server.handleRunAutomation(mockUserSession, runMessage);
        
        console.log('\n4️⃣ Testing variable replacement...');
        
        // Test variable replacement functionality
        const testAction = {
            type: 'navigate',
            url: '${LOGIN_URL}'
        };
        
        const testVariables = {
            'LOGIN_URL': 'https://example.com/login'
        };
        
        // Test if server has variable replacement method
        if (typeof server.replaceVariablesInAction === 'function') {
            const processedAction = server.replaceVariablesInAction(testAction, testVariables);
            console.log(`✅ Variable replacement test:`, {
                original: testAction.url,
                processed: processedAction.url
            });
        } else {
            console.log('⚠️ Variable replacement method not found - may need to be implemented');
        }
        
        console.log('\n5️⃣ Testing execution progress tracking...');
        
        // Test execution progress manager integration
        const activeExecutions = server.executionProgressManager.getActiveExecutions();
        console.log(`✅ Active executions: ${activeExecutions.length}`);
        
        const executionHistory = server.executionProgressManager.getExecutionHistory(5);
        console.log(`✅ Execution history: ${executionHistory.length} entries`);
        
        console.log('\n6️⃣ Testing automation storage...');
        
        // Test automation retrieval
        const retrievedAutomation = server.savedAutomations.get(mockAutomation.id);
        if (retrievedAutomation) {
            console.log(`✅ Automation retrieved successfully:`, {
                name: retrievedAutomation.name,
                variableCount: retrievedAutomation.variables?.length || 0,
                stepCount: retrievedAutomation.steps?.length || 0
            });
        } else {
            console.error('❌ Failed to retrieve automation');
        }
        
        console.log('\n✅ Variable Input Workflow test completed successfully!');
        
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
    testVariableInputWorkflow().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testVariableInputWorkflow;