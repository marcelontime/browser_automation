const { Stagehand } = require('@browserbasehq/stagehand');
const { z } = require('zod');
const RobustElementInteraction = require('./modules/browser/element-interaction');
const ComprehensiveErrorRecovery = require('./modules/browser/error-recovery');

class StagehandAutomationEngine {
    constructor(options = {}) {
        this.options = {
            headless: false,
            devtools: false,
            model: 'openai:gpt-4o',
            ...options
        };
        
        this.isInitialized = false;
        this.page = null;
        this.stagehand = null;
        this.variables = new Map();
        this.currentInstruction = null;
        this.processingInstruction = false;
        this.retryCount = 0;
        this.maxRetries = 2; // Add max retries limit
        
        // Import error recovery module
        this.errorRecovery = null;
        this.importErrorRecovery();
    }

    async importErrorRecovery() {
        try {
            const { ComprehensiveErrorRecovery } = require('./modules/browser/error-recovery');
            this.ComprehensiveErrorRecovery = ComprehensiveErrorRecovery;
        } catch (error) {
            console.warn('⚠️ Error recovery module not found, continuing without it');
        }
    }

    async init() {
        try {
            console.log('🚀 Initializing Stagehand automation engine...');
            
            // Use the configuration passed from the server (this.options) instead of creating a new one
            console.log('🔑 Using API key from options:', this.options.openaiApiKey ? 'SET' : 'NOT SET');
            
            this.stagehand = new Stagehand(this.options);
            await this.stagehand.init();
            
            this.page = this.stagehand.page;
            
            // Initialize robust element interaction system if available
            try {
                const { RobustElementInteraction } = require('./modules/browser/element-interaction');
                this.robustInteraction = new RobustElementInteraction(this.page, {
                    defaultTimeout: 30000,
                    retryAttempts: 3,
                    retryDelay: 1000,
                    exponentialBackoff: true,
                    visualVerification: true,
                    stabilityWait: 500
                });
            } catch (error) {
                console.warn('⚠️ Robust element interaction module not found, continuing without it');
            }
            
            // Initialize comprehensive error recovery system if available
            if (this.ComprehensiveErrorRecovery) {
                this.errorRecovery = new this.ComprehensiveErrorRecovery({
                    maxRetries: 2, // Match our retry limit
                    retryDelay: 2000,
                    sessionTimeout: 300000,
                    networkTimeout: 30000,
                    pageLoadTimeout: 45000
                });
            }
            
            this.isInitialized = true;
            
            console.log('✅ Stagehand engine initialized with enhanced error handling');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Stagehand engine:', error.message);
            throw error;
        }
    }

    async cleanup() {
        try {
            // Reset instruction state
            this.resetInstructionState();
            
            // Clean up error recovery system
            if (this.errorRecovery && this.errorRecovery.cleanup) {
                await this.errorRecovery.cleanup();
            }
            
            // Clear variables
            this.variables.clear();
            
            console.log('✅ Stagehand engine cleaned up');
        } catch (error) {
            console.error('❌ Error during cleanup:', error.message);
        }
    }

    async close() {
        try {
            // Clean up error recovery system
            await this.cleanup();
            
            if (this.stagehand) {
                await this.stagehand.close();
                console.log('✅ Stagehand engine closed');
            }
            
            this.isInitialized = false;
        } catch (error) {
            console.error('❌ Error closing Stagehand engine:', error.message);
        }
    }

