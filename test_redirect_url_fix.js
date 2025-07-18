/**
 * 🧪 Test: Redirect URL Detection Fix
 * 
 * Tests that PlaywrightRecorder captures the correct URL after redirects
 */

const PlaywrightRecorder = require('./modules/recording/playwright-recorder');

class RedirectUrlTest {
    constructor() {
        this.testResults = [];
    }

    async runTest() {
        console.log('🧪 Testing Redirect URL Detection Fix...\n');

        try {
            await this.testBasicRecording();
            await this.testRedirectDetection();
            await this.testMultipleFormFields();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            throw error;
        }
    }

    async testBasicRecording() {
        console.log('🧪 Test 1: Basic Recording (No Redirect)');
        
        try {
            const recorder = new PlaywrightRecorder();
            recorder.startRecording('test_basic', 'Basic Recording Test');
            
            // Record initial navigation
            recorder.recordNavigation('https://example.com/login');
            
            // Record form fill without redirect
            recorder.recordFormFill('email', 'test@example.com', null, 'https://example.com/login');
            
            const result = recorder.stopRecording();
            const script = result.script;
            
            // Verify script contains correct URL
            if (script.includes("await page.goto('https://example.com/login');")) {
                console.log('✅ Basic recording: URL captured correctly');
                this.testResults.push({ test: 'Basic Recording', status: 'PASSED' });
            } else {
                console.log('❌ Basic recording: URL not found in script');
                this.testResults.push({ test: 'Basic Recording', status: 'FAILED' });
            }
            
        } catch (error) {
            console.log('❌ Basic recording error:', error.message);
            this.testResults.push({ test: 'Basic Recording', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testRedirectDetection() {
        console.log('🧪 Test 2: Redirect Detection');
        
        try {
            const recorder = new PlaywrightRecorder();
            recorder.startRecording('test_redirect', 'Redirect Detection Test');
            
            // Record initial navigation (what user enters)
            recorder.recordNavigation('https://app.example.com/login');
            
            // Record form fill on redirected URL (where forms actually are)
            recorder.recordFormFill('cpf', '381.151.977-85', null, 'https://accounts.google.com/signin');
            
            const result = recorder.stopRecording();
            const script = result.script;
            
            console.log('📜 Generated script preview:');
            console.log(script.split('\n').slice(0, 15).join('\n'));
            console.log('...\n');
            
            // Verify script was updated to use the redirect URL
            if (script.includes("await page.goto('https://accounts.google.com/signin');")) {
                console.log('✅ Redirect detection: URL updated correctly');
                this.testResults.push({ test: 'Redirect Detection', status: 'PASSED' });
            } else if (script.includes("await page.goto('https://app.example.com/login');")) {
                console.log('❌ Redirect detection: Still using original URL');
                this.testResults.push({ test: 'Redirect Detection', status: 'FAILED', 
                    details: 'Script still contains original URL instead of redirect URL' });
            } else {
                console.log('❌ Redirect detection: No navigation found');
                this.testResults.push({ test: 'Redirect Detection', status: 'FAILED',
                    details: 'No navigation URL found in script' });
            }
            
        } catch (error) {
            console.log('❌ Redirect detection error:', error.message);
            this.testResults.push({ test: 'Redirect Detection', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    async testMultipleFormFields() {
        console.log('🧪 Test 3: Multiple Form Fields with Redirect');
        
        try {
            const recorder = new PlaywrightRecorder();
            recorder.startRecording('test_multiple', 'Multiple Fields Test');
            
            // Record initial navigation
            recorder.recordNavigation('https://azut1-br-digital.azurewebsites.net/login');
            
            // Record multiple form fills on redirected URL
            recorder.recordFormFill('cpf', '381.151.977-85', null, 'https://accounts.google.com/signin/v2');
            recorder.recordFormFill('password', 'Akad@2025', null, 'https://accounts.google.com/signin/v2');
            
            const result = recorder.stopRecording();
            const script = result.script;
            
            // Verify both redirect detection and multiple form fields
            const hasRedirectUrl = script.includes('accounts.google.com/signin/v2');
            const hasCpfField = script.includes('${CPF_NUMBER}');
            const hasPasswordField = script.includes('${USER_PASSWORD}');
            
            if (hasRedirectUrl && hasCpfField && hasPasswordField) {
                console.log('✅ Multiple fields: Redirect URL and all fields captured');
                this.testResults.push({ test: 'Multiple Form Fields', status: 'PASSED' });
            } else {
                console.log('❌ Multiple fields: Missing elements');
                this.testResults.push({ test: 'Multiple Form Fields', status: 'FAILED', 
                    details: { hasRedirectUrl, hasCpfField, hasPasswordField } });
            }
            
        } catch (error) {
            console.log('❌ Multiple fields error:', error.message);
            this.testResults.push({ test: 'Multiple Form Fields', status: 'ERROR', error: error.message });
        }
        
        console.log('');
    }

    printResults() {
        console.log('📊 REDIRECT URL TEST RESULTS');
        console.log('=============================\n');
        
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
        console.log(`\n${success ? '🎉' : '❌'} Overall Result: ${success ? 'REDIRECT URL FIX WORKING' : 'ISSUES DETECTED'}`);
        
        if (success) {
            console.log('\n🚀 Redirect URL detection fix verified! Generated scripts will use correct URLs.');
        } else {
            console.log('\n🔧 Some issues detected. Review the failed tests above.');
        }
    }
}

// Run the test
async function runTest() {
    const test = new RedirectUrlTest();
    await test.runTest();
}

// Only run if this file is executed directly
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = RedirectUrlTest; 