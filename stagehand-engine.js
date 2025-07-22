const { Stagehand } = require('@browserbasehq/stagehand');
const { z } = require('zod');
const RobustElementInteraction = require('./modules/browser/element-interaction');
const ComprehensiveErrorRecovery = require('./modules/browser/error-recovery');
const VariableAnalyzer = require('./modules/analysis/variable-analyzer');
const ElementContextAnalyzer = require('./modules/analysis/element-context-analyzer');
const ValidationRuleGenerator = require('./modules/analysis/validation-rule-generator');
const { RecordingSession, Variable, VariableTypes } = require('./modules/storage/models');
const PlaywrightRecorder = require('./modules/recording/playwright-recorder');

// Import workflow system components
const WorkflowEngine = require('./modules/workflow/workflow-engine');
const StepExecutor = require('./modules/workflow/step-executor');
const TimingController = require('./modules/workflow/timing-controller');
const NavigationHandler = require('./modules/workflow/handlers/navigation-handler');
const InteractionHandler = require('./modules/workflow/handlers/interaction-handler');
const ExtractionHandler = require('./modules/workflow/handlers/extraction-handler');
const ValidationHandler = require('./modules/workflow/handlers/validation-handler');
const ControlHandler = require('./modules/workflow/handlers/control-handler');
const WorkflowParser = require('./modules/workflow/workflow-parser');

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
        
        // Enhanced recording capabilities
        this.isRecording = false;
        this.currentRecordingSession = null;
        this.recordedActions = [];
        this.variableAnalyzer = null;
        this.elementContextAnalyzer = null;
        this.validationRuleGenerator = null;
        
        // Import error recovery module
        this.errorRecovery = null;
        this.importErrorRecovery();
        
        // Initialize workflow system components
        this.workflowEngine = null;
        this.stepExecutor = null;
        this.timingController = null;
        this.workflowParser = null;
        this.activeWorkflows = new Map();
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
            
            // Extract API key from modelClientOptions if available
            const apiKey = this.options.modelClientOptions?.apiKey || this.options.openaiApiKey || process.env.OPENAI_API_KEY;
            console.log('🔑 Using API key from options:', apiKey ? 'SET' : 'NOT SET');
            
            // Ensure API key is properly set in the options
            if (apiKey) {
                this.options.modelClientOptions = this.options.modelClientOptions || {};
                this.options.modelClientOptions.apiKey = apiKey;
            }
            
            this.stagehand = new Stagehand(this.options);
            await this.stagehand.init();
            
            this.page = this.stagehand.page;
            
            // Set proper browser viewport size for better user experience
            await this.page.setViewportSize({ 
                width: 1920,  // Full HD width for modern web applications
                height: 1080  // Full HD height for complete page visibility
            });
            console.log('📐 Set browser viewport to 1920x1080 for optimal user experience');
            
            // Initialize robust element interaction system if available
            try {
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
            
            // Initialize variable analysis components
            this.variableAnalyzer = new VariableAnalyzer({
                confidenceThreshold: 0.7,
                enableAdvancedPatterns: true,
                sensitiveDataDetection: true
            });
            
            this.elementContextAnalyzer = new ElementContextAnalyzer({
                enableSemanticAnalysis: true,
                enableSiblingAnalysis: true,
                enableFormAnalysis: true
            });
            
            this.validationRuleGenerator = new ValidationRuleGenerator({
                strictValidation: true,
                enableCustomPatterns: true,
                supportMultipleLanguages: true
            });
            
            // Initialize Playwright recorder for generating scripts
            this.playwrightRecorder = new PlaywrightRecorder({
                skipErrors: true,
                includeScreenshots: false,
                generateComments: true,
                variablePattern: '${VAR_NAME}'
            });
            
            // Initialize workflow system
            await this.initializeWorkflowSystem();
            
            this.isInitialized = true;
            
            console.log('✅ Stagehand engine initialized with enhanced error handling and workflow system');
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

            // Check if this is a multi-step instruction
            if (this.isMultiStepInstruction(instruction)) {
                const result = await this.executeMultiStepInstruction(instruction);
                this.resetInstructionState();
                return result;
            }

            // Use Stagehand's intelligent action processing for single steps
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

    // Detect multi-step instructions
    isMultiStepInstruction(instruction) {
        // Check for numbered steps (1., 2., 3., etc.)
        const numberedSteps = /^\s*\d+\.\s*\*\*.*?\*\*|\d+\.\s*\*\*.*?\*\*/gm;
        const numberedMatches = instruction.match(numberedSteps);
        
        // Check for markdown bold steps (**Step**)
        const boldSteps = /\*\*[^*]+\*\*/g;
        const boldMatches = instruction.match(boldSteps);
        
        // Check for multiple sentences with action words
        const actionWords = ['navigate', 'fill', 'click', 'submit', 'enter', 'select', 'type'];
        const sentences = instruction.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const actionSentences = sentences.filter(sentence => 
            actionWords.some(word => sentence.toLowerCase().includes(word))
        );
        
        return (numberedMatches && numberedMatches.length > 1) || 
               (boldMatches && boldMatches.length > 1) ||
               (actionSentences.length > 1);
    }

    // Execute multi-step instructions sequentially
    async executeMultiStepInstruction(instruction) {
        console.log('🔄 Detected multi-step instruction, breaking down into individual steps...');
        
        const steps = this.parseMultiStepInstruction(instruction);
        console.log(`📋 Parsed ${steps.length} steps:`, steps.map((s, i) => `${i+1}. ${s}`));
        
        const results = [];
        let allSuccessful = true;
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const stepNumber = i + 1;
            
            console.log(`🎯 Executing step ${stepNumber}/${steps.length}: "${step}"`);
            
            try {
                // Add a small delay between steps to allow page to settle
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
                const stepResult = await this.executeAutomation(step);
                results.push({
                    step: stepNumber,
                    instruction: step,
                    result: stepResult,
                    success: true
                });
                
                console.log(`✅ Step ${stepNumber} completed successfully`);
                
            } catch (error) {
                console.error(`❌ Step ${stepNumber} failed:`, error.message);
                
                results.push({
                    step: stepNumber,
                    instruction: step,
                    error: error.message,
                    success: false
                });
                
                allSuccessful = false;
                
                // Decide whether to continue or stop
                if (this.shouldStopOnStepFailure(step, error)) {
                    console.log(`🛑 Stopping execution due to critical step failure`);
                    break;
                } else {
                    console.log(`⚠️ Continuing with next step despite failure`);
                }
            }
        }
        
        const successfulSteps = results.filter(r => r.success).length;
        
        return {
            success: allSuccessful,
            totalSteps: steps.length,
            successfulSteps: successfulSteps,
            failedSteps: steps.length - successfulSteps,
            results: results,
            action: 'multi_step_execution'
        };
    }

    // Parse multi-step instruction into individual steps
    parseMultiStepInstruction(instruction) {
        const steps = [];
        
        // Method 1: Try numbered steps first (1., 2., 3., etc.)
        const numberedPattern = /(\d+\.\s*\*\*[^*]+\*\*[^0-9]*?)(?=\d+\.\s*\*\*|$)/g;
        let match;
        
        while ((match = numberedPattern.exec(instruction)) !== null) {
            const step = match[1].trim();
            if (step) {
                // Clean up the step text
                const cleanStep = step
                    .replace(/^\d+\.\s*/, '') // Remove number prefix
                    .replace(/\*\*/g, '') // Remove markdown bold
                    .trim();
                
                if (cleanStep) {
                    steps.push(cleanStep);
                }
            }
        }
        
        // Method 2: If no numbered steps, try bold patterns
        if (steps.length === 0) {
            const boldPattern = /\*\*([^*]+)\*\*([^*]*?)(?=\*\*|$)/g;
            
            while ((match = boldPattern.exec(instruction)) !== null) {
                const action = match[1].trim();
                const details = match[2].trim();
                
                if (action) {
                    const step = details ? `${action} ${details}` : action;
                    steps.push(step.trim());
                }
            }
        }
        
        // Method 3: If still no steps, split by sentences with action words
        if (steps.length === 0) {
            const actionWords = ['navigate', 'fill', 'click', 'submit', 'enter', 'select', 'type'];
            const sentences = instruction.split(/[.!?]+/).filter(s => s.trim().length > 0);
            
            for (const sentence of sentences) {
                if (actionWords.some(word => sentence.toLowerCase().includes(word))) {
                    steps.push(sentence.trim());
                }
            }
        }
        
        // Fallback: if no steps found, treat as single step
        if (steps.length === 0) {
            steps.push(instruction.trim());
        }
        
        return steps;
    }

    // Determine if execution should stop on step failure
    shouldStopOnStepFailure(step, error) {
        // Stop on navigation failures (critical)
        if (step.toLowerCase().includes('navigate') || step.toLowerCase().includes('go to')) {
            return true;
        }
        
        // Stop on login failures (critical)
        if (step.toLowerCase().includes('login') || step.toLowerCase().includes('submit')) {
            return true;
        }
        
        // Continue on form field failures (non-critical)
        if (step.toLowerCase().includes('fill') || step.toLowerCase().includes('type')) {
            return false;
        }
        
        // Default: stop on failure
        return true;
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
        // Add safe property access
        if (!step || typeof step !== 'string') {
            throw new Error('Invalid step: step must be a non-empty string');
        }
        
        if (step.startsWith('Navigate to ')) {
            const url = step.replace('Navigate to ', '');
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            console.log(`✅ Navigated to: ${url}`);
            
            // Record successful navigation in Playwright recorder
            if (this.isRecording && this.playwrightRecorder) {
                this.playwrightRecorder.recordNavigation(url);
            }
            
            return;
        }

        // Use robust Stagehand wrapper with comprehensive error handling
        await this.robustPageAct(step, { timeout: 20000 });
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
            
            // Use robust Stagehand wrapper with comprehensive error handling
            console.log('🎯 Executing action with Stagehand...');
            
            await this.robustPageAct(instruction, { timeout: 30000 });
            
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
            
            // Check if this is a Stagehand method compatibility issue
            if (error.message.includes('Method navigate not supported') || 
                error.message.includes('PlaywrightCommandMethodNotSupportedException')) {
                console.log('🔄 Attempting fallback for unsupported Stagehand method...');
                return await this.handleStagehandFallback(instruction, error);
            }
            
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
        // Enhanced URL extraction with better cleaning
        const urlPatterns = [
            /(?:navigate|go)\s+to\s+(https?:\/\/[^\s]+)/i,
            /(?:open|visit)\s+(https?:\/\/[^\s]+)/i,
            /(https?:\/\/[^\s`'"]+)/i // Direct URL detection
        ];

        for (const pattern of urlPatterns) {
            const match = instruction.match(pattern);
            if (match) {
                let url = match[1] || match[0];
                
                // Clean the URL of any formatting artifacts
                url = url.replace(/[`'"]/g, '').trim();
                
                // Ensure proper URL format
                if (!url.startsWith('http')) {
                    url = 'https://' + url;
                }
                
                console.log(`🌐 Direct navigation detected: "${instruction}" → "${url}"`);
                
                try {
                    await this.page.goto(url, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000 
                    });
                    
                    // Verify we actually navigated to the expected domain
                    const currentUrl = this.page.url();
                    const expectedDomain = new URL(url).hostname;
                    const currentDomain = new URL(currentUrl).hostname;
                    
                    if (currentDomain === expectedDomain) {
                        console.log(`✅ Navigation successful: Now on ${currentDomain}`);
                        
                        // Record successful navigation in Playwright recorder
                        if (this.isRecording && this.playwrightRecorder) {
                            this.playwrightRecorder.recordNavigation(url, currentUrl);
                        }
                        
                        return {
                            success: true,
                            action: { type: 'navigate', url: url, currentUrl: currentUrl },
                            method: 'direct_navigation'
                        };
                    } else {
                        console.error(`❌ Navigation domain mismatch: Expected ${expectedDomain}, got ${currentDomain}`);
                        return {
                            success: false,
                            error: `Navigation failed: Expected ${expectedDomain} but ended up on ${currentDomain}`
                        };
                    }
                } catch (error) {
                    console.error(`❌ Navigation failed:`, error.message);
                    return {
                        success: false,
                        error: `Navigation failed: ${error.message}`
                    };
                }
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

    // Handle Stagehand fallback for unsupported methods
    async handleStagehandFallback(instruction, originalError) {
        console.log('🔧 Implementing Stagehand fallback for:', instruction);
        
        try {
            // Parse the instruction to understand what action is needed
            const actionDetails = this.parseActionFromInstruction(instruction);
            
            // Handle different types of actions with direct Playwright
            switch (actionDetails.type) {
                case 'navigate':
                    return await this.handleDirectNavigation(actionDetails.url || instruction);
                    
                case 'click':
                    return await this.handleDirectClick(instruction);
                    
                case 'type':
                    return await this.handleDirectType(instruction);
                    
                case 'select':
                    return await this.handleDirectSelect(instruction);
                    
                default:
                    // For complex actions, try to use AI to identify elements but execute with Playwright
                    return await this.handleComplexActionFallback(instruction);
            }
            
        } catch (fallbackError) {
            console.error('❌ Fallback method also failed:', fallbackError.message);
            
            // Return the original error with additional context
            throw new Error(`Stagehand failed: ${originalError.message}. Fallback also failed: ${fallbackError.message}`);
        }
    }
    
    async handleDirectNavigation(url) {
        console.log('🌐 Direct navigation fallback to:', url);
        
        // Clean up URL if needed
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        // ✅ FIXED: Record navigation in PlaywrightRecorder during direct navigation fallback
        if (this.isRecording && this.playwrightRecorder) {
            this.playwrightRecorder.recordNavigation(url);
            console.log(`🎬 Recorded fallback navigation in Playwright script: ${url}`);
        }
        
        return {
            success: true,
            action: { type: 'navigate', url: url },
            method: 'direct_playwright_navigation'
        };
    }
    
    async handleDirectClick(instruction) {
        console.log('🖱️ Direct click fallback for:', instruction);
        
        // Try common button/link selectors
        const commonSelectors = [
            'button:contains("search")',
            'input[type="submit"]',
            '[role="button"]',
            'a:contains("search")',
            '.search-button',
            '#search-button',
            '.btn-search',
            'button[type="submit"]'
        ];
        
        for (const selector of commonSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.click();
                    console.log(`✅ Clicked element with selector: ${selector}`);
                    return {
                        success: true,
                        action: { type: 'click', selector: selector },
                        method: 'direct_playwright_click'
                    };
                }
            } catch (error) {
                // Continue to next selector
                continue;
            }
        }
        
        throw new Error('Could not find clickable element');
    }
    
    async handleDirectType(instruction) {
        console.log('⌨️ Direct type fallback for:', instruction);
        
        // Extract text to type from instruction
        const textMatch = instruction.match(/(?:type|search for|enter)\s+"?([^"]+)"?/i);
        const text = textMatch ? textMatch[1] : '';
        
        if (!text) {
            throw new Error('Could not extract text to type from instruction');
        }
        
        // Try common input selectors
        const inputSelectors = [
            'input[type="search"]',
            'input[name*="search"]',
            'input[placeholder*="search"]',
            '.search-input',
            '#search-input',
            'input[type="text"]',
            'textarea'
        ];
        
        for (const selector of inputSelectors) {
            try {
                const element = await this.page.$(selector);
                if (element) {
                    await element.fill(text);
                    console.log(`✅ Typed "${text}" into element with selector: ${selector}`);
                    return {
                        success: true,
                        action: { type: 'type', text: text, selector: selector },
                        method: 'direct_playwright_type'
                    };
                }
            } catch (error) {
                // Continue to next selector
                continue;
            }
        }
        
        throw new Error('Could not find input element to type into');
    }
    
    async handleDirectSelect(instruction) {
        console.log('📋 Direct select fallback for:', instruction);
        
        // This is a placeholder for select operations
        // Can be expanded based on specific needs
        throw new Error('Direct select fallback not yet implemented');
    }
    
    async handleComplexActionFallback(instruction) {
        console.log('🔍 Complex action fallback for:', instruction);
        
        // For search operations, try a combined approach
        if (instruction.toLowerCase().includes('search')) {
            try {
                // First try to type in search box
                await this.handleDirectType(instruction);
                
                // Then try to click search button
                await this.handleDirectClick('click search button');
                
                return {
                    success: true,
                    action: { type: 'complex_search', instruction: instruction },
                    method: 'combined_playwright_actions'
                };
                
            } catch (error) {
                console.error('❌ Complex search fallback failed:', error.message);
                throw error;
            }
        }
        
        throw new Error('Complex action fallback not implemented for this instruction type');
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

    // ===== ENHANCED RECORDING METHODS =====

    /**
     * Start enhanced recording session with Playwright script generation
     */
    async startRecording(automationId, options = {}) {
        if (this.isRecording) {
            throw new Error('Recording session already active');
        }

        console.log(`📹 Starting Playwright recording session for automation: ${automationId}`);
        
        this.isRecording = true;
        this.recordedActions = [];
        
        // Start the Playwright recorder
        const automationName = options.name || `automation_${automationId}`;
        this.playwrightRecorder.startRecording(automationId, automationName);
        
        // Create new recording session (for compatibility)
        this.currentRecordingSession = new RecordingSession({
            automationId: automationId,
            sessionId: Date.now().toString(),
            metadata: {
                options: options,
                userAgent: await this.page.evaluate(() => navigator.userAgent),
                url: this.page.url(),
                timestamp: new Date().toISOString()
            }
        });

        // Set up page event listeners for recording (legacy support)
        await this.setupRecordingListeners();
        
        console.log(`✅ Playwright recording session started: ${this.currentRecordingSession.id}`);
        return this.currentRecordingSession;
    }

    /**
     * Stop recording and generate Playwright script
     */
    async stopRecording() {
        if (!this.isRecording) {
            throw new Error('No active recording session');
        }

        console.log(`⏹️ Stopping Playwright recording session: ${this.currentRecordingSession.id}`);
        
        this.isRecording = false;
        
        // Remove event listeners
        await this.removeRecordingListeners();
        
        // Stop the Playwright recorder and get the generated script
        const playwrightResult = this.playwrightRecorder.stopRecording();
        
        // Analyze recorded actions for variables (legacy support)
        const detectedVariables = await this.analyzeRecordedVariables();
        
        // Complete the recording session
        this.currentRecordingSession.complete();
        this.currentRecordingSession.detectedVariables = detectedVariables;
        
        const result = {
            session: this.currentRecordingSession,
            actions: this.recordedActions,
            variables: detectedVariables,
            actionCount: this.recordedActions.length,
            variableCount: detectedVariables.length,
            // NEW: Add Playwright script generation
            playwrightScript: playwrightResult.script,
            scriptFilename: playwrightResult.filename,
            playwrightVariables: playwrightResult.session.variables
        };
        
        console.log(`✅ Playwright recording completed: ${result.actionCount} actions, ${result.variableCount} variables detected`);
        console.log(`🎬 Generated Playwright script: ${playwrightResult.filename}`);
        
        // Reset recording state
        this.currentRecordingSession = null;
        this.recordedActions = [];
        
        return result;
    }

    /**
     * Set up event listeners for recording browser interactions
     */
    async setupRecordingListeners() {
        if (!this.page) return;

        try {
            // Inject recording script into the page
            await this.page.addInitScript(() => {
                // Store original methods
                window._originalAddEventListener = EventTarget.prototype.addEventListener;
                window._recordedEvents = [];
                
                // Override addEventListener to capture events
                EventTarget.prototype.addEventListener = function(type, listener, options) {
                    // Call original method
                    window._originalAddEventListener.call(this, type, listener, options);
                    
                    // Add our recording listener for relevant events
                    if (['click', 'input', 'change', 'submit', 'focus', 'blur'].includes(type)) {
                        window._originalAddEventListener.call(this, type, (event) => {
                            window._recordedEvents.push({
                                type: event.type,
                                target: {
                                    tagName: event.target.tagName,
                                    type: event.target.type,
                                    name: event.target.name,
                                    id: event.target.id,
                                    className: event.target.className,
                                    value: event.target.value,
                                    placeholder: event.target.placeholder,
                                    label: event.target.labels?.[0]?.textContent || '',
                                    ariaLabel: event.target.ariaLabel || ''
                                },
                                timestamp: Date.now(),
                                url: window.location.href
                            });
                        }, { passive: true });
                    }
                };
            });

            // Set up periodic collection of recorded events
            this.recordingInterval = setInterval(async () => {
                if (this.isRecording) {
                    await this.collectRecordedEvents();
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Error setting up recording listeners:', error.message);
        }
    }

    /**
     * Remove recording event listeners
     */
    async removeRecordingListeners() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }

        try {
            // Restore original addEventListener
            await this.page.evaluate(() => {
                if (window._originalAddEventListener) {
                    EventTarget.prototype.addEventListener = window._originalAddEventListener;
                    delete window._originalAddEventListener;
                    delete window._recordedEvents;
                }
            });
        } catch (error) {
            console.error('❌ Error removing recording listeners:', error.message);
        }
    }

    /**
     * Collect recorded events from the page
     */
    async collectRecordedEvents() {
        try {
            const events = await this.page.evaluate(() => {
                const events = window._recordedEvents || [];
                window._recordedEvents = []; // Clear collected events
                return events;
            });

            // Process and store events as actions
            for (const event of events) {
                const action = await this.processRecordedEvent(event);
                if (action) {
                    this.recordedActions.push(action);
                    this.currentRecordingSession.addAction(action);
                }
            }
        } catch (error) {
            console.error('❌ Error collecting recorded events:', error.message);
        }
    }

    /**
     * Process a recorded event into an action
     */
    async processRecordedEvent(event) {
        try {
            const action = {
                id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: this.mapEventTypeToAction(event.type),
                element: event.target,
                value: event.target.value || '',
                timestamp: event.timestamp,
                url: event.url,
                screenshot: null // Could add screenshot capture here
            };

            // Take screenshot for important actions
            if (['click', 'submit'].includes(action.type)) {
                try {
                    action.screenshot = await this.takeScreenshot();
                } catch (error) {
                    console.warn('⚠️ Could not capture screenshot for action');
                }
            }

            console.log(`📝 Recorded action: ${action.type} on ${action.element.tagName}`);
            return action;
        } catch (error) {
            console.error('❌ Error processing recorded event:', error.message);
            return null;
        }
    }

    /**
     * Map DOM event types to action types
     */
    mapEventTypeToAction(eventType) {
        const mapping = {
            'click': 'click',
            'input': 'type',
            'change': 'change',
            'submit': 'submit',
            'focus': 'focus',
            'blur': 'blur'
        };
        
        return mapping[eventType] || 'unknown';
    }

    /**
     * Analyze recorded actions to detect variables
     */
    async analyzeRecordedVariables() {
        if (!this.variableAnalyzer || this.recordedActions.length === 0) {
            return [];
        }

        console.log(`🔍 Analyzing ${this.recordedActions.length} recorded actions for variables...`);
        
        try {
            // Use the variable analyzer to detect patterns
            const variableCandidates = await this.variableAnalyzer.analyzeRecording(this.recordedActions);
            
            // Enhance with element context analysis
            const enhancedVariables = [];
            for (const candidate of variableCandidates) {
                const contextAnalysis = this.elementContextAnalyzer.analyzeElementContext(
                    candidate.element, 
                    candidate.value
                );
                
                // Generate validation rules
                const validationRules = this.validationRuleGenerator.generateValidationRules(
                    candidate.type,
                    candidate.value,
                    contextAnalysis.context
                );
                
                // Create enhanced variable
                const enhancedVariable = new Variable({
                    id: candidate.id,
                    name: contextAnalysis.recommendedName || candidate.name,
                    type: candidate.type,
                    value: candidate.value,
                    description: candidate.description || contextAnalysis.semantics.purpose,
                    examples: candidate.examples,
                    validation: validationRules,
                    sensitive: candidate.sensitive,
                    confidenceScore: candidate.confidence,
                    elementInfo: {
                        ...candidate.element,
                        context: contextAnalysis.context,
                        relationships: contextAnalysis.relationships
                    }
                });
                
                enhancedVariables.push(enhancedVariable);
            }
            
            console.log(`✅ Enhanced ${enhancedVariables.length} variables with context analysis`);
            return enhancedVariables;
            
        } catch (error) {
            console.error('❌ Error analyzing recorded variables:', error.message);
            return [];
        }
    }

    /**
     * Get current recording status
     */
    getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            sessionId: this.currentRecordingSession?.id || null,
            actionCount: this.recordedActions.length,
            startTime: this.currentRecordingSession?.startedAt || null,
            duration: this.currentRecordingSession ? 
                Date.now() - new Date(this.currentRecordingSession.startedAt).getTime() : 0
        };
    }

    /**
     * Record a successful action with the Playwright recorder
     */
    recordSuccessfulAction(instruction, result) {
        if (!this.isRecording || !this.playwrightRecorder) return;

        try {
            // Get current URL for redirect detection
            const currentUrl = this.page ? this.page.url() : null;
            
            // Analyze instruction to determine action type and record appropriately
            const instructionLower = instruction.toLowerCase();
            
            if (instructionLower.includes('fill') && instructionLower.includes('cpf')) {
                // Record CPF form fill with current URL for redirect detection
                const value = instruction.match(/["']([^"']+)["']/)?.[1] || '000.000.000-00';
                this.playwrightRecorder.recordFormFill('cpf', value, null, currentUrl);
                console.log(`🎬 Recorded CPF form fill on URL: ${currentUrl}`);
                
            } else if (instructionLower.includes('fill') && (instructionLower.includes('password') || instructionLower.includes('senha'))) {
                // Record password form fill with current URL for redirect detection
                const value = instruction.match(/["']([^"']+)["']/)?.[1] || 'password';
                this.playwrightRecorder.recordFormFill('password', value, null, currentUrl);
                console.log(`🎬 Recorded password form fill on URL: ${currentUrl}`);
                
            } else if (instructionLower.includes('click')) {
                // Record click action
                this.playwrightRecorder.recordClick(instruction);
                console.log(`🎬 Recorded click action: "${instruction}"`);
                
            } else {
                // Record generic action
                this.playwrightRecorder.recordStagehandAction(instruction, { success: true });
                console.log(`🎬 Recorded successful action: "${instruction}"`);
            }
            
        } catch (error) {
            console.warn(`⚠️ Failed to record action for Playwright script: ${error.message}`);
        }
    }

    /**
     * Process variable string with substitution and validation
     */
    processVariableString(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Replace variable placeholders with actual values
        return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
            const value = this.variables.get(variableName);
            if (value !== undefined) {
                // Log variable usage for analytics
                this.trackVariableUsage(variableName, value);
                return value;
            }
            
            console.warn(`⚠️ Variable not found: ${variableName}`);
            return match; // Return placeholder if variable not found
        });
    }

    /**
     * Set variable value with validation
     */
    async setVariable(name, value, variableDefinition = null) {
        try {
            // Validate variable value if definition is provided
            if (variableDefinition && this.variableValidationService) {
                const validation = await this.variableValidationService.validateValue(variableDefinition, value);
                if (!validation.valid) {
                    throw new Error(`Variable validation failed for ${name}: ${validation.errors[0]?.message}`);
                }
                
                if (validation.warnings.length > 0) {
                    console.warn(`⚠️ Variable warnings for ${name}:`, validation.warnings);
                }
            }
            
            this.variables.set(name, value);
            console.log(`📝 Variable set: ${name} = ${variableDefinition?.sensitive ? '***' : value}`);
            
            return { success: true, warnings: variableDefinition ? [] : [] };
        } catch (error) {
            console.error(`❌ Error setting variable ${name}:`, error.message);
            throw error;
        }
    }

    /**
     * Set multiple variables with batch validation
     */
    async setVariables(variableMap, variableDefinitions = {}) {
        const results = [];
        const errors = [];
        
        for (const [name, value] of Object.entries(variableMap)) {
            try {
                const definition = variableDefinitions[name];
                const result = await this.setVariable(name, value, definition);
                results.push({ name, success: true, ...result });
            } catch (error) {
                errors.push({ name, error: error.message });
                results.push({ name, success: false, error: error.message });
            }
        }
        
        if (errors.length > 0) {
            console.warn(`⚠️ ${errors.length} variable(s) failed validation:`, errors);
        }
        
        return {
            success: errors.length === 0,
            results,
            errors,
            totalSet: results.filter(r => r.success).length,
            totalFailed: errors.length
        };
    }

    /**
     * Get variable value
     */
    getVariable(name) {
        return this.variables.get(name);
    }

    /**
     * Get all variables
     */
    getAllVariables() {
        return Object.fromEntries(this.variables);
    }

    /**
     * Clear all variables
     */
    clearVariables() {
        this.variables.clear();
        console.log('🧹 All variables cleared');
    }

    /**
     * Execute automation with variable substitution
     */
    async executeWithVariables(actions, variables = {}, variableDefinitions = {}) {
        try {
            console.log(`🎯 Executing automation with ${Object.keys(variables).length} variables`);
            
            // Set all variables first
            const variableResult = await this.setVariables(variables, variableDefinitions);
            if (!variableResult.success) {
                throw new Error(`Variable validation failed: ${variableResult.errors.map(e => e.error).join(', ')}`);
            }
            
            const results = [];
            let executionId = Date.now().toString();
            
            // Execute each action with variable substitution
            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                const startTime = Date.now();
                
                try {
                    console.log(`🔄 Executing step ${i + 1}/${actions.length}: ${action.type}`);
                    
                    const result = await this.executeActionWithVariables(action);
                    const duration = Date.now() - startTime;
                    
                    results.push({
                        stepIndex: i,
                        action: action,
                        success: true,
                        result: result,
                        duration: duration
                    });
                    
                    // Track variable usage if action used variables
                    if (action.variableId && this.variableStore) {
                        await this.variableStore.trackVariableUsage(
                            action.variableId, 
                            executionId, 
                            true, 
                            duration
                        );
                    }
                    
                    console.log(`✅ Step ${i + 1} completed in ${duration}ms`);
                    
                } catch (error) {
                    const duration = Date.now() - startTime;
                    
                    results.push({
                        stepIndex: i,
                        action: action,
                        success: false,
                        error: error.message,
                        duration: duration
                    });
                    
                    // Track variable usage failure
                    if (action.variableId && this.variableStore) {
                        await this.variableStore.trackVariableUsage(
                            action.variableId, 
                            executionId, 
                            false, 
                            duration,
                            error.message
                        );
                    }
                    
                    console.error(`❌ Step ${i + 1} failed:`, error.message);
                    
                    // Decide whether to continue or stop
                    if (action.stopOnError !== false) {
                        throw error;
                    }
                }
            }
            
            const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
            const successCount = results.filter(r => r.success).length;
            
            console.log(`✅ Automation completed: ${successCount}/${results.length} steps successful in ${totalDuration}ms`);
            
            return {
                success: successCount === results.length,
                executionId,
                results,
                summary: {
                    totalSteps: results.length,
                    successfulSteps: successCount,
                    failedSteps: results.length - successCount,
                    totalDuration,
                    variablesUsed: Object.keys(variables).length
                }
            };
            
        } catch (error) {
            console.error('❌ Automation execution failed:', error.message);
            throw error;
        }
    }

    /**
     * Execute individual action with variable substitution
     */
    async executeActionWithVariables(action) {
        const processedAction = this.processActionVariables(action);
        
        switch (processedAction.type) {
            case 'navigate':
                await this.page.goto(processedAction.url, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 15000 
                });
                return { type: 'navigate', url: processedAction.url };
                
            case 'click':
                if (this.robustInteraction) {
                    return await this.robustClick(processedAction.selector);
                } else {
                    await this.robustPageAct(processedAction.instruction || `Click ${processedAction.selector}`);
                    return { type: 'click', selector: processedAction.selector };
                }
                
            case 'type':
                if (this.robustInteraction) {
                    return await this.robustType(processedAction.selector, processedAction.text);
                } else {
                    const instruction = `Type "${processedAction.text}" in ${processedAction.selector}`;
                    await this.robustPageAct(instruction);
                    return { type: 'type', selector: processedAction.selector, text: processedAction.text };
                }
                
            case 'select':
                if (this.robustInteraction) {
                    return await this.robustSelect(processedAction.selector, processedAction.value);
                } else {
                    const instruction = `Select "${processedAction.value}" from ${processedAction.selector}`;
                    await this.robustPageAct(instruction);
                    return { type: 'select', selector: processedAction.selector, value: processedAction.value };
                }
                
            case 'wait':
                const waitTime = processedAction.duration || 2000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return { type: 'wait', duration: waitTime };
                
            default:
                // Use Stagehand's general action processing with robust wrapper
                const instruction = processedAction.instruction || processedAction.description;
                await this.robustPageAct(instruction);
                return { type: 'action', instruction };
        }
    }

    /**
     * Process action to substitute variables
     */
    processActionVariables(action) {
        const processed = { ...action };
        
        // Process all string fields for variable substitution
        const stringFields = ['url', 'text', 'value', 'selector', 'instruction', 'description'];
        
        stringFields.forEach(field => {
            if (processed[field] && typeof processed[field] === 'string') {
                processed[field] = this.processVariableString(processed[field]);
            }
        });
        
        return processed;
    }

    /**
     * Track variable usage for analytics
     */
    trackVariableUsage(variableName, value) {
        // This would integrate with the VariableStore analytics
        if (this.variableStore) {
            // Track usage asynchronously to not block execution
            setImmediate(async () => {
                try {
                    // This would be implemented when we have the variable ID mapping
                    console.log(`📊 Tracking usage of variable: ${variableName}`);
                } catch (error) {
                    console.error('Error tracking variable usage:', error);
                }
            });
        }
    }

    /**
     * Initialize variable store integration
     */
    setVariableStore(variableStore) {
        this.variableStore = variableStore;
        console.log('🔗 Variable store integration enabled');
    }

    /**
     * Initialize variable validation service
     */
    setVariableValidationService(validationService) {
        this.variableValidationService = validationService;
        console.log('🔍 Variable validation service enabled');
    }

    // ==================== WORKFLOW SYSTEM INTEGRATION ====================
    
    /**
     * Initialize workflow system components
     */
    async initializeWorkflowSystem() {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return await workflowIntegration.initializeWorkflowSystem.call(this);
    }
    
    /**
     * Register step handlers with the step executor
     */
    async registerStepHandlers() {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return await workflowIntegration.registerStepHandlers.call(this);
    }
    
    /**
     * Set up workflow event listeners
     */
    setupWorkflowEventListeners() {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return workflowIntegration.setupWorkflowEventListeners.call(this);
    }
    
    /**
     * Execute workflow from definition
     */
    async executeWorkflow(workflowDefinition, context = {}) {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return await workflowIntegration.executeWorkflow.call(this, workflowDefinition, context);
    }
    
    /**
     * Convert automation steps to workflow format
     */
    convertAutomationToWorkflow(automation) {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return workflowIntegration.convertAutomationToWorkflow.call(this, automation);
    }
    
    /**
     * Execute automation as workflow
     */
    async executeAutomationAsWorkflow(automation, context = {}) {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return await workflowIntegration.executeAutomationAsWorkflow.call(this, automation, context);
    }
    
    /**
     * Get active workflow statuses
     */
    getActiveWorkflows() {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return workflowIntegration.getActiveWorkflows.call(this);
    }
    
    /**
     * Pause workflow execution
     */
    async pauseWorkflow(executionId) {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return await workflowIntegration.pauseWorkflow.call(this, executionId);
    }
    
    /**
     * Resume workflow execution
     */
    async resumeWorkflow(executionId) {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return await workflowIntegration.resumeWorkflow.call(this, executionId);
    }
    
    /**
     * Stop workflow execution
     */
    async stopWorkflow(executionId, reason = 'user_requested') {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return await workflowIntegration.stopWorkflow.call(this, executionId, reason);
    }
    
    /**
     * Get workflow execution status
     */
    getWorkflowStatus(executionId) {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return workflowIntegration.getWorkflowStatus.call(this, executionId);
    }
    
    /**
     * Create workflow from recorded actions
     */
    createWorkflowFromRecording(recordedActions, metadata = {}) {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return workflowIntegration.createWorkflowFromRecording.call(this, recordedActions, metadata);
    }
    
    /**
     * Get workflow system statistics
     */
    getWorkflowStats() {
        const workflowIntegration = require('./modules/workflow/workflow-integration');
        return workflowIntegration.getWorkflowStats.call(this);
    }
    
    // ==================== ENHANCED AUTOMATION METHODS ====================
    
    /**
     * Enhanced instruction processing with workflow support
     */
    async processInstructionAsWorkflow(instruction, options = {}) {
        try {
            // Create a simple workflow from the instruction
            const workflow = {
                id: `instruction_${Date.now()}`,
                name: 'Instruction Workflow',
                description: `Workflow for instruction: ${instruction}`,
                version: '1.0.0',
                steps: [{
                    id: 'instruction_step',
                    type: 'interaction',
                    name: 'Process Instruction',
                    action: 'instruction',
                    target: instruction,
                    timeout: options.timeout || 30000,
                    retryOptions: {
                        maxRetries: options.retryAttempts || 3,
                        retryDelay: 1000
                    },
                    continueOnError: false
                }],
                variables: options.variables || [],
                settings: {
                    timeout: options.timeout || 30000,
                    retryAttempts: options.retryAttempts || 3,
                    continueOnError: false
                }
            };
            
            // Execute as workflow
            return await this.executeWorkflow(workflow, {
                sessionId: options.sessionId,
                variables: options.variables || {}
            });
            
        } catch (error) {
            console.error('❌ Enhanced instruction processing failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Execute multiple steps sequentially
     */
    async executeSequentialSteps(steps, context = {}) {
        try {
            const workflow = {
                id: `sequential_${Date.now()}`,
                name: 'Sequential Steps',
                description: 'Sequential execution of multiple steps',
                version: '1.0.0',
                steps: steps.map((step, index) => ({
                    id: step.id || `step_${index + 1}`,
                    type: step.type || 'interaction',
                    name: step.name || `Step ${index + 1}`,
                    action: step.action,
                    target: step.target,
                    value: step.value,
                    timeout: step.timeout || 30000,
                    retryOptions: {
                        maxRetries: step.retryAttempts || 3,
                        retryDelay: 1000
                    },
                    continueOnError: step.continueOnError || false,
                    conditions: step.conditions || [],
                    waitFor: step.waitFor,
                    metadata: step.metadata || {}
                })),
                variables: context.variables || [],
                settings: {
                    timeout: context.timeout || 30000,
                    retryAttempts: context.retryAttempts || 3,
                    continueOnError: context.continueOnError || false
                }
            };
            
            return await this.executeWorkflow(workflow, context);
            
        } catch (error) {
            console.error('❌ Sequential steps execution failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Execute automation with enhanced error recovery and timing
     */
    async executeEnhancedAutomation(automation, context = {}) {
        try {
            console.log(`🚀 Executing enhanced automation: ${automation.name || automation.id}`);
            
            // Convert to workflow format
            const workflow = this.convertAutomationToWorkflow(automation);
            
            // Add enhanced timing and error recovery settings
            workflow.settings = {
                ...workflow.settings,
                adaptiveTimeouts: true,
                smartRetries: true,
                errorRecovery: true,
                stabilityChecks: true
            };
            
            // Execute with workflow engine
            const result = await this.executeWorkflow(workflow, {
                ...context,
                enhancedMode: true,
                timingController: this.timingController,
                errorRecovery: this.errorRecovery
            });
            
            console.log(`✅ Enhanced automation completed: ${automation.name || automation.id}`);
            return result;
            
        } catch (error) {
            console.error('❌ Enhanced automation execution failed:', error.message);
            throw error;
        }
    }

    /**
     * Enhanced form field detection and interaction
     */
    async executeFormAction(actionType, fieldType, value, options = {}) {
        try {
            console.log(`🎯 Enhanced form action: ${actionType} on ${fieldType} field`);
            
            // Generate specific instruction for form fields
            const instruction = this.generateFormInstruction(actionType, fieldType, value);
            
            // Add element validation before action
            await this.validateTargetElement(fieldType);
            
            // Execute with robust wrapper and timeout protection
            await this.robustPageAct(instruction, { timeout: 25000 });
            
            console.log(`✅ Form ${actionType} completed successfully`);
            return { success: true, instruction, fieldType, value };
            
        } catch (error) {
            console.error(`❌ Form ${actionType} failed:`, error.message);
            
            // Try fallback strategy for form fields
            if (error.message.includes('Element is not an <input>') || 
                error.message.includes('xpath=/html')) {
                console.log('🔄 Attempting fallback form field strategy...');
                return await this.fallbackFormFieldAction(actionType, fieldType, value);
            }
            
            throw error;
        }
    }

    /**
     * Generate specific instructions for form fields
     */
    generateFormInstruction(actionType, fieldType, value) {
        if (actionType === 'type' || actionType === 'fill') {
            // Enhanced field-specific instructions with better targeting
            if (fieldType === 'cpf') {
                return `Fill the CPF number "${value}" in the first text input field that accepts document numbers or login credentials (not the password field)`;
            } else if (fieldType === 'password') {
                return `Fill the password "${value}" in the password input field (type="password") - do NOT fill the CPF/document field that was already filled`;
            } else if (fieldType === 'email') {
                return `Fill the email address "${value}" in the email input field (type="email") or login field`;
            } else if (fieldType === 'phone') {
                return `Fill the phone number "${value}" in the phone or telephone input field`;
            } else if (fieldType === 'name') {
                return `Fill the name "${value}" in the name input field`;
            } else {
                return `Fill "${value}" in the ${fieldType} input field`;
            }
        } else if (actionType === 'click') {
            if (fieldType === 'submit' || fieldType === 'login') {
                return `Click the login button or submit button to proceed`;
            } else {
                return `Click the ${fieldType} button`;
            }
        }
        
        return `${actionType} ${value} in ${fieldType} field`;
    }

    /**
     * Validate that we're targeting the correct element type
     */
    async validateTargetElement(fieldType) {
        try {
            // Use Stagehand's extract capability to validate page content
            const pageInfo = await this.page.extract({
                instruction: `Find ${fieldType} input fields on this page`,
                schema: z.object({
                    hasEmailField: z.boolean().describe('Does the page have an email/login input field?'),
                    hasPasswordField: z.boolean().describe('Does the page have a password input field?'),
                    hasSubmitButton: z.boolean().describe('Does the page have a submit/login button?'),
                    formCount: z.number().describe('How many forms are on this page?')
                })
            });
            
            console.log('📋 Page validation:', pageInfo);
            
            // Validate that required fields exist
            if (fieldType === 'email' && !pageInfo.hasEmailField) {
                console.warn('⚠️ Email field not detected on page');
            }
            if (fieldType === 'password' && !pageInfo.hasPasswordField) {
                console.warn('⚠️ Password field not detected on page');
            }
            
            return pageInfo;
            
        } catch (error) {
            console.warn('⚠️ Element validation failed:', error.message);
            // Continue anyway - validation is best effort
            return null;
        }
    }

    /**
     * Fallback strategy for form field interaction
     */
    async fallbackFormFieldAction(actionType, fieldType, value) {
        try {
            console.log('🔄 Attempting Playwright fallback for form fields...');
            
            // Direct Playwright selectors for common form fields
            const selectors = this.getFormFieldSelectors(fieldType);
            
            for (const selector of selectors) {
                try {
                    const element = await this.page.$(selector);
                    if (element) {
                        console.log(`✓ Found ${fieldType} field with selector: ${selector}`);
                        
                        if (actionType === 'type' || actionType === 'fill') {
                            await element.fill(value);
                        } else if (actionType === 'click') {
                            await element.click();
                        }
                        
                        console.log(`✅ Fallback ${actionType} successful`);
                        return { success: true, method: 'playwright_fallback', selector, value };
                    }
                } catch (selectorError) {
                    console.log(`✗ Selector ${selector} failed: ${selectorError.message}`);
                    continue;
                }
            }
            
            throw new Error(`No working selectors found for ${fieldType} field`);
            
        } catch (error) {
            console.error(`❌ Fallback strategy failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get common selectors for form field types (prioritized for Brazilian forms)
     */
    getFormFieldSelectors(fieldType) {
        const selectorMaps = {
            email: [
                'input[type="email"]',
                'input[name*="email"]',
                'input[id*="email"]',
                'input[placeholder*="email" i]',
                'input[name*="login"]',
                'input[id*="login"]',
                'input[name*="username"]',
                'input[id*="username"]',
                'input[placeholder*="E-mail" i]',
                'input[class*="email"]'
            ],
            password: [
                'input[type="password"]',  // Most specific - always try first
                'input[name*="senha" i]',
                'input[id*="senha" i]',
                'input[placeholder*="senha" i]',
                'input[name*="password" i]',
                'input[id*="password" i]',
                'input[placeholder*="password" i]',
                'input[class*="password"]',
                'input[class*="senha"]'
            ],
            cpf: [
                // Try CPF-specific fields first (these should NOT be password fields)
                'input[name*="cpf" i]:not([type="password"])',
                'input[id*="cpf" i]:not([type="password"])',
                'input[placeholder*="CPF" i]:not([type="password"])',
                'input[name*="document" i]:not([type="password"])',
                'input[id*="document" i]:not([type="password"])',
                'input[name*="usuario" i]:not([type="password"])',
                'input[id*="usuario" i]:not([type="password"])',
                'input[name*="login" i]:not([type="password"])',
                'input[id*="login" i]:not([type="password"])',
                'input[maxlength="14"]:not([type="password"])', // CPF formatted length
                'input[maxlength="11"]:not([type="password"])', // CPF unformatted length
                'input[pattern*="cpf" i]:not([type="password"])',
                'input[title*="CPF" i]:not([type="password"])',
                'input[data-field*="cpf" i]:not([type="password"])',
                'input[class*="cpf" i]:not([type="password"])',
                // Generic text input only as last resort, and specifically exclude password fields
                'input[type="text"]:not([type="password"]):not([name*="senha"]):not([id*="senha"]):not([placeholder*="senha"])'
            ],
            submit: [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Entrar")',
                'button:has-text("Login")',
                'button:has-text("Acessar")',
                'button:has-text("Sign in")',
                'button[class*="login"]',
                'button[class*="entrar"]',
                'button[class*="submit"]',
                'button[id*="login"]',
                'button[id*="entrar"]',
                '.login-button',
                '.submit-button',
                '.btn-login',
                '.btn-entrar'
            ]
        };
        
        return selectorMaps[fieldType] || [`input[name*="${fieldType}"]`, `input[id*="${fieldType}"]`];
    }

    /**
     * Robust wrapper for Stagehand page.act() calls with comprehensive error handling
     * @param {string} instruction - The instruction to execute
     * @param {Object} options - Execution options
     * @returns {Promise<any>} Action result
     */
    async robustPageAct(instruction, options = {}) {
        if (!instruction || typeof instruction !== 'string' || instruction.trim() === '') {
            throw new Error('Invalid instruction provided to Stagehand: instruction must be a non-empty string');
        }

        const cleanInstruction = instruction.trim();
        const maxRetries = options.maxRetries || 3;
        const timeout = options.timeout || 30000;
        
        console.log(`🎯 Robust page.act() call: "${cleanInstruction}"`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Validate page state before attempting action
                if (!this.page || this.page.isClosed()) {
                    throw new Error('Page is not available or has been closed');
                }
                
                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Stagehand action timeout after ${timeout}ms`)), timeout);
                });
                
                // Execute action with timeout protection
                console.log(`🤖 Attempt ${attempt}/${maxRetries}: Executing Stagehand action...`);
                const actionPromise = this.page.act(cleanInstruction);
                
                const result = await Promise.race([actionPromise, timeoutPromise]);
                console.log(`✅ Stagehand action completed successfully on attempt ${attempt}`);
                
                // Record successful action in Playwright recorder
                this.recordSuccessfulAction(cleanInstruction, result);
                
                return result;
                
            } catch (error) {
                console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                // Check if this is the internal Stagehand error we're trying to fix
                if (error.message.includes('Cannot read properties of undefined')) {
                    console.log(`🔧 Detected Stagehand internal error, attempting recovery...`);
                    
                    // Wait before retry to allow any internal state to settle
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try to refresh page state if this is the last retry
                    if (attempt === maxRetries) {
                        console.log(`🔄 Final attempt: Using fallback Playwright actions...`);
                        return await this.executePlaywrightFallback(cleanInstruction);
                    }
                    
                    continue; // Retry the action
                }
                
                // For other errors, check if we should retry
                if (attempt >= maxRetries) {
                    throw new Error(`Stagehand action failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry for retryable errors
                const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
                console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    /**
     * Fallback to direct Playwright actions when Stagehand fails
     * @param {string} instruction - The original instruction
     * @returns {Promise<any>} Fallback result
     */
    async executePlaywrightFallback(instruction) {
        console.log(`🎭 Executing Playwright fallback for: "${instruction}"`);
        
        try {
            // Parse instruction and attempt direct Playwright actions
            const lowerInstruction = instruction.toLowerCase();
            
            // Navigation commands
            if (lowerInstruction.includes('navigate') || lowerInstruction.includes('go to') || lowerInstruction.includes('visit')) {
                const urlMatch = instruction.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    console.log(`🌐 Fallback navigation to: ${urlMatch[0]}`);
                    await this.page.goto(urlMatch[0], { waitUntil: 'networkidle' });
                    
                    // ✅ FIXED: Record navigation in PlaywrightRecorder during Playwright fallback
                    if (this.isRecording && this.playwrightRecorder) {
                        this.playwrightRecorder.recordNavigation(urlMatch[0]);
                        console.log(`🎬 Recorded Playwright fallback navigation: ${urlMatch[0]}`);
                    }
                    
                    return { success: true, action: 'navigation', url: urlMatch[0] };
                }
            }
            
            // Click commands
            if (lowerInstruction.includes('click')) {
                // Try to find clickable elements with common selectors
                const clickableSelectors = [
                    'button', 'a', '[role="button"]', 'input[type="submit"]', 
                    'input[type="button"]', '.btn', '.button'
                ];
                
                for (const selector of clickableSelectors) {
                    try {
                        const elements = await this.page.$$(selector);
                        for (const element of elements) {
                            const text = await element.textContent();
                            if (text && instruction.toLowerCase().includes(text.toLowerCase())) {
                                console.log(`🖱️ Fallback click on element with text: "${text}"`);
                                await element.click();
                                return { success: true, action: 'click', text };
                            }
                        }
                    } catch (e) {
                        // Continue to next selector
                    }
                }
            }
            
            // Fill/type commands
            if (lowerInstruction.includes('fill') || lowerInstruction.includes('type') || lowerInstruction.includes('enter')) {
                // Extract the value to fill
                const valueMatch = instruction.match(/["']([^"']+)["']/) || instruction.match(/with\s+([^\s]+)/);
                if (valueMatch) {
                    const value = valueMatch[1];
                    const inputSelectors = ['input[type="text"]', 'input[type="email"]', 'input[type="password"]', 'textarea'];
                    
                    for (const selector of inputSelectors) {
                        try {
                            const input = await this.page.$(selector);
                            if (input) {
                                console.log(`⌨️ Fallback fill input with: "${value}"`);
                                await input.fill(value);
                                return { success: true, action: 'fill', value };
                            }
                        } catch (e) {
                            // Continue to next selector
                        }
                    }
                }
            }
            
            console.log(`⚠️ Fallback: Could not parse instruction "${instruction}" into direct Playwright actions`);
            return { success: false, action: 'fallback_failed', instruction };
            
        } catch (error) {
            console.error(`❌ Playwright fallback failed:`, error.message);
            throw new Error(`Both Stagehand and Playwright fallback failed: ${error.message}`);
        }
    }
}

module.exports = StagehandAutomationEngine;