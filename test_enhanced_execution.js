/**
 * 🧪 TEST ENHANCED EXECUTION SYSTEM
 * 
 * Test the enhanced automation execution with progress tracking
 */

const StagehandBrowserAutomationServer = require('./server');

async function testEnhancedExecution() {
    console.log('🧪 Testing Enhanced Execution System...');
    
    try {
        // Create server instance
        const server = new StagehandBrowserAutomationServer({
            port: 7080 // Use different port for testing
        });
        
        // Test ExecutionProgressManager integration
        console.log('\n1️⃣ Testing ExecutionProgressManager integration...');
        
        // Check if ExecutionProgressManager is initialized
        if (server.executionProgressManager) {
            console.log('✅ ExecutionProgressManager initialized');
            
            // Test basic functionality
            const testExecutionId = server.executionProgressManager.startExecution(
                'test-automation', 
                'test-session', 
                {
                    totalSteps: 3,
                    automationName: 'Test Integration',
                    variables: { test: 'value' }
                }
            );
            
            console.log(`✅ Test execution started: ${testExecutionId}`);
            
            // Test progress updates
            server.executionProgressManager.updateProgress(testExecutionId, 1, {
                success: true,
                action: 'navigate',
                duration: 1000
            });
            
            server.executionProgressManager.updateProgress(testExecutionId, 2, {
                success: true,
                action: 'fill',
                duration: 500
            });
            
            server.executionProgressManager.updateProgress(testExecutionId, 3, {
                success: true,
                action: 'click',
                duration: 300
            });
            
            // Complete execution
            server.executionProgressManager.completeExecution(testExecutionId, {
                success: true,
                totalSteps: 3
            });
            
            console.log('✅ Test execution completed');
            
            // Get execution status
            const status = server.executionProgressManager.getExecutionStatus(testExecutionId);
            console.log('✅ Execution status retrieved:', {
                executionId: status.executionId,
                status: status.status,
                progress: status.progress,
                duration: status.duration
            });
            
        } else {
            console.error('❌ ExecutionProgressManager not initialized');
        }
        
        console.log('\n2️⃣ Testing server methods...');
        
        // Test if new methods exist
        const methods = [
            'handlePauseExecution',
            'handleResumeExecution', 
            'handleStopExecution',
            'handleGetExecutionStatus',
            'executeAutomationStepsWithProgress'
        ];
        
        for (const method of methods) {
            if (typeof server[method] === 'function') {
                console.log(`✅ Method ${method} exists`);
            } else {
                console.error(`❌ Method ${method} missing`);
            }
        }
        
        console.log('\n3️⃣ Testing automation storage...');
        
        // Check if savedAutomations exists
        if (server.savedAutomations) {
            console.log(`✅ Automation storage initialized (${server.savedAutomations.size} automations)`);
        } else {
            console.error('❌ Automation storage not initialized');
        }
        
        console.log('\n✅ Enhanced execution system test completed successfully!');
        
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
    testEnhancedExecution().catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = testEnhancedExecution;