/**
 * 🎬 PLAYWRIGHT RECORDER
 * 
 * Records browser automation and generates executable Playwright JavaScript code
 * Focuses on successful actions only, skipping errors and timeouts
 */
class PlaywrightRecorder {
    constructor(options = {}) {
        this.options = {
            skipErrors: options.skipErrors !== false,
            includeScreenshots: options.includeScreenshots || false,
            generateComments: options.generateComments !== false,
            variablePattern: options.variablePattern || '${VAR_NAME}',
            ...options
        };
        
        // Recording state
        this.isRecording = false;
        this.recordingSession = null;
        this.capturedActions = [];
        this.variables = new Map();
        this.lastSuccessfulSelectors = new Map();
        
        // Action type mapping
        this.actionTypeMap = {
            'navigate': 'goto',
            'click': 'click', 
            'type': 'fill',
            'fill': 'fill',
            'select': 'selectOption',
            'wait': 'waitForTimeout'
        };
    }

    /**
     * Start recording session
     */
    startRecording(sessionId, automationName = null) {
        if (this.isRecording) {
            throw new Error('Recording session already active');
        }

        console.log(`🎬 Starting Playwright recording: ${sessionId}`);
        
        this.isRecording = true;
        this.recordingSession = {
            id: sessionId,
            name: automationName || `automation_${Date.now()}`,
            startTime: new Date().toISOString(),
            baseUrl: null,
            actions: [],
            variables: [],
            metadata: {}
        };
        
        this.capturedActions = [];
        this.variables.clear();
        this.lastSuccessfulSelectors.clear();
        
        console.log(`✅ Playwright recording started: ${sessionId}`);
        return this.recordingSession;
    }

    /**
     * Record a successful navigation action
     */
    recordNavigation(url, currentUrl = null) {
        if (!this.isRecording) return;

        const action = {
            type: 'navigate',
            method: 'goto', 
            url: url,
            currentUrl: currentUrl || url,
            timestamp: Date.now(),
            success: true
        };

        // Set base URL for the session
        if (!this.recordingSession.baseUrl) {
            try {
                const urlObj = new URL(url);
                this.recordingSession.baseUrl = urlObj.origin;
            } catch (e) {
                this.recordingSession.baseUrl = url;
            }
        }

        this.capturedActions.push(action);
        console.log(`📍 Recorded navigation: ${url}`);
    }

    /**
     * Record a successful form fill action
     */
    recordFormFill(fieldType, value, selector = null, currentUrl = null) {
        if (!this.isRecording) return;

        // If this is the first form action and we have a current URL, record navigation to actual form page
        if (currentUrl && this.capturedActions.length === 1 && this.capturedActions[0].type === 'navigate') {
            const previousNav = this.capturedActions[0];
            if (previousNav.url !== currentUrl) {
                console.log(`🔄 Updating navigation URL from ${previousNav.url} to ${currentUrl} (redirect detected)`);
                previousNav.url = currentUrl;
                previousNav.currentUrl = currentUrl;
            }
        }

        // Generate realistic selector based on field type
        const generatedSelector = selector || this.generateSelector(fieldType, value);
        
        // Check if this looks like a variable
        const variable = this.analyzeForVariable(fieldType, value);
        if (variable) {
            this.variables.set(variable.name, variable);
        }

        const action = {
            type: 'fill',
            method: 'fill',
            selector: generatedSelector,
            value: variable ? variable.placeholder : value,
            originalValue: value,
            fieldType: fieldType,
            timestamp: Date.now(),
            success: true,
            variable: variable
        };

        this.capturedActions.push(action);
        console.log(`📝 Recorded form fill: ${fieldType} = "${value}"`);
    }

    /**
     * Record a successful click action
     */
    recordClick(target, selector = null) {
        if (!this.isRecording) return;

        const generatedSelector = selector || this.generateClickSelector(target);

        const action = {
            type: 'click',
            method: 'click',
            selector: generatedSelector,
            target: target,
            timestamp: Date.now(),
            success: true
        };

        this.capturedActions.push(action);
        console.log(`🖱️ Recorded click: ${target}`);
    }

    /**
     * Record a successful select action
     */
    recordSelect(value, selector = null) {
        if (!this.isRecording) return;

        const action = {
            type: 'select',
            method: 'selectOption',
            selector: selector || 'select',
            value: value,
            timestamp: Date.now(),
            success: true
        };

        this.capturedActions.push(action);
        console.log(`📋 Recorded select: "${value}"`);
    }

