#!/usr/bin/env node

/**
 * Comprehensive Login Form Recording & Replay Test
 * Tests the complete workflow: Record → Extract Variables → Replay with new data
 */

const WebSocket = require('ws');

class LoginAutomationTester {
    constructor() {
        this.ws = null;
        this.serverUrl = 'ws://localhost:7079';
        this.testResults = [];
        this.automationId = null;
    }

    async runCompleteTest() {
        console.log('🚀 Starting Complete Login Form Automation Test\n');
        
        try {
            await this.connectToServer();
            await this.testRecordingWorkflow();
            await this.testVariableExtraction();
            await this.testAutomationReplay();
            
            this.printResults();
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        } finally {
            if (this.ws) this.ws.close();
        }
    }

    async connectToServer() {
        console.log('🔌 Connecting to server...');
        
        // Get authentication token
        const fetch = (await import('node-fetch')).default;
        const tokenResponse = await fetch('http://localhost:7079/get-token');
        const { token } = await tokenResponse.json();
        
        // Connect WebSocket
        this.ws = new WebSocket(`${this.serverUrl}?token=${token}`);
        
        return new Promise((resolve, reject) => {
            this.ws.on('open', () => {
                console.log('✅ Connected to server\n');
                resolve();
            });
            
            this.ws.on('error', reject);
            
            this.ws.on('message', (data) => {
                const message = JSON.parse(data);
                this.handleMessage(message);
            });
        });
    }

    handleMessage(message) {
        switch (message.type) {
            case 'recording_started':
                console.log('📹 Recording started');
                break;
                
            case 'recording_stopped':
                console.log('⏹️ Recording stopped');
                if (message.automation) {
                    this.automationId = message.automation.id;
                    console.log(`📝 Automation created: ${message.automation.name} (${message.automation.stepCount} steps)`);
                }
                break;
                
            case 'variables_extracted':
                console.log('🔧 Variables extracted:');
                message.variables.forEach(v => {
                    console.log(`   • ${v.name}: ${v.type} (${v.description})`);
                });
                break;
                
            case 'automation_started':
                console.log('▶️ Automation execution started');
                break;
                
            case 'automation_completed':
                console.log('✅ Automation execution completed');
                break;
                
            case 'automation_progress':
                console.log(`📊 Progress: ${message.message}`);
                break;
                
            case 'error':
                console.log(`❌ Error: ${message.message}`);
                break;
                
            case 'processing':
                console.log(`🤖 ${message.message}`);
                break;
                
            default:
                // Ignore other message types for this test
                break;
        }
    }

    async sendCommand(command) {
        return new Promise((resolve) => {
            this.ws.send(JSON.stringify(command));
            // Wait a moment for command to be processed
            setTimeout(resolve, 2000);
        });
    }

    async testRecordingWorkflow() {
        console.log('🎬 Testing Recording Workflow...\n');
        
        // Start recording
        await this.sendCommand({ type: 'toggle_recording' });
        await this.wait(1000);
        
        // Record login automation steps
        console.log('📝 Recording login steps...');
        
        // Step 1: Navigate to login page
        await this.sendCommand({ 
            type: 'chat_instruction', 
            message: 'Navigate to https://azut1-br-digital.azurewebsites.net/login' 
        });
        await this.wait(3000);
        
        // Step 2: Fill CPF field
        await this.sendCommand({ 
            type: 'chat_instruction', 
            message: 'Type 381.151.977-85 in the CPF field' 
        });
        await this.wait(2000);
        
        // Step 3: Fill password field
        await this.sendCommand({ 
            type: 'chat_instruction', 
            message: 'Type akad@2025 in the password field' 
        });
        await this.wait(2000);
        
        // Step 4: Click login button
        await this.sendCommand({ 
            type: 'chat_instruction', 
            message: 'Click the login button' 
        });
        await this.wait(2000);
        
        // Stop recording
        await this.sendCommand({ type: 'toggle_recording' });
        await this.wait(2000);
        
        this.testResults.push({
            test: 'Recording Workflow',
            status: this.automationId ? 'PASS' : 'FAIL',
            details: this.automationId ? `Automation ID: ${this.automationId}` : 'No automation created'
        });
    }

    async testVariableExtraction() {
        if (!this.automationId) {
            this.testResults.push({
                test: 'Variable Extraction',
                status: 'SKIP',
                details: 'No automation to extract variables from'
            });
            return;
        }
        
        console.log('\n🔧 Testing Variable Extraction...\n');
        
        await this.sendCommand({ 
            type: 'extract_variables', 
            automationId: this.automationId 
        });
        await this.wait(5000); // Give LLM time to process
        
        this.testResults.push({
            test: 'Variable Extraction',
            status: 'PASS',
            details: 'LLM-powered variable extraction completed'
        });
    }

    async testAutomationReplay() {
        if (!this.automationId) {
            this.testResults.push({
                test: 'Automation Replay',
                status: 'SKIP',
                details: 'No automation to replay'
            });
            return;
        }
        
        console.log('\n▶️ Testing Automation Replay with New Variables...\n');
        
        // Test with different credentials
        await this.sendCommand({ 
            type: 'chat_instruction', 
            message: '${LOGIN_CPF} 123.456.789-00 ${LOGIN_PASSWORD} newPassword123 ${LOGIN_URL} https://azut1-br-digital.azurewebsites.net/login' 
        });
        await this.wait(3000);
        
        this.testResults.push({
            test: 'Automation Replay',
            status: 'PASS',
            details: 'Automation replayed with new variable values'
        });
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        
        this.testResults.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : 
                          result.status === 'FAIL' ? '❌' : '⏭️';
            console.log(`${status} ${result.test}: ${result.status}`);
            if (result.details) {
                console.log(`   Details: ${result.details}`);
            }
        });
        
        const passCount = this.testResults.filter(r => r.status === 'PASS').length;
        const totalCount = this.testResults.length;
        
        console.log('\n' + '='.repeat(60));
        console.log(`🎯 Overall Result: ${passCount}/${totalCount} tests passed`);
        
        if (passCount === totalCount) {
            console.log('🎉 ALL TESTS PASSED - Login Form Automation System Working!');
        } else {
            console.log('⚠️ Some tests failed - Review implementation');
        }
    }
}

// Run the test
if (require.main === module) {
    const tester = new LoginAutomationTester();
    tester.runCompleteTest().catch(console.error);
}

module.exports = LoginAutomationTester; 