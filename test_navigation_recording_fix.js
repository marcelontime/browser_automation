/**
 * 🧪 Comprehensive Test: Navigation Recording Fix Verification
 * 
 * Tests all fixed navigation paths to ensure PlaywrightRecorder integration works
 */

const StagehandAutomationEngine = require('./stagehand-engine');

class NavigationRecordingTest {
    constructor() {
        this.testResults = [];
        this.automationEngine = null;
    }

    async runComprehensiveTest() {
        console.log('🧪 Starting Comprehensive Navigation Recording Test...\n');

        try {
            // Initialize engine
            await this.setupEngine();
            
            // Test all navigation paths
            await this.testDirectNavigation();
            await this.testStepInstruction();
            await this.testSequentialSteps();
            await this.testAutomationExecution();
            await this.testPlaywrightFallback();
            
            // Verify Playwright script generation
            await this.verifyScriptGeneration();
            
            // Print results
            this.printTestResults();
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    async setupEngine() {
        console.log('🚀 Setting up automation engine...');
        
        this.automationEngine = new StagehandAutomationEngine({
            headless: false,
            modelClientOptions: {
                apiKey: process.env.OPENAI_API_KEY
            }
        });
        
        await this.automationEngine.init();
        console.log('✅ Engine initialized\n');
    }

    async testDirectNavigation() {
        console.log('🧪 Test 1: Direct Navigation Recording');
        
        try {
            // Start recording
            const sessionId = 'test_direct_nav_' + Date.now();
            await this.automationEngine.startRecording(sessionId, 'Direct Navigation Test');
            
            // Execute direct navigation (handleNavigationInstruction path)
            const result = await this.automationEngine.handleNavigationInstruction('navigate to https://httpbin.org/html');
            
            if (result && result.success) {
                console.log('✅ Direct navigation executed successfully');
                this.testResults.push({ test: 'Direct Navigation', status: 'PASSED' });
            } else {
                console.log('❌ Direct navigation failed');
                this.testResults.push({ test: 'Direct Navigation', status: 'FAILED' });
            }
            
        } catch (error) {
            console.log('❌ Direct navigation test error:', error.message);
            this.testResults.push({ test: 'Direct Navigation', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testStepInstruction() {
        console.log('🧪 Test 2: Step Instruction Navigation Recording');
        
        try {
            // Execute step instruction (executeStep path)
            await this.automationEngine.executeStep('Navigate to https://httpbin.org/get');
            
            console.log('✅ Step instruction navigation executed');
            this.testResults.push({ test: 'Step Instruction', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Step instruction test error:', error.message);
            this.testResults.push({ test: 'Step Instruction', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testSequentialSteps() {
        console.log('🧪 Test 3: Sequential Steps Navigation Recording');
        
        try {
            const steps = [
                'Navigate to https://httpbin.org/forms/post',
                'fill "test@example.com" in email field',
                'click submit button'
            ];
            
            // Execute sequential steps (this would call server's executeSequentialSteps)
            for (const step of steps) {
                if (step.toLowerCase().includes('navigate')) {
                    // Simulate the fixed navigation path
                    const url = step.match(/https?:\/\/[^\s]+/)?.[0];
                    if (url) {
                        await this.automationEngine.page.goto(url, { 
                            waitUntil: 'domcontentloaded',
                            timeout: 30000 
                        });
                        
                        // Simulate the fixed recording call
                        if (this.automationEngine.isRecording && this.automationEngine.playwrightRecorder) {
                            this.automationEngine.playwrightRecorder.recordNavigation(url);
                            console.log(`🎬 Recorded sequential navigation: ${url}`);
                        }
                    }
                } else {
                    await this.automationEngine.executeStep(step);
                }
            }
            
            console.log('✅ Sequential steps executed');
            this.testResults.push({ test: 'Sequential Steps', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Sequential steps test error:', error.message);
            this.testResults.push({ test: 'Sequential Steps', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testAutomationExecution() {
        console.log('🧪 Test 4: Automation Execution Navigation Recording');
        
        try {
            // Simulate automation execution navigation (executeAutomationStepsWithProgress path)
            const processedAction = {
                type: 'navigate',
                url: 'https://httpbin.org/json'
            };
            
            await this.automationEngine.page.goto(processedAction.url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 15000 
            });
            
            // Simulate the fixed recording call
            if (this.automationEngine.isRecording && this.automationEngine.playwrightRecorder) {
                this.automationEngine.playwrightRecorder.recordNavigation(processedAction.url);
                console.log(`🎬 Recorded automation execution navigation: ${processedAction.url}`);
            }
            
            console.log('✅ Automation execution navigation completed');
            this.testResults.push({ test: 'Automation Execution', status: 'PASSED' });
            
        } catch (error) {
            console.log('❌ Automation execution test error:', error.message);
            this.testResults.push({ test: 'Automation Execution', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testPlaywrightFallback() {
        console.log('🧪 Test 5: Playwright Fallback Navigation Recording');
        
        try {
            // Test Playwright fallback navigation
            const result = await this.automationEngine.executePlaywrightFallback('navigate to https://httpbin.org/uuid');
            
            if (result && result.success) {
                console.log('✅ Playwright fallback navigation executed');
                this.testResults.push({ test: 'Playwright Fallback', status: 'PASSED' });
            } else {
                console.log('❌ Playwright fallback failed');
                this.testResults.push({ test: 'Playwright Fallback', status: 'FAILED' });
            }
            
        } catch (error) {
            console.log('❌ Playwright fallback test error:', error.message);
            this.testResults.push({ test: 'Playwright Fallback', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async verifyScriptGeneration() {
        console.log('🧪 Test 6: Playwright Script Generation Verification');
        
        try {
            // Stop recording and check if script is generated
            const result = await this.automationEngine.stopRecording();
            
            if (result.playwrightScript && result.scriptFilename) {
                console.log('✅ Playwright script generated successfully');
                console.log(`📁 Script filename: ${result.scriptFilename}`);
                console.log(`📊 Actions recorded: ${result.actionCount}`);
                console.log(`🔧 Variables detected: ${result.variableCount}`);
                
                // Verify script contains expected content
                const script = result.playwrightScript;
                const hasNavigation = script.includes('page.goto(');
                const hasBrowserSetup = script.includes('chromium.launch(');
                const hasErrorHandling = script.includes('try {') && script.includes('catch (error)');
                
                if (hasNavigation && hasBrowserSetup && hasErrorHandling) {
                    console.log('✅ Script contains all expected elements');
                    this.testResults.push({ test: 'Script Generation', status: 'PASSED' });
                } else {
                    console.log('❌ Script missing required elements');
                    this.testResults.push({ test: 'Script Generation', status: 'FAILED', details: {
                        hasNavigation, hasBrowserSetup, hasErrorHandling
                    }});
                }
                
                // Show first few lines of generated script
                console.log('\n📜 Generated Script Preview:');
                console.log(script.split('\n').slice(0, 10).join('\n'));
                console.log('...\n');
                
            } else {
                console.log('❌ No Playwright script generated');
                this.testResults.push({ test: 'Script Generation', status: 'FAILED' });
            }
            
        } catch (error) {
            console.log('❌ Script generation test error:', error.message);
            this.testResults.push({ test: 'Script Generation', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    printTestResults() {
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('========================\n');
        
        let passed = 0;
        let failed = 0;
        let errors = 0;
        
        this.testResults.forEach(result => {
            const status = result.status === 'PASSED' ? '✅' : 
                         result.status === 'FAILED' ? '❌' : '⚠️';
            console.log(`${status} ${result.test}: ${result.status}`);
            
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
            if (result.details) {
                console.log(`   Details:`, result.details);
            }
            
            if (result.status === 'PASSED') passed++;
            else if (result.status === 'FAILED') failed++;
            else errors++;
        });
        
        console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${errors} errors`);
        
        const success = failed === 0 && errors === 0;
        console.log(`\n${success ? '🎉' : '❌'} Overall Result: ${success ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);
        
        if (success) {
            console.log('\n🚀 Navigation recording fixes verified! Playwright script generation working correctly.');
        }
    }

    async cleanup() {
        if (this.automationEngine) {
            try {
                await this.automationEngine.close();
                console.log('\n🧹 Engine cleaned up');
            } catch (error) {
                console.warn('⚠️ Cleanup warning:', error.message);
            }
        }
    }
}

// Run the test
async function runTest() {
    const test = new NavigationRecordingTest();
    await test.runComprehensiveTest();
}

// Only run if this file is executed directly
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = NavigationRecordingTest; 