    // Main instruction processing with comprehensive error recovery
    async processInstruction(instruction) {
        if (!this.isInitialized) {
            throw new Error('Stagehand engine not initialized. Call init() first.');
        }

        // Clear any previous instruction and reset retry count for new instruction
        if (this.currentInstruction !== instruction) {
            this.currentInstruction = instruction;
            this.retryCount = 0;
            this.processingInstruction = false;
        }

        // Check if we're already processing this instruction
        if (this.processingInstruction) {
            console.log('⏳ Instruction already being processed, skipping...');
            return { success: false, error: 'Instruction already being processed' };
        }

        // Check retry limit
        if (this.retryCount >= this.maxRetries) {
            console.log(`❌ Max retries (${this.maxRetries}) exceeded for instruction: "${instruction}"`);
            this.resetInstructionState();
            return { success: false, error: `Max retries exceeded for: ${instruction}` };
        }

        this.processingInstruction = true;
        console.log(`🤖 Processing: "${instruction}" (attempt ${this.retryCount + 1}/${this.maxRetries + 1})`);

        try {
            // Save session state before processing
            if (this.errorRecovery && this.page) {
                await this.errorRecovery.saveSessionState(this.page);
            }

            // Check if this is variable definitions
            if (this.isVariableDefinition(instruction)) {
                const result = await this.handleVariableDefinitions(instruction);
                this.resetInstructionState();
                return result;
            }

            // Check for control commands
            const controlResult = this.checkControlCommand(instruction);
            if (controlResult) {
                this.resetInstructionState();
                return controlResult;
            }

            // Use Stagehand's intelligent action processing
            const result = await this.executeAutomation(instruction);
            this.resetInstructionState();
            return result;

        } catch (error) {
            console.error('❌ Error processing instruction:', error.message);
            this.retryCount++;
            
            // Try to recover from error if we haven't exceeded retry limit
            if (this.retryCount < this.maxRetries && this.errorRecovery) {
                const recoveryResult = await this.errorRecovery.recoverFromError(error, {
                    page: this.page,
                    instruction,
                    url: this.page ? this.page.url() : null,
                    restartBrowser: this.restartBrowser?.bind(this),
                    reAuthenticate: this.reAuthenticate?.bind(this)
                });
                
                if (recoveryResult.success) {
                    console.log('✅ Error recovered, retrying instruction...');
                    this.processingInstruction = false;
                    // Retry the instruction after recovery (non-recursive)
                    return await this.processInstruction(instruction);
                } else {
                    console.error('❌ Error recovery failed:', recoveryResult.error);
                }
            }
            
            this.resetInstructionState();
            throw error;
        }
    }

    // Reset instruction state
    resetInstructionState() {
        this.currentInstruction = null;
        this.processingInstruction = false;
        this.retryCount = 0;
    }

    // Variable definition detection (keep our existing logic)
    isVariableDefinition(instruction) {
        const variablePattern = /\$\{[A-Z_][A-Z0-9_]*\}\s+[^\$]+/gi;
        const matches = instruction.match(variablePattern);
        return matches && matches.length >= 2;
    }

    // Enhanced variable definitions with Stagehand
    async handleVariableDefinitions(instruction) {
        console.log('🔧 Detected variable definition pattern, processing directly');
        
        const variables = this.parseVariableDefinitions(instruction);
        
        if (variables.length === 0) {
            return {
                success: false,
                error: 'No valid variables found in definition',
                action: 'variable_error'
            };
        }

        // Store variables
        variables.forEach(variable => {
            this.currentVariables[variable.name] = variable.value;
        });

        const variableList = variables.map(v => `${v.name}="${v.value}"`).join(', ');
        console.log(`✅ Variables defined: ${variableList}`);

        // Create automation steps based on variables
        const automationSteps = this.createAutomationFromVariables(variables);
        
        if (automationSteps.length > 0) {
            console.log(`🎯 Created automation with ${automationSteps.length} steps`);
            
            // Execute the automation sequence using Stagehand
            for (let i = 0; i < automationSteps.length; i++) {
                const step = automationSteps[i];
                const remaining = automationSteps.length - i - 1;
                
                console.log(`🔄 Executing: "${step}" (${remaining} remaining)`);
                
                try {
                    await this.executeAutomationStep(step);
                    console.log(`✅ Completed: "${step}"`);
                } catch (error) {
                    console.error(`❌ Failed: "${step}" - ${error.message}`);
                    // Continue with next step instead of stopping
                }
            }
        }

        return {
            success: true,
            variables: variables,
            automationSteps: automationSteps,
            action: 'variable_definition'
        };
    }

    // Parse variable definitions (keep existing logic)
    parseVariableDefinitions(instruction) {
        const variables = [];
        const pattern = /\$\{([A-Z_][A-Z0-9_]*)\}\s+([^\$]+?)(?=\s*\$\{|$)/gi;
        let match;
        
        while ((match = pattern.exec(instruction)) !== null) {
            const name = match[1].trim();
            const value = match[2].trim();
            
            if (name && value) {
                variables.push({ name, value });
            }
        }
        
        return variables;
    }

    // Create automation steps from variables (enhanced)
    createAutomationFromVariables(variables) {
        const steps = [];
        
        // Find URL variable and navigate first
        const urlVar = variables.find(v => 
            v.name.includes('URL') || v.name.includes('url') || 
            v.name.includes('LINK') || v.name.includes('link')
        );
        
        if (urlVar) {
            steps.push(`Navigate to ${urlVar.value}`);
        }

        // Find credentials and create smart field mapping
        const emailVar = variables.find(v => 
            v.name.includes('EMAIL') || v.name.includes('email') || 
            v.name.includes('CPF') || v.name.includes('cpf')
        );
        const passwordVar = variables.find(v => 
            v.name.includes('PASSWORD') || v.name.includes('password')
        );

        if (emailVar) {
            // Use smart field detection based on variable type
            if (emailVar.name.includes('CPF') || emailVar.name.includes('cpf')) {
                steps.push(`Type ${emailVar.value} in the CPF field`);
            } else if (emailVar.name.includes('EMAIL') || emailVar.name.includes('email')) {
                steps.push(`Type ${emailVar.value} in the email field`);
            } else {
                steps.push(`Type ${emailVar.value} in the username field`);
            }
        }

        if (passwordVar) {
            steps.push(`Type ${passwordVar.value} in the password field`);
        }

        // Add login action if we have credentials
        if (emailVar || passwordVar) {
            steps.push('Click the login button');
        }

        return steps;
    }

    // Execute individual automation step using Stagehand
    async executeAutomationStep(step) {
        if (step.startsWith('Navigate to ')) {
            const url = step.replace('Navigate to ', '');
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            console.log(`✅ Navigated to: ${url}`);
            return;
        }

        // Use Stagehand's page.act() method with timeout protection
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Step timeout after 20 seconds')), 20000);
        });
        