    /**
     * Stop recording and generate Playwright script
     */
    stopRecording() {
        if (!this.isRecording) {
            throw new Error('No active recording session');
        }

        console.log(`⏹️ Stopping Playwright recording: ${this.recordingSession.id}`);
        
        this.isRecording = false;
        this.recordingSession.endTime = new Date().toISOString();
        this.recordingSession.actions = [...this.capturedActions];
        this.recordingSession.variables = Array.from(this.variables.values());

        // Generate the complete Playwright script
        const playwrightScript = this.generatePlaywrightScript();
        
        const result = {
            session: this.recordingSession,
            script: playwrightScript,
            actionCount: this.capturedActions.length,
            variableCount: this.variables.size,
            filename: `${this.recordingSession.name}.js`
        };

        console.log(`✅ Playwright recording completed: ${result.actionCount} actions, ${result.variableCount} variables`);
        
        // Reset state
        this.recordingSession = null;
        this.capturedActions = [];
        this.variables.clear();
        
        return result;
    }

    /**
     * Generate complete Playwright JavaScript code
     */
    generatePlaywrightScript() {
        const functionName = this.recordingSession.name.replace(/[^a-zA-Z0-9]/g, '');
        const variables = Array.from(this.variables.values());
        
        let script = '';
        
        // Script header
        script += `const { chromium } = require('playwright');\n\n`;
        
        // Add variable definitions as comments
        if (variables.length > 0) {
            script += `/**\n * Variables for this automation:\n`;
            variables.forEach(variable => {
                script += ` * ${variable.name}: ${variable.description} (example: "${variable.example}")\n`;
            });
            script += ` */\n\n`;
        }

        // Function declaration
        script += `async function ${functionName}() {\n`;
        script += `  console.log('🚀 Starting automation: ${this.recordingSession.name}');\n\n`;
        
        // Browser setup
        script += `  // Browser setup\n`;
        script += `  const browser = await chromium.launch({ headless: false });\n`;
        script += `  const context = await browser.newContext();\n`;
        script += `  const page = await context.newPage();\n\n`;
        
        // Add error handling
        script += `  try {\n`;
        
        // Generate code for each action
        this.capturedActions.forEach((action, index) => {
            script += this.generateActionCode(action, index + 1);
        });
        
        script += `\n    console.log('✅ Automation completed successfully');\n\n`;
        
        // Error handling and cleanup
        script += `  } catch (error) {\n`;
        script += `    console.error('❌ Automation failed:', error.message);\n`;
        script += `    throw error;\n`;
        script += `  } finally {\n`;
        script += `    // Cleanup\n`;
        script += `    await browser.close();\n`;
        script += `  }\n`;
        script += `}\n\n`;
        
        // Add execution and error handling
        script += `// Execute the automation\n`;
        script += `${functionName}()\n`;
        script += `  .then(() => console.log('🎉 Automation finished'))\n`;
        script += `  .catch(console.error);\n`;
        
        return script;
    }

    /**
     * Generate Playwright code for a single action
     */
    generateActionCode(action, stepNumber) {
        let code = '';
        
        // Add step comment
        if (this.options.generateComments) {
            code += `    // Step ${stepNumber}: ${this.getActionDescription(action)}\n`;
        }
        
        switch (action.type) {
            case 'navigate':
                code += `    await page.goto('${action.url}');\n`;
                code += `    await page.waitForLoadState('domcontentloaded');\n`;
                break;
                
            case 'fill':
                const value = action.variable ? `'${action.variable.placeholder}'` : `'${action.value}'`;
                code += `    await page.fill('${action.selector}', ${value});\n`;
                break;
                
            case 'click':
                code += `    await page.click('${action.selector}');\n`;
                if (action.target && action.target.includes('login') || action.target.includes('submit')) {
                    code += `    await page.waitForLoadState('domcontentloaded');\n`;
                }
                break;
                
            case 'select':
                code += `    await page.selectOption('${action.selector}', '${action.value}');\n`;
                break;
                
            case 'wait':
                const duration = action.duration || 2000;
                code += `    await page.waitForTimeout(${duration});\n`;
                break;
        }
        
        code += '\n';
        return code;
    }

    /**
     * Generate realistic selectors for form fields
     */
    generateSelector(fieldType, value) {
        const fieldTypeMap = {
            'cpf': 'input[name*="cpf" i], input[placeholder*="cpf" i]',
            'cnpj': 'input[name*="cnpj" i], input[placeholder*="cnpj" i]', 
            'email': 'input[type="email"], input[name*="email" i]',
            'password': 'input[type="password"], input[name*="senha" i]',
            'username': 'input[name*="user" i], input[name*="login" i]',
            'phone': 'input[name*="phone" i], input[name*="telefone" i]',
            'name': 'input[name*="name" i], input[name*="nome" i]',
            'text': 'input[type="text"]',
            'search': 'input[type="search"], input[name*="search" i]'
        };

        return fieldTypeMap[fieldType.toLowerCase()] || 'input[type="text"]';
    }

    /**
     * Generate realistic selectors for click targets
     */
    generateClickSelector(target) {
        if (target.includes('login') || target.includes('entrar')) {
            return 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar")';
        }
        if (target.includes('search') || target.includes('buscar')) {
            return 'button:has-text("Search"), button:has-text("Buscar"), input[type="submit"]';
        }
        if (target.includes('button')) {
            return 'button, input[type="button"], input[type="submit"]';
        }
        
        return 'button, a, [role="button"]';
    }

