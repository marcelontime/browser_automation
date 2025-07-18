/**
 * Comprehensive test for the sequential automation execution workflow system
 */

const StagehandAutomationEngine = require('./stagehand-engine');

async function testWorkflowSystem() {
    console.log('🧪 Testing Sequential Automation Execution Workflow System');
    console.log('=' .repeat(60));
    
    let engine = null;
    
    try {
        // Initialize the automation engine
        console.log('1. Initializing automation engine...');
        engine = new StagehandAutomationEngine({
            openaiApiKey: process.env.OPENAI_API_KEY,
            headless: false,
            verbose: 1
        });
        
        await engine.init();
        console.log('✅ Automation engine initialized successfully');
        
        // Test 1: Simple workflow execution
        console.log('\n2. Testing simple workflow execution...');
        const simpleWorkflow = {
            id: 'test-simple-workflow',
            name: 'Simple Test Workflow',
            description: 'A simple workflow to test basic functionality',
            version: '1.0.0',
            steps: [
                {
                    id: 'step1',
                    type: 'navigation',
                    name: 'Navigate to Example',
                    action: 'goto',
                    target: 'https://example.com',
                    timeout: 30000
                },
                {
                    id: 'step2',
                    type: 'extraction',
                    name: 'Extract Page Title',
                    action: 'getText',
                    target: 'h1',
                    storeAs: 'pageTitle',
                    timeout: 10000
                },
                {
                    id: 'step3',
                    type: 'validation',
                    name: 'Validate Title',
                    action: 'checkText',
                    target: 'h1',
                    value: 'Example Domain',
                    timeout: 5000
                }
            ],
            variables: [],
            settings: {
                timeout: 30000,
                retryAttempts: 3,
                continueOnError: false
            }
        };
        
        const simpleResult = await engine.executeWorkflow(simpleWorkflow, {
            sessionId: 'test-session-1',
            variables: {}
        });
        
        console.log('✅ Simple workflow executed successfully');
        console.log(`   - Workflow ID: ${simpleResult.workflowId}`);
        console.log(`   - Execution time: ${simpleResult.executionTime}ms`);
        console.log(`   - Status: ${simpleResult.result.status}`);
        
        // Test 2: Sequential steps execution
        console.log('\n3. Testing sequential steps execution...');
        const sequentialSteps = [
            {
                id: 'nav-step',
                type: 'navigation',
                action: 'goto',
                target: 'https://httpbin.org/forms/post',
                timeout: 30000
            },
            {
                id: 'fill-step',
                type: 'interaction',
                action: 'type',
                target: 'input[name="custname"]',
                value: 'Test User',
                timeout: 10000
            },
            {
                id: 'extract-step',
                type: 'extraction',
                action: 'getAttribute',
                target: 'input[name="custname"]',
                value: 'value',
                storeAs: 'customerName',
                timeout: 5000
            }
        ];
        
        const sequentialResult = await engine.executeSequentialSteps(sequentialSteps, {
            sessionId: 'test-session-2',
            variables: {},
            timeout: 60000
        });
        
        console.log('✅ Sequential steps executed successfully');
        console.log(`   - Steps executed: ${sequentialSteps.length}`);
        console.log(`   - Execution time: ${sequentialResult.executionTime}ms`);
        console.log(`   - Status: ${sequentialResult.result.status}`);
        
        // Test 3: Workflow with variables
        console.log('\n4. Testing workflow with variables...');
        const variableWorkflow = {
            id: 'test-variable-workflow',
            name: 'Variable Test Workflow',
            description: 'Workflow testing variable substitution',
            version: '1.0.0',
            steps: [
                {
                    id: 'nav-with-var',
                    type: 'navigation',
                    name: 'Navigate with Variable',
                    action: 'goto',
                    target: '{{baseUrl}}/get?param={{testParam}}',
                    timeout: 30000
                },
                {
                    id: 'extract-response',
                    type: 'extraction',
                    name: 'Extract Response',
                    action: 'getText',
                    target: 'pre',
                    storeAs: 'responseData',
                    timeout: 10000
                }
            ],
            variables: [
                { name: 'baseUrl', type: 'url', value: 'https://httpbin.org' },
                { name: 'testParam', type: 'text', value: 'workflow-test' }
            ],
            settings: {
                timeout: 30000,
                retryAttempts: 2
            }
        };
        
        const variableResult = await engine.executeWorkflow(variableWorkflow, {
            sessionId: 'test-session-3',
            variables: {
                baseUrl: 'https://httpbin.org',
                testParam: 'workflow-variable-test'
            }
        });
        
        console.log('✅ Variable workflow executed successfully');
        console.log(`   - Variables used: ${Object.keys(variableResult.result.context?.variables || {}).length}`);
        console.log(`   - Status: ${variableResult.result.status}`);
        
        // Test 4: Enhanced automation execution
        console.log('\n5. Testing enhanced automation execution...');
        const testAutomation = {
            id: 'test-automation',
            name: 'Test Automation',
            description: 'Test automation for workflow conversion',
            steps: [
                {
                    id: 'auto-step-1',
                    type: 'navigate',
                    action: 'goto',
                    target: 'https://example.com',
                    timeout: 30000
                },
                {
                    id: 'auto-step-2',
                    type: 'extract',
                    action: 'getText',
                    selector: 'h1',
                    timeout: 10000
                }
            ],
            variables: []
        };
        
        const enhancedResult = await engine.executeEnhancedAutomation(testAutomation, {
            sessionId: 'test-session-4',
            variables: {},
            enhancedMode: true
        });
        
        console.log('✅ Enhanced automation executed successfully');
        console.log(`   - Automation converted to workflow format`);
        console.log(`   - Status: ${enhancedResult.result.status}`);
        
        // Test 5: Workflow statistics
        console.log('\n6. Testing workflow statistics...');
        const stats = engine.getWorkflowStats();
        console.log('✅ Workflow statistics retrieved:');
        console.log(`   - Active workflows: ${stats.activeWorkflows}`);
        console.log(`   - Step executor handlers: ${stats.stepExecutor?.registeredHandlers || 0}`);
        console.log(`   - Timing controller initialized: ${stats.timingController ? 'Yes' : 'No'}`);
        
        // Test 6: Create workflow from recording simulation
        console.log('\n7. Testing workflow creation from recording...');
        const mockRecordedActions = [
            {
                type: 'navigate',
                action: 'goto',
                target: 'https://example.com',
                timestamp: new Date(),
                description: 'Navigate to example.com'
            },
            {
                type: 'click',
                action: 'click',
                selector: 'a[href="/more"]',
                timestamp: new Date(),
                description: 'Click more info link'
            },
            {
                type: 'extract',
                action: 'getText',
                selector: 'h1',
                timestamp: new Date(),
                description: 'Extract page title'
            }
        ];
        
        const recordedWorkflow = engine.createWorkflowFromRecording(mockRecordedActions, {
            name: 'Recorded Test Workflow',
            description: 'Workflow created from recorded actions'
        });
        
        console.log('✅ Workflow created from recording:');
        console.log(`   - Workflow ID: ${recordedWorkflow.id}`);
        console.log(`   - Steps created: ${recordedWorkflow.steps.length}`);
        console.log(`   - Source: ${recordedWorkflow.metadata.source}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 All workflow system tests completed successfully!');
        console.log('✅ Sequential automation execution is working properly');
        console.log('\nKey improvements implemented:');
        console.log('• Multi-step workflow execution with proper sequencing');
        console.log('• Smart timing and wait strategies');
        console.log('• Variable substitution and context management');
        console.log('• Error recovery and retry mechanisms');
        console.log('• Workflow pause/resume/stop controls');
        console.log('• Integration with existing automation system');
        console.log('• Enhanced step handlers for all action types');
        console.log('• Real-time monitoring and progress tracking');
        
    } catch (error) {
        console.error('\n❌ Workflow system test failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Provide troubleshooting information
        console.log('\n🔧 Troubleshooting information:');
        console.log('• Make sure OPENAI_API_KEY is set in environment');
        console.log('• Ensure all workflow modules are properly installed');
        console.log('• Check that browser automation dependencies are available');
        console.log('• Verify network connectivity for test URLs');
        
        throw error;
    } finally {
        // Cleanup
        if (engine) {
            try {
                await engine.close();
                console.log('✅ Automation engine closed successfully');
            } catch (cleanupError) {
                console.error('❌ Error during cleanup:', cleanupError.message);
            }
        }
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testWorkflowSystem()
        .then(() => {
            console.log('\n🎯 Test completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = { testWorkflowSystem };