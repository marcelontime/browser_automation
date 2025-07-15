require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const StagehandAutomationEngine = require('./stagehand-engine');
const BrowserProfileManager = require('./modules/browser/profile-manager');

class StagehandBrowserAutomationServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.wss = null;
        
        // Per-user session management
        this.userSessions = new Map(); // sessionId -> { ws, automationEngine, profilePath, recordingState }
        this.connectedClients = new Set();
        
        // JWT secret for WebSocket authentication
        this.jwtSecret = 'browser-automation-secret-key';
        
        // Global automation storage (shared across sessions)
        this.savedAutomations = new Map();
        this.automationsDir = path.join(__dirname, 'automations');
        
        // Browser profile management
        this.profileManager = new BrowserProfileManager();
        
        this.setupExpress();
        this.setupWebSocket();
        this.initializeStorage();
        this.setupProfileCleanup();
    }

    async initializeStorage() {
        try {
            // Create automations directory if it doesn't exist
            await fs.mkdir(this.automationsDir, { recursive: true });
            
            // Load existing automations
            await this.loadSavedAutomations();
            
            console.log(`📁 Automation storage initialized: ${this.savedAutomations.size} automations loaded`);
        } catch (error) {
            console.error('❌ Error initializing storage:', error.message);
        }
    }

    setupProfileCleanup() {
        // Set up cleanup handlers for browser profiles
        this.profileManager.setupCleanupHandlers();
        
        // Add server-specific cleanup
        const cleanup = async () => {
            console.log('🧹 Server shutting down, cleaning up resources...');
            
            // Close automation engine
            if (this.automationEngine) {
                await this.automationEngine.close();
            }
            
            // Clean up profiles
            await this.profileManager.cleanupAllTemporaryProfiles();
            
            // Close WebSocket server
            if (this.wss) {
                this.wss.close();
            }
            
            // Close HTTP server
            if (this.server) {
                this.server.close();
            }
            
            console.log('✅ Server cleanup completed');
        };
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }

    async loadSavedAutomations() {
        try {
            const files = await fs.readdir(this.automationsDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(this.automationsDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const automation = JSON.parse(content);
                    this.savedAutomations.set(automation.id, automation);
                } catch (error) {
                    console.error(`❌ Error loading automation ${file}:`, error.message);
                }
            }
        } catch (error) {
            console.error('❌ Error reading automations directory:', error.message);
        }
    }

    async saveAutomation(automation) {
        try {
            // Save to memory
            this.savedAutomations.set(automation.id, automation);
            
            // Save to file system
            const filePath = path.join(this.automationsDir, `${automation.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(automation, null, 2));
            
            console.log(`💾 Automation saved: ${automation.name} (${automation.id})`);
            return true;
        } catch (error) {
            console.error(`❌ Error saving automation:`, error.message);
            return false;
        }
    }

    async deleteAutomation(automationId) {
        try {
            // Get automation name for logging
            const automation = this.savedAutomations.get(automationId);
            const automationName = automation ? automation.name : automationId;
            
            // Remove from memory
            const deleted = this.savedAutomations.delete(automationId);
            
            if (!deleted) {
                throw new Error(`Automation ${automationId} not found in memory`);
            }
            
            // Remove from file system
            const filePath = path.join(this.automationsDir, `${automationId}.json`);
            try {
                await fs.unlink(filePath);
                console.log(`🗑️ File deleted: ${filePath}`);
            } catch (fileError) {
                if (fileError.code !== 'ENOENT') {
                    console.warn(`⚠️ Warning: Could not delete file ${filePath}:`, fileError.message);
                }
            }
            
            console.log(`✅ Automation deleted successfully: ${automationName} (${automationId})`);
            return true;
        } catch (error) {
            console.error(`❌ Error deleting automation ${automationId}:`, error.message);
            throw error;
        }
    }

    setupExpress() {
        // Serve static files from React build
        this.app.use(express.static('public/build'));
        this.app.use(express.json());

        // Token endpoint for WebSocket authentication
        this.app.get('/get-token', (req, res) => {
            const token = jwt.sign(
                { 
                    user: 'browser-automation-user',
                    timestamp: Date.now()
                },
                this.jwtSecret,
                { expiresIn: '24h' }
            );
            res.json({ token });
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy',
                engine: this.automationEngine ? 'initialized' : 'not_initialized',
                clients: this.connectedClients.size,
                timestamp: new Date().toISOString()
            });
        });

        // Profile statistics endpoint
        this.app.get('/api/profiles/stats', async (req, res) => {
            try {
                const stats = await this.profileManager.getProfileStats();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Serve the React app
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'build', 'index.html'));
        });
    }

    setupWebSocket() {
        this.wss = new WebSocket.Server({
            server: this.server,
            verifyClient: (info) => {
                try {
                    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
                    const token = url.searchParams.get('token');
                    
                    if (!token) {
                        console.log('❌ WebSocket connection rejected: No token provided');
                        return false;
                    }

                    jwt.verify(token, this.jwtSecret);
                    console.log('✅ WebSocket connection authenticated');
                    return true;
                } catch (error) {
                    console.log('❌ WebSocket connection rejected: Invalid token');
                    return false;
                }
            }
        });

        this.wss.on('connection', async (ws) => {
            const sessionId = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
            console.log(`🔌 New WebSocket client connected - Session: ${sessionId}`);
            
            this.connectedClients.add(ws);
            
            // Create isolated session for this user
            const userSession = {
                sessionId,
                ws,
                automationEngine: null,
                profilePath: null,
                recordingState: {
                    isRecording: false,
                    isManualMode: false,
                    isPaused: false,
                    currentRecordingId: null,
                    recordedSteps: []
                },
                screenshotInterval: null
            };
            
            this.userSessions.set(sessionId, userSession);
            
            // Initialize automation engine for this session
            await this.initializeSessionEngine(sessionId);

            // Send initial status
            this.sendToClient(ws, {
                type: 'status',
                message: 'Connected to Stagehand Browser Automation',
                engine: 'stagehand',
                version: '2.0',
                sessionId: sessionId
            });

            // Handle incoming messages
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);
                    await this.handleWebSocketMessage(sessionId, message);
                } catch (error) {
                    console.error(`❌ Error handling WebSocket message for session ${sessionId}:`, error.message);
                    this.sendToClient(ws, {
                        type: 'error',
                        message: `Error: ${error.message}`
                    });
                }
            });

            // Handle client disconnect
            ws.on('close', async () => {
                console.log(`🔌 WebSocket client disconnected - Session: ${sessionId}`);
                await this.cleanupSession(sessionId);
            });

            // Handle WebSocket errors
            ws.on('error', async (error) => {
                console.error(`❌ WebSocket error for session ${sessionId}:`, error.message);
                await this.cleanupSession(sessionId);
            });
        });
    }

    async initializeAutomationEngine() {
        if (this.automationEngine && this.automationEngine.isInitialized) {
            return; // Already initialized
        }

        try {
            console.log('🚀 Initializing Stagehand automation engine with persistent profiles...');
            
            // Create temporary profile for this session
            this.currentProfilePath = await this.profileManager.createTemporaryProfile(
                this.sessionId,
                {
                    brazilianLocalization: true,
                    performance: true,
                    debug: process.env.NODE_ENV === 'development'
                }
            );
            
            // Get enhanced Stagehand configuration
            const stagehandConfig = this.profileManager.getStagehandConfig(
                this.currentProfilePath,
                {
                    openaiApiKey: process.env.OPENAI_API_KEY,
                    headless: false,
                    verbose: 1,
                    brazilianLocalization: true,
                    performance: true
                }
            );
            
            this.automationEngine = new StagehandAutomationEngine(stagehandConfig);

            await this.automationEngine.init();
            
            // Start screenshot streaming
            this.startScreenshotStreaming();
            
            this.broadcastToClients({
                type: 'engine_ready',
                message: '✅ Stagehand engine initialized with persistent profile'
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize automation engine:', error.message);
            this.broadcastToClients({
                type: 'error',
                message: `Failed to initialize engine: ${error.message}`
            });
        }
    }

    // Session management methods
    async initializeSessionEngine(sessionId) {
        const userSession = this.userSessions.get(sessionId);
        if (!userSession) {
            throw new Error(`Session ${sessionId} not found`);
        }

        try {
            console.log(`🚀 Initializing automation engine for session ${sessionId}...`);
            
            // Debug API key
            const apiKey = process.env.OPENAI_API_KEY;
            console.log(`🔑 API Key check: ${apiKey ? 'SET (length: ' + apiKey.length + ')' : 'NOT SET'}`);
            
            // Create temporary profile for this session
            userSession.profilePath = await this.profileManager.createTemporaryProfile(
                sessionId,
                {
                    brazilianLocalization: true,
                    performance: true,
                    debug: process.env.NODE_ENV === 'development'
                }
            );
            
            // Get enhanced Stagehand configuration
            const stagehandConfig = this.profileManager.getStagehandConfig(
                userSession.profilePath,
                {
                    openaiApiKey: apiKey, // Pass the API key explicitly
                    headless: false,
                    verbose: 1,
                    brazilianLocalization: true,
                    performance: true
                }
            );
            
            // Debug the final config
            console.log(`🔧 Final Stagehand config API key: ${stagehandConfig.modelClientOptions?.apiKey ? 'SET' : 'NOT SET'}`);
            
            userSession.automationEngine = new StagehandAutomationEngine(stagehandConfig);
            await userSession.automationEngine.init();
            
            // Start screenshot streaming for this session
            this.startSessionScreenshotStreaming(sessionId);
            
            this.sendToClient(userSession.ws, {
                type: 'engine_ready',
                message: `✅ Stagehand engine initialized for session ${sessionId}`
            });
            
        } catch (error) {
            console.error(`❌ Failed to initialize automation engine for session ${sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Failed to initialize engine: ${error.message}`
            });
        }
    }

    async cleanupSession(sessionId) {
        const userSession = this.userSessions.get(sessionId);
        if (!userSession) {
            console.log(`⚠️ Session ${sessionId} not found during cleanup`);
            return;
        }

        try {
            console.log(`🧹 Cleaning up session ${sessionId}...`);
            
            // Stop screenshot streaming
            if (userSession.screenshotInterval) {
                clearInterval(userSession.screenshotInterval);
            }
            
            // Close automation engine
            if (userSession.automationEngine) {
                await userSession.automationEngine.close();
            }
            
            // Clean up browser profile
            if (userSession.profilePath) {
                await this.profileManager.cleanupProfile(userSession.profilePath);
            }
            
            // Remove from connected clients
            this.connectedClients.delete(userSession.ws);
            
            // Remove session from map
            this.userSessions.delete(sessionId);
            
            console.log(`✅ Session ${sessionId} cleaned up successfully`);
            
        } catch (error) {
            console.error(`❌ Error cleaning up session ${sessionId}:`, error.message);
        }
    }

    startSessionScreenshotStreaming(sessionId) {
        const userSession = this.userSessions.get(sessionId);
        if (!userSession || !userSession.automationEngine) {
            return;
        }

        // Take screenshot every 2 seconds
        userSession.screenshotInterval = setInterval(async () => {
            try {
                if (userSession.automationEngine && userSession.automationEngine.page) {
                    const screenshot = await userSession.automationEngine.page.screenshot({
                        type: 'jpeg',
                        quality: 50
                    });
                    
                    this.sendToClient(userSession.ws, {
                        type: 'screenshot',
                        message: 'No message',
                        data: screenshot.toString('base64')
                    });
                }
            } catch (error) {
                console.error(`❌ Error taking screenshot for session ${sessionId}:`, error.message);
            }
        }, 2000);
    }

    // Updated message handler to work with session IDs
    async handleWebSocketMessage(sessionId, message) {
        const userSession = this.userSessions.get(sessionId);
        if (!userSession) {
            console.error(`❌ Session ${sessionId} not found`);
            return;
        }

        const { type, data, message: messageContent } = message;
        
        // Extract the actual instruction content
        const instructionData = data || messageContent || message;

        switch (type) {
            case 'instruction':
            case 'chat_instruction': // Handle both old and new message types
                await this.handleInstruction(userSession, instructionData);
                break;
            
            case 'navigate':
                await this.handleNavigate(userSession, message);
                break;
            
            case 'screenshot_request':
                await this.handleScreenshotRequest(userSession);
                break;
            
            case 'extract_data':
                await this.handleDataExtraction(userSession, data);
                break;
            
            case 'get_page_info':
                await this.handlePageInfoRequest(userSession);
                break;

            // Automation management
            case 'create_automation':
                await this.handleCreateAutomation(userSession, message);
                break;
            
            case 'run_automation':
                await this.handleRunAutomation(userSession, message);
                break;
            
            case 'edit_automation':
                await this.handleEditAutomation(userSession, message);
                break;
            
            case 'save_automation_edits':
                await this.handleSaveAutomationEdits(userSession, message);
                break;
            
            case 'delete_automation':
                await this.handleDeleteAutomation(userSession, message);
                break;
            
            case 'extract_variables':
                await this.handleExtractVariables(userSession, message);
                break;
            
            case 'toggle_recording':
                await this.handleToggleRecording(userSession, message);
                break;

            // Browser controls
            case 'go_back':
                await this.handleGoBack(userSession);
                break;
            
            case 'refresh':
                await this.handleRefresh(userSession);
                break;
            
            case 'toggle_manual_mode':
                await this.handleToggleManualMode(userSession);
                break;
            
            case 'toggle_pause':
                await this.handleTogglePause(userSession);
                break;
            
            case 'sync_browser_state':
                await this.handleSyncBrowser(userSession);
                break;
            
            case 'manual_click':
                await this.handleManualClick(userSession, message);
                break;
            
            case 'get_automation_variables':
                await this.handleGetAutomationVariables(userSession, message);
                break;

            case 'update_automation_variables':
                await this.handleUpdateAutomationVariables(userSession, message);
                break;
            
            case 'get_automations':
                await this.handleGetAutomations(userSession);
                break;
            
            default:
                this.sendToClient(userSession.ws, {
                    type: 'error',
                    message: `Unknown message type: ${type}`
                });
        }
    }

    // Navigation handler
    async handleNavigate(userSession, message) {
        try {
            const { url } = message;
            console.log(`🌐 [${userSession.sessionId}] Direct navigation to: ${url}`);
            
            if (!userSession.automationEngine) {
                throw new Error('Automation engine not initialized');
            }
            
            userSession.recordingState.isLoading = true;
            
            // Use direct navigation instead of Stagehand for simple URL navigation
            await userSession.automationEngine.page.goto(url);
            
            // Record the action if recording is active
            if (userSession.recordingState.isRecording) {
                this.recordStep(userSession, {
                    type: 'navigate',
                    url: url,
                    timestamp: Date.now()
                });
            }
            
            this.sendToClient(userSession.ws, {
                type: 'navigation_completed',
                message: `✅ Navigated to ${url}`,
                url: url
            });
            
            // Send updated screenshot after navigation
            setTimeout(() => this.takeAndSendScreenshot(userSession), 2000);
            
        } catch (error) {
            console.error(`❌ Navigation error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Navigation failed: ${error.message}`
            });
        }
    }

    // Instruction handler
    async handleInstruction(userSession, instructionData) {
        try {
            console.log(`📝 [${userSession.sessionId}] Received instruction: "${instructionData}"`);
            
            if (!userSession.automationEngine) {
                throw new Error('Automation engine not initialized');
            }
            
            const result = await userSession.automationEngine.processInstruction(instructionData);
            
            this.sendToClient(userSession.ws, {
                type: 'instruction_result',
                message: result.success ? '✅ Instruction completed successfully' : '❌ Instruction failed',
                data: result
            });
            
        } catch (error) {
            console.error(`❌ Error processing instruction for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Error: ${error.message}`
            });
        }
    }

    // Helper method to take and send screenshot
    async takeAndSendScreenshot(userSession) {
        try {
            if (userSession.automationEngine && userSession.automationEngine.page) {
                const screenshot = await userSession.automationEngine.page.screenshot({
                    type: 'jpeg',
                    quality: 50
                });
                
                this.sendToClient(userSession.ws, {
                    type: 'screenshot',
                    message: 'No message',
                    data: screenshot.toString('base64')
                });
            }
        } catch (error) {
            console.error(`❌ Error taking screenshot for session ${userSession.sessionId}:`, error.message);
        }
    }

    // Helper method to record steps
    recordStep(userSession, action) {
        if (userSession.recordingState.isRecording) {
            userSession.recordingState.recordedSteps.push({
                ...action,
                timestamp: Date.now()
            });
        }
    }

    // Get automations handler
    async handleGetAutomations(userSession) {
        try {
            const automationsList = Array.from(this.savedAutomations.values());
            this.sendToClient(userSession.ws, {
                type: 'automations_list',
                automations: automationsList
            });
        } catch (error) {
            console.error(`❌ Error getting automations for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Error getting automations: ${error.message}`
            });
        }
    }

    async handleScreenshotRequest(ws) {
        try {
            const screenshot = await this.automationEngine.takeScreenshot();
            if (screenshot) {
                const base64Screenshot = screenshot.toString('base64');
                this.sendToClient(ws, {
                    type: 'screenshot',
                    data: base64Screenshot,
                    format: 'jpeg'
                });
            }
        } catch (error) {
            console.error('❌ Error taking screenshot:', error.message);
            this.sendToClient(ws, {
                type: 'error',
                message: `Screenshot error: ${error.message}`
            });
        }
    }

    async handleDataExtraction(ws, { instruction, schema }) {
        try {
            const result = await this.automationEngine.extractData(instruction, schema);
            this.sendToClient(ws, {
                type: 'extraction_result',
                data: result,
                instruction: instruction
            });
        } catch (error) {
            console.error('❌ Error extracting data:', error.message);
            this.sendToClient(ws, {
                type: 'error',
                message: `Data extraction error: ${error.message}`
            });
        }
    }

    async handlePageInfoRequest(ws) {
        try {
            const pageInfo = await this.automationEngine.getPageInfo();
            this.sendToClient(ws, {
                type: 'page_info',
                data: pageInfo
            });
        } catch (error) {
            console.error('❌ Error getting page info:', error.message);
            this.sendToClient(ws, {
                type: 'error',
                message: `Page info error: ${error.message}`
            });
        }
    }

    startScreenshotStreaming() {
        // Clear any existing interval
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
        }
        
        // Start screenshot streaming with error handling
        this.screenshotInterval = setInterval(async () => {
            if (this.connectedClients.size > 0 && this.automationEngine?.isInitialized) {
                await this.broadcastScreenshot();
            }
        }, 2000); // Reduced frequency to avoid timeouts
        
        console.log('📸 Screenshot streaming started (every 2 seconds)');
    }

    async broadcastScreenshot() {
        try {
            if (!this.automationEngine) {
                console.log('📸 Screenshot skipped: No automation engine');
                return;
            }
            
            if (!this.automationEngine.page) {
                console.log('📸 Screenshot skipped: No page available');
                return;
            }

            console.log('📸 Taking screenshot...');
            
            // Take screenshot with increased timeout and error handling
            const screenshotBuffer = await Promise.race([
                this.automationEngine.page.screenshot({ 
                    type: 'jpeg',
                    quality: 80,
                    fullPage: false
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Screenshot timeout')), 15000)
                )
            ]);

            // Convert Buffer to base64 string
            const screenshotBase64 = screenshotBuffer.toString('base64');
            const url = this.automationEngine.page.url();
            
            console.log('📸 Screenshot taken, broadcasting to clients...');

            this.broadcastToClients({
                type: 'screenshot',
                data: screenshotBase64,
                url: url
            });
            
            console.log('📸 Screenshot broadcast complete');
        } catch (error) {
            // Always log screenshot errors for debugging
            console.error('❌ Error taking screenshot:', error.message);
            
            // Send a placeholder screenshot or skip if screenshot fails
            this.broadcastToClients({
                type: 'screenshot',
                data: null,
                url: this.automationEngine?.page?.url() || 'about:blank',
                error: 'Screenshot unavailable'
            });
        }
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    broadcastToClients(message) {
        const messageStr = JSON.stringify(message);
        this.connectedClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }

    formatResultMessage(result) {
        if (!result) return 'No result';
        
        switch (result.action) {
            case 'variable_definition':
                const varList = result.variables ? 
                    result.variables.map(v => `${v.name}="${v.value}"`).join(', ') : '';
                const stepCount = result.automationSteps ? result.automationSteps.length : 0;
                return `✅ Variables defined: ${varList}\n🎯 Created automation with ${stepCount} steps`;
                
            case 'automation_sequence':
                const actionCount = result.actions ? result.actions.length : 0;
                return `✅ Executed ${actionCount} automation actions successfully`;
                
            case 'direct_action':
                return `✅ Executed: ${result.directAction}`;
                
            case 'stop':
            case 'clear':
            case 'status':
                return result.message || 'Command executed';
                
            case 'error':
                return `❌ Error: ${result.error}`;
                
            default:
                return result.message || 'Action completed';
        }
    }

    // Automation Management Handlers
    async handleCreateAutomation(ws, message) {
        try {
            const { name, description } = message;
            console.log(`🎯 Creating automation: ${name}`);
            
            // Generate a unique ID for the new automation
            const newAutomationId = Date.now().toString();

            const newAutomation = {
                id: newAutomationId,
                name,
                description: description || 'New automation',
                status: 'ready',
                stepCount: 0,
                variableCount: 0,
                steps: [], // Placeholder for steps
                createdAt: new Date().toISOString()
            };

            await this.saveAutomation(newAutomation);

            this.sendToClient(ws, {
                type: 'automation_created',
                message: `✅ Created automation: ${name}`,
                automation: newAutomation
            });
        } catch (error) {
            this.sendToClient(ws, {
                type: 'error',
                message: `❌ Failed to create automation: ${error.message}`
            });
        }
    }

    async handleRunAutomation(ws, message) {
        try {
            const { automationId, variables } = message;
            console.log(`▶️ Running automation: ${automationId}`);
            
            const automation = this.savedAutomations.get(automationId);
            if (!automation) {
                throw new Error(`Automation with ID ${automationId} not found.`);
            }

            this.sendToClient(ws, {
                type: 'automation_started',
                message: `▶️ Starting automation: ${automation.name}`,
                automationId
            });
            
            // Execute the automation steps
            try {
                const result = await this.executeAutomationSteps(automation, variables || {});
                
                this.sendToClient(ws, {
                    type: 'automation_completed',
                    message: `✅ Automation completed successfully: ${result.stepsExecuted}/${result.totalSteps} steps`,
                    automationId,
                    result
                });
            } catch (execError) {
                this.sendToClient(ws, {
                    type: 'automation_failed',
                    message: `❌ Automation failed: ${execError.message}`,
                    automationId,
                    error: execError.message
                });
            }
        } catch (error) {
            this.sendToClient(ws, {
                type: 'error',
                message: `❌ Failed to run automation: ${error.message}`
            });
        }
    }

    async executeAutomationSteps(automation, userVariables) {
        const steps = automation.steps || [];
        const variables = { ...userVariables };
        let stepsExecuted = 0;
        
        console.log(`🎯 Executing automation with ${steps.length} steps`);
        
        for (const step of steps) {
            try {
                const action = step.action;
                if (!action) continue;
                
                // Replace variables in action parameters
                const processedAction = this.replaceVariablesInAction(action, variables);
                
                console.log(`📍 Executing step ${stepsExecuted + 1}/${steps.length}: ${action.type}`);
                
                // Execute based on action type
                switch (processedAction.type) {
                    case 'navigate':
                        await this.automationEngine.page.goto(processedAction.url, { 
                            waitUntil: 'domcontentloaded', 
                            timeout: 15000 
                        });
                        break;
                        
                    case 'type':
                    case 'fill':
                        // Use Stagehand to find and fill the field
                        const fillInstruction = `type "${processedAction.text}" in ${processedAction.selector || processedAction.description}`;
                        await this.automationEngine.page.act(fillInstruction);
                        break;
                        
                    case 'click':
                        // Use Stagehand to click the element
                        const clickInstruction = `click ${processedAction.selector || processedAction.description}`;
                        await this.automationEngine.page.act(clickInstruction);
                        break;
                        
                    case 'select':
                        // Use Stagehand to select from dropdown
                        const selectInstruction = `select "${processedAction.value}" from ${processedAction.selector || processedAction.description}`;
                        await this.automationEngine.page.act(selectInstruction);
                        break;
                        
                    case 'wait':
                        // Wait for a moment
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        break;
                        
                    default:
                        // Use Stagehand for generic actions
                        if (processedAction.description) {
                            await this.automationEngine.page.act(processedAction.description);
                        }
                }
                
                stepsExecuted++;
                
                // Send progress update
                this.broadcastToClients({
                    type: 'automation_progress',
                    message: `Step ${stepsExecuted}/${steps.length} completed`,
                    progress: (stepsExecuted / steps.length) * 100
                });
                
                // Small delay between steps
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (stepError) {
                console.error(`❌ Step ${stepsExecuted + 1} failed:`, stepError.message);
                throw new Error(`Step ${stepsExecuted + 1} failed: ${stepError.message}`);
            }
        }
        
        return {
            success: true,
            stepsExecuted,
            totalSteps: steps.length
        };
    }

    replaceVariablesInAction(action, variables) {
        const processed = { ...action };
        
        // Replace variables in all string properties
        for (const key in processed) {
            if (typeof processed[key] === 'string') {
                processed[key] = this.replaceVariables(processed[key], variables);
            }
        }
        
        return processed;
    }

    replaceVariables(text, variables) {
        let result = text;
        
        // Replace {{VAR}}, ${VAR}, {VAR} patterns
        for (const [varName, varValue] of Object.entries(variables)) {
            const patterns = [
                new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
                new RegExp(`\\$\\{${varName}\\}`, 'g'),
                new RegExp(`\\{${varName}\\}`, 'g')
            ];
            
            patterns.forEach(pattern => {
                result = result.replace(pattern, varValue);
            });
        }
        
        return result;
    }

    async handleEditAutomation(ws, message) {
        try {
            const { automationId } = message;
            console.log(`✏️ Editing automation: ${automationId}`);
            
            const automation = this.savedAutomations.get(automationId);
            if (!automation) {
                throw new Error(`Automation with ID ${automationId} not found.`);
            }

            // Send automation details for editing
            this.sendToClient(ws, {
                type: 'automation_edit_started',
                message: `✏️ Opening automation editor for: ${automation.name}`,
                automationId,
                automation: {
                    id: automation.id,
                    name: automation.name,
                    description: automation.description,
                    steps: automation.steps || [],
                    variables: automation.variables || [],
                    stepCount: automation.stepCount,
                    variableCount: automation.variableCount
                }
            });
        } catch (error) {
            this.sendToClient(ws, {
                type: 'error',
                message: `❌ Failed to edit automation: ${error.message}`
            });
        }
    }

    async handleSaveAutomationEdits(ws, message) {
        try {
            const { automationId, updates } = message;
            console.log(`💾 Saving automation edits: ${automationId}`);
            
            const automation = this.savedAutomations.get(automationId);
            if (!automation) {
                throw new Error(`Automation with ID ${automationId} not found.`);
            }

            // Update automation with edits
            const updatedAutomation = {
                ...automation,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            await this.saveAutomation(updatedAutomation);

            this.sendToClient(ws, {
                type: 'automation_edit_saved',
                message: `✅ Automation "${updatedAutomation.name}" updated successfully`,
                automationId,
                automation: updatedAutomation
            });
        } catch (error) {
            this.sendToClient(ws, {
                type: 'error',
                message: `Error editing automation: ${error.message}`
            });
        }
    }

    start() {
        const PORT = process.env.PORT || 7079;
        
        this.server.listen(PORT, () => {
            console.log(`🚀 Stagehand Browser Automation Server running on port ${PORT}`);
            console.log(`📱 Web interface: http://localhost:${PORT}`);
            console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
        });
    }
}

// Start the server
const server = new StagehandBrowserAutomationServer();
server.start();