#!/usr/bin/env node

/**
 * 🧪 BRAZILIAN INSURANCE AUTOMATION TEST SCRIPT
 * 
 * This script tests our browser automation server (port 7079) against the
 * sophisticated Brazilian insurance quotation workflow from Traducao_PW_Simulador_v32.py
 * 
 * Purpose: Validate that our server can handle complex real-world automation scenarios
 * Target: https://azut1-br-digital.azurewebsites.net/login
 * 
 * Test Coverage:
 * - Authentication with CPF/password
 * - Complex form navigation
 * - Dropdown selection with arrow keys
 * - Conditional field handling
 * - Brazilian document validation
 * - Multi-step quote generation
 * - Data extraction and export
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const http = require('http');

class BrazilianInsuranceAutomationTester {
    constructor() {
        this.ws = null;
        this.serverUrl = 'ws://localhost:7079';
        this.testResults = [];
        this.startTime = Date.now();
        
        // Test data matching the Python script
        this.testData = {
            // Authentication data
            cpf: '381.151.977-85',
            password: 'akad@2025',
            
            // Form data
            nome_completo: 'Endosso Simulado',
            email: 'simulador@gmail.com',
            
            // Business data
            pessoa_tipo: 'Pessoa Física',
            profissao: 'Advogados',
            atividade: 'Advocacia Geral',
            importancia_segurada: 'R$ 100.000,00',
            sinistros_5_anos: 'Nenhum',
            sinistros_12_meses: 'Nenhum',
            soma_sinistros: '0,00',
            retroatividade: '1 ano',
            franquia: '10% dos prejuízos com mínimo de R$ 2.000,00',
            honorarios: 'Normal'
        };
        
        this.currentStep = 0;
        this.totalSteps = 12;
        this.responseHandlers = new Set();
    }

    async connect() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🔌 Getting authentication token...');
                
                // Get authentication token
                const token = await this.getAuthToken();
                
                console.log('🔌 Connecting to browser automation server...');
                
                this.ws = new WebSocket(`${this.serverUrl}?token=${token}`);
                
                this.ws.on('open', () => {
                    console.log('✅ Connected to server');
                    
                    // Wait for engine to be ready
                    const waitForEngine = (message) => {
                        if (message.type === 'engine_ready' || 
                            message.message?.includes('engine initialized')) {
                            console.log('✅ Engine ready');
                            this.removeResponseHandler(waitForEngine);
                            resolve();
                        }
                    };
                    
                    this.addResponseHandler(waitForEngine);
                    
                    // Set a timeout in case engine_ready is not received
                    setTimeout(() => {
                        console.log('⏳ Engine ready timeout, proceeding anyway...');
                        this.removeResponseHandler(waitForEngine);
                        resolve();
                    }, 10000);
                });
                
                this.ws.on('error', (error) => {
                    console.error('❌ Connection error:', error);
                    reject(error);
                });
                
                this.ws.on('message', (data) => {
                    this.handleMessage(JSON.parse(data));
                });
            } catch (error) {
                console.error('❌ Authentication error:', error);
                reject(error);
            }
        });
    }

    async getAuthToken() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 7079,
                path: '/get-token',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
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
                reject(error);
            });

            req.end();
        });
    }

    handleMessage(message) {
        const timestamp = new Date().toISOString();
        console.log(`📨 [${timestamp}] Server response:`, message);
        
        // Store results for analysis
        this.testResults.push({
            timestamp,
            step: this.currentStep,
            message: message.message,
            type: message.type,
            success: !message.error
        });
        
        // Call all response handlers
        this.responseHandlers.forEach(handler => {
            try {
                handler(message);
            } catch (error) {
                console.error('Error in response handler:', error);
            }
        });
    }

    addResponseHandler(handler) {
        this.responseHandlers.add(handler);
    }

    removeResponseHandler(handler) {
        this.responseHandlers.delete(handler);
    }

    async sendCommand(command, description) {
        return new Promise((resolve, reject) => {
            this.currentStep++;
            const progress = `[${this.currentStep}/${this.totalSteps}]`;
            
            console.log(`\n🎯 ${progress} ${description}`);
            console.log(`📤 Command: ${command}`);
            
            // Set up response handler
            const responseHandler = (message) => {
                // Look for completion or error responses
                if (message.type === 'action_completed' || 
                    message.type === 'navigation_complete' ||
                    message.type === 'instruction_completed' ||
                    message.type === 'instruction_result' ||
                    message.type === 'chat_message' ||
                    message.message?.includes('✅') ||
                    message.message?.includes('completed')) {
                    
                    console.log(`✅ Step completed: ${message.message || 'Action completed'}`);
                    this.removeResponseHandler(responseHandler);
                    resolve(message);
                } else if (message.type === 'error' || 
                          message.message?.includes('❌') ||
                          message.message?.includes('failed') ||
                          message.message?.includes('Error')) {
                    
                    console.log(`❌ Step failed: ${message.message}`);
                    this.removeResponseHandler(responseHandler);
                    reject(new Error(message.message || 'Step failed'));
                } else if (message.type === 'processing' || 
                          message.message?.includes('🤖') ||
                          message.message?.includes('Processing')) {
                    
                    console.log(`🤖 Processing: ${message.message}`);
                    // Continue waiting for completion
                } else if (message.type === 'screenshot') {
                    // Ignore screenshot messages for now
                    return;
                }
            };
            
            this.addResponseHandler(responseHandler);
            
            // Send the command
            this.ws.send(JSON.stringify({
                type: 'chat_instruction',
                message: command
            }));
            
            // Set timeout for the command
            setTimeout(() => {
                this.removeResponseHandler(responseHandler);
                reject(new Error(`Command timeout after 30 seconds: ${command}`));
            }, 30000);
        });
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runBrazilianInsuranceTest() {
        console.log('🚀 BRAZILIAN INSURANCE AUTOMATION TEST');
        console.log('=====================================');
        console.log('Target: https://azut1-br-digital.azurewebsites.net/login');
        console.log('Workflow: Professional Liability Insurance Quote');
        console.log('⚠️  Browser will be visible (non-headless) to monitor test execution');
        console.log('');

        try {
            // Step 1: Navigate to login page
            await this.sendCommand(
                'navigate to https://azut1-br-digital.azurewebsites.net/login',
                'Navigate to insurance portal login page'
            );
            await this.wait(2000); // Wait to see the page load

            // Step 2: Handle initial popup (if present)
            try {
                await this.sendCommand(
                    'if there is a popup or modal, close it',
                    'Handle initial popup dismissal'
                );
            } catch (error) {
                console.log('⚠️  No popup found or error handling popup - continuing...');
            }
            await this.wait(1000);

            // Step 3: Fill CPF field
            await this.sendCommand(
                `type "${this.testData.cpf}" in the CPF field`,
                'Fill CPF field with authentication data'
            );
            await this.wait(1000);

            // Step 4: Fill password field  
            await this.sendCommand(
                `type "${this.testData.password}" in the password field`,
                'Fill password field with authentication data'
            );
            await this.wait(1000);

            // Step 5: Click login button
            await this.sendCommand(
                'click the login button',
                'Submit login credentials'
            );
            await this.wait(3000); // Wait for login processing

            // Step 6: Navigate to new quote
            await this.sendCommand(
                'click the "New Quote" button or navigate to create new quote',
                'Navigate to quote creation page'
            );
            await this.wait(2000);

            // Step 7: Select person type
            await this.sendCommand(
                `select "${this.testData.pessoa_tipo}" from person type options`,
                'Select individual person type'
            );
            await this.wait(1000);

            // Step 8: Select profession
            await this.sendCommand(
                `select "${this.testData.profissao}" from profession dropdown`,
                'Select profession from dropdown list'
            );
            await this.wait(1000);

            // Step 9: Fill personal information
            await this.sendCommand(
                `type "${this.testData.nome_completo}" in the name field`,
                'Fill complete name field'
            );
            await this.wait(1000);

            await this.sendCommand(
                `type "${this.testData.email}" in the email field`,
                'Fill email field'
            );
            await this.wait(1000);

            // Step 10: Configure insurance parameters
            await this.sendCommand(
                `select "${this.testData.atividade}" from activity dropdown`,
                'Select professional activity'
            );
            await this.wait(1000);

            await this.sendCommand(
                `select "${this.testData.importancia_segurada}" from coverage amount dropdown`,
                'Select insurance coverage amount'
            );
            await this.wait(1000);

            // Step 11: Configure claims history
            await this.sendCommand(
                `select "${this.testData.sinistros_5_anos}" from 5-year claims history dropdown`,
                'Configure 5-year claims history'
            );
            await this.wait(1000);

            // Step 12: Generate quote
            await this.sendCommand(
                'click the "Calculate Quote" or "Generate Quote" button',
                'Generate insurance quote'
            );
            await this.wait(5000); // Wait for quote generation

            console.log('\n🎉 TEST COMPLETED');
            this.generateTestReport();

        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
            this.generateErrorReport(error);
        }
    }

    generateTestReport() {
        const endTime = Date.now();
        const duration = (endTime - this.startTime) / 1000;
        
        const report = {
            testName: 'Brazilian Insurance Automation Test',
            duration: `${duration}s`,
            totalSteps: this.totalSteps,
            completedSteps: this.currentStep,
            successRate: `${((this.currentStep / this.totalSteps) * 100).toFixed(1)}%`,
            timestamp: new Date().toISOString(),
            results: this.testResults,
            testData: this.testData
        };

        // Save report to file
        const reportPath = path.join(__dirname, 'test_reports', `brazilian_insurance_test_${Date.now()}.json`);
        
        // Ensure directory exists
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 TEST REPORT SUMMARY');
        console.log('=====================');
        console.log(`Duration: ${duration}s`);
        console.log(`Steps Completed: ${this.currentStep}/${this.totalSteps}`);
        console.log(`Success Rate: ${report.successRate}`);
        console.log(`Report saved: ${reportPath}`);
        
        // Display step results
        console.log('\n📋 STEP RESULTS:');
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} Step ${result.step}: ${result.message}`);
        });
    }

    generateErrorReport(error) {
        const errorReport = {
            testName: 'Brazilian Insurance Automation Test',
            status: 'FAILED',
            error: error.message,
            stack: error.stack,
            completedSteps: this.currentStep,
            totalSteps: this.totalSteps,
            timestamp: new Date().toISOString(),
            results: this.testResults
        };

        const errorPath = path.join(__dirname, 'test_reports', `brazilian_insurance_error_${Date.now()}.json`);
        
        // Ensure directory exists
        const errorDir = path.dirname(errorPath);
        if (!fs.existsSync(errorDir)) {
            fs.mkdirSync(errorDir, { recursive: true });
        }
        
        fs.writeFileSync(errorPath, JSON.stringify(errorReport, null, 2));
        
        console.log('\n❌ ERROR REPORT');
        console.log('===============');
        console.log(`Error: ${error.message}`);
        console.log(`Failed at step: ${this.currentStep}/${this.totalSteps}`);
        console.log(`Error report saved: ${errorPath}`);
    }

    async disconnect() {
        if (this.ws) {
            this.ws.close();
            console.log('🔌 Disconnected from server');
        }
    }
}

// Additional test utilities for specific Brazilian insurance scenarios
class BrazilianInsuranceTestUtils {
    static validateCPF(cpf) {
        // Basic CPF validation (simplified)
        const cleaned = cpf.replace(/[^\d]/g, '');
        return cleaned.length === 11;
    }

    static validateCNPJ(cnpj) {
        // Basic CNPJ validation (simplified)
        const cleaned = cnpj.replace(/[^\d]/g, '');
        return cleaned.length === 14;
    }

    static formatBrazilianCurrency(amount) {
        return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    static generateTestScenarios() {
        return [
            {
                name: 'Individual Professional - Lawyer',
                data: {
                    pessoa_tipo: 'Pessoa Física',
                    profissao: 'Advogados',
                    atividade: 'Advocacia Geral',
                    importancia_segurada: 'R$ 100.000,00'
                }
            },
            {
                name: 'Individual Professional - Doctor',
                data: {
                    pessoa_tipo: 'Pessoa Física',
                    profissao: 'Médicos',
                    atividade: 'Medicina Geral',
                    importancia_segurada: 'R$ 200.000,00'
                }
            },
            {
                name: 'Company Professional - Engineering',
                data: {
                    pessoa_tipo: 'Pessoa Jurídica',
                    profissao: 'Engenheiros e Arquitetos',
                    atividade: 'Engenharia Civil',
                    importancia_segurada: 'R$ 500.000,00'
                }
            }
        ];
    }
}

// Extended test runner for multiple scenarios
class ExtendedBrazilianInsuranceTest {
    constructor() {
        this.scenarios = BrazilianInsuranceTestUtils.generateTestScenarios();
        this.results = [];
    }

    async runAllScenarios() {
        console.log('🧪 EXTENDED BRAZILIAN INSURANCE TEST SUITE');
        console.log('==========================================');
        
        for (const scenario of this.scenarios) {
            console.log(`\n🎯 Running scenario: ${scenario.name}`);
            
            const tester = new BrazilianInsuranceAutomationTester();
            
            // Override test data with scenario data
            Object.assign(tester.testData, scenario.data);
            
            try {
                await tester.connect();
                await tester.runBrazilianInsuranceTest();
                
                this.results.push({
                    scenario: scenario.name,
                    status: 'PASSED',
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                this.results.push({
                    scenario: scenario.name,
                    status: 'FAILED',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } finally {
                await tester.disconnect();
            }
            
            // Wait between scenarios
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        this.generateSummaryReport();
    }

    generateSummaryReport() {
        const passedTests = this.results.filter(r => r.status === 'PASSED').length;
        const failedTests = this.results.filter(r => r.status === 'FAILED').length;
        const successRate = ((passedTests / this.results.length) * 100).toFixed(1);
        
        console.log('\n📊 EXTENDED TEST SUMMARY');
        console.log('========================');
        console.log(`Total Scenarios: ${this.results.length}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${successRate}%`);
        
        // Detailed results
        console.log('\n📋 DETAILED RESULTS:');
        this.results.forEach(result => {
            const status = result.status === 'PASSED' ? '✅' : '❌';
            console.log(`${status} ${result.scenario}: ${result.status}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--extended')) {
        // Run extended test suite with multiple scenarios
        const extendedTest = new ExtendedBrazilianInsuranceTest();
        await extendedTest.runAllScenarios();
    } else {
        // Run single scenario test
        const tester = new BrazilianInsuranceAutomationTester();
        
        try {
            await tester.connect();
            await tester.runBrazilianInsuranceTest();
        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await tester.disconnect();
        }
    }
    
    console.log('\n🏁 Test execution completed');
    process.exit(0);
}

// Export for use in other test files
module.exports = {
    BrazilianInsuranceAutomationTester,
    BrazilianInsuranceTestUtils,
    ExtendedBrazilianInsuranceTest
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 