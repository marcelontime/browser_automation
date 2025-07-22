const express = require('express');
const WebSocket = require('ws');
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const Validator = require('validator');
require('dotenv').config();
const cluster = require('cluster');
const os = require('os');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const crypto = require('crypto');

// Make Redis connection optional
let redis;
try {
  redis = new IORedis();
  console.log('✅ Redis connected');
} catch (error) {
  console.log('⚠️  Redis not available, using in-memory storage');
  redis = null;
}
const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();
const executionSuccess = new client.Counter({ name: 'execution_success', help: 'Successful script executions' });
const executionFailure = new client.Counter({ name: 'execution_failure', help: 'Failed script executions' });
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

class IntelligentBrowserAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.clients = new Set();
        this.isRecording = false;
        this.currentRecording = {
            name: '',
            description: '',
            steps: [],
            variables: [],
            startUrl: ''
        };
        this.savedScripts = new Map();
        this.actionHistory = [];
        this.screenshotInterval = null;
        
        // Manual control state
        this.isManualMode = false;
        this.automationPaused = false;
        this.lastKnownState = null;
        
        // Optimized screenshot system
        this.lastScreenshotHash = null;
        this.screenshotQuality = 60; // JPEG quality (0-100)
        this.screenshotCheckInterval = 1000; // Check every second
        this.screenshotsSent = 0;
        this.screenshotsSkipped = 0;
        
        // NEW: Automation queue system
        this.automationQueue = [];
        this.isProcessingQueue = false;
        this.currentStepIndex = 0;
        this.shouldStopAutomation = false;
        this.automationState = 'idle'; // idle, processing, paused, stopped
        
        // LLM Fallback System
        this.fallbackUsageCount = 0;
        this.fallbackSuccessCount = 0;
        this.fallbackFailureCount = 0;
        this.fallbackHistory = [];
        
        // Variable Management
        this.currentVariables = {};
        
        // Initialize Claude client
        if (process.env.ANTHROPIC_API_KEY) {
            this.claude = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
            console.log('✅ Claude AI integration initialized for intelligent fallback');
        } else {
            console.log('⚠️ ANTHROPIC_API_KEY not found - LLM fallback disabled');
        }
    }

    async initialize() {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.static('public/build'));
        this.app.use(express.json());
        
        const port = process.env.PORT || 7079;
        
        // Setup HTTP routes FIRST
        this.app.get('/metrics', async (req, res) => {
          res.set('Content-Type', client.register.contentType);
          res.end(await client.register.metrics());
        });

        const options = {
          definition: {
            openapi: '3.0.0',
            info: {
              title: 'Browser Automation API',
              version: '1.0.0',
              description: 'API for browser automation system',
            },
          },
          apis: ['./server.js'], // Assuming JSDoc comments are in server.js
        };
        const specs = swaggerJsdoc(options);
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

        /**
         * @openapi
         * /login:
         *   post:
         *     description: Get JWT token for WebSocket authentication
         *     parameters:
         *       - name: userId
         *         in: body
         *         required: true
         *     responses:
         *       200:
         *         description: Returns JWT token
         */
        this.app.post('/login', (req, res) => {
          const { userId } = req.body; // Assume client sends userId
          if (!userId) return res.status(400).json({ error: 'userId required' });
          const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'your_secret_key');
          res.json({ token });
        });

        // Add the missing get-token endpoint
        this.app.get('/get-token', (req, res) => {
          console.log('🔑 Token request received');
          const userId = req.query.userId || 'default-user';
          const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'your_secret_key');
          console.log('🔑 Token generated for user:', userId);
          res.json({ token });
        });

        // NEW: LLM Fallback Analytics Endpoint
        this.app.get('/api/fallback-analytics', (req, res) => {
          try {
            const analytics = this.getFallbackAnalytics();
            res.json({
              success: true,
              data: analytics,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              success: false,
              error: error.message
            });
          }
        });

        // NEW: Screenshot Optimization Analytics Endpoint
        this.app.get('/api/screenshot-analytics', (req, res) => {
          try {
            const analytics = this.getScreenshotAnalytics();
            res.json({
              success: true,
              data: analytics,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            res.status(500).json({
              success: false,
              error: error.message
            });
          }
        });

        // NEW: Configure Screenshot Optimization Endpoint
        this.app.post('/api/configure-screenshots', (req, res) => {
          try {
            const options = req.body;
            this.configureScreenshotOptimization(options);
            res.json({
              success: true,
              message: 'Screenshot optimization configured successfully',
              settings: this.getScreenshotAnalytics()
            });
          } catch (error) {
            res.status(500).json({
              success: false,
              error: error.message
            });
          }
        });

        // Catch-all route MUST be last
        this.app.get('*', (req, res) => {
          res.sendFile(path.join(__dirname, 'public/build/index.html'));
        });
        
        // Start HTTP server
        this.server = this.app.listen(port);
        console.log(`🚀 HTTP Server started at http://localhost:${port}`);
        
        // Setup WebSocket server
        this.setupWebSocket();
        
        await this.initBrowser();
        await this.loadSavedScripts();
        
        console.log(`🚀 Browser Automation System fully initialized`);
        console.log(`🤖 Claude integration: ${process.env.ANTHROPIC_API_KEY ? 'Enabled' : 'Disabled'}`);
    }

    async initBrowser() {
        console.log('🚀 Initializing browser...');
        this.browser = await chromium.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized',
                '--disable-web-security'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewportSize({ width: 1920, height: 1080 });
        
        // Navigate to a default page
        await this.page.goto('https://www.google.com', { waitUntil: 'networkidle' });
        console.log('🌐 Browser initialized and navigated to Google');
        
        // Inject monitoring script
        await this.injectMonitoringScript();
        this.startScreenshotStream();
    }

    async injectMonitoringScript() {
        await this.page.addInitScript(() => {
            window.automationRecorder = {
                isRecording: false,
                actions: [],
                
                recordAction(type, element, value = null) {
                    if (!this.isRecording) return;
                    
                    const action = {
                        type,
                        timestamp: Date.now(),
                        element: this.getElementInfo(element),
                        value,
                        url: window.location.href
                    };
                    
                    // Send to server
                    window.postMessage({ type: 'recordAction', action }, '*');
                },
                
                getElementInfo(element) {
                    const rect = element.getBoundingClientRect();
                    return {
                        tagName: element.tagName,
                        id: element.id,
                        className: element.className,
                        textContent: element.textContent?.substring(0, 50),
                        selector: this.generateSelector(element),
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                        attributes: this.getRelevantAttributes(element)
                    };
                },
                
                generateSelector(element) {
                    // Generate unique and robust selector
                    if (element.id) return `#${element.id}`;
                    
                    if (element.className) {
                        const classes = element.className.split(' ').filter(c => c.length > 0);
                        if (classes.length > 0) {
                            return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
                        }
                    }
                    
                    // Use hierarchical position
                    const parent = element.parentElement;
                    if (parent) {
                        const index = Array.from(parent.children).indexOf(element);
                        return `${this.generateSelector(parent)} > ${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
                    }
                    
                    return element.tagName.toLowerCase();
                },

                generateMultipleSelectors(element) {
                    const selectors = [];
                    
                    // ID selector (highest priority)
                    if (element.id) {
                        selectors.push(`#${element.id}`);
                    }
                    
                    // Name attribute
                    if (element.name) {
                        selectors.push(`[name="${element.name}"]`);
                    }
                    
                    // Placeholder-based selector
                    if (element.placeholder) {
                        selectors.push(`[placeholder="${element.placeholder}"]`);
                    }
                    
                    // Aria-label selector
                    if (element.getAttribute('aria-label')) {
                        selectors.push(`[aria-label="${element.getAttribute('aria-label')}"]`);
                    }
                    
                    // Class-based selectors
                    if (element.className) {
                        const classes = element.className.split(' ').filter(c => c.length > 0);
                        classes.forEach(cls => {
                            selectors.push(`.${cls}`);
                        });
                    }
                    
                    // Type-based selector
                    if (element.type) {
                        selectors.push(`${element.tagName.toLowerCase()}[type="${element.type}"]`);
                    }
                    
                    // Text content selector (for buttons/links)
                    if (element.textContent && element.textContent.trim()) {
                        const text = element.textContent.trim();
                        if (text.length < 50) { // Avoid very long text
                            selectors.push(`${element.tagName.toLowerCase()}:contains("${text}")`);
                        }
                    }
                    
                    // Position-based selector (nth-child)
                    const parent = element.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName);
                        const index = siblings.indexOf(element);
                        if (index >= 0) {
                            selectors.push(`${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`);
                        }
                    }
                    
                    // Fallback to tag name
                    selectors.push(element.tagName.toLowerCase());
                    
                    return selectors;
                },
                
                getRelevantAttributes(element) {
                    const attrs = {};
                    ['type', 'name', 'placeholder', 'value', 'href', 'src'].forEach(attr => {
                        if (element.hasAttribute(attr)) {
                            attrs[attr] = element.getAttribute(attr);
                        }
                    });
                    return attrs;
                }
            };
            
            // Monitor events
            ['click', 'input', 'change', 'submit'].forEach(eventType => {
                document.addEventListener(eventType, (e) => {
                    window.automationRecorder.recordAction(eventType, e.target, e.target.value);
                }, true);
            });
            
            // Intercept navigation
            const originalPushState = history.pushState;
            history.pushState = function(...args) {
                window.automationRecorder.recordAction('navigate', document.body, args[2]);
                return originalPushState.apply(history, args);
            };
        });

        // Listen to messages from injected script
        this.page.on('console', msg => {
            if (msg.text().includes('recordAction')) {
                console.log('Action recorded:', msg.text());
            }
        });
    }

    async getUserBrowser(userId) {
      let session = this.sessions.get(userId);
      if (!session) {
        session = { browser: await chromium.launch({ headless: false }) };
        this.sessions.set(userId, session);
      }
      return session.browser;
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({
            server: this.server,
            verifyClient: (info, done) => {
                console.log('🔄 Verifying WebSocket client...');
                const url = new URL(info.req.url, `http://${info.req.headers.host}`);
                const token = url.searchParams.get('token');
                
                if (!token) {
                    console.log('❌ No token provided');
                    return done(false, 401, 'Unauthorized: No token');
                }
                
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
                    console.log('✅ Token verified for user:', decoded.userId);
                    info.req.userId = decoded.userId; // Attach userId for later use
                    done(true);
                } catch (err) {
                    console.error('❌ Token verification failed:', err.message);
                    done(false, 401, 'Unauthorized: Invalid token');
                }
            }
        });
        
        this.wss.on('connection', (ws, req) => {
            this.clients.add(ws);
            console.log('👤 Client connected with userId:', req.userId);

            // Send initial state
            ws.send(JSON.stringify({
                type: 'init',
                scripts: Array.from(this.savedScripts.keys()),
                isRecording: this.isRecording
            }));

            ws.on('message', async (message) => {
                try {
                const data = JSON.parse(message);
                await this.handleMessage(data, ws);
                } catch (error) {
                    console.error('❌ Error processing message:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Server error: ${error.message}`
                    }));
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('👤 Client disconnected');
            });
        });
    }

    async handleMessage(data, ws) {
        try {
            switch (data.type) {
                case 'chat_instruction':
                    await this.processNaturalLanguageInstruction(data.message);
                    break;
                    
                case 'start_recording':
                    await this.startRecording(data.name, data.description);
                    break;
                    
                case 'stop_recording':
                    await this.stopRecording();
                    break;
                    
                case 'execute_script':
                    await this.executeScript(data.scriptName, data.variables);
                    break;
                    
                case 'get_page_info':
                    await this.getPageInfo();
                    break;
                    
                case 'navigate':
                    await this.navigateTo(data.url);
                    break;
                    
                case 'delete_script':
                    await this.deleteScript(data.scriptName);
                    break;
                    
                case 'toggle_manual_mode':
                    await this.toggleManualMode();
                    break;
                    
                case 'manual_click':
                    await this.handleManualClick(data.x, data.y);
                    break;
                    
                case 'pause_automation':
                    await this.pauseAutomation();
                    break;
                    
                case 'resume_automation':
                    await this.resumeAutomation();
                    break;
                    
                case 'sync_browser_state':
                    await this.syncBrowserState();
                    break;
                    
                case 'get_script_variables':
                    await this.getScriptVariables(data.scriptName);
                    break;
                    
                case 'get_fallback_analytics':
                    const analytics = this.getFallbackAnalytics();
                    ws.send(JSON.stringify({
                        type: 'fallback_analytics',
                        data: analytics
                    }));
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.broadcast({
                type: 'error',
                message: `Error: ${error.message}`
            });
        }
    }

    async processNaturalLanguageInstruction(instruction) {
        this.broadcast({
            type: 'chat_response',
            message: `🤖 Processing: "${instruction}"`
        });

        // Check for control commands first
        const controlCommand = this.checkForControlCommand(instruction);
        if (controlCommand) {
            await this.handleControlCommand(controlCommand);
            return;
        }

        // Check if this looks like variable definitions BEFORE LLM parsing
        if (this.isVariableDefinition(instruction)) {
            console.log('🔧 Detected variable definition pattern, processing directly');
            const variables = this.parseVariableDefinitions(instruction);
            if (variables.length > 0) {
                await this.handleVariableDefinitions(variables, 'create_login_automation', instruction);
                return;
            }
        }

        // ALWAYS use LLM to parse instructions first for better understanding
        const action = await this.parseInstructionWithLLM(instruction);
        if (action === null) {
            // LLM handled it (variables were processed or steps were queued)
            return;
        }
        // If LLM returned an action, continue to queue it
        if (action) {
            this.automationQueue.push({
                instruction: instruction,
                action: action,
                type: 'llm-parsed',
                addedAt: Date.now()
            });
            
            this.broadcast({
                type: 'chat_response',
                message: `➕ Added to queue: "${instruction}"`
            });
            
            if (!this.isProcessingQueue && this.automationState !== 'paused') {
                this.processAutomationQueue();
            }
            return;
        }

        // Check if this is a multi-step instruction
        if (this.isMultiStepInstruction(instruction)) {
            // Add steps to queue instead of processing immediately
            this.addMultiStepInstructionsToQueue(instruction);
            return;
        }

        // Check if this is a request for guidance
        if (this.isGuidanceRequest(instruction)) {
            const key = `guidance:${instruction}`;
            if (redis) {
                let cached = await redis.get(key);
                if (cached) {
                    this.broadcast({
                        type: 'chat_response',
                        message: `💡 ${JSON.parse(cached)}`
                    });
                    return;
                }
            }
            await this.provideGuidance(instruction);
            return;
        }

        // For single commands, add to queue
        this.addInstructionToQueue(instruction);
    }

    // NEW: Check for control commands (stop, pause, resume, clear)
    checkForControlCommand(instruction) {
        const lower = instruction.toLowerCase().trim();
        
        if (['stop', 'stop automation', 'cancel'].includes(lower)) {
            return 'stop';
        }
        if (['pause', 'pause automation', 'hold'].includes(lower)) {
            return 'pause';
        }
        if (['resume', 'continue', 'resume automation'].includes(lower)) {
            return 'resume';
        }
        if (['clear', 'clear queue', 'reset'].includes(lower)) {
            return 'clear';
        }
        if (['status', 'queue status', 'what\'s running'].includes(lower)) {
            return 'status';
        }
        
        return null;
    }

    // NEW: Handle control commands
    async handleControlCommand(command) {
        switch (command) {
            case 'stop':
                this.shouldStopAutomation = true;
                this.automationState = 'stopped';
                this.broadcast({
                    type: 'chat_response',
                    message: '🛑 Stopping automation...'
                });
                break;
                
            case 'pause':
                this.automationState = 'paused';
                this.broadcast({
                    type: 'chat_response',
                    message: '⏸️ Automation paused. Send "resume" to continue.'
                });
                break;
                
            case 'resume':
                if (this.automationState === 'paused') {
                    this.automationState = 'processing';
                    this.broadcast({
                        type: 'chat_response',
                        message: '▶️ Resuming automation...'
                    });
                    // Resume processing if there are items in queue
                    if (this.automationQueue.length > 0 && !this.isProcessingQueue) {
                        this.processAutomationQueue();
                    }
                } else {
                    this.broadcast({
                        type: 'chat_response',
                        message: '❌ Nothing to resume. Automation is not paused.'
                    });
                }
                break;
                
            case 'clear':
                this.automationQueue = [];
                this.currentStepIndex = 0;
                this.broadcast({
                    type: 'chat_response',
                    message: '🗑️ Automation queue cleared.'
                });
                break;
                
            case 'status':
                this.reportQueueStatus();
                break;
        }
    }

    // NEW: Report current queue status
    reportQueueStatus() {
        const status = {
            state: this.automationState,
            queueLength: this.automationQueue.length,
            currentIndex: this.currentStepIndex,
            isProcessing: this.isProcessingQueue
        };
        
        let message = `📊 Automation Status:\n`;
        message += `• State: ${status.state}\n`;
        message += `• Queue: ${status.queueLength} steps remaining\n`;
        message += `• Progress: Step ${status.currentIndex + 1} of ${status.currentIndex + status.queueLength}\n`;
        
        if (status.queueLength > 0) {
            message += `• Next: "${this.automationQueue[0].instruction}"`;
        }
        
        this.broadcast({
            type: 'chat_response',
            message
        });
    }

    // NEW: Add single instruction to queue
    addInstructionToQueue(instruction) {
        this.automationQueue.push({
            instruction,
            type: 'single',
            addedAt: Date.now()
        });
        
        this.broadcast({
            type: 'chat_response',
            message: `➕ Added to queue: "${instruction}"`
        });
        
        // Start processing if not already running
        if (!this.isProcessingQueue && this.automationState !== 'paused') {
            this.processAutomationQueue();
        }
    }

    // NEW: Add multi-step instructions to queue
    addMultiStepInstructionsToQueue(instruction) {
        console.log('📋 Adding multi-step instructions to queue');
        
        const steps = this.extractStepsFromInstruction(instruction);
        
        if (steps.length === 0) {
            this.broadcast({
                type: 'chat_response',
                message: `❌ Could not extract actionable steps from the instructions`
            });
            return;
        }

        // Add each step to the queue
        steps.forEach(step => {
            this.automationQueue.push({
                instruction: step,
                type: 'multi-step',
                addedAt: Date.now()
            });
        });

        this.broadcast({
            type: 'chat_response',
            message: `📋 Added ${steps.length} steps to automation queue`
        });

        // Start processing if not already running
        if (!this.isProcessingQueue && this.automationState !== 'paused') {
            this.processAutomationQueue();
        }
    }

    // NEW: Process automation queue
    async processAutomationQueue() {
        if (this.isProcessingQueue || this.automationQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        this.automationState = 'processing';
        this.shouldStopAutomation = false;

        while (this.automationQueue.length > 0 && !this.shouldStopAutomation) {
            // Check if paused
            if (this.automationState === 'paused') {
                this.isProcessingQueue = false;
                return;
            }

            const queueItem = this.automationQueue.shift();
            this.currentStepIndex++;

            this.broadcast({
                type: 'chat_response',
                message: `🔄 Executing: "${queueItem.instruction}" (${this.automationQueue.length} remaining)`
            });

            try {
                // Use LLM parsing for better understanding
                const action = await this.parseInstructionWithLLM(queueItem.instruction);
                
                if (action) {
                    await this.executeAction(action);
                    
                    // Add to recording if active
                    if (this.isRecording) {
                        this.currentRecording.steps.push({
                            instruction: queueItem.instruction,
                            action,
                            timestamp: Date.now(),
                            screenshot: await this.page.screenshot({ encoding: 'base64' })
                        });
                    }
                    
                    // Small delay between actions
                    await this.page.waitForTimeout(500);
                } else {
                    this.broadcast({
                        type: 'chat_response',
                        message: `⏭️ Skipping: "${queueItem.instruction}" (no action needed)`
                    });
                }
            } catch (error) {
                console.error('Error executing queued instruction:', error);
                this.broadcast({
                    type: 'error',
                    message: `❌ Error: ${error.message}`
                });
                
                // Ask if user wants to continue
                this.automationState = 'paused';
                this.broadcast({
                    type: 'chat_response',
                    message: `🤔 Error occurred. Queue paused. Send "resume" to continue or "clear" to start over.`
                });
                break;
            }
        }

        this.isProcessingQueue = false;
        
        if (this.automationQueue.length === 0 && !this.shouldStopAutomation) {
            this.automationState = 'idle';
            this.currentStepIndex = 0;
            this.broadcast({
                type: 'chat_response',
                message: `✅ Automation queue completed successfully!`
            });
        }
    }

    // NEW: Check if instruction contains multiple steps
    isMultiStepInstruction(instruction) {
        // Check for numbered lists, bullet points, or multiple lines
        const indicators = [
            /^\d+\./m,           // Numbered lists (1., 2., etc.)
            /^[-*•]/m,           // Bullet points
            /\n\s*\n/,           // Multiple paragraphs
            /###.*\n.*###/s,     // Multiple markdown sections
            instruction.split('\n').length > 3  // More than 3 lines
        ];
        
        return indicators.some(indicator => 
            indicator instanceof RegExp ? indicator.test(instruction) : indicator
        );
    }

    // NEW: Extract actionable steps from complex instructions
    extractStepsFromInstruction(instruction) {
        const steps = [];
        
        // First, extract any URLs mentioned in the instruction
        const urlMatch = instruction.match(/URL:\s*[`']?([^`'\s\n]+)[`']?/i);
        if (urlMatch && urlMatch[1] !== 'https://citnet.example.com') {
            // Only add if it's not the example URL
            steps.push(`Navigate to ${urlMatch[1]}`);
        }
        
        // Strategy 1: Extract numbered steps (1., 2., etc.)
        const numberedSteps = instruction.match(/^\d+\.\s*(.+)$/gm);
        if (numberedSteps && numberedSteps.length > 0) {
            numberedSteps.forEach(step => {
                const cleanStep = step.replace(/^\d+\.\s*/, '').trim();
                
                // Special handling for navigation steps
                if (cleanStep.toLowerCase().includes('navigate') && cleanStep.toLowerCase().includes('login page')) {
                    // Skip if we already have a URL navigation
                    if (!steps.some(s => s.startsWith('Navigate to http'))) {
                        steps.push(cleanStep);
                    }
                } else if (this.isActionableStep(cleanStep)) {
                    steps.push(cleanStep);
                }
            });
        }
        
        // Strategy 2: Extract bullet points
        const bulletSteps = instruction.match(/^[-*•]\s*(.+)$/gm);
        if (bulletSteps && bulletSteps.length > 0) {
            bulletSteps.forEach(step => {
                const cleanStep = step.replace(/^[-*•]\s*/, '').trim();
                
                // Extract credentials from bullet points
                if (cleanStep.includes('Username:') || cleanStep.includes('username:')) {
                    const userMatch = cleanStep.match(/Username:\s*[`']?([^`'\s]+)[`']?/i);
                    if (userMatch) {
                        steps.push(`Type ${userMatch[1]} in username field`);
                    }
                } else if (cleanStep.includes('Password:') || cleanStep.includes('password:')) {
                    const passMatch = cleanStep.match(/Password:\s*[`']?([^`'\s]+)[`']?/i);
                    if (passMatch) {
                        steps.push(`Type ${passMatch[1]} in password field`);
                    }
                } else if (this.isActionableStep(cleanStep)) {
                    steps.push(cleanStep);
                }
            });
        }
        
        // Remove duplicates and filter out non-actionable steps
        const uniqueSteps = [...new Set(steps)];
        
        // Filter out steps that are just informational
        return uniqueSteps.filter(step => {
            const lower = step.toLowerCase();
            // Skip verification steps for now
            if (lower.includes('verify') || lower.includes('check')) {
                return false;
            }
            // Skip steps about leaving things as default
            if (lower.includes('leave') && lower.includes('default')) {
                return false;
            }
            return step.length > 0;
        });
    }

    // NEW: Check if a line is an actionable step
    isActionableStep(line) {
        if (!line || line.length < 3) return false;
        
        // Skip non-actionable lines
        const skipPatterns = [
            /^###/,                          // Markdown headers
            /^##/,                           // Markdown headers
            /^\*\*/,                         // Bold text
            /^```/,                          // Code blocks
            /^-{3,}/,                        // Horizontal rules
            /^={3,}/,                        // Horizontal rules
            /^\s*$/,                         // Empty lines
            /^(issue|solution|note|tip):/i,  // Informational lines
            /^\(.+\)$/,                      // Parenthetical notes
        ];
        
        if (skipPatterns.some(pattern => pattern.test(line))) {
            return false;
        }
        
        // Check for action keywords
        const actionKeywords = [
            'navigate', 'go to', 'visit', 'open',
            'click', 'press', 'tap', 'select',
            'type', 'enter', 'input', 'fill',
            'wait', 'verify', 'check', 'ensure',
            'login', 'submit', 'search', 'download',
            'leave', 'skip', 'ignore'
        ];
        
        const lineLower = line.toLowerCase();
        return actionKeywords.some(keyword => lineLower.includes(keyword));
    }

    // NEW: Use LLM to intelligently parse instruction into actionable steps
    async parseInstructionWithLLM(instruction) {
        if (!this.claude || !process.env.ANTHROPIC_API_KEY) {
            // Fallback to basic parsing if LLM not available
            return this.parseInstruction(instruction);
        }

        try {
            const prompt = `You are a browser automation expert with vision capabilities. Analyze the user input AND the current page screenshot to determine what automation they want.

User Input: "${instruction}"

VISUAL CONTEXT: Look at the provided screenshot to understand:
- What page/website is currently displayed
- What interactive elements are visible (buttons, forms, modals, etc.)
- The current state of the page
- What the user likely wants to interact with based on their instruction

FIRST, determine the user's intent:

1. If this contains VARIABLE DEFINITIONS (like \${VAR_NAME} followed by values), return:
   {"action_type": "variable_definitions", "variables": [{"name": "VAR_NAME", "value": "actual_value"}], "next_action": "create_login_automation"}

2. If this is a SINGLE AUTOMATION COMMAND, return:
   {"action_type": "single_command", "command": "navigate|click|type|etc", "target": "specific_element_description", "value": "text_or_url", "strategy": "method", "visual_context": "what_you_see_in_screenshot"}

3. If this is MULTI-STEP INSTRUCTIONS, return:
   {"action_type": "multi_step", "steps": ["step1", "step2", "step3"]}

4. If this is a GREETING or CONVERSATION (like "Hi", "Hello", "How are you?"), return:
   {"action_type": "conversation", "response": "friendly response"}

EXAMPLES:

Variable Definitions:
"\${LOGIN_EMAIL} john@example.com
\${LOGIN_PASSWORD} mypassword123
\${LOGIN_URL} https://site.com/login"
→ {"action_type": "variable_definitions", "variables": [{"name": "LOGIN_EMAIL", "value": "john@example.com"}, {"name": "LOGIN_PASSWORD", "value": "mypassword123"}, {"name": "LOGIN_URL", "value": "https://site.com/login"}], "next_action": "create_login_automation"}

Single Commands:
"Click the login button" → {"action_type": "single_command", "command": "click", "target": "blue login button in center", "value": null, "strategy": "visual", "visual_context": "I can see a blue login button in the center of the form"}
"Close this modal" → {"action_type": "single_command", "command": "click", "target": "X close button", "value": null, "strategy": "visual", "visual_context": "I can see a modal with an X button in the top right"}
"Navigate to https://google.com" → {"action_type": "single_command", "command": "navigate", "target": null, "value": "https://google.com", "strategy": null, "visual_context": "navigation command"}

Multi-Step:
"1. Go to login page
2. Enter username
3. Enter password
4. Click submit"
→ {"action_type": "multi_step", "steps": ["Go to login page", "Enter username", "Enter password", "Click submit"]}

Conversation:
"Hi" → {"action_type": "conversation", "response": "Hello! I'm your browser automation assistant. How can I help you today?"}
"Hello" → {"action_type": "conversation", "response": "Hi there! Ready to help you automate some browser tasks!"}

Return ONLY the JSON object, no explanation.`;

            // Get current screenshot for visual context
            const screenshot = await this.takeScreenshot();
            const screenshotBase64 = screenshot ? screenshot.toString('base64') : null;
            
            if (!screenshot) {
                console.log('⚠️ No screenshot available for LLM parsing');
            }

            // Prepare message content
            const messageContent = [
                {
                    type: 'text',
                    text: prompt
                }
            ];

            // Add screenshot if available
            if (screenshotBase64) {
                messageContent.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/jpeg', // Changed to jpeg since we're using jpeg screenshots
                        data: screenshotBase64
                    }
                });
            }

            const response = await this.claude.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 20000,
                messages: [{ 
                    role: 'user', 
                    content: messageContent
                }]
            });

            let jsonStr = response.content[0].text.trim();
            
            // Handle markdown code blocks if present
            if (jsonStr.startsWith('```json') && jsonStr.endsWith('```')) {
                jsonStr = jsonStr.slice(7, -3).trim();
            } else if (jsonStr.startsWith('```') && jsonStr.endsWith('```')) {
                jsonStr = jsonStr.slice(3, -3).trim();
            }
            
            const parsed = JSON.parse(jsonStr);
            
            console.log(`🧠 LLM parsed instruction:`, parsed);

            // Handle different types of user input
            if (parsed.action_type === 'variable_definitions') {
                // User provided variable definitions - create automation steps
                return await this.handleVariableDefinitions(parsed.variables, parsed.next_action, instruction);
            }

            if (parsed.action_type === 'multi_step') {
                // User provided multi-step instructions
                return await this.handleMultiStepInstructions(parsed.steps, instruction);
            }

            if (parsed.action_type === 'single_command') {
                // User provided a single command - convert to action
                return this.convertSingleCommandToAction(parsed, instruction);
            }

            if (parsed.action_type === 'conversation') {
                // User is having a conversation - respond and return null
                this.broadcast({
                    type: 'chat_response',
                    message: parsed.response || "Hello! I'm here to help you with browser automation. You can give me commands like 'Navigate to google.com' or provide variable definitions."
                });
                return null;
            }

            // Legacy support for old format
            if (parsed.action_type === 'skip') {
                return null;
            }

            if (parsed.action_type === 'navigate') {
                return {
                    type: 'navigate',
                    url: parsed.value,
                    original: instruction
                };
            }

            // Default fallback to regular parsing
            return this.parseInstruction(instruction);

        } catch (error) {
            console.error('LLM parsing error:', error);
            // Fallback to regular parsing
            return this.parseInstruction(instruction);
        }
    }

    // NEW: Check if instruction looks like variable definitions
    isVariableDefinition(instruction) {
        // Look for patterns like ${VAR_NAME} value ${VAR_NAME2} value2
        const variablePattern = /\$\{[A-Z_][A-Z0-9_]*\}\s+[^\$]+/gi;
        const matches = instruction.match(variablePattern);
        
        // Must have at least 2 variable definitions to be considered a variable definition block
        return matches && matches.length >= 2;
    }

    // NEW: Parse variable definitions from instruction
    parseVariableDefinitions(instruction) {
        const variables = [];
        
        // Pattern to match ${VAR_NAME} followed by value (until next ${VAR_NAME} or end)
        const pattern = /\$\{([A-Z_][A-Z0-9_]*)\}\s+([^\$]+?)(?=\s*\$\{|$)/gi;
        
        let match;
        while ((match = pattern.exec(instruction)) !== null) {
            const name = match[1];
            const value = match[2].trim();
            
            if (value) {
                variables.push({
                    name: name,
                    value: value
                });
                console.log(`🔧 Parsed variable: ${name} = "${value}"`);
            }
        }
        
        return variables;
    }

    // NEW: Handle variable definitions from user input
    async handleVariableDefinitions(variables, nextAction, originalInstruction) {
        console.log('🔧 Processing variable definitions:', variables);
        
        // Store variables for use in automation
        this.currentVariables = {};
        variables.forEach(variable => {
            this.currentVariables[variable.name] = variable.value;
        });

        this.broadcast({
            type: 'chat_response',
            message: `✅ Variables defined: ${variables.map(v => `${v.name}="${v.value}"`).join(', ')}`
        });

        // Based on the next action, create appropriate automation steps
        if (nextAction === 'create_login_automation') {
            return await this.createLoginAutomation(variables);
        }

        // For now, return null to indicate variables were processed
        return null;
    }

    // NEW: Create login automation from variables
    async createLoginAutomation(variables) {
        const steps = [];
        
        // Find URL variable
        const urlVar = variables.find(v => v.name.includes('URL') || v.name.includes('url'));
        if (urlVar) {
            steps.push(`Navigate to ${urlVar.value}`);
        }

        // Find credentials
        const emailVar = variables.find(v => v.name.includes('EMAIL') || v.name.includes('email') || v.name.includes('CPF') || v.name.includes('cpf'));
        const passwordVar = variables.find(v => v.name.includes('PASSWORD') || v.name.includes('password'));

        if (emailVar) {
            // Use more specific field names based on the variable type
            if (emailVar.name.includes('CPF') || emailVar.name.includes('cpf')) {
                steps.push(`Type ${emailVar.value} in cpf field`);
            } else {
                steps.push(`Type ${emailVar.value} in email field`);
            }
        }

        if (passwordVar) {
            steps.push(`Type ${passwordVar.value} in password field`);
        }

        steps.push('Click login button');

        this.broadcast({
            type: 'chat_response',
            message: `🎯 Created login automation with ${steps.length} steps`
        });

        // Add steps to queue
        steps.forEach(step => {
            this.automationQueue.push({
                instruction: step,
                type: 'generated-from-variables',
                addedAt: Date.now()
            });
        });

        // Start processing
        if (!this.isProcessingQueue && this.automationState !== 'paused') {
            this.processAutomationQueue();
        }

        return null; // Indicate that steps were queued
    }

    // NEW: Handle multi-step instructions
    async handleMultiStepInstructions(steps, originalInstruction) {
        console.log('📋 Processing multi-step instructions:', steps);
        
        this.broadcast({
            type: 'chat_response',
            message: `📋 Added ${steps.length} steps to automation queue`
        });

        // Add each step to the queue
        steps.forEach(step => {
            this.automationQueue.push({
                instruction: step,
                type: 'multi-step-llm',
                addedAt: Date.now()
            });
        });

        // Start processing if not already running
        if (!this.isProcessingQueue && this.automationState !== 'paused') {
            this.processAutomationQueue();
        }

        return null; // Indicate that steps were queued
    }

    // NEW: Convert single command to action
    convertSingleCommandToAction(parsed, instruction) {
        if (parsed.command === 'navigate') {
            return {
                type: 'navigate',
                url: parsed.value,
                original: instruction
            };
        }

        if (parsed.command === 'click' || parsed.command === 'close') {
            return {
                type: 'click',
                target: parsed.target,
                searchText: parsed.target,
                original: instruction,
                strategy: parsed.strategy || 'visual',
                visualContext: parsed.visual_context,
                confidence: 0.9 // High confidence since LLM analyzed the screenshot
            };
        }

        if (parsed.command === 'type') {
            // Build proper selector based on strategy
            let selector = null;
            if (parsed.strategy === 'label') {
                selector = `input[aria-label*="${parsed.target}"], input[name*="${parsed.target.toLowerCase()}"], input[id*="${parsed.target.toLowerCase()}"]`;
            } else if (parsed.strategy === 'placeholder') {
                selector = `input[placeholder*="${parsed.target}"]`;
            } else if (parsed.strategy === 'id') {
                selector = `#${parsed.target}`;
            } else if (parsed.strategy === 'name') {
                selector = `input[name="${parsed.target}"]`;
            }

            // If no text provided by LLM, try to extract it from the original instruction
            let textToType = parsed.value;
            if (!textToType) {
                textToType = this.extractTextToType(instruction);
            }

            return {
                type: 'type',
                target: selector,
                text: textToType,
                original: instruction,
                searchText: parsed.target
            };
        }

        if (parsed.command === 'click') {
            let selector = null;
            if (parsed.strategy === 'text') {
                selector = `button, a, input[type="submit"], input[type="button"]`;
            } else if (parsed.strategy === 'id') {
                selector = `#${parsed.target}`;
            }

            return {
                type: 'click',
                target: selector,
                searchText: parsed.value || parsed.target,
                original: instruction
            };
        }

        // Default fallback
        return this.parseInstruction(instruction);
    }

    isGuidanceRequest(instruction) {
        // Only activate Claude if user explicitly asks for guidance with a question
        return instruction.trim().endsWith('?') && instruction.length > 10;
    }

    async provideGuidance(instruction) {
        if (!this.claude || !process.env.ANTHROPIC_API_KEY) {
            this.broadcast({
                type: 'chat_response',
                message: `💡 Guidance: For complex automation, try recording your actions step by step. Use simple commands like "click login button" or "type username in email field".`
            });
            return;
        }

        try {
            const prompt = `You are a browser automation guide. The user has a recording-based automation system where they can:

1. Record actions by clicking "Start Recording"
2. Perform actions manually or via simple commands
3. Stop recording to create reusable scripts with variables
4. Execute scripts with different parameters

User request: "${instruction}"

Provide helpful, concise guidance (2-3 sentences max) on how to achieve their goal using this recording-based approach. Focus on the "record once, reuse many times" workflow.`;

            const response = await this.claude.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 20000,
                messages: [{ role: 'user', content: prompt }]
            });

            this.broadcast({
                type: 'chat_response',
                message: `💡 ${response.content[0].text}`
            });

            if (redis) {
                await redis.set(`guidance:${instruction}`, JSON.stringify(response.content[0].text), 'EX', 3600);
            }

        } catch (error) {
            console.error('Guidance error:', error);
            this.broadcast({
                type: 'chat_response',
                message: `💡 Guidance: Record your actions step by step, then reuse the script with different variables. Start with "Start Recording" and perform the actions you want to automate.`
            });
        }
    }



    async intelligentActionDetection(instruction) {
        try {
            console.log(`🔍 Starting intelligent action detection for: "${instruction}"`);
            
            // Enhanced element detection with dynamic content awareness
            const elements = await this.page.evaluate((instruction) => {
                // Define calculateElementPriority function inside the page context
                const calculateElementPriority = (element, instruction) => {
                    let priority = 0;
                    const text = element.textContent || element.value || element.placeholder || '';
                    const id = element.id || '';
                    const className = element.className || '';
                    const tagName = element.tagName.toLowerCase();
                    
                    // Text relevance scoring
                    const instructionWords = instruction.toLowerCase().split(/\s+/);
                    const elementText = text.toLowerCase();
                    
                    instructionWords.forEach(word => {
                        if (elementText.includes(word)) {
                            priority += 10;
                        }
                        if (id.toLowerCase().includes(word)) {
                            priority += 8;
                        }
                        if (className.toLowerCase().includes(word)) {
                            priority += 6;
                        }
                    });
                    
                    // Element type priorities
                    if (tagName === 'button') priority += 5;
                    if (tagName === 'input') priority += 4;
                    if (tagName === 'select') priority += 4;
                    if (tagName === 'a') priority += 3;
                    
                    // Visibility and interaction
                    const rect = element.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) priority += 2;
                    if (!element.disabled && !element.readonly) priority += 2;
                    
                    return priority;
                };

                // Fallback selector generation function
                const generateBasicSelector = (element) => {
                    if (element.id) return `#${element.id}`;
                    if (element.className) {
                        const classes = element.className.split(' ').filter(c => c.length > 0);
                        if (classes.length > 0) {
                            return `${element.tagName.toLowerCase()}.${classes[0]}`;
                        }
                    }
                    return element.tagName.toLowerCase();
                };

                // Get all interactive elements
                const allElements = Array.from(document.querySelectorAll('button, input, select, textarea, a, [onclick], [role="button"]'));
                
                // Calculate priority for each element
                const scoredElements = allElements.map(element => ({
                    element: element,
                    priority: calculateElementPriority(element, instruction),
                    text: element.textContent || element.value || element.placeholder || '',
                    selector: generateBasicSelector(element),
                    tagName: element.tagName.toLowerCase(),
                    type: element.type || '',
                    id: element.id || '',
                    className: element.className || ''
                }));

                // Sort by priority (highest first)
                scoredElements.sort((a, b) => b.priority - a.priority);

                // Return top candidates
                return scoredElements.slice(0, 10).map(item => ({
                    selector: item.selector,
                    text: item.text,
                    priority: item.priority,
                    tagName: item.tagName,
                    type: item.type,
                    id: item.id,
                    className: item.className
                }));
            }, instruction);

            console.log(`🎯 Found ${elements.length} potential elements:`, elements);
            
            // If we found elements, create an action from the best match
            if (elements.length > 0) {
                const bestElement = elements[0];
                
                // Determine action type based on element
                let actionType = 'click'; // default
                if (bestElement.tagName === 'input') {
                    if (['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(bestElement.type)) {
                        actionType = 'type';
                    } else if (['submit', 'button'].includes(bestElement.type)) {
                        actionType = 'click';
                    }
                } else if (bestElement.tagName === 'textarea') {
                    actionType = 'type';
                } else if (bestElement.tagName === 'select') {
                    actionType = 'select';
                }
                
                // Create action object
                const action = {
                    type: actionType,
                    target: bestElement.selector,
                    searchText: this.extractSearchText(instruction),
                    original: instruction,
                    confidence: bestElement.priority / 100, // normalize to 0-1 scale
                    fallbackSelectors: elements.slice(0, 3).map(el => el.selector) // top 3 as fallbacks
                };
                
                // Add text for type actions
                if (actionType === 'type') {
                    action.text = this.extractTextToType(instruction);
                    
                    // If no text extracted, check if we have stored variables that might match
                    if (!action.text && this.currentVariables) {
                        // Try to match field with variables (e.g., password field with LOGIN_PASSWORD)
                        if (bestElement.id && bestElement.id.toLowerCase().includes('password')) {
                            const passwordVar = Object.keys(this.currentVariables).find(key => 
                                key.toLowerCase().includes('password')
                            );
                            if (passwordVar) {
                                action.text = this.currentVariables[passwordVar];
                            }
                        } else if (bestElement.id && (bestElement.id.toLowerCase().includes('cpf') || bestElement.id.toLowerCase().includes('email'))) {
                            const loginVar = Object.keys(this.currentVariables).find(key => 
                                key.toLowerCase().includes('cpf') || key.toLowerCase().includes('email') || key.toLowerCase().includes('login')
                            );
                            if (loginVar) {
                                action.text = this.currentVariables[loginVar];
                            }
                        }
                    }
                }
                
                console.log(`✅ Created action:`, action);
                return action;
            }
            
            console.log('❌ No suitable elements found for instruction');
            return null;
        } catch (error) {
            console.error('Error in intelligent action detection:', error);
            return null;
        }
    }

    // Helper method to extract search text from instruction
    extractSearchText(instruction) {
        // Extract text that should be searched for (e.g., "click login" -> "login")
        const clickMatch = instruction.match(/(?:click|press|tap)\s+(.+)/i);
        if (clickMatch) {
            return clickMatch[1].trim();
        }
        
        // Extract from other patterns
        const searchMatch = instruction.match(/(?:find|search|look for)\s+(.+)/i);
        if (searchMatch) {
            return searchMatch[1].trim();
        }
        
        return null;
    }

    // Helper method to extract text to type from instruction
    extractTextToType(instruction) {
        // Extract text that should be typed (e.g., "type hello" -> "hello")
        const typeMatch = instruction.match(/(?:type|enter|input)\s+(.+?)(?:\s+(?:in|into|on)\s+.+)?$/i);
        if (typeMatch) {
            return typeMatch[1].trim();
        }
        
        // Extract from fill patterns
        const fillMatch = instruction.match(/(?:fill|complete)\s+.+?(?:\s+(?:with|as)\s+(.+))?$/i);
        if (fillMatch && fillMatch[1]) {
            return fillMatch[1].trim();
        }

        // NEW: Handle conversational instructions that contain values
        // Look for patterns like "eh senha .. ao inves the password" -> extract "password"
        const conversationalPasswordMatch = instruction.match(/(?:eh|é|is|the)\s+(?:senha|password)[\s\w]*?(?:ao\s+inves|instead|rather)[\s\w]*?(?:the\s+)?(\w+)/i);
        if (conversationalPasswordMatch && conversationalPasswordMatch[1]) {
            return conversationalPasswordMatch[1].trim();
        }
        
        // Look for simple password patterns
        const passwordMatch = instruction.match(/(?:senha|password)[^a-zA-Z0-9]*([a-zA-Z0-9@#$%^&*!]+)/i);
        if (passwordMatch) {
            return passwordMatch[1].trim();
        }

        // Look for CPF patterns
        const cpfMatch = instruction.match(/(?:cpf|login)[^0-9]*([0-9]{3}\.?[0-9]{3}\.?[0-9]{3}[-.]?[0-9]{2})/i);
        if (cpfMatch) {
            return cpfMatch[1].trim();
        }

        // Look for email patterns
        const emailMatch = instruction.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            return emailMatch[1].trim();
        }

        // Look for quoted text
        const quotedMatch = instruction.match(/["']([^"']+)["']/);
        if (quotedMatch) {
            return quotedMatch[1].trim();
        }
        
        return '';
    }

    // NEW: Exact semantic matching
    findExactSemanticMatch(instruction, elements) {
        const instructionLower = instruction.toLowerCase();
        
        for (const element of elements) {
            const score = this.calculateSimilarity(instruction, element);
            
            // Check for exact matches in key attributes
            if (element.id && instructionLower.includes(element.id.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.9) };
            }
            if (element.name && instructionLower.includes(element.name.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.85) };
            }
            if (element.dataTestId && instructionLower.includes(element.dataTestId.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.9) };
            }
            if (element.ariaLabel && instructionLower.includes(element.ariaLabel.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.8) };
            }
            
            if (score > 0.7) {
                return { ...element, score };
            }
        }
        
        return null;
    }

    // NEW: Fuzzy semantic matching with improved algorithm
    findFuzzySemanticMatch(instruction, elements) {
        let bestMatch = null;
        let highestScore = 0;
        
        for (const element of elements) {
            const score = this.calculateEnhancedSimilarity(instruction, element);
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = { ...element, score };
            }
        }
        
        return highestScore > 0.3 ? bestMatch : null;
    }

    // NEW: Context-aware matching
    findContextAwareMatch(instruction, elements) {
        const context = this.analyzeInstructionContext(instruction);
        
        for (const element of elements) {
            let score = this.calculateSimilarity(instruction, element);
            
            // Context-based scoring adjustments
            if (context.isLogin && (element.type === 'password' || element.type === 'email')) {
                score += 0.3;
            }
            if (context.isSearch && (element.type === 'search' || element.placeholder?.toLowerCase().includes('search'))) {
                score += 0.3;
            }
            if (context.isSubmit && (element.type === 'submit' || element.tagName === 'BUTTON')) {
                score += 0.3;
            }
            
            if (score > 0.4) {
                return { ...element, score };
            }
        }
        
        return null;
    }

    // NEW: Position-based matching
    findPositionBasedMatch(instruction, elements) {
        const positionKeywords = {
            'first': (elements) => elements[0],
            'last': (elements) => elements[elements.length - 1],
            'top': (elements) => elements.sort((a, b) => a.rect.y - b.rect.y)[0],
            'bottom': (elements) => elements.sort((a, b) => b.rect.y - a.rect.y)[0],
            'left': (elements) => elements.sort((a, b) => a.rect.x - b.rect.x)[0],
            'right': (elements) => elements.sort((a, b) => b.rect.x - a.rect.x)[0]
        };
        
        const instructionLower = instruction.toLowerCase();
        
        for (const [keyword, selector] of Object.entries(positionKeywords)) {
            if (instructionLower.includes(keyword)) {
                const relevantElements = elements.filter(el => 
                    this.calculateSimilarity(instruction, el) > 0.2
                );
                
                if (relevantElements.length > 0) {
                    const selected = selector(relevantElements);
                    return { ...selected, score: 0.6 };
                }
            }
        }
        
        return null;
    }

    // NEW: Enhanced similarity calculation
    calculateEnhancedSimilarity(instruction, element) {
        const baseScore = this.calculateSimilarity(instruction, element);
        
        // Additional scoring factors
        let enhancementScore = 0;
        
        // Boost for semantic relevance
        const semanticKeywords = {
            'login': ['login', 'signin', 'sign-in', 'log-in'],
            'search': ['search', 'find', 'lookup'],
            'submit': ['submit', 'send', 'go', 'enter'],
            'cancel': ['cancel', 'close', 'dismiss'],
            'next': ['next', 'continue', 'proceed'],
            'back': ['back', 'previous', 'return']
        };
        
        const instructionLower = instruction.toLowerCase();
        for (const [category, keywords] of Object.entries(semanticKeywords)) {
            if (keywords.some(kw => instructionLower.includes(kw))) {
                if (element.textContent?.toLowerCase().includes(category) ||
                    element.className?.toLowerCase().includes(category) ||
                    element.id?.toLowerCase().includes(category)) {
                    enhancementScore += 0.2;
                }
            }
        }
        
        // Boost for common UI patterns
        if (element.tagName === 'BUTTON' && instructionLower.includes('click')) {
            enhancementScore += 0.1;
        }
        if (element.tagName === 'INPUT' && instructionLower.includes('type')) {
            enhancementScore += 0.1;
        }
        
        return Math.min(baseScore + enhancementScore, 1.0);
    }

    // NEW: Analyze instruction context
    analyzeInstructionContext(instruction) {
        const lower = instruction.toLowerCase();
        
        return {
            isLogin: lower.includes('login') || lower.includes('signin') || lower.includes('sign in'),
            isSearch: lower.includes('search') || lower.includes('find') || lower.includes('lookup'),
            isSubmit: lower.includes('submit') || lower.includes('send') || lower.includes('go'),
            isNavigation: lower.includes('navigate') || lower.includes('go to') || lower.includes('visit'),
            isForm: lower.includes('form') || lower.includes('fill') || lower.includes('enter'),
            isClick: lower.includes('click') || lower.includes('press') || lower.includes('tap'),
            isType: lower.includes('type') || lower.includes('enter') || lower.includes('input')
        };
    }

    // NEW: Extract search text for fallback
    extractSearchText(instruction, element) {
        const words = instruction.toLowerCase().split(/\s+/);
        const relevantWords = words.filter(word => 
            word.length > 2 && 
            !['click', 'the', 'button', 'field', 'box', 'input', 'on', 'in', 'at'].includes(word)
        );
        
        return relevantWords.join(' ') || element.textContent?.substring(0, 50) || '';
    }

    findBestElementMatch(instruction, elements) {
        let bestMatch = null;
        let highestScore = 0;

        console.log(`🔍 Matching instruction "${instruction}" against ${elements.length} elements`);
        
        for (const element of elements) {
            const score = this.calculateSimilarity(instruction, element);
            
            console.log(`🎯 Element: ${element.tagName}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ')[0] : ''} - Score: ${score.toFixed(2)}`);
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = { ...element, score };
            }
        }

        console.log(`🏆 Best match score: ${highestScore.toFixed(2)}, threshold: 0.2`);
        
        // Lower threshold for better matching
        return highestScore > 0.2 ? bestMatch : null;
    }

    calculateSimilarity(instruction, element) {
        const instructionWords = instruction.toLowerCase().split(/\s+/);
        const elementTexts = [
            element.textContent,
            element.placeholder,
            element.id,
            element.name,
            element.ariaLabel,
            element.title,
            element.className,
            element.value
        ].filter(Boolean).join(' ').toLowerCase();

        let score = 0;
        let exactMatches = 0;
        let partialMatches = 0;
        
        for (const word of instructionWords) {
            if (elementTexts.includes(word)) {
                score += 1;
                exactMatches++;
            } else {
                // Check for partial matches with improved fuzzy matching
                const partialMatch = elementTexts.split(' ').some(text => {
                    // Exact substring match
                    if (text.includes(word) || word.includes(text)) return true;
                    // Fuzzy matching for typos (Levenshtein distance)
                    if (this.levenshteinDistance(text, word) <= 2 && Math.min(text.length, word.length) >= 3) return true;
                    return false;
                });
                if (partialMatch) {
                    score += 0.5;
                    partialMatches++;
                }
            }
        }

        // Enhanced scoring system
        const baseScore = score / instructionWords.length;
        
        // Boost score for common search terms and element types
        let typeBoost = 0;
        const searchTerms = ['search', 'box', 'field', 'input', 'button', 'click', 'type', 'login', 'submit', 'form'];
        for (const term of searchTerms) {
            if (instruction.toLowerCase().includes(term)) {
                if (element.tagName === 'INPUT' && ['search', 'box', 'field', 'input'].includes(term)) {
                    typeBoost += 0.3;
                } else if (element.tagName === 'BUTTON' && ['button', 'click', 'submit'].includes(term)) {
                    typeBoost += 0.3;
                } else if (element.type === 'submit' && ['submit', 'login'].includes(term)) {
                    typeBoost += 0.4;
                }
            }
        }

        // Additional context-aware scoring
        let contextBoost = 0;
        if (element.id && instruction.toLowerCase().includes(element.id.toLowerCase())) {
            contextBoost += 0.2;
        }
        if (element.name && instruction.toLowerCase().includes(element.name.toLowerCase())) {
            contextBoost += 0.2;
        }
        if (element.placeholder && instruction.toLowerCase().includes(element.placeholder.toLowerCase())) {
            contextBoost += 0.2;
        }

        return Math.min(baseScore + typeBoost + contextBoost, 1.0);
    }

    // NEW: Levenshtein distance for fuzzy matching
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    determineActionType(element, instruction) {
        // Determine action based purely on element type and context
        if (element.tagName === 'INPUT') {
            const inputType = element.type?.toLowerCase();
            if (['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(inputType)) {
                return 'type';
            }
            if (['checkbox', 'radio'].includes(inputType)) {
                return 'click';
            }
            if (inputType === 'submit' || inputType === 'button') {
                return 'click';
            }
        }
        
        if (element.tagName === 'TEXTAREA') {
            return 'type';
        }
        
        if (element.tagName === 'SELECT') {
            return 'select';
        }
        
        if (element.tagName === 'BUTTON' || 
            element.tagName === 'A' || 
            element.hasAttribute('onclick') ||
            element.getAttribute('role') === 'button') {
            return 'click';
        }
        
        // Default to click for any other interactive element
        return 'click';
    }



    async startRecording(name, description) {
        this.isRecording = true;
        this.currentRecording = {
            name,
            description,
            steps: [],
            variables: [],
            startUrl: this.page.url(),
            createdAt: new Date().toISOString()
        };

        await this.page.evaluate(() => {
            window.automationRecorder.isRecording = true;
        });

        this.broadcast({
            type: 'recording_started',
            message: `🔴 Recording: "${name}"`
        });
    }

    async stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        await this.page.evaluate(() => {
            window.automationRecorder.isRecording = false;
        });

        // Analyze variables in recorded steps
        this.currentRecording.variables = this.extractVariables(this.currentRecording.steps);
        
        // Save the script
        await this.saveScript(this.currentRecording);

        this.broadcast({
            type: 'recording_stopped',
            script: this.currentRecording,
            message: `✅ Script "${this.currentRecording.name}" saved successfully!`
        });

        this.currentRecording = null;
    }

    extractVariables(steps) {
        const variables = [];
        const seenValues = new Set();

        for (const step of steps) {
            // Extract ALL URL parameters as potential variables
            if (step.action && step.action.url) {
                const url = step.action.url;
                const queryParams = url.match(/[?&]([^=]+)=([^&]+)/g);
                if (queryParams) {
                    queryParams.forEach(param => {
                        const [key, value] = param.substring(1).split('=');
                        const decodedValue = decodeURIComponent(value.replace(/\+/g, ' '));
                        if (decodedValue.length > 1 && !seenValues.has(decodedValue)) {
                            variables.push({
                                name: key,
                                value: decodedValue,
                                type: this.detectValueType(decodedValue),
                                description: `${key} parameter`
                            });
                            seenValues.add(decodedValue);
                        }
                    });
                }
            }
            
            // Extract ALL typed text as potential variables
            if (step.action && step.action.text && !seenValues.has(step.action.text)) {
                const text = step.action.text;
                
                if (text.length > 0) {
                    const varName = this.generateGenericVariableName(text, step.action.target, variables.length);
                    variables.push({
                        name: varName,
                        value: text,
                        type: this.detectValueType(text),
                        description: `User input: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
                    });
                    seenValues.add(text);
                }
            }
        }

        return variables;
    }

    detectValueType(value) {
        // Generic type detection without hardcoded patterns
        if (!value || typeof value !== 'string') return 'text';
        
        // Check if it's a number
        if (!isNaN(value) && !isNaN(parseFloat(value))) {
            return 'number';
        }
        
        // Check if it contains @ symbol (likely email)
        if (value.includes('@') && value.includes('.')) {
            return 'email';
        }
        
        // Check if it looks like a date (contains date separators)
        if (value.match(/\d+[\/\-\.]\d+[\/\-\.]\d+/)) {
            return 'date';
        }
        
        // Check if it's a URL
        if (value.startsWith('http') || value.includes('://')) {
            return 'url';
        }
        
        // Default to text
        return 'text';
    }

    generateGenericVariableName(text, target, index) {
        // Generate variable name based on position and context
        if (target) {
            // Extract meaningful words from target selector
            const targetWords = target.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2);
            
            if (targetWords.length > 0) {
                return targetWords[0];
            }
        }
        
        // Fallback to generic indexed name
        return `var_${index + 1}`;
    }

    async saveScript(script) {
        this.savedScripts.set(script.name, script);
        
        // Save to file
        try {
            await fs.mkdir(path.join(__dirname, 'scripts'), { recursive: true });
            await fs.writeFile(
                path.join(__dirname, 'scripts', `${script.name}.json`),
                JSON.stringify(script, null, 2)
            );
        } catch (error) {
            console.error('Error saving script:', error);
        }
    }

    async loadSavedScripts() {
        try {
            if (redis) {
                const scriptsJson = await redis.get('savedScripts');
                if (scriptsJson) {
                    const scriptsArray = JSON.parse(scriptsJson);
                    scriptsArray.forEach(s => this.savedScripts.set(s.name, s));
                    console.log(`📂 Loaded ${scriptsArray.length} scripts from Redis`);
                }
            }
            // Always try to load from filesystem as fallback
            const scriptsDir = path.join(__dirname, 'scripts');
            const files = await fs.readdir(scriptsDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const scriptPath = path.join(scriptsDir, file);
                    const scriptData = await fs.readFile(scriptPath, 'utf8');
                    const script = JSON.parse(scriptData);
                this.savedScripts.set(script.name, script);
            }
            }
            
            console.log(`📂 Loaded ${this.savedScripts.size} scripts total`);
        } catch (error) {
            console.log('📂 No existing scripts found');
        }
    }

    async deleteScript(scriptName) {
        try {
            this.savedScripts.delete(scriptName);
            await fs.unlink(path.join(__dirname, 'scripts', `${scriptName}.json`));
            // Update Redis
            if (redis) {
                await redis.set('savedScripts', JSON.stringify(Array.from(this.savedScripts.values())));
            }
            this.broadcast({
                type: 'script_deleted',
                scriptName,
                message: `✅ Script "${scriptName}" deleted successfully!`
            });
        } catch (error) {
            console.error('Error deleting script:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error deleting script: ${error.message}`
            });
        }
    }

    async executeScript(scriptName, variables = {}) {
        try {
        const script = this.savedScripts.get(scriptName);
        if (!script) {
            this.broadcast({
                type: 'error',
                message: `❌ Script "${scriptName}" not found`
            });
            return;
        }

            console.log(`🚀 Executing script: "${scriptName}"`);

        this.broadcast({
            type: 'script_execution_started',
                message: `🚀 Starting script: "${scriptName}"`
            });

            // Execute each step in the script
            for (let i = 0; i < script.steps.length; i++) {
                const step = script.steps[i];
                try {
                    console.log(`📝 Step ${i + 1}/${script.steps.length}: ${step.action.type}`);
                
                this.broadcast({
                    type: 'script_step',
                        message: `📝 Step ${i + 1}: ${step.action.type}`,
                    step: i + 1,
                    total: script.steps.length
                });

                    await this.executeAction(step.action);
                    await this.page.waitForTimeout(1000); // Wait between steps
                    } catch (error) {
                    console.error(`❌ Step ${i + 1} failed:`, error);
                    this.broadcast({
                        type: 'error',
                        message: `❌ Step ${i + 1} failed: ${error.message}`
                    });
                    break;
                }
            }

            this.broadcast({
                type: 'script_execution_completed',
                message: `✅ Script "${scriptName}" completed successfully`
            });

        } catch (error) {
            console.error('Error executing script:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error executing script: ${error.message}`
            });
        }
    }

    // NEW: Validate script variables
    validateScriptVariables(script, variables) {
        if (!script.variables || script.variables.length === 0) {
            return { isValid: true };
        }

        const missingVariables = [];
        const invalidVariables = [];

        for (const scriptVar of script.variables) {
            const varName = scriptVar.name;
            const varValue = variables[varName];

            if (varValue === undefined || varValue === null) {
                missingVariables.push(varName);
            } else if (scriptVar.type === 'number' && isNaN(varValue)) {
                invalidVariables.push(`${varName} must be a number`);
            } else if (scriptVar.type === 'email' && !this.isValidEmail(varValue)) {
                invalidVariables.push(`${varName} must be a valid email`);
            }
        }

        if (missingVariables.length > 0) {
            return {
                isValid: false,
                error: `Missing required variables: ${missingVariables.join(', ')}`
            };
        }

        if (invalidVariables.length > 0) {
            return {
                isValid: false,
                error: `Invalid variables: ${invalidVariables.join(', ')}`
            };
        }

        return { isValid: true };
    }

    // NEW: Pre-execution action validation
    async validateActionPreExecution(action) {
        if (!action || !action.type) {
            return { isValid: false, error: 'Action missing or invalid type' };
        }

        switch (action.type) {
            case 'navigate':
                if (!action.url && !action.target) {
                    return { isValid: false, error: 'Navigate action missing URL' };
                }
                break;
            case 'click':
                if (!action.target && !action.searchText) {
                    return { isValid: false, error: 'Click action missing target or search text' };
                }
                break;
            case 'type':
                if (!action.text) {
                    return { isValid: false, error: 'Type action missing text' };
                }
                break;
        }

        return { isValid: true };
    }

    // NEW: Post-execution action validation
    async validateActionPostExecution(action) {
        try {
            switch (action.type) {
                case 'navigate':
                    // Verify navigation was successful
                    const currentUrl = this.page.url();
                    const expectedUrl = action.url || action.target;
                    
                    if (expectedUrl && !currentUrl.includes(expectedUrl.replace(/^https?:\/\//, ''))) {
                        return { isValid: false, error: `Navigation failed: expected ${expectedUrl}, got ${currentUrl}` };
                    }
                    break;
                    
                case 'click':
                    // Verify click had some effect (page change, element state change, etc.)
                    await this.page.waitForTimeout(500);
                    // Could add more sophisticated validation here
                    break;
            }
            
            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    // NEW: Auto-correct common action issues
    async autoCorrectAction(action, validationResult) {
        const correctedAction = { ...action };
        
        if (action.type === 'navigate') {
            // Auto-correct URL format
            if (action.url && !action.url.startsWith('http')) {
                correctedAction.url = 'https://' + action.url;
                console.log(`🔧 Auto-corrected URL: ${action.url} → ${correctedAction.url}`);
                return correctedAction;
            }
        }
        
        return null; // No auto-correction possible
    }

    // NEW: Attempt error recovery
    async attemptErrorRecovery(error, step) {
        console.log(`🔧 Attempting error recovery for: ${error.message}`);
        
        try {
            // Common recovery strategies
            if (error.message.includes('timeout') || error.message.includes('not found')) {
                console.log('🔄 Refreshing page for timeout/not found error');
                await this.page.reload({ waitUntil: 'networkidle' });
                await this.waitForPageStability();
            } else if (error.message.includes('click')) {
                console.log('🔄 Scrolling to make elements visible');
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight / 2);
                });
                await this.page.waitForTimeout(1000);
            } else if (error.message.includes('navigation')) {
                console.log('🔄 Clearing browser cache and retrying');
                await this.page.evaluate(() => {
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                            registrations.forEach(registration => registration.unregister());
                        });
                    }
                });
            }
            
            console.log('✅ Error recovery completed');
        } catch (recoveryError) {
            console.log(`❌ Error recovery failed: ${recoveryError.message}`);
        }
    }

    // NEW: Handle step failure
    async handleStepFailure(error, step, executionContext) {
        console.log(`🤔 Handling step failure: ${error.message}`);
        
        // Determine if we should continue or abort based on error type and context
        const continuableErrors = [
            'element not found',
            'click failed',
            'timeout',
            'selector not found'
        ];
        
        const shouldContinue = continuableErrors.some(errorType => 
            error.message.toLowerCase().includes(errorType.toLowerCase())
        );
        
        if (shouldContinue) {
            console.log('⚠️ Error is continuable, proceeding with next step');
            this.broadcast({
                type: 'warning',
                message: `⚠️ Step ${executionContext.currentStep} failed but continuing: ${error.message}`
            });
        } else {
            console.log('💥 Error is critical, aborting execution');
        }
        
        return shouldContinue;
    }

    // NEW: Email validation helper
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async executeClickAction(action) {
        const selectors = action.fallbackSelectors || [action.target];
        
        console.log(`🎯 Attempting to click with ${selectors.length} selector strategies`);
        
        // Enhanced waiting strategy
        for (let i = 0; i < selectors.length; i++) {
            const selector = selectors[i];
            console.log(`🔍 Trying selector ${i + 1}/${selectors.length}: ${selector}`);
            try {
                const locator = this.page.locator(selector);
                await locator.waitFor({ state: 'visible', timeout: 5000 });
                await locator.click();
                                console.log(`✅ Successfully clicked using selector: ${selector}`);
                                this.broadcast({
                                    type: 'action_executed',
                                    action: `✅ Clicked: ${selector}`
                                });
                                return;
            } catch (error) {
                console.log(`❌ Error with selector ${selector}:`, error.message);
            }
        }
        
        // Enhanced text-based search with multiple strategies
        if (action.searchText) {
            console.log(`🔍 Trying enhanced text-based search for: "${action.searchText}"`);
            
            const textSearchStrategies = [
                // Exact text match
                `*:contains("${action.searchText}")`,
                // Case-insensitive match
                `*:contains("${action.searchText.toLowerCase()}")`,
                // Partial match
                `*[textContent*="${action.searchText}" i]`,
                // Placeholder match
                `input[placeholder*="${action.searchText}" i]`,
                // Value match
                `input[value*="${action.searchText}" i]`,
                // Aria-label match
                `*[aria-label*="${action.searchText}" i]`,
                // Title match
                `*[title*="${action.searchText}" i]`
            ];
            
            for (const strategy of textSearchStrategies) {
                try {
                    const elements = await this.page.$$eval('*', (elements, searchText) => {
                        return elements
                            .filter(el => {
                                const text = (el.textContent || '').toLowerCase();
                                const placeholder = (el.placeholder || '').toLowerCase();
                                const value = (el.value || '').toLowerCase();
                                const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                                const title = (el.title || '').toLowerCase();
                                
                                return text.includes(searchText.toLowerCase()) ||
                                       placeholder.includes(searchText.toLowerCase()) ||
                                       value.includes(searchText.toLowerCase()) ||
                                       ariaLabel.includes(searchText.toLowerCase()) ||
                                       title.includes(searchText.toLowerCase());
                            })
                            .filter(el => {
                                const rect = el.getBoundingClientRect();
                                const style = window.getComputedStyle(el);
                                return rect.width > 0 && rect.height > 0 && 
                                       style.display !== 'none' && 
                                       style.visibility !== 'hidden' &&
                                       style.opacity !== '0';
                            })
                            .map(el => ({
                                tagName: el.tagName,
                                textContent: el.textContent.trim(),
                                selector: el.id ? `#${el.id}` : 
                                         el.className ? `.${el.className.split(' ')[0]}` : 
                                         `${el.tagName.toLowerCase()}:nth-of-type(${Array.from(el.parentNode.children).indexOf(el) + 1})`
                            }));
                    }, action.searchText);
                    
                    if (elements.length > 0) {
                        const element = elements[0];
                        await this.page.click(element.selector);
                        console.log(`✅ Successfully clicked via text search: ${element.textContent}`);
                        this.broadcast({
                            type: 'action_executed',
                            action: `✅ Clicked: ${element.textContent}`
                        });
                        return;
                    }
                } catch (error) {
                    console.log(`❌ Text search strategy failed:`, error.message);
                }
            }
        }
        
        throw new Error(`Failed to click element. Tried ${selectors.length} selectors${action.searchText ? ' and enhanced text search' : ''}`);
    }

    async navigateTo(url) {
        try {
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            await this.page.goto(url, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(1000);
            
            // Force screenshot update after navigation
            await this.forceScreenshotUpdate();
            
            this.broadcast({
                type: 'navigation_completed',
                message: `✅ Navigated to: ${url}`
            });
        } catch (error) {
            console.error('Navigation error:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Navigation failed: ${error.message}`
            });
        }
    }

    async getPageInfo() {
        try {
            const info = await this.page.evaluate(() => ({
                title: document.title,
                url: window.location.href,
                forms: Array.from(document.forms).length,
                inputs: document.querySelectorAll('input').length,
                buttons: document.querySelectorAll('button').length
            }));

            this.broadcast({
                type: 'page_info',
                info
            });
        } catch (error) {
            console.error('Error getting page info:', error);
        }
    }

    startScreenshotStream() {
        this.screenshotInterval = setInterval(async () => {
            try {
                if (this.page && !this.page.isClosed()) {
                    await this.captureAndCompareScreenshot();
                }
            } catch (error) {
                console.error('Screenshot error:', error.message);
            }
        }, this.screenshotCheckInterval);
    }

    async captureAndCompareScreenshot() {
        try {
            // Take screenshot
            const screenshot = await this.page.screenshot({
                quality: this.screenshotQuality,
                type: 'jpeg'
            });

            // Calculate hash of the screenshot
            const screenshotHash = crypto.createHash('md5').update(screenshot).digest('hex');

            // Check if screenshot has changed
            if (this.lastScreenshotHash !== screenshotHash) {
                // Screenshot has changed, send it
                const base64Screenshot = screenshot.toString('base64');
                const currentUrl = this.page.url();

                this.broadcast({
                    type: 'screenshot',
                    data: base64Screenshot,
                    url: currentUrl,
                    timestamp: Date.now(),
                    hash: screenshotHash
                });

                console.log('📸 Screenshot changed, sent new version. URL:', currentUrl);
                
                // Update stored values
                this.lastScreenshotHash = screenshotHash;
                this.lastScreenshotBuffer = screenshot;
            } else {
                // Screenshot hasn't changed, don't send
                // Only log this occasionally to avoid spam
                if (Date.now() % 10000 < this.screenshotCheckInterval) {
                    console.log('📸 Screenshot unchanged, skipping broadcast');
                }
            }
        } catch (error) {
            console.error('Error in captureAndCompareScreenshot:', error.message);
        }
    }

    // Force screenshot update (for manual actions, navigation, etc.)
    async forceScreenshotUpdate() {
        try {
            if (this.page && !this.page.isClosed()) {
                const screenshot = await this.page.screenshot({
                    quality: this.screenshotQuality,
                    type: 'jpeg'
                });

                const base64Screenshot = screenshot.toString('base64');
                const currentUrl = this.page.url();
                const screenshotHash = crypto.createHash('md5').update(screenshot).digest('hex');

                this.broadcast({
                    type: 'screenshot',
                    data: base64Screenshot,
                    url: currentUrl,
                    timestamp: Date.now(),
                    hash: screenshotHash,
                    forced: true
                });

                console.log('📸 Forced screenshot update sent. URL:', currentUrl);
                
                // Update stored values
                this.lastScreenshotHash = screenshotHash;
                this.lastScreenshotBuffer = screenshot;
            }
        } catch (error) {
            console.error('Error in forceScreenshotUpdate:', error.message);
        }
    }

    // Configure screenshot optimization settings
    configureScreenshotOptimization(options = {}) {
        this.screenshotQuality = options.quality || 60;
        this.screenshotCheckInterval = options.checkInterval || 1000;
        this.screenshotChangeThreshold = options.changeThreshold || 0.1;
        
        console.log('📸 Screenshot optimization configured:', {
            quality: this.screenshotQuality,
            checkInterval: this.screenshotCheckInterval,
            changeThreshold: this.screenshotChangeThreshold
        });
        
        // Restart screenshot stream with new settings
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.startScreenshotStream();
        }
    }

    // Get screenshot optimization analytics
    getScreenshotAnalytics() {
        return {
            quality: this.screenshotQuality,
            checkInterval: this.screenshotCheckInterval,
            changeThreshold: this.screenshotChangeThreshold,
            lastScreenshotHash: this.lastScreenshotHash,
            optimizationEnabled: true
        };
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
        
        // Log non-screenshot messages for debugging
        if (data.type !== 'screenshot') {
            console.log('📡 Broadcasting:', data.type, data.message || '');
        }
    }

    async toggleManualMode() {
        this.isManualMode = !this.isManualMode;
        
        if (this.isManualMode) {
            // Entering manual mode
            console.log('👤 Entering manual control mode');
            this.lastKnownState = {
                url: this.page.url(),
                title: await this.page.title(),
                timestamp: Date.now()
            };
            
            this.broadcast({
                type: 'manual_mode_enabled',
                message: '👤 Manual control enabled. You can now interact directly with the browser.',
                state: this.lastKnownState
            });
        } else {
            // Exiting manual mode
            console.log('🤖 Exiting manual control mode');
            await this.syncBrowserState();
            
            this.broadcast({
                type: 'manual_mode_disabled',
                message: '🤖 Manual control disabled. Automation system resumed.',
                changes: this.lastKnownState
            });
        }
    }

    async pauseAutomation() {
        this.automationPaused = true;
        console.log('⏸️ Automation paused');
        
        this.broadcast({
            type: 'automation_paused',
            message: '⏸️ Automation paused. Browser is now under manual control.'
        });
    }

    async resumeAutomation() {
        this.automationPaused = false;
        await this.syncBrowserState();
        console.log('▶️ Automation resumed');
        
        this.broadcast({
            type: 'automation_resumed',
            message: '▶️ Automation resumed. System synchronized with browser state.'
        });
    }

    async syncBrowserState() {
        try {
            const currentState = {
                url: this.page.url(),
                title: await this.page.title(),
                timestamp: Date.now()
            };

            // Detect changes made during manual control
            const changes = [];
            if (this.lastKnownState) {
                if (currentState.url !== this.lastKnownState.url) {
                    changes.push(`URL changed: ${this.lastKnownState.url} → ${currentState.url}`);
                }
                if (currentState.title !== this.lastKnownState.title) {
                    changes.push(`Page title changed: ${this.lastKnownState.title} → ${currentState.title}`);
                }
            }

            console.log('🔄 Browser state synchronized:', currentState);
            if (changes.length > 0) {
                console.log('📝 Manual changes detected:', changes);
            }

            this.lastKnownState = currentState;

            this.broadcast({
                type: 'browser_state_synced',
                message: changes.length > 0 
                    ? `🔄 State synchronized. Changes detected: ${changes.join(', ')}`
                    : '🔄 Browser state synchronized.',
                state: currentState,
                changes
            });

            return currentState;
        } catch (error) {
            console.error('Error syncing browser state:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error syncing browser state: ${error.message}`
            });
        }
    }

    async getScriptVariables(scriptName) {
        try {
            const script = this.savedScripts.get(scriptName);
            if (!script) {
                this.broadcast({
                    type: 'error',
                    message: `❌ Script "${scriptName}" not found`
                });
                return;
            }

            console.log(`📋 Getting variables for script: "${scriptName}"`);
            console.log(`🔧 Script variables:`, script.variables);

            this.broadcast({
                type: 'script_variables',
                scriptName,
                variables: script.variables || []
            });

        } catch (error) {
            console.error('Error getting script variables:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error getting script variables: ${error.message}`
            });
        }
    }

    async executeAction(action) {
        console.log(`🎬 Executing action:`, action);
        
        // Enhanced retry mechanism with LLM fallback
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxRetries} for action: ${action.type}`);
                
                switch (action.type) {
                    case 'navigate':
                        await this.executeNavigateAction(action);
                        break;
                    case 'click':
                        await this.executeClickAction(action);
                        // Force screenshot update after click action
                        await this.forceScreenshotUpdate();
                        break;
                    case 'type':
                        await this.executeTypeAction(action);
                        // Force screenshot update after type action
                        await this.forceScreenshotUpdate();
                        break;
                    case 'wait':
                        await this.page.waitForTimeout(action.duration || 2000);
                        break;
                    case 'screenshot':
                        await this.takeScreenshot();
                        break;
                    default:
                        throw new Error(`Unknown action type: ${action.type}`);
                }
                
                // Success - break out of retry loop
                console.log(`✅ Action completed successfully on attempt ${attempt}`);
                return;
                
            } catch (error) {
                lastError = error;
                console.log(`❌ Action failed on attempt ${attempt}:`, error.message);
                
                // Classify the error to determine if LLM fallback is appropriate
                const errorClassification = this.classifyError(error, action);
                console.log(`🔍 Error classification:`, errorClassification);
                
                if (attempt === maxRetries) {
                    // Final attempt failed - try LLM fallback for appropriate error types
                    if (errorClassification.type === 'structural' || 
                        errorClassification.type === 'interaction' ||
                        (errorClassification.type === 'temporal' && !errorClassification.retryable)) {
                        
                        console.log(`🤖 Attempting LLM fallback for ${errorClassification.type} error`);
                        
                        try {
                            const fallbackSuccess = await this.executeLLMFallback(action, error);
                            if (fallbackSuccess) {
                                console.log(`✅ LLM fallback succeeded for action: ${action.type}`);
                                this.broadcast({
                                    type: 'action_executed',
                                    message: `🤖 LLM Fallback Success: ${action.type} completed using AI assistance`
                                });
                                return;
                            }
                        } catch (fallbackError) {
                            console.error(`❌ LLM fallback also failed:`, fallbackError.message);
                        }
                    }
                    
                    // Both traditional and LLM approaches failed
                    console.error(`💥 Action failed after ${maxRetries} attempts and LLM fallback: ${error.message}`);
                    this.broadcast({
                        type: 'error',
                        message: `❌ Action failed: ${action.type} - ${error.message}`
                    });
                    throw error;
                }
                
                // Wait before retry (exponential backoff)
                await this.page.waitForTimeout(1000 * attempt);
            }
        }
    }

    async executeNavigateAction(action) {
        const url = action.url || action.target;
        if (!url) {
            throw new Error('Navigate action missing URL');
        }
        await this.navigateTo(url);
    }

    async executeTypeAction(action) {
        // Handle null or undefined target
        if (!action.target && action.searchText) {
            // Try to find the field using searchText
            action.target = await this.findInputFieldByContext(action.searchText);
        }
        
        if (!action.target) {
            throw new Error('Type action missing target field');
        }

        // Ensure target is a string (not an array)
        const selectors = Array.isArray(action.target) ? action.target : [action.target];
        let textToType = action.text;

        if (!textToType) {
            throw new Error('Type action missing text to type');
        }

        for (const selector of selectors) {
            try {
                const locator = this.page.locator(selector);
                await locator.waitFor({ state: 'visible', timeout: 5000 });
                await locator.fill(textToType);
                console.log(`✅ Typed "${textToType}" into ${selector}`);
                this.broadcast({
                    type: 'action_executed',
                    action: `✅ Typed: ${textToType} into ${selector}`
                });
                return;
            } catch (error) {
                console.log(`❌ Error typing into ${selector}:`, error.message);
                if (error.message.includes('Target page, context or browser has been closed')) {
                    throw error; // Re-throw critical errors
                }
            }
        }
        throw new Error(`Failed to type text into any selector: ${selectors.join(', ')}`);
    }

    // NEW: Helper to find input field by context
    async findInputFieldByContext(context) {
        const contextLower = context.toLowerCase();
        
        // Common field mappings
        const fieldMappings = {
            'username': `input[type="text"], input[name*="user"], input[id*="user"], input[placeholder*="usuário"]`,
            'password': `input[type="password"], input[name*="pass"], input[id*="pass"], input[placeholder*="senha"]`,
            'email': `input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email"]`,
            'search': `input[type="search"], input[name*="search"], input[placeholder*="search"], input[placeholder*="buscar"]`
        };

        // Check for known field types
        for (const [fieldType, selector] of Object.entries(fieldMappings)) {
            if (contextLower.includes(fieldType)) {
                return selector;
            }
        }

        // Generic input field selector
        return `input[type="text"], input[type="email"], input[type="password"], textarea`;
    }

    async takeScreenshot() {
        try {
            if (this.page && !this.page.isClosed()) {
                // PNG doesn't support quality option, use JPEG for quality control
                const screenshot = await this.page.screenshot({
                    quality: this.screenshotQuality || 60,
                    type: 'jpeg'
                });
                console.log('📸 Screenshot taken');
                return screenshot;
            }
        } catch (error) {
            console.error('Error taking screenshot:', error.message);
        }
        return null;
    }

    async waitForPageStability() {
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForLoadState('load');
    }

    // NEW: Enhanced Error Classification and LLM Fallback System
    classifyError(error, action) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('timeout') || errorMessage.includes('waiting')) {
            return { type: 'temporal', severity: 'medium', retryable: true };
        }
        
        if (errorMessage.includes('selector') || errorMessage.includes('not found') || 
            errorMessage.includes('no element') || errorMessage.includes('locator')) {
            return { type: 'structural', severity: 'high', retryable: false };
        }
        
        if (errorMessage.includes('network') || errorMessage.includes('connection') ||
            errorMessage.includes('failed to load')) {
            return { type: 'connectivity', severity: 'medium', retryable: true };
        }
        
        if (errorMessage.includes('click') || errorMessage.includes('interaction')) {
            return { type: 'interaction', severity: 'high', retryable: false };
        }
        
        return { type: 'unknown', severity: 'low', retryable: true };
    }

    // NEW: Convert actions to natural language for LLM fallback
    convertActionToNaturalLanguage(action) {
        const baseInstructions = {
            navigate: `Navigate to the URL: ${action.url}`,
            click: this.generateClickInstruction(action),
            type: this.generateTypeInstruction(action),
            wait: `Wait for ${action.duration || 2000} milliseconds`,
            screenshot: 'Take a screenshot of the current page'
        };
        
        return baseInstructions[action.type] || `Perform ${action.type} action`;
    }

    generateClickInstruction(action) {
        if (action.searchText) {
            return `Click on the element that contains the text "${action.searchText}"`;
        }
        
        if (action.target) {
            // Convert technical selector to natural language
            if (action.target.includes('button')) {
                return `Click on the button`;
            }
            if (action.target.includes('input')) {
                return `Click on the input field`;
            }
            if (action.target.includes('link') || action.target.includes('a[')) {
                return `Click on the link`;
            }
            
            return `Click on the element with selector: ${action.target}`;
        }
        
        return 'Click on the appropriate element';
    }

    generateTypeInstruction(action) {
        const text = action.text || '';
        
        if (action.target) {
            if (action.target.includes('email')) {
                return `Type "${text}" in the email field`;
            }
            if (action.target.includes('password')) {
                return `Type "${text}" in the password field`;
            }
            if (action.target.includes('search')) {
                return `Type "${text}" in the search box`;
            }
            
            return `Type "${text}" in the input field`;
        }
        
        return `Type "${text}" in the appropriate field`;
    }

    // NEW: LLM Fallback Execution using Claude
    async executeLLMFallback(action, error) {
        console.log('🤖 Initiating LLM fallback for action:', action.type);
        
        try {
            const instruction = this.convertActionToNaturalLanguage(action);
            console.log('🔤 Natural language instruction:', instruction);
            
            // Get current screenshot for visual context
            const screenshot = await this.takeScreenshot();
            if (!screenshot) {
                console.log('⚠️ No screenshot available for LLM fallback');
                return false;
            }
            const screenshotBase64 = screenshot.toString('base64');
            
            // Use Claude to generate a more robust approach with visual context
            const prompt = `You are a browser automation expert with vision capabilities. The following action failed:
            
Original Action: ${JSON.stringify(action, null, 2)}
Error: ${error.message}
Natural Language Instruction: ${instruction}

Current page URL: ${this.page.url()}

VISUAL ANALYSIS: Look at the provided screenshot to understand:
- What elements are visible on the page
- What interactive elements are available (buttons, forms, inputs)
- The current state of the page
- Alternative ways to accomplish the failed action

Please provide a step-by-step approach to accomplish this action. Be specific about what to look for on the page.
Focus on alternative ways to identify and interact with elements based on what you can see.
Respond in a structured format that can guide the automation.

If this is a type action that failed due to missing text, analyze the page to understand what should be typed based on the context.`;

            const response = await this.claude.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 20000,
                messages: [{ 
                    role: 'user', 
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: screenshotBase64
                            }
                        }
                    ]
                }]
            });

            const guidance = response.content[0].text;
            console.log('🧠 LLM Guidance with Visual Context:', guidance);

            // Attempt to execute using the guidance
            await this.executeLLMGuidedAction(action, guidance);
            
            // Log successful fallback
            this.logFallbackSuccess(action, error, guidance);
            
            return true;
        } catch (llmError) {
            console.error('❌ LLM fallback failed:', llmError.message);
            this.logFallbackFailure(action, error, llmError);
            return false;
        }
    }

    // NEW: Execute action with LLM guidance
    async executeLLMGuidedAction(action, guidance) {
        // For now, use enhanced element detection based on LLM guidance
        // This can be expanded to use more sophisticated LLM-driven automation
        
        switch (action.type) {
            case 'click':
                await this.executeLLMGuidedClick(action, guidance);
                break;
            case 'type':
                await this.executeLLMGuidedType(action, guidance);
                break;
            case 'navigate':
                await this.executeLLMGuidedNavigate(action, guidance);
                break;
            default:
                throw new Error(`LLM fallback not implemented for action type: ${action.type}`);
        }
    }

    async executeLLMGuidedClick(action, guidance) {
        // Use more aggressive element detection strategies
        const strategies = [
            // Text-based search with partial matching
            async () => {
                const elements = await this.page.$$eval('*', (elements, searchText) => {
                    return elements
                        .filter(el => {
                            const text = (el.textContent || '').toLowerCase();
                            const placeholder = (el.placeholder || '').toLowerCase();
                            const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                            const title = (el.title || '').toLowerCase();
                            
                            return text.includes(searchText) || 
                                   placeholder.includes(searchText) ||
                                   ariaLabel.includes(searchText) ||
                                   title.includes(searchText);
                        })
                        .filter(el => {
                            const rect = el.getBoundingClientRect();
                            const style = window.getComputedStyle(el);
                            return rect.width > 0 && rect.height > 0 && 
                                   style.display !== 'none' && 
                                   style.visibility !== 'hidden';
                        })
                        .map(el => ({
                            tagName: el.tagName,
                            textContent: el.textContent.trim(),
                            id: el.id,
                            className: el.className
                        }));
                }, (action.searchText || action.target || '').toLowerCase());
                
                if (elements.length > 0) {
                    const element = elements[0];
                    const selector = element.id ? `#${element.id}` : 
                                   element.className ? `.${element.className.split(' ')[0]}` : 
                                   element.tagName.toLowerCase();
                    await this.page.click(selector);
                    return true;
                }
                return false;
            },
            
            // Role-based selection
            async () => {
                const roleSelectors = ['button', 'link', 'textbox', 'combobox', 'listbox'];
                for (const role of roleSelectors) {
                    try {
                        const elements = await this.page.getByRole(role).all();
                        if (elements.length > 0) {
                            await elements[0].click();
                            return true;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                return false;
            }
        ];

        for (const strategy of strategies) {
            try {
                if (await strategy()) {
                    console.log('✅ LLM-guided click successful');
                    return;
                }
            } catch (e) {
                continue;
            }
        }
        
        throw new Error('All LLM-guided click strategies failed');
    }

    async executeLLMGuidedType(action, guidance) {
        const text = action.text || '';
        
        // Enhanced input field detection
        const strategies = [
            // By input type
            async () => {
                const inputs = await this.page.$$('input[type="text"], input[type="email"], input[type="search"], textarea');
                if (inputs.length > 0) {
                    await inputs[0].fill(text);
                    return true;
                }
                return false;
            },
            
            // By placeholder
            async () => {
                if (action.target && action.target.includes('email')) {
                    const emailInputs = await this.page.$$('input[type="email"], input[placeholder*="email" i]');
                    if (emailInputs.length > 0) {
                        await emailInputs[0].fill(text);
                        return true;
                    }
                }
                return false;
            },
            
            // By role
            async () => {
                const textboxes = await this.page.getByRole('textbox').all();
                if (textboxes.length > 0) {
                    await textboxes[0].fill(text);
                    return true;
                }
                return false;
            }
        ];

        for (const strategy of strategies) {
            try {
                if (await strategy()) {
                    console.log('✅ LLM-guided type successful');
                    return;
                }
            } catch (e) {
                continue;
            }
        }
        
        throw new Error('All LLM-guided type strategies failed');
    }

    async executeLLMGuidedNavigate(action, guidance) {
        // Enhanced navigation with retry logic
        const url = action.url || action.target;
        
        try {
            await this.page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            console.log('✅ LLM-guided navigation successful');
        } catch (error) {
            // Try with different wait conditions
            await this.page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 15000 
            });
            console.log('✅ LLM-guided navigation successful (fallback)');
        }
    }

    // NEW: Logging and Analytics
    logFallbackSuccess(action, originalError, guidance) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            originalError: originalError.message,
            guidance: guidance,
            result: 'success',
            url: this.page.url()
        };
        
        console.log('📊 LLM Fallback Success:', logEntry);
        
        // Store for analytics (could be sent to database)
        if (!this.fallbackLogs) this.fallbackLogs = [];
        this.fallbackLogs.push(logEntry);
    }

    logFallbackFailure(action, originalError, llmError) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            originalError: originalError.message,
            llmError: llmError.message,
            result: 'failure',
            url: this.page.url()
        };
        
        console.log('📊 LLM Fallback Failure:', logEntry);
        
        if (!this.fallbackLogs) this.fallbackLogs = [];
        this.fallbackLogs.push(logEntry);
    }

    // NEW: Get fallback analytics
    getFallbackAnalytics() {
        if (!this.fallbackLogs || this.fallbackLogs.length === 0) {
            return {
                totalFallbacks: 0,
                successRate: 0,
                avgResponseTime: 0,
                commonFailures: []
            };
        }

        const total = this.fallbackLogs.length;
        const successful = this.fallbackLogs.filter(log => log.result === 'success').length;
        
        return {
            totalFallbacks: total,
            successRate: (successful / total * 100).toFixed(1),
            avgResponseTime: 'N/A', // Could be calculated with timing
            commonFailures: this.getCommonFailures()
        };
    }

    getCommonFailures() {
        if (!this.fallbackLogs) return [];
        
        const failures = this.fallbackLogs
            .filter(log => log.result === 'failure')
            .map(log => log.originalError);
            
        const failureCounts = {};
        failures.forEach(error => {
            failureCounts[error] = (failureCounts[error] || 0) + 1;
        });
        
        return Object.entries(failureCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([error, count]) => ({ error, count }));
    }

    async handleManualClick(x, y) {
        if (!this.isManualMode) {
            console.log('❌ Manual click ignored - not in manual mode');
            this.broadcast({
                type: 'error',
                message: '❌ Manual clicks only work in manual mode'
            });
            return;
        }

        try {
            console.log(`👆 Manual click at coordinates: (${x}, ${y})`);
            
            // Perform the click at the specified coordinates
            await this.page.mouse.click(x, y);
            
            // Wait a moment for any page changes
            await this.page.waitForTimeout(500);
            
            // Force screenshot update since manual interaction likely changed the page
            await this.forceScreenshotUpdate();
            
            this.broadcast({
                type: 'action_executed',
                message: `👆 Manual click executed at (${x}, ${y})`
            });
            
            console.log(`✅ Manual click completed at (${x}, ${y})`);
            
        } catch (error) {
            console.error('❌ Manual click failed:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Manual click failed: ${error.message}`
            });
        }
    }

    // Basic parsing fallback
    async parseInstruction(instruction) {
        // First try direct navigation commands
        const navigationAction = this.parseNavigationCommand(instruction);
        if (navigationAction) {
            return navigationAction;
        }

        // Then try element-based action detection
        return await this.intelligentActionDetection(instruction);
    }

    parseNavigationCommand(instruction) {
        const lowerInstruction = instruction.toLowerCase();
        
        // Common navigation patterns
        const navigationPatterns = [
            { pattern: /^(?:go to|navigate to|visit|open)\s+(.+)$/i, type: 'navigate' },
            { pattern: /^(?:open)\s+(.+)$/i, type: 'navigate' },
            { pattern: /^(.+\.(com|br|org|net|gov|edu|co\.uk|com\.br))$/i, type: 'navigate' },
            { pattern: /^(?:search for|find|look for)\s+(.+)$/i, type: 'search' },
            { pattern: /^(?:click|press|tap)\s+(.+)$/i, type: 'click_text' },
            { pattern: /^(?:type|enter|input)\s+(.+?)(?:\s+(?:in|into|on)\s+(.+))?$/i, type: 'type_text' },
            { pattern: /^(?:fill|complete)\s+(.+?)(?:\s+(?:with|as)\s+(.+))?$/i, type: 'fill_field' }
        ];

        for (const { pattern, type } of navigationPatterns) {
            const match = instruction.match(pattern);
            if (match) {
                console.log(`🎯 Matched navigation pattern: ${type}`, match);
                
                switch (type) {
                    case 'navigate':
                        return {
                            type: 'navigate',
                            url: match[1].trim(),
                            original: instruction
                        };
                    case 'search':
                        // This will be handled by element detection
                        return null;
                    case 'click_text':
                        return {
                            type: 'click',
                            searchText: match[1].trim(),
                            original: instruction
                        };
                    case 'type_text':
                        return {
                            type: 'type',
                            text: match[1].trim(),
                            target: match[2] ? match[2].trim() : null,
                            original: instruction
                        };
                    case 'fill_field':
                        return {
                            type: 'type',
                            target: match[1].trim(),
                            text: match[2] ? match[2].trim() : '',
                            original: instruction
                        };
                }
            }
        }

        return null;
    }
}

module.exports = IntelligentBrowserAutomation;

// Start the server
if (require.main === module) {
    const server = new IntelligentBrowserAutomation();
    server.initialize().then(() => {
        console.log('🚀 Server started successfully!');
    }).catch(error => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });
}