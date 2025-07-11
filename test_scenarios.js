const WebSocket = require('ws');
const readline = require('readline');

class AutomationTester {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.testResults = [];
        this.currentTest = null;
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async connect() {
        return new Promise((resolve, reject) => {
            console.log('🔌 Connecting to automation server...');
            this.ws = new WebSocket('ws://localhost:7079');
            
            this.ws.on('open', () => {
                console.log('✅ Connected to automation server');
                this.connected = true;
                resolve();
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ Connection error:', error.message);
                reject(error);
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data));
            });
            
            this.ws.on('close', () => {
                console.log('🔌 Connection closed');
                this.connected = false;
            });
        });
    }

    handleMessage(data) {
        console.log(`📨 Received: ${data.type} - ${data.message || ''}`);
        
        if (this.currentTest) {
            this.currentTest.messages.push(data);
            
            // Check for test completion conditions
            if (data.type === 'script_execution_completed' || 
                data.type === 'error' || 
                data.message?.includes('executed successfully')) {
                this.completeCurrentTest(data.type !== 'error');
            }
        }
    }

    sendCommand(command) {
        if (!this.connected) {
            console.error('❌ Not connected to server');
            return;
        }
        
        console.log(`📤 Sending: ${JSON.stringify(command)}`);
        this.ws.send(JSON.stringify(command));
    }

    async startTest(testName, description) {
        console.log(`\n🧪 Starting Test: ${testName}`);
        console.log(`📝 Description: ${description}`);
        
        this.currentTest = {
            name: testName,
            description,
            startTime: Date.now(),
            messages: [],
            success: false
        };
    }

    completeCurrentTest(success) {
        if (!this.currentTest) return;
        
        this.currentTest.success = success;
        this.currentTest.endTime = Date.now();
        this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
        
        console.log(`${success ? '✅' : '❌'} Test ${this.currentTest.name} ${success ? 'PASSED' : 'FAILED'}`);
        console.log(`⏱️ Duration: ${this.currentTest.duration}ms`);
        
        this.testResults.push(this.currentTest);
        this.currentTest = null;
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async askUser(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    // ===========================================
    // VARIABLE SYSTEM TESTS
    // ===========================================

    async testVariableSystem() {
        console.log('\n🎯 === VARIABLE SYSTEM TESTS ===');
        
        // Test V1: Dynamic Variable Loading
        await this.startTest('V1_Dynamic_Variable_Loading', 'Test dynamic variable form generation');
        
        this.sendCommand({
            type: 'get_script_variables',
            scriptName: 'MercadoLivre Product Search'
        });
        
        await this.wait(2000);
        
        // Check if we received script_variables message
        const variableMessage = this.currentTest.messages.find(m => m.type === 'script_variables');
        if (variableMessage && variableMessage.variables && variableMessage.variables.length > 0) {
            console.log('✅ Variables loaded:', variableMessage.variables);
            this.completeCurrentTest(true);
        } else {
            console.log('❌ No variables received');
            this.completeCurrentTest(false);
        }

        // Test V2: Variable Substitution
        await this.startTest('V2_Variable_Substitution', 'Test variable substitution in script execution');
        
        const testVariables = {
            searchTerm: 'mesa-de-jardim'
        };
        
        this.sendCommand({
            type: 'execute_script',
            scriptName: 'MercadoLivre Product Search',
            variables: testVariables
        });
        
        await this.wait(10000); // Wait for script execution
    }

    // ===========================================
    // NATURAL LANGUAGE PROCESSING TESTS
    // ===========================================

    async testNaturalLanguageProcessing() {
        console.log('\n🎯 === NATURAL LANGUAGE PROCESSING TESTS ===');
        
        const commands = [
            { cmd: 'navigate to amazon.com', expected: 'navigate' },
            { cmd: 'go to google.com', expected: 'navigate' },
            { cmd: 'visit youtube.com', expected: 'navigate' },
            { cmd: 'click login button', expected: 'click' },
            { cmd: 'type hello world', expected: 'type' }
        ];

        for (const { cmd, expected } of commands) {
            await this.startTest(`NLP_${expected}_Command`, `Test ${expected} command recognition`);
            
            this.sendCommand({
                type: 'chat_instruction',
                message: cmd
            });
            
            await this.wait(5000);
            
            // Check if command was processed correctly
            const processedMessage = this.currentTest.messages.find(m => 
                m.message && m.message.includes('Processing')
            );
            
            if (processedMessage) {
                console.log(`✅ Command "${cmd}" was processed`);
                this.completeCurrentTest(true);
            } else {
                console.log(`❌ Command "${cmd}" was not processed`);
                this.completeCurrentTest(false);
            }
        }
    }

    // ===========================================
    // SHOPPING SCENARIO TESTS
    // ===========================================

    async testShoppingScenarios() {
        console.log('\n🎯 === SHOPPING SCENARIO TESTS ===');
        
        // Test S1: MercadoLivre Variable Substitution
        const searchTerms = [
            'mesa-de-jardim',
            'smartphone-samsung',
            'livros-programacao'
        ];

        for (const term of searchTerms) {
            await this.startTest(`Shopping_MercadoLivre_${term}`, `Test MercadoLivre search for ${term}`);
            
            this.sendCommand({
                type: 'execute_script',
                scriptName: 'MercadoLivre Product Search',
                variables: { searchTerm: term }
            });
            
            await this.wait(8000);
        }

        // Test S2: Amazon Navigation
        await this.startTest('Shopping_Amazon_Navigation', 'Test Amazon navigation');
        
        this.sendCommand({
            type: 'chat_instruction',
            message: 'navigate to amazon.com'
        });
        
        await this.wait(5000);
    }

    // ===========================================
    // SEARCH SCENARIO TESTS
    // ===========================================

    async testSearchScenarios() {
        console.log('\n🎯 === SEARCH SCENARIO TESTS ===');
        
        // Test Google Search
        await this.startTest('Search_Google', 'Test Google search automation');
        
        this.sendCommand({
            type: 'chat_instruction',
            message: 'navigate to google.com'
        });
        
        await this.wait(5000);
        
        // Test search command
        this.sendCommand({
            type: 'chat_instruction',
            message: 'search for machine learning tutorials'
        });
        
        await this.wait(5000);
    }

    // ===========================================
    // TRAVEL SCENARIO TESTS
    // ===========================================

    async testTravelScenarios() {
        console.log('\n🎯 === TRAVEL SCENARIO TESTS ===');
        
        // Test travel site navigation
        await this.startTest('Travel_Navigation', 'Test travel booking site navigation');
        
        this.sendCommand({
            type: 'chat_instruction',
            message: 'navigate to booking.com'
        });
        
        await this.wait(5000);
        
        // Test location search
        this.sendCommand({
            type: 'chat_instruction',
            message: 'search for hotels in London'
        });
        
        await this.wait(5000);
    }

    // ===========================================
    // MANUAL CONTROL TESTS
    // ===========================================

    async testManualControl() {
        console.log('\n🎯 === MANUAL CONTROL TESTS ===');
        
        // Test manual mode toggle
        await this.startTest('Manual_Mode_Toggle', 'Test manual mode switching');
        
        this.sendCommand({
            type: 'toggle_manual_mode'
        });
        
        await this.wait(2000);
        
        // Test pause/resume
        await this.startTest('Pause_Resume', 'Test automation pause/resume');
        
        this.sendCommand({
            type: 'pause_automation'
        });
        
        await this.wait(1000);
        
        this.sendCommand({
            type: 'resume_automation'
        });
        
        await this.wait(2000);
        
        // Test sync
        await this.startTest('Browser_Sync', 'Test browser state synchronization');
        
        this.sendCommand({
            type: 'sync_browser_state'
        });
        
        await this.wait(2000);
    }

    // ===========================================
    // MAIN TEST EXECUTION
    // ===========================================

    async runAllTests() {
        console.log('🚀 Starting Comprehensive Testing Suite');
        console.log('=====================================');
        
        try {
            await this.connect();
            
            // Wait for initial connection
            await this.wait(2000);
            
            // Run test suites
            await this.testVariableSystem();
            await this.testNaturalLanguageProcessing();
            await this.testManualControl();
            await this.testShoppingScenarios();
            await this.testSearchScenarios();
            await this.testTravelScenarios();
            
            // Generate final report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test execution failed:', error);
        } finally {
            this.rl.close();
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    generateReport() {
        console.log('\n📊 === COMPREHENSIVE TEST REPORT ===');
        console.log('=====================================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(t => t.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
        
        console.log(`📈 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`🎯 Success Rate: ${successRate}%`);
        
        console.log('\n📋 Detailed Results:');
        this.testResults.forEach((test, index) => {
            const status = test.success ? '✅ PASS' : '❌ FAIL';
            const duration = test.duration || 0;
            console.log(`${index + 1}. ${status} - ${test.name} (${duration}ms)`);
            console.log(`   📝 ${test.description}`);
            if (!test.success && test.messages.length > 0) {
                const errorMsg = test.messages.find(m => m.type === 'error');
                if (errorMsg) {
                    console.log(`   ❌ Error: ${errorMsg.message}`);
                }
            }
        });
        
        console.log('\n🎉 Test Suite Complete!');
        
        // System health assessment
        if (successRate >= 95) {
            console.log('🟢 System Health: EXCELLENT');
        } else if (successRate >= 85) {
            console.log('🟡 System Health: GOOD');
        } else if (successRate >= 70) {
            console.log('🟠 System Health: NEEDS IMPROVEMENT');
        } else {
            console.log('🔴 System Health: CRITICAL ISSUES');
        }
    }

    async runInteractiveTest() {
        console.log('🎮 Interactive Testing Mode');
        console.log('===========================');
        
        await this.connect();
        
        while (true) {
            const command = await this.askUser('\n💬 Enter command (or "quit" to exit): ');
            
            if (command.toLowerCase() === 'quit') {
                break;
            }
            
            if (command.startsWith('script:')) {
                const scriptName = command.substring(7).trim();
                this.sendCommand({
                    type: 'execute_script',
                    scriptName,
                    variables: {}
                });
            } else if (command.startsWith('vars:')) {
                const scriptName = command.substring(5).trim();
                this.sendCommand({
                    type: 'get_script_variables',
                    scriptName
                });
            } else {
                this.sendCommand({
                    type: 'chat_instruction',
                    message: command
                });
            }
            
            await this.wait(2000);
        }
        
        this.rl.close();
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Main execution
const tester = new AutomationTester();

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--interactive')) {
    tester.runInteractiveTest();
} else {
    tester.runAllTests();
}

module.exports = { AutomationTester }; 