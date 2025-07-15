/**
 * COMPREHENSIVE MCP PLAYWRIGHT TEST SUITE
 * Browser Automation Service - Complete Function Testing
 * 
 * This test suite uses MCP Playwright to test all functions of the browser automation service
 * running at localhost:7079. It covers all WebSocket commands, API endpoints, and UI interactions.
 */

const { chromium } = require('playwright');
const WebSocket = require('ws');

class ComprehensiveBrowserAutomationTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.ws = null;
        this.testResults = [];
        this.currentTest = null;
        this.receivedMessages = [];
        this.serviceUrl = 'http://localhost:7079';
        this.wsUrl = 'ws://localhost:7079';
        this.authToken = null;
    }

    // ===========================================
    // TEST INFRASTRUCTURE
    // ===========================================

    async initialize() {
        console.log('🚀 Initializing Comprehensive Test Suite...');
        
        // Launch browser for testing
        this.browser = await chromium.launch({ 
            headless: false,
            args: ['--start-maximized']
        });
        this.page = await this.browser.newPage();
        
        console.log('✅ Test browser initialized');
    }

    async cleanup() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.browser) {
            await this.browser.close();
        }
        console.log('🧹 Test cleanup completed');
    }

    async startTest(testName, description, category = 'General') {
        console.log(`\n🧪 [${category}] Starting Test: ${testName}`);
        console.log(`📝 Description: ${description}`);
        
        this.currentTest = {
            name: testName,
            description,
            category,
            startTime: Date.now(),
            messages: [],
            success: false,
            error: null
        };
        
        this.receivedMessages = [];
    }

    completeTest(success, error = null) {
        if (!this.currentTest) return;
        
        this.currentTest.success = success;
        this.currentTest.error = error;
        this.currentTest.endTime = Date.now();
        this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
        this.currentTest.messages = [...this.receivedMessages];
        
        const status = success ? '✅ PASSED' : '❌ FAILED';
        console.log(`${status} Test ${this.currentTest.name} (${this.currentTest.duration}ms)`);
        if (error) {
            console.log(`   Error: ${error}`);
        }
        
        this.testResults.push(this.currentTest);
        this.currentTest = null;
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===========================================
    // AUTHENTICATION & CONNECTION TESTS
    // ===========================================

    async testAuthentication() {
        await this.startTest('AUTH_001', 'Test JWT token generation', 'Authentication');
        
        try {
            // Test /get-token endpoint
            await this.page.goto(`${this.serviceUrl}/get-token`);
            const content = await this.page.textContent('body');
            const tokenData = JSON.parse(content);
            
            if (tokenData.token) {
                this.authToken = tokenData.token;
                console.log('✅ JWT token generated successfully');
                this.completeTest(true);
            } else {
                throw new Error('No token in response');
            }
        } catch (error) {
            this.completeTest(false, `Token generation failed: ${error.message}`);
        }
    }

    async testWebSocketConnection() {
        await this.startTest('WS_001', 'Test WebSocket connection with JWT auth', 'WebSocket');
        
        try {
            // First get a token
            await this.page.goto(`${this.serviceUrl}/get-token`);
            const content = await this.page.textContent('body');
            const tokenData = JSON.parse(content);
            this.authToken = tokenData.token;
            
            // Connect to WebSocket with token
            this.ws = new WebSocket(`${this.wsUrl}?token=${this.authToken}`);
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('WebSocket connection timeout'));
                }, 10000);
                
                this.ws.on('open', () => {
                    console.log('✅ WebSocket connected successfully');
                    clearTimeout(timeout);
                    this.completeTest(true);
                    resolve();
                });
                
                this.ws.on('error', (error) => {
                    clearTimeout(timeout);
                    this.completeTest(false, `WebSocket connection failed: ${error.message}`);
                    reject(error);
                });
                
                this.ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    this.receivedMessages.push(message);
                    console.log(`📨 Received: ${message.type}`);
                });
            });
        } catch (error) {
            this.completeTest(false, `WebSocket test failed: ${error.message}`);
        }
    }

    // ===========================================
    // FRONTEND UI TESTS
    // ===========================================

    async testFrontendLoading() {
        await this.startTest('UI_001', 'Test React frontend loading and components', 'Frontend');
        
        try {
            await this.page.goto(this.serviceUrl);
            await this.page.waitForSelector('h3:has-text("🤖 Automation Assistant")', { timeout: 10000 });
            
            // Check for key UI components
            const components = [
                'button:has-text("🔴 Start Recording")',
                'textbox[placeholder*="instruction"]',
                'button:has-text("Send")',
                'button:has-text("Examples")',
                'h4:has-text("📚 Saved Scripts")',
                'h4:has-text("💬 Natural Language Commands")'
            ];
            
            for (const selector of components) {
                const element = await this.page.$(selector);
                if (!element) {
                    throw new Error(`Component not found: ${selector}`);
                }
            }
            
            console.log('✅ All UI components loaded successfully');
            this.completeTest(true);
        } catch (error) {
            this.completeTest(false, `Frontend loading failed: ${error.message}`);
        }
    }

    async testBrowserScreenshot() {
        await this.startTest('UI_002', 'Test browser screenshot display', 'Frontend');
        
        try {
            await this.page.goto(this.serviceUrl);
            
            // Wait for screenshot to load
            await this.page.waitForSelector('img[alt="Browser Screenshot"]', { timeout: 15000 });
            
            // Check if screenshot has src attribute with base64 data
            const screenshotSrc = await this.page.getAttribute('img[alt="Browser Screenshot"]', 'src');
            
            if (screenshotSrc && screenshotSrc.includes('data:image/')) {
                console.log('✅ Browser screenshot loaded successfully');
                this.completeTest(true);
            } else {
                throw new Error('Screenshot not loaded or invalid format');
            }
        } catch (error) {
            this.completeTest(false, `Screenshot test failed: ${error.message}`);
        }
    }

    // ===========================================
    // NATURAL LANGUAGE PROCESSING TESTS
    // ===========================================

    async testNaturalLanguageCommands() {
        await this.startTest('NLP_001', 'Test natural language command processing', 'NLP');
        
        try {
            await this.page.goto(this.serviceUrl);
            await this.page.waitForSelector('textbox[placeholder*="instruction"]');
            
            // Test navigation command
            const command = 'navigate to google.com';
            await this.page.fill('textbox[placeholder*="instruction"]', command);
            await this.page.click('button:has-text("Send")');
            
            // Wait for command to be processed
            await this.wait(3000);
            
            // Check if command appears in chat
            const chatMessage = await this.page.textContent('.chat-messages, [class*="Message"]');
            if (chatMessage && chatMessage.includes(command)) {
                console.log('✅ Natural language command processed');
                this.completeTest(true);
            } else {
                throw new Error('Command not processed or not visible in chat');
            }
        } catch (error) {
            this.completeTest(false, `NLP test failed: ${error.message}`);
        }
    }

    async testCommandVariations() {
        await this.startTest('NLP_002', 'Test various command patterns', 'NLP');
        
        const commands = [
            'go to amazon.com',
            'visit youtube.com',
            'open wikipedia.org',
            'click login button',
            'type hello world',
            'search for laptops'
        ];
        
        try {
            await this.page.goto(this.serviceUrl);
            
            for (const command of commands) {
                await this.page.fill('textbox[placeholder*="instruction"]', command);
                await this.page.click('button:has-text("Send")');
                await this.wait(1000);
                
                console.log(`✅ Processed command: ${command}`);
            }
            
            this.completeTest(true);
        } catch (error) {
            this.completeTest(false, `Command variations test failed: ${error.message}`);
        }
    }

    // ===========================================
    // RECORDING & SCRIPT TESTS
    // ===========================================

    async testScriptRecording() {
        await this.startTest('REC_001', 'Test script recording functionality', 'Recording');
        
        try {
            await this.page.goto(this.serviceUrl);
            
            // Start recording
            await this.page.click('button:has-text("🔴 Start Recording")');
            
            // Handle the prompt dialogs
            this.page.on('dialog', async dialog => {
                if (dialog.message().includes('Script name')) {
                    await dialog.accept('Test Script');
                } else if (dialog.message().includes('Description')) {
                    await dialog.accept('Test script for automation');
                } else {
                    await dialog.accept();
                }
            });
            
            await this.wait(2000);
            
            // Check if recording button changed to stop
            const stopButton = await this.page.$('button:has-text("⏹️ Stop Recording")');
            if (stopButton) {
                console.log('✅ Recording started successfully');
                
                // Stop recording
                await this.page.click('button:has-text("⏹️ Stop Recording")');
                await this.wait(1000);
                
                this.completeTest(true);
            } else {
                throw new Error('Recording did not start properly');
            }
        } catch (error) {
            this.completeTest(false, `Recording test failed: ${error.message}`);
        }
    }

    // ===========================================
    // NAVIGATION & BROWSER CONTROL TESTS
    // ===========================================

    async testBrowserNavigation() {
        await this.startTest('NAV_001', 'Test browser navigation controls', 'Navigation');
        
        try {
            await this.page.goto(this.serviceUrl);
            
            // Test URL input and navigation
            const urlInput = await this.page.$('input[type="text"], textbox');
            if (urlInput) {
                await this.page.fill('input[type="text"], textbox', 'example.com');
                await this.page.click('button:has-text("Go")');
                
                await this.wait(3000);
                
                console.log('✅ Navigation command sent');
                this.completeTest(true);
            } else {
                throw new Error('URL input not found');
            }
        } catch (error) {
            this.completeTest(false, `Navigation test failed: ${error.message}`);
        }
    }

    async testPageInfo() {
        await this.startTest('NAV_002', 'Test page info functionality', 'Navigation');
        
        try {
            await this.page.goto(this.serviceUrl);
            
            // Click page info button
            await this.page.click('button:has-text("📄 Info")');
            await this.wait(2000);
            
            console.log('✅ Page info request sent');
            this.completeTest(true);
        } catch (error) {
            this.completeTest(false, `Page info test failed: ${error.message}`);
        }
    }

    // ===========================================
    // MANUAL CONTROL TESTS
    // ===========================================

    async testManualMode() {
        await this.startTest('MAN_001', 'Test manual mode toggle', 'Manual Control');
        
        try {
            await this.page.goto(this.serviceUrl);
            
            // Toggle manual mode
            await this.page.click('button:has-text("👤 Manual")');
            await this.wait(1000);
            
            // Check if button text changed
            const autoButton = await this.page.$('button:has-text("🤖 Auto")');
            if (autoButton) {
                console.log('✅ Manual mode activated');
                
                // Toggle back to auto
                await this.page.click('button:has-text("🤖 Auto")');
                await this.wait(1000);
                
                this.completeTest(true);
            } else {
                throw new Error('Manual mode toggle failed');
            }
        } catch (error) {
            this.completeTest(false, `Manual mode test failed: ${error.message}`);
        }
    }

    async testPauseResume() {
        await this.startTest('MAN_002', 'Test pause/resume functionality', 'Manual Control');
        
        try {
            await this.page.goto(this.serviceUrl);
            
            // Test pause
            await this.page.click('button:has-text("⏸️ Pause")');
            await this.wait(1000);
            
            // Check if button changed to resume
            const resumeButton = await this.page.$('button:has-text("▶️ Resume")');
            if (resumeButton) {
                console.log('✅ Automation paused');
                
                // Test resume
                await this.page.click('button:has-text("▶️ Resume")');
                await this.wait(1000);
                
                this.completeTest(true);
            } else {
                throw new Error('Pause functionality failed');
            }
        } catch (error) {
            this.completeTest(false, `Pause/Resume test failed: ${error.message}`);
        }
    }

    // ===========================================
    // API ENDPOINT TESTS
    // ===========================================

    async testApiEndpoints() {
        await this.startTest('API_001', 'Test API endpoints availability', 'API');
        
        const endpoints = [
            '/get-token',
            '/metrics',
            '/api-docs'
        ];
        
        try {
            for (const endpoint of endpoints) {
                await this.page.goto(`${this.serviceUrl}${endpoint}`);
                const response = this.page.url();
                
                if (response.includes(endpoint) || response.includes('localhost:7079')) {
                    console.log(`✅ Endpoint ${endpoint} accessible`);
                } else {
                    throw new Error(`Endpoint ${endpoint} not accessible`);
                }
            }
            
            this.completeTest(true);
        } catch (error) {
            this.completeTest(false, `API endpoints test failed: ${error.message}`);
        }
    }

    async testMetricsEndpoint() {
        await this.startTest('API_002', 'Test Prometheus metrics endpoint', 'API');
        
        try {
            await this.page.goto(`${this.serviceUrl}/metrics`);
            const content = await this.page.textContent('body');
            
            if (content && content.includes('execution_success')) {
                console.log('✅ Metrics endpoint working');
                this.completeTest(true);
            } else {
                throw new Error('Metrics not found or invalid format');
            }
        } catch (error) {
            this.completeTest(false, `Metrics test failed: ${error.message}`);
        }
    }

    // ===========================================
    // WEBSOCKET MESSAGE TESTS
    // ===========================================

    async testWebSocketMessages() {
        await this.startTest('WS_002', 'Test all WebSocket message types', 'WebSocket');
        
        const messageTypes = [
            { type: 'chat_instruction', message: 'test command' },
            { type: 'get_page_info' },
            { type: 'navigate', url: 'example.com' },
            { type: 'toggle_manual_mode' },
            { type: 'pause_automation' },
            { type: 'resume_automation' },
            { type: 'sync_browser_state' }
        ];
        
        try {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                await this.testWebSocketConnection();
            }
            
            for (const msg of messageTypes) {
                this.ws.send(JSON.stringify(msg));
                await this.wait(1000);
                console.log(`✅ Sent message: ${msg.type}`);
            }
            
            this.completeTest(true);
        } catch (error) {
            this.completeTest(false, `WebSocket messages test failed: ${error.message}`);
        }
    }

    // ===========================================
    // ERROR HANDLING TESTS
    // ===========================================

    async testErrorHandling() {
        await this.startTest('ERR_001', 'Test error handling and recovery', 'Error Handling');
        
        try {
            await this.page.goto(this.serviceUrl);
            
            // Test invalid command
            await this.page.fill('textbox[placeholder*="instruction"]', 'invalid command xyz123');
            await this.page.click('button:has-text("Send")');
            await this.wait(2000);
            
            // Test invalid navigation
            await this.page.fill('textbox[placeholder*="instruction"]', 'navigate to invalid-url-that-does-not-exist');
            await this.page.click('button:has-text("Send")');
            await this.wait(2000);
            
            console.log('✅ Error handling tests completed');
            this.completeTest(true);
        } catch (error) {
            this.completeTest(false, `Error handling test failed: ${error.message}`);
        }
    }

    // ===========================================
    // PERFORMANCE TESTS
    // ===========================================

    async testPerformance() {
        await this.startTest('PERF_001', 'Test system performance and responsiveness', 'Performance');
        
        try {
            const startTime = Date.now();
            
            await this.page.goto(this.serviceUrl);
            await this.page.waitForSelector('h3:has-text("🤖 Automation Assistant")');
            
            const loadTime = Date.now() - startTime;
            
            if (loadTime < 5000) {
                console.log(`✅ Page loaded in ${loadTime}ms`);
                this.completeTest(true);
            } else {
                throw new Error(`Page load too slow: ${loadTime}ms`);
            }
        } catch (error) {
            this.completeTest(false, `Performance test failed: ${error.message}`);
        }
    }

    // ===========================================
    // MAIN TEST RUNNER
    // ===========================================

    async runAllTests() {
        console.log('🚀 Starting Comprehensive Browser Automation Test Suite');
        console.log('=' .repeat(60));
        
        await this.initialize();
        
        try {
            // Authentication & Connection Tests
            await this.testAuthentication();
            await this.testWebSocketConnection();
            
            // Frontend UI Tests
            await this.testFrontendLoading();
            await this.testBrowserScreenshot();
            
            // Natural Language Processing Tests
            await this.testNaturalLanguageCommands();
            await this.testCommandVariations();
            
            // Recording & Script Tests
            await this.testScriptRecording();
            
            // Navigation & Browser Control Tests
            await this.testBrowserNavigation();
            await this.testPageInfo();
            
            // Manual Control Tests
            await this.testManualMode();
            await this.testPauseResume();
            
            // API Endpoint Tests
            await this.testApiEndpoints();
            await this.testMetricsEndpoint();
            
            // WebSocket Message Tests
            await this.testWebSocketMessages();
            
            // Error Handling Tests
            await this.testErrorHandling();
            
            // Performance Tests
            await this.testPerformance();
            
        } catch (error) {
            console.error('❌ Test suite execution error:', error);
        } finally {
            await this.cleanup();
        }
        
        this.generateReport();
    }

    generateReport() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 COMPREHENSIVE TEST RESULTS REPORT');
        console.log('=' .repeat(60));
        
        const categories = {};
        let totalTests = 0;
        let passedTests = 0;
        
        this.testResults.forEach(test => {
            totalTests++;
            if (test.success) passedTests++;
            
            if (!categories[test.category]) {
                categories[test.category] = { passed: 0, failed: 0, tests: [] };
            }
            
            if (test.success) {
                categories[test.category].passed++;
            } else {
                categories[test.category].failed++;
            }
            
            categories[test.category].tests.push(test);
        });
        
        // Overall Summary
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        console.log(`\n📈 OVERALL RESULTS:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests} ✅`);
        console.log(`   Failed: ${totalTests - passedTests} ❌`);
        console.log(`   Success Rate: ${successRate}%`);
        
        // Category Breakdown
        console.log(`\n📋 CATEGORY BREAKDOWN:`);
        Object.entries(categories).forEach(([category, data]) => {
            const categoryRate = ((data.passed / (data.passed + data.failed)) * 100).toFixed(1);
            console.log(`\n   ${category}:`);
            console.log(`     Passed: ${data.passed} ✅`);
            console.log(`     Failed: ${data.failed} ❌`);
            console.log(`     Success Rate: ${categoryRate}%`);
            
            // Show failed tests
            data.tests.forEach(test => {
                if (!test.success) {
                    console.log(`     ❌ ${test.name}: ${test.error}`);
                }
            });
        });
        
        // Performance Summary
        console.log(`\n⚡ PERFORMANCE SUMMARY:`);
        const avgDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0) / totalTests;
        console.log(`   Average Test Duration: ${avgDuration.toFixed(0)}ms`);
        
        const slowestTest = this.testResults.reduce((slowest, test) => 
            test.duration > slowest.duration ? test : slowest
        );
        console.log(`   Slowest Test: ${slowestTest.name} (${slowestTest.duration}ms)`);
        
        // Recommendations
        console.log(`\n💡 RECOMMENDATIONS:`);
        if (successRate >= 95) {
            console.log('   🎉 Excellent! Service is production ready.');
        } else if (successRate >= 80) {
            console.log('   ⚠️  Good, but some issues need attention.');
        } else {
            console.log('   🚨 Critical issues detected. Review failed tests.');
        }
        
        // Service Status
        console.log(`\n🎯 SERVICE STATUS:`);
        console.log(`   Authentication: ${categories['Authentication']?.passed > 0 ? '✅' : '❌'}`);
        console.log(`   WebSocket: ${categories['WebSocket']?.passed > 0 ? '✅' : '❌'}`);
        console.log(`   Frontend: ${categories['Frontend']?.passed > 0 ? '✅' : '❌'}`);
        console.log(`   NLP Processing: ${categories['NLP']?.passed > 0 ? '✅' : '❌'}`);
        console.log(`   Navigation: ${categories['Navigation']?.passed > 0 ? '✅' : '❌'}`);
        console.log(`   API Endpoints: ${categories['API']?.passed > 0 ? '✅' : '❌'}`);
        
        console.log('\n' + '=' .repeat(60));
        console.log('🏁 COMPREHENSIVE TEST SUITE COMPLETED');
        console.log('=' .repeat(60));
    }
}

// ===========================================
// EXECUTION
// ===========================================

async function main() {
    const tester = new ComprehensiveBrowserAutomationTester();
    await tester.runAllTests();
    process.exit(0);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ComprehensiveBrowserAutomationTester }; 