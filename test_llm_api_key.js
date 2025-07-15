const WebSocket = require('ws');
const https = require('https');

class LLMApiKeyTester {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.responses = [];
        this.testSteps = [
            "Navigate to https://azut1-br-digital.azurewebsites.net/login",
            "fill the CPF field with 381.151.977-85",
            "fill the password field with Akad@2025",
            "click the login button"
        ];
        this.currentStep = 0;
        this.stepTimeout = 30000; // 30 seconds per step
    }

    async getAuthToken() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 7079,
                path: '/get-token',
                method: 'GET',
                rejectUnauthorized: false
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        resolve(response.token);
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                // Try HTTP instead of HTTPS
                const http = require('http');
                const httpOptions = { ...options };
                delete httpOptions.rejectUnauthorized;
                
                const httpReq = http.request(httpOptions, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            resolve(response.token);
                        } catch (error) {
                            reject(error);
                        }
                    });
                });

                httpReq.on('error', reject);
                httpReq.end();
            });

            req.end();
        });
    }

    async connect() {
        try {
            console.log('🔑 Getting authentication token...');
            const token = await this.getAuthToken();
            console.log('✅ Token received');

            console.log('🔌 Connecting to WebSocket server...');
            this.ws = new WebSocket(`ws://localhost:7079?token=${token}`);

            return new Promise((resolve, reject) => {
                this.ws.on('open', () => {
                    console.log('✅ Connected to server');
                    this.connected = true;
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(JSON.parse(data));
                });

                this.ws.on('close', () => {
                    console.log('🔌 Connection closed');
                    this.connected = false;
                });

                this.ws.on('error', (error) => {
                    console.error('❌ WebSocket error:', error.message);
                    reject(error);
                });

                setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
            });
        } catch (error) {
            console.error('❌ Connection failed:', error.message);
            throw error;
        }
    }

    handleMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`📨 [${timestamp}] Received:`, {
            type: message.type,
            message: message.message || 'No message'
        });

        this.responses.push({
            timestamp,
            step: this.currentStep,
            message
        });

        // Check for specific message types
        if (message.type === 'processing') {
            console.log(`🤖 Processing: ${message.message}`);
        } else if (message.type === 'error') {
            console.log(`❌ Error: ${message.message}`);
            
            // Check if it's the API key error
            if (message.message.includes('No LLM API key')) {
                console.log('🔍 API KEY ERROR DETECTED!');
                console.log('🔍 This confirms the API key is not being passed correctly to Stagehand');
                this.analyzeApiKeyIssue();
            }
        } else if (message.type === 'navigation_complete' || message.type === 'action_executed') {
            console.log(`✅ Success: ${message.message}`);
            this.proceedToNextStep();
        } else if (message.type === 'screenshot') {
            console.log(`📸 Screenshot received (${message.url})`);
        }
    }

    analyzeApiKeyIssue() {
        console.log('\n🔍 API KEY ANALYSIS:');
        console.log('==================');
        console.log('1. Environment variable check needed');
        console.log('2. Server configuration check needed');
        console.log('3. Stagehand initialization check needed');
        console.log('4. Profile manager configuration check needed');
        console.log('\nRecommendation: Debug the API key flow step by step');
    }

    sendCommand(command) {
        if (!this.connected) {
            console.error('❌ Not connected to server');
            return;
        }

        console.log(`📤 [Step ${this.currentStep + 1}/${this.testSteps.length}] Sending: "${command}"`);
        
        this.ws.send(JSON.stringify({
            type: 'chat_instruction',
            message: command
        }));

        // Set timeout for this step
        setTimeout(() => {
            if (this.currentStep < this.testSteps.length) {
                console.log(`⏱️ Step ${this.currentStep + 1} timeout - proceeding to next step`);
                this.proceedToNextStep();
            }
        }, this.stepTimeout);
    }

    proceedToNextStep() {
        this.currentStep++;
        
        if (this.currentStep < this.testSteps.length) {
            console.log(`\n➡️ Proceeding to step ${this.currentStep + 1}/${this.testSteps.length}`);
            setTimeout(() => {
                this.sendCommand(this.testSteps[this.currentStep]);
            }, 2000); // Wait 2 seconds between steps
        } else {
            this.completeTest();
        }
    }

    completeTest() {
        console.log('\n🎉 TEST COMPLETED');
        console.log('=================');
        
        const errorResponses = this.responses.filter(r => r.message.type === 'error');
        const successResponses = this.responses.filter(r => 
            r.message.type === 'navigation_complete' || 
            r.message.type === 'action_executed'
        );

        console.log(`✅ Successful steps: ${successResponses.length}`);
        console.log(`❌ Failed steps: ${errorResponses.length}`);

        if (errorResponses.length > 0) {
            console.log('\n❌ ERRORS FOUND:');
            errorResponses.forEach((resp, i) => {
                console.log(`${i + 1}. Step ${resp.step + 1}: ${resp.message.message}`);
            });
        }

        console.log('\n📊 SUMMARY:');
        console.log(`Total steps tested: ${this.testSteps.length}`);
        console.log(`Success rate: ${((successResponses.length / this.testSteps.length) * 100).toFixed(1)}%`);
        
        if (errorResponses.some(r => r.message.message.includes('No LLM API key'))) {
            console.log('\n🔧 RECOMMENDATION:');
            console.log('The API key issue needs to be resolved before proceeding with MCP testing');
            console.log('Check the server logs for API key configuration details');
        }

        // Close connection
        if (this.ws) {
            this.ws.close();
        }
    }

    async runTest() {
        try {
            console.log('🚀 STARTING LLM API KEY TEST');
            console.log('============================');
            console.log('Target: http://localhost:7079');
            console.log('Testing Brazilian Insurance Login Steps');
            console.log('');

            await this.connect();
            
            // Wait for initial connection and engine initialization
            setTimeout(() => {
                console.log('\n🎯 Starting automation test...');
                this.sendCommand(this.testSteps[0]);
            }, 3000);

        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }
}

// Run the test
const tester = new LLMApiKeyTester();
tester.runTest().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Test interrupted by user');
    if (tester.ws) {
        tester.ws.close();
    }
    process.exit(0);
}); 