        const stepPromise = this.page.act(step);
        
        // Race between step execution and timeout
        await Promise.race([stepPromise, timeoutPromise]);
        console.log(`✅ Step completed: ${step}`);
    }

    // Main automation execution using Stagehand
    async executeAutomation(instruction) {
        try {
            // Check if this is a navigation instruction and handle directly
            const navigationResult = await this.handleNavigationInstruction(instruction);
            if (navigationResult) {
                return navigationResult;
            }
            
            // Use Stagehand's page.act() for direct actions (correct API: string parameter)
            console.log('🎯 Executing action with Stagehand...');
            
            // Add timeout protection to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Action timeout after 30 seconds')), 30000);
            });
            
            const actionPromise = this.page.act(instruction);
            
            // Race between action and timeout
            await Promise.race([actionPromise, timeoutPromise]);
            
            console.log('✅ Stagehand action completed successfully');
            
            // Parse the instruction to determine action type and details
            const actionDetails = this.parseActionFromInstruction(instruction);
            
            return {
                success: true,
                action: actionDetails,
                method: 'direct_action'
            };

        } catch (error) {
            console.error('❌ Automation execution failed:', error.message);
            
            // If it's a timeout, try to recover
            if (error.message.includes('timeout')) {
                console.log('🔄 Attempting to recover from timeout...');
                try {
                    // Try to take a screenshot to verify page state
                    await this.takeScreenshot();
                    console.log('✅ Page appears to be responsive after timeout');
                } catch (screenshotError) {
                    console.error('❌ Page appears to be unresponsive:', screenshotError.message);
                }
            }
            
            throw error;
        }
    }

    // Handle navigation instructions directly to avoid Stagehand confusion
    async handleNavigationInstruction(instruction) {
        const instructionLower = instruction.toLowerCase();
        
        // Check for direct navigation patterns
        const navigationPatterns = [
            /^(?:go to|navigate to|open|visit)\s+(.+)$/i,
            /^(?:goto|nav)\s+(.+)$/i,
            /^(.+\.(com|org|net|io|co|gov|edu|mil|int|eu|uk|us|ca|au|de|fr|jp|cn|in|br|mx|ru|za|ng|eg|sa|ae|il|tr|pl|nl|be|ch|se|no|dk|fi|ie|at|pt|es|it|gr))$/i
        ];
        
        for (const pattern of navigationPatterns) {
            const match = instruction.match(pattern);
            if (match) {
                let url = match[1].trim();
                
                // Add protocol if missing
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                
                console.log(`🌐 Direct navigation to: ${url}`);
                await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                
                return {
                    success: true,
                    action: {
                        type: 'navigate',
                        url: url
                    },
                    method: 'direct_navigation'
                };
            }
        }
        
        return null; // Not a navigation instruction
    }

    // Control commands (simplified)
    checkControlCommand(instruction) {
        const cmd = instruction.toLowerCase().trim();
        
        switch (cmd) {
            case 'stop':
                return { success: true, message: '⏹️ Automation stopped', action: 'stop' };
            case 'status':
                return { 
                    success: true, 
                    message: '📊 Stagehand engine running', 
                    variables: Object.keys(this.currentVariables).length,
                    action: 'status' 
                };
            case 'clear':
                this.currentVariables = {};
                return { success: true, message: '🧹 Variables cleared', action: 'clear' };
            default:
                return null;
        }
    }

    // Utility methods for data extraction
    async extractData(instruction, schema = null) {
        if (!this.isInitialized) {
            throw new Error('Stagehand engine not initialized');
        }

        try {
            if (schema) {
                return await this.page.extract({
                    instruction: instruction,
                    schema: schema
                });
            } else {
                return await this.page.extract(instruction);
            }
        } catch (error) {
            console.error('❌ Data extraction failed:', error.message);
            throw error;
        }
    }

    // Get current page info
    async getPageInfo() {
        if (!this.page) return null;
        
        try {
            return {
                url: this.page.url(),
                title: await this.page.title(),
                variables: this.currentVariables
            };
        } catch (error) {
            console.error('❌ Error getting page info:', error.message);
            return null;
        }
    }

    // Take screenshot using Stagehand
    async takeScreenshot() {
        if (!this.page) return null;
        
        try {
            return await this.page.screenshot({
                type: 'jpeg',
                quality: 60,
                timeout: 5000  // Reduced timeout to prevent hanging
            });
        } catch (error) {
            console.error('❌ Error taking screenshot:', error.message);
            return null;
        }
    }

    parseActionFromInstruction(instruction) {
        const instructionLower = instruction.toLowerCase();
        
        // Navigation actions
        if (instructionLower.includes('navigate to') || instructionLower.includes('go to')) {
            const urlMatch = instruction.match(/(?:navigate to|go to)\s+(.+)/i);
            return {
                type: 'navigate',
                url: urlMatch ? urlMatch[1].trim() : instruction
            };
        }
        
        // Click actions
        if (instructionLower.includes('click')) {
            const targetMatch = instruction.match(/click\s+(?:on\s+)?(?:the\s+)?(.+)/i);
            return {
                type: 'click',
                selector: targetMatch ? targetMatch[1].trim() : instruction,
                description: instruction
            };
        }
        
        // Type/Fill actions
        if (instructionLower.includes('type') || instructionLower.includes('fill') || instructionLower.includes('enter')) {
            const match = instruction.match(/(?:type|fill|enter)\s+"?([^"]+)"?\s+(?:in|into)\s+(?:the\s+)?(.+)/i);
            if (match) {
                return {
                    type: 'type',
                    text: match[1].trim(),
                    selector: match[2].trim(),
                    description: instruction
                };
            }
        }
        
        // Select actions
        if (instructionLower.includes('select')) {
            const match = instruction.match(/select\s+"?([^"]+)"?\s+(?:from|in)\s+(?:the\s+)?(.+)/i);
            if (match) {
                return {
                    type: 'select',
                    value: match[1].trim(),
                    selector: match[2].trim(),
                    description: instruction
                };
            }
        }
        
        // Wait actions
        if (instructionLower.includes('wait')) {
            return {
                type: 'wait',
                description: instruction
            };
        }
        
        // Default action
        return {
            type: 'action',
            description: instruction
        };
    }

    // Enhanced interaction methods using robust element interaction
    async robustClick(selector, options = {}) {
        if (!this.robustInteraction) {
            throw new Error('Robust interaction system not initialized');
        }
        
        return await this.robustInteraction.interact(selector, 'click', options);
    }

    async robustType(selector, text, options = {}) {
        if (!this.robustInteraction) {
            throw new Error('Robust interaction system not initialized');
        }
        
        return await this.robustInteraction.interact(selector, 'type', {
            ...options,
            text: this.processVariableString(text)
        });
    }

    async robustSelect(selector, value, options = {}) {
        if (!this.robustInteraction) {
            throw new Error('Robust interaction system not initialized');
        }
        
        return await this.robustInteraction.interact(selector, 'select', {
            ...options,
            value: this.processVariableString(value)
        });
    }

    async robustSelectDropdown(selector, targetText, options = {}) {
        if (!this.robustInteraction) {
            throw new Error('Robust interaction system not initialized');
        }
        
        return await this.robustInteraction.selectDropdownWithArrows(
            selector, 
            this.processVariableString(targetText), 
            options
        );
    }

    async robustHover(selector, options = {}) {
        if (!this.robustInteraction) {
            throw new Error('Robust interaction system not initialized');
        }
        
        return await this.robustInteraction.interact(selector, 'hover', options);
    }

    // Get robust interaction statistics
    getRobustInteractionStats() {
        if (!this.robustInteraction) {
            return null;
        }
        
        return this.robustInteraction.getStats();
    }

    // Get error recovery statistics
    getErrorRecoveryStats() {
        if (!this.errorRecovery) {
            return null;
        }
        
        return this.errorRecovery.getRecoveryStats();
    }
}

module.exports = StagehandAutomationEngine; 