    /**
     * Analyze value for variable potential
     */
    analyzeForVariable(fieldType, value) {
        // CPF pattern
        if (fieldType === 'cpf' || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)) {
            return {
                name: 'CPF_NUMBER',
                placeholder: '${CPF_NUMBER}',
                description: 'Brazilian CPF document number',
                example: value,
                type: 'cpf',
                validation: '^\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}$'
            };
        }

        // Email pattern
        if (fieldType === 'email' || /\S+@\S+\.\S+/.test(value)) {
            return {
                name: 'LOGIN_EMAIL',
                placeholder: '${LOGIN_EMAIL}',
                description: 'User login email address',
                example: value,
                type: 'email',
                validation: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
            };
        }

        // Password pattern
        if (fieldType === 'password' || (value.length >= 6 && /[A-Za-z]/.test(value) && /\d/.test(value))) {
            return {
                name: 'USER_PASSWORD',
                placeholder: '${USER_PASSWORD}',
                description: 'User login password',
                example: '********',
                type: 'password',
                validation: '.{6,}'
            };
        }

        // Phone pattern
        if (fieldType === 'phone' || /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(value)) {
            return {
                name: 'PHONE_NUMBER', 
                placeholder: '${PHONE_NUMBER}',
                description: 'Brazilian phone number',
                example: value,
                type: 'phone',
                validation: '^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$'
            };
        }

        // If value looks important (not just test data)
        if (value.length >= 3 && !value.includes('test') && !value.includes('123')) {
            const varName = fieldType.toUpperCase() + '_VALUE';
            return {
                name: varName,
                placeholder: '${' + varName + '}',
                description: `Value for ${fieldType} field`,
                example: value,
                type: 'text',
                validation: '.+'
            };
        }

        return null;
    }

    /**
     * Get human-readable description for action
     */
    getActionDescription(action) {
        switch (action.type) {
            case 'navigate':
                return `Navigate to ${action.url}`;
            case 'fill':
                return `Fill ${action.fieldType} field with "${action.value}"`;
            case 'click':
                return `Click ${action.target}`;
            case 'select':
                return `Select "${action.value}" from dropdown`;
            case 'wait':
                return `Wait ${action.duration || 2000}ms`;
            default:
                return action.type;
        }
    }

    /**
     * Record a Stagehand action result (called from stagehand-engine)
     */
    recordStagehandAction(instruction, result, actionType = null) {
        if (!this.isRecording || !result.success) return;

        // Parse instruction to understand what happened
        const parsedAction = this.parseInstructionToAction(instruction, actionType);
        if (parsedAction) {
            switch (parsedAction.type) {
                case 'navigate':
                    this.recordNavigation(parsedAction.url);
                    break;
                case 'fill':
                    this.recordFormFill(parsedAction.fieldType, parsedAction.value);
                    break;
                case 'click':
                    this.recordClick(parsedAction.target);
                    break;
                case 'select':
                    this.recordSelect(parsedAction.value);
                    break;
            }
        }
    }

    /**
     * Parse instruction to extract action details
     */
    parseInstructionToAction(instruction, actionType = null) {
        const instructionLower = instruction.toLowerCase();

        // Navigation
        if (instructionLower.includes('navigate to') || instructionLower.includes('go to')) {
            const urlMatch = instruction.match(/(?:navigate to|go to)\s+(.+)/i);
            return {
                type: 'navigate',
                url: urlMatch ? urlMatch[1].trim() : instruction
            };
        }

        // Form fills - Brazilian forms
        if (instructionLower.includes('fill') && instructionLower.includes('cpf')) {
            const valueMatch = instruction.match(/["']([^"']+)["']/);
            return {
                type: 'fill',
                fieldType: 'cpf',
                value: valueMatch ? valueMatch[1] : '000.000.000-00'
            };
        }

        if (instructionLower.includes('fill') && (instructionLower.includes('password') || instructionLower.includes('senha'))) {
            const valueMatch = instruction.match(/["']([^"']+)["']/);
            return {
                type: 'fill',
                fieldType: 'password',
                value: valueMatch ? valueMatch[1] : 'password'
            };
        }

        // Generic fill
        if (instructionLower.includes('fill') || instructionLower.includes('type')) {
            const valueMatch = instruction.match(/["']([^"']+)["']/);
            return {
                type: 'fill',
                fieldType: 'text',
                value: valueMatch ? valueMatch[1] : 'text'
            };
        }

        // Clicks
        if (instructionLower.includes('click')) {
            const targetMatch = instruction.match(/click\s+(?:on\s+)?(?:the\s+)?(.+)/i);
            return {
                type: 'click',
                target: targetMatch ? targetMatch[1].trim() : 'button'
            };
        }

        return null;
    }
}

module.exports = PlaywrightRecorder; 