/**
 * 🧠 SESSION PLANNER
 * 
 * LLM-powered session planner that uses OpenAI GPT-4o for intelligent
 * intent analysis and step planning with context awareness.
 */

const OpenAI = require('openai');

class SessionPlanner {
    constructor(sessionId, automationEngine) {
        this.sessionId = sessionId;
        this.automationEngine = automationEngine;
        
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Conversation state
        this.conversationHistory = [];
        this.currentGoal = null;
        this.goalProgress = [];
        this.extractedSteps = [];
        this.detectedVariables = new Map();
        
        // Planning state
        this.isExecutingPlan = false;
        this.currentStepIndex = 0;
        this.pendingSteps = [];
        this.completedSteps = [];
        
        // Context awareness
        this.pageContext = null;
        this.userIntent = null;
        this.automationContext = {
            website: null,
            workflow: null,
            expectedOutcome: null
        };
        
        console.log(`🧠 LLM-powered SessionPlanner initialized for session ${sessionId}`);
    }

    /**
     * Process user message using LLM analysis
     */
    async processUserMessage(message) {
        console.log(`🧠 [${this.sessionId}] Processing user message with LLM: "${message}"`);
        
        // Add to conversation history
        this.conversationHistory.push({
            type: 'user',
            message: message,
            timestamp: Date.now()
        });
        
        // Get current page context for LLM
        const pageContext = await this.getCurrentPageContext();
        
        // Analyze user intent with LLM
        const intent = await this.analyzeUserIntentWithLLM(message, pageContext);
        console.log(`🎯 [${this.sessionId}] LLM detected intent:`, intent);
        
        // Update goal if new goal detected
        if (intent.isNewGoal) {
            await this.setNewGoal(intent);
        }
        
        // Plan next actions using LLM
        const actionPlan = await this.planNextActionsWithLLM(intent, message, pageContext);
        console.log(`📋 [${this.sessionId}] LLM generated action plan:`, actionPlan);
        
        // Execute the plan
        const result = await this.executePlan(actionPlan);
        
        // Update conversation history with result
        this.conversationHistory.push({
            type: 'assistant',
            message: result.message,
            actions: result.actions,
            timestamp: Date.now()
        });
        
        return result;
    }

    /**
     * Get current page context for LLM analysis
     */
    async getCurrentPageContext() {
        try {
            if (!this.automationEngine?.page) {
                return { url: 'unknown', title: 'unknown', hasContent: false };
            }
            
            const url = await this.automationEngine.page.url();
            const title = await this.automationEngine.page.title();
            
            return {
                url: url,
                title: title,
                hasContent: true,
                domain: new URL(url).hostname
            };
        } catch (error) {
            console.error(`❌ Error getting page context:`, error.message);
            return { url: 'unknown', title: 'unknown', hasContent: false };
        }
    }

    /**
     * Analyze user intent using OpenAI GPT-4o
     */
    async analyzeUserIntentWithLLM(message, pageContext) {
        try {
            const systemPrompt = `You are an intelligent browser automation assistant that analyzes user instructions and determines their automation intent for Playwright-based execution.

Current Context:
- Page URL: ${pageContext.url}
- Page Title: ${pageContext.title}
- Domain: ${pageContext.domain}

Your task is to analyze the user's message and determine:
1. Their automation intent/goal
2. Whether this is a new goal or continuation
3. What type of Playwright actions they want to perform
4. Any specific data/variables mentioned
5. The complexity and scope of the automation

INTENT CATEGORIES:
- login_goal: User wants to authenticate/login
- navigation_goal: User wants to navigate to pages/URLs
- form_filling_goal: User wants to fill out forms
- search_goal: User wants to search for content
- extraction_goal: User wants to extract/scrape data
- interaction_goal: User wants to click/interact with elements
- upload_goal: User wants to upload files
- download_goal: User wants to download content
- verification_goal: User wants to verify page state/content
- automation_creation_goal: User wants to create/record automation
- testing_goal: User wants to test functionality
- monitoring_goal: User wants to monitor changes
- continuation_step: Continue current workflow

PLAYWRIGHT ACTION DETECTION:
Identify which specific Playwright actions the user likely needs:
- Navigation: goto, goBack, goForward, reload
- Interaction: click, dblclick, hover, focus, tap
- Input: fill, type, clear, press, selectOption, setInputFiles
- Wait: waitForSelector, waitForTimeout, waitForNavigation
- Evaluation: evaluate, getAttribute, getText, isVisible
- Dialog: acceptDialog, dismissDialog
- Screenshot: screenshot
- Scroll: scrollIntoView, scrollTo

DATA EXTRACTION:
Look for:
- URLs (any http/https links)
- Credentials (usernames, passwords, CPF, email addresses)
- Form data (names, addresses, phone numbers)
- File paths (for uploads)
- CSS selectors or element descriptions
- Text content to search for
- Numbers/quantities
- Dates and times

Return a JSON object with this structure:
{
    "type": "intent_category_from_above",
    "description": "Clear description of what user wants to accomplish",
    "isNewGoal": true/false,
    "confidence": 0.0-1.0,
    "complexity": "simple|moderate|complex|advanced",
    "scope": "single_page|multi_page|cross_domain",
    "playwrightActions": ["list", "of", "likely", "actions", "needed"],
    "extractedData": {
        "urls": ["any URLs mentioned"],
        "credentials": {"cpf": "value", "email": "value", "password": "value"},
        "formData": {"field_name": "value"},
        "selectors": ["any element selectors mentioned"],
        "searchTerms": ["terms to search for"],
        "files": ["file paths for uploads"],
        "waitConditions": ["elements or conditions to wait for"]
    },
    "technicalRequirements": {
        "requiresLogin": true/false,
        "requiresNavigation": true/false,
        "requiresFormFilling": true/false,
        "requiresFileUpload": true/false,
        "requiresScreenshot": true/false,
        "requiresDataExtraction": true/false,
        "requiresWaiting": true/false
    },
    "estimatedSteps": 1-20,
    "riskLevel": "low|medium|high",
    "reasoning": "Detailed explanation of analysis and classification"
}`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.1,
                max_tokens: 1500,
                response_format: { type: 'json_object' }
            });

            const analysis = JSON.parse(response.choices[0].message.content);
            console.log(`🧠 LLM comprehensive intent analysis:`, analysis);
            
            return {
                ...analysis,
                originalMessage: message,
                pageContext: pageContext
            };

        } catch (error) {
            console.error(`❌ LLM intent analysis failed:`, error.message);
            
            // Fallback to basic analysis
            return {
                type: 'continuation_step',
                description: 'Continue current workflow',
                isNewGoal: false,
                confidence: 0.5,
                complexity: 'simple',
                scope: 'single_page',
                playwrightActions: ['click'],
                extractedData: {},
                technicalRequirements: {
                    requiresLogin: false,
                    requiresNavigation: false,
                    requiresFormFilling: false,
                    requiresFileUpload: false,
                    requiresScreenshot: false,
                    requiresDataExtraction: false,
                    requiresWaiting: false
                },
                estimatedSteps: 1,
                riskLevel: 'low',
                reasoning: 'LLM analysis failed, using fallback',
                originalMessage: message,
                pageContext: pageContext
            };
        }
    }

    /**
     * Plan next actions using OpenAI GPT-4o
     */
    async planNextActionsWithLLM(intent, originalMessage, pageContext) {
        try {
            const systemPrompt = `You are a browser automation planner that generates Playwright-compatible automation steps. Given user intent and page context, create a detailed step-by-step execution plan.

Current Context:
- Intent: ${intent.type} - ${intent.description}
- Page: ${pageContext.url}
- Domain: ${pageContext.domain}

User's Original Message: "${originalMessage}"

Create a detailed step-by-step plan using ALL available Playwright actions. Each step should be a specific, actionable instruction.

AVAILABLE PLAYWRIGHT ACTIONS (use the most appropriate):

Navigation Actions:
- goto: Navigate to URL
- goBack: Go back in history  
- goForward: Go forward in history
- reload: Refresh the page
- waitForNavigation: Wait for navigation to complete

Interaction Actions:
- click: Click on element
- dblclick: Double-click on element
- hover: Hover over element
- focus: Focus on element
- blur: Remove focus from element
- tap: Tap on element (mobile)
- dragAndDrop: Drag element to another location

Input Actions:
- fill: Fill input field with text
- type: Type text character by character
- clear: Clear input field
- press: Press keyboard key(s)
- selectOption: Select option from dropdown
- setInputFiles: Upload files to file input
- check: Check checkbox/radio button
- uncheck: Uncheck checkbox

Scrolling Actions:
- scrollIntoView: Scroll element into view
- scrollTo: Scroll to specific position
- wheel: Perform wheel scroll

Wait Actions:
- waitForSelector: Wait for element to appear
- waitForFunction: Wait for function to return true
- waitForTimeout: Wait for specific time
- waitForEvent: Wait for specific event
- waitForLoadState: Wait for page load state

Evaluation Actions:
- evaluate: Execute JavaScript in page context
- evaluateHandle: Execute JS and return handle
- getAttribute: Get element attribute
- getText: Get element text content
- isVisible: Check if element is visible
- isEnabled: Check if element is enabled

Dialog Actions:
- acceptDialog: Accept browser dialog (alert/confirm)
- dismissDialog: Dismiss browser dialog
- getDialogMessage: Get dialog text

Screenshot Actions:
- screenshot: Take page/element screenshot

Frame Actions:
- switchToFrame: Switch to iframe
- switchToMainFrame: Switch back to main frame

For numbered step lists (like "1. Navigate to... 2. Fill CPF... 3. Fill password..."), extract and preserve each individual step exactly as provided.

Return a JSON object with this structure:
{
    "type": "sequential_execution",
    "steps": [
        {
            "type": "navigation|interaction|input|wait|evaluation|dialog|screenshot|scroll",
            "action": "specific_playwright_action_name",
            "instruction": "Natural language instruction for Stagehand",
            "target": "element_selector_or_url",
            "value": "data_to_enter_or_parameters",
            "options": {
                "timeout": 30000,
                "waitUntil": "domcontentloaded",
                "force": false
            },
            "description": "Human readable description",
            "fallback": "alternative_action_if_primary_fails"
        }
    ],
    "estimatedDuration": "time_estimate_in_seconds",
    "variables": {
        "detected_variables": "any_variables_found"
    },
    "complexity": "simple|moderate|complex",
    "reasoning": "why_this_plan_was_chosen"
}

IMPORTANT: 
- Use precise Playwright actions instead of generic terms
- Include appropriate options (timeout, waitUntil, etc.)
- Add fallback strategies for critical steps
- Consider page load states and timing
- Handle potential errors gracefully`;

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { 
                        role: 'user', 
                        content: `Plan steps for: ${originalMessage}\n\nIntent Analysis: ${JSON.stringify(intent, null, 2)}` 
                    }
                ],
                temperature: 0.1,
                max_tokens: 3000,
                response_format: { type: 'json_object' }
            });

            const plan = JSON.parse(response.choices[0].message.content);
            console.log(`📋 LLM generated comprehensive Playwright plan:`, plan);
            
            return plan;

        } catch (error) {
            console.error(`❌ LLM action planning failed:`, error.message);
            
            // Fallback to direct instruction parsing
            return {
                type: 'sequential_execution',
                steps: [{
                    type: 'direct_instruction',
                    action: 'execute_instruction',
                    instruction: originalMessage,
                    description: originalMessage,
                    options: { timeout: 30000 }
                }],
                estimatedDuration: 30,
                variables: {},
                complexity: 'simple',
                reasoning: 'LLM planning failed, using direct instruction fallback'
            };
        }
    }

    /**
     * Set new goal with LLM-extracted information
     */
    async setNewGoal(intent) {
        console.log(`🎯 [${this.sessionId}] Setting new goal: ${intent.type}`);
        
        this.currentGoal = {
            type: intent.type,
            description: intent.description,
            confidence: intent.confidence,
            startTime: Date.now(),
            variables: new Map(),
            extractedData: intent.extractedData,
            pageContext: intent.pageContext
        };
        
        // Store extracted variables
        if (intent.extractedData && intent.extractedData.credentials) {
            Object.entries(intent.extractedData.credentials).forEach(([key, value]) => {
                this.detectedVariables.set(key, {
                    name: key,
                    value: value,
                    type: 'credential',
                    source: 'llm_extraction'
                });
                this.currentGoal.variables.set(key, value);
            });
        }
        
        if (intent.extractedData && intent.extractedData.urls) {
            intent.extractedData.urls.forEach((url, index) => {
                this.detectedVariables.set(`url_${index}`, {
                    name: `url_${index}`,
                    value: url,
                    type: 'url',
                    source: 'llm_extraction'
                });
            });
        }
    }

    /**
     * Execute the LLM-generated plan with comprehensive Playwright action support
     */
    async executePlan(actionPlan) {
        console.log(`🚀 [${this.sessionId}] Executing LLM plan with ${actionPlan.steps.length} steps`);
        console.log(`📊 Plan complexity: ${actionPlan.complexity || 'unknown'}, Estimated duration: ${actionPlan.estimatedDuration}s`);
        
        const results = [];
        let allSuccessful = true;
        
        for (let i = 0; i < actionPlan.steps.length; i++) {
            const step = actionPlan.steps[i];
            const stepNumber = i + 1;
            
            console.log(`🎯 [${this.sessionId}] Executing step ${stepNumber}/${actionPlan.steps.length}:`);
            console.log(`   Action: ${step.action || 'unknown'}`);
            console.log(`   Target: ${step.target || 'unknown'}`);
            console.log(`   Value: ${step.value || 'none'}`);
            console.log(`   Instruction: ${step.instruction || step.description}`);
            
            try {
                let stepResult;
                
                // Handle different types of Playwright actions
                const action = step.action || 'execute_instruction';
                const instruction = step.instruction || step.description;
                const target = step.target;
                const value = step.value;
                const options = step.options || {};
                
                // Specialized handling for specific Playwright actions
                switch (action) {
                    case 'goto':
                    case 'navigate':
                        if (target && (target.startsWith('http') || target.startsWith('www'))) {
                            console.log(`🌐 Direct navigation to: ${target}`);
                            await this.automationEngine.page.goto(target, {
                                waitUntil: options.waitUntil || 'domcontentloaded',
                                timeout: options.timeout || 30000
                            });
                            stepResult = { 
                                success: true, 
                                message: `✅ Successfully navigated to ${target}`,
                                action: 'navigation'
                            };
                        } else {
                            stepResult = await this.automationEngine.processInstruction(instruction);
                        }
                        break;
                        
                    case 'waitForSelector':
                        if (target) {
                            console.log(`⏳ Waiting for selector: ${target}`);
                            await this.automationEngine.page.waitForSelector(target, {
                                timeout: options.timeout || 30000,
                                state: options.state || 'visible'
                            });
                            stepResult = { 
                                success: true, 
                                message: `✅ Element ${target} appeared`,
                                action: 'wait'
                            };
                        } else {
                            stepResult = await this.automationEngine.processInstruction(instruction);
                        }
                        break;
                        
                    case 'waitForTimeout':
                        const delay = parseInt(value) || 1000;
                        console.log(`⏳ Waiting for ${delay}ms`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        stepResult = { 
                            success: true, 
                            message: `✅ Waited for ${delay}ms`,
                            action: 'wait'
                        };
                        break;
                        
                    case 'screenshot':
                        console.log(`📸 Taking screenshot`);
                        try {
                            const screenshotBuffer = await this.automationEngine.page.screenshot({
                                fullPage: options.fullPage || false,
                                timeout: options.timeout || 30000
                            });
                            stepResult = { 
                                success: true, 
                                message: `✅ Screenshot captured`,
                                action: 'screenshot',
                                data: screenshotBuffer.toString('base64')
                            };
                        } catch (screenshotError) {
                            stepResult = { 
                                success: false, 
                                error: `Screenshot failed: ${screenshotError.message}`,
                                action: 'screenshot'
                            };
                        }
                        break;
                        
                    case 'evaluate':
                        if (value) {
                            console.log(`🔧 Executing JavaScript: ${value}`);
                            const result = await this.automationEngine.page.evaluate(value);
                            stepResult = { 
                                success: true, 
                                message: `✅ JavaScript executed`,
                                action: 'evaluate',
                                data: result
                            };
                        } else {
                            stepResult = await this.automationEngine.processInstruction(instruction);
                        }
                        break;
                        
                    default:
                        // For all other actions, use the automation engine with enhanced instruction
                        const enhancedInstruction = this.enhanceInstructionWithPlaywrightDetails(step);
                        stepResult = await this.automationEngine.processInstruction(enhancedInstruction);
                        break;
                }
                
                // Handle step result
                if (stepResult.success) {
                    console.log(`✅ [${this.sessionId}] Step ${stepNumber} completed successfully`);
                    
                    results.push({
                        step: stepNumber,
                        instruction: instruction,
                        action: action,
                        target: target,
                        value: value,
                        result: stepResult,
                        success: true,
                        completedAt: Date.now()
                    });
                    
                    this.completedSteps.push({
                        ...step,
                        result: stepResult,
                        completedAt: Date.now()
                    });
                    
                } else {
                    console.error(`❌ [${this.sessionId}] Step ${stepNumber} failed:`, stepResult.error);
                    
                    // Try fallback if provided
                    if (step.fallback) {
                        console.log(`🔄 [${this.sessionId}] Attempting fallback: ${step.fallback}`);
                        try {
                            const fallbackResult = await this.automationEngine.processInstruction(step.fallback);
                            if (fallbackResult.success) {
                                console.log(`✅ [${this.sessionId}] Fallback succeeded for step ${stepNumber}`);
                                stepResult = fallbackResult;
                            }
                        } catch (fallbackError) {
                            console.error(`❌ [${this.sessionId}] Fallback also failed:`, fallbackError.message);
                        }
                    }
                    
                    results.push({
                        step: stepNumber,
                        instruction: instruction,
                        action: action,
                        target: target,
                        value: value,
                        result: stepResult,
                        success: stepResult.success || false,
                        error: stepResult.error,
                        fallbackAttempted: !!step.fallback
                    });
                    
                    if (!stepResult.success) {
                        allSuccessful = false;
                        break; // Stop execution on failure
                    }
                }
                
                // Add delay between steps for stability
                if (i < actionPlan.steps.length - 1) {
                    const delay = options.stepDelay || 1500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.error(`❌ [${this.sessionId}] Step execution error:`, error.message);
                
                results.push({
                    step: stepNumber,
                    instruction: instruction,
                    action: step.action || 'unknown',
                    error: error.message,
                    success: false
                });
                
                allSuccessful = false;
                break; // Stop on error
            }
        }
        
        // Update goal status
        const goalStatus = allSuccessful ? 'completed' : 'failed';
        if (this.currentGoal) {
            this.currentGoal.status = goalStatus;
            this.currentGoal.endTime = Date.now();
            this.currentGoal.results = results;
        }
        
        // Generate comprehensive response message
        const successRate = (results.filter(r => r.success).length / results.length) * 100;
        const completedSteps = results.filter(r => r.success).length;
        
        let message;
        if (allSuccessful) {
            message = `🎉 **LLM Plan Completed Successfully!** All ${results.length} Playwright actions executed successfully.`;
        } else {
            message = `⚠️ **LLM Plan Partially Completed** - ${completedSteps}/${results.length} steps successful (${successRate.toFixed(1)}%)`;
            
            // Add failure details
            const failedSteps = results.filter(r => !r.success);
            if (failedSteps.length > 0) {
                message += `\n\n❌ Failed steps: ${failedSteps.map(s => `Step ${s.step} (${s.action})`).join(', ')}`;
            }
        }
        
        return {
            success: allSuccessful,
            message: message,
            totalSteps: actionPlan.steps.length,
            completedSteps: completedSteps,
            successRate: successRate,
            actions: results,
            goalStatus: goalStatus,
            estimatedDuration: actionPlan.estimatedDuration,
            actualDuration: this.currentGoal ? 
                Math.round((Date.now() - this.currentGoal.startTime) / 1000) : 0,
            complexity: actionPlan.complexity,
            reasoning: actionPlan.reasoning
        };
    }

    /**
     * Enhance instruction with Playwright-specific details
     */
    enhanceInstructionWithPlaywrightDetails(step) {
        let enhanced = step.instruction || step.description;
        
        // Add target information if available
        if (step.target && !enhanced.includes(step.target)) {
            enhanced += ` targeting ${step.target}`;
        }
        
        // Add value information if available
        if (step.value && !enhanced.includes(step.value)) {
            enhanced += ` with value "${step.value}"`;
        }
        
        // Add action context
        if (step.action && step.action !== 'execute_instruction') {
            enhanced = `${step.action}: ${enhanced}`;
        }
        
        return enhanced;
    }

    /**
     * Create automation from completed goal (for saving)
     */
    async createAutomationFromGoal() {
        if (!this.currentGoal || this.currentGoal.status !== 'completed') {
            return null;
        }
        
        const automation = {
            id: `automation_${Date.now()}`,
            name: `${this.currentGoal.type.replace('_', ' ')} - ${this.currentGoal.description}`,
            description: `LLM-generated automation for ${this.currentGoal.description}`,
            type: this.currentGoal.type,
            steps: this.completedSteps.map(step => ({
                id: step.id || `step_${Math.random().toString(36).substr(2, 9)}`,
                name: step.description || step.instruction,
                action: step.action || 'interact',
                target: step.target || 'page',
                value: step.value || '',
                type: step.type || 'interaction'
            })),
            variables: Array.from(this.detectedVariables.values()),
            metadata: {
                createdAt: Date.now(),
                sessionId: this.sessionId,
                goalType: this.currentGoal.type,
                confidence: this.currentGoal.confidence,
                llmGenerated: true,
                extractedData: this.currentGoal.extractedData
            }
        };
        
        return automation;
    }

    /**
     * Get current session status
     */
    getSessionStatus() {
        return {
            sessionId: this.sessionId,
            currentGoal: this.currentGoal,
            isExecutingPlan: this.isExecutingPlan,
            completedSteps: this.completedSteps.length,
            detectedVariables: Array.from(this.detectedVariables.values()),
            conversationHistory: this.conversationHistory.length
        };
    }
}

module.exports = SessionPlanner;
