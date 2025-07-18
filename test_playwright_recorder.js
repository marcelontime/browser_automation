/**
 * Test PlaywrightRecorder to ensure it generates correct Playwright scripts
 */
const PlaywrightRecorder = require('./modules/recording/playwright-recorder');

async function testPlaywrightRecorder() {
    console.log('🧪 Testing PlaywrightRecorder...');
    
    try {
        // Create a new recorder
        const recorder = new PlaywrightRecorder({
            skipErrors: true,
            generateComments: true
        });
        
        // Start recording
        const sessionId = 'test_session_' + Date.now();
        const automationName = 'test_login_automation';
        recorder.startRecording(sessionId, automationName);
        
        // Simulate recording some actions
        console.log('📹 Recording simulated actions...');
        
        // Navigation
        recorder.recordNavigation('https://azut1-br-digital.azurewebsites.net/login');
        
        // Fill CPF
        recorder.recordFormFill('cpf', '381.151.977-85');
        
        // Fill password
        recorder.recordFormFill('password', 'Akad@2025');
        
        // Click login button
        recorder.recordClick('login button');
        
        // Stop recording and get generated script
        console.log('⏹️ Stopping recording...');
        const result = recorder.stopRecording();
        
        console.log('\n🎬 Generated Playwright Script:');
        console.log('=====================================');
        console.log(result.script);
        console.log('=====================================\n');
        
        console.log(`✅ Test completed successfully!`);
        console.log(`📊 Results:`);
        console.log(`   - Actions recorded: ${result.actionCount}`);
        console.log(`   - Variables detected: ${result.variableCount}`);
        console.log(`   - Script filename: ${result.filename}`);
        console.log(`   - Variables: ${result.session.variables.map(v => v.name).join(', ')}`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testPlaywrightRecorder()
        .then(() => console.log('🎉 All tests passed!'))
        .catch(error => {
            console.error('💥 Test failed:', error.message);
            process.exit(1);
        });
}

module.exports = testPlaywrightRecorder; 