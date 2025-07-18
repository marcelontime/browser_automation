/**
 * Test Live Recording Workflow
 * Demonstrates the correct order: Start Recording → Perform Actions → Stop Recording
 */

const StagehandAutomationEngine = require('./stagehand-engine');

async function testLiveRecording() {
    console.log('🧪 Testing Live Recording Workflow...');
    
    try {
        // Initialize the engine
        const engine = new StagehandAutomationEngine({
            headless: false,
            modelClientOptions: {
                apiKey: process.env.OPENAI_API_KEY
            }
        });
        
        await engine.init();
        console.log('✅ Engine initialized');
        
        // Step 1: Start Recording FIRST
        console.log('\n🎬 Step 1: Starting recording...');
        const sessionId = Date.now().toString();
        await engine.startRecording(sessionId, { name: 'live_test_automation' });
        console.log('✅ Recording started - now actions will be captured');
        
        // Step 2: Perform actions WHILE recording is active
        console.log('\n🚀 Step 2: Performing actions during recording...');
        
        // Action 1: Navigate
        console.log('📍 Action 1: Navigate to login page...');
        await engine.processInstruction('go to https://azut1-br-digital.azurewebsites.net/login');
        
        // Action 2: Fill CPF
        console.log('📝 Action 2: Fill CPF field...');
        await engine.processInstruction('fill "381.151.977-85" in the CPF field');
        
        // Action 3: Fill password
        console.log('🔐 Action 3: Fill password field...');
        await engine.processInstruction('fill "Akad@2025" in the password field');
        
        // Action 4: Click login
        console.log('🖱️ Action 4: Click login button...');
        await engine.processInstruction('click the login button');
        
        // Step 3: Stop recording and get script
        console.log('\n⏹️ Step 3: Stopping recording...');
        const result = await engine.stopRecording();
        
        console.log('\n🎬 Generated Playwright Script:');
        console.log('=====================================');
        if (result.playwrightScript) {
            console.log(result.playwrightScript);
        } else {
            console.log('❌ No script generated');
        }
        console.log('=====================================\n');
        
        console.log(`📊 Results:`);
        console.log(`   - Actions captured: ${result.actionCount || 0}`);
        console.log(`   - Variables detected: ${result.variableCount || 0}`);
        if (result.scriptFilename) {
            console.log(`   - Script saved as: ${result.scriptFilename}`);
        }
        
        // Cleanup
        await engine.close();
        
        return result;
        
    } catch (error) {
        console.error('❌ Live recording test failed:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testLiveRecording()
        .then((result) => {
            if (result.playwrightScript) {
                console.log('🎉 Live recording test passed!');
                console.log(`✅ Generated ${result.playwrightScript.split('\n').length} lines of Playwright code`);
            } else {
                console.log('⚠️ Test completed but no script generated');
            }
        })
        .catch(error => {
            console.error('💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = testLiveRecording; 