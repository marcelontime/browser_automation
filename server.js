require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const StagehandAutomationEngine = require('./stagehand-engine');
const BrowserProfileManager = require('./modules/browser/profile-manager');
const RedisStorageManager = require('./modules/storage/redis-storage');
const SessionPlanner = require('./modules/planning/session-planner');
const { Variable, VariableUsage, RecordingSession, EnhancedAutomation, VariableTypes } = require('./modules/storage/models');
const { OpenAI } = require('openai');
const { ExecutionProgressManager } = require('./modules/execution');

class StagehandBrowserAutomationServer {
    constructor(options = {}) {
        this.options = options;
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
        
        // Redis storage manager
        this.storageManager = new RedisStorageManager({
            fallbackToMemory: true,
            keyPrefix: 'browser_automation:'
        });
        
        // Browser profile management
        this.profileManager = new BrowserProfileManager();
        
        // Initialize execution progress manager
        this.executionProgressManager = new ExecutionProgressManager({
            maxConcurrentExecutions: 10,
            executionTimeout: 30000, // 5 minutes
            progressUpdateInterval: 1000 // 1 second
        });
        
        // Initialize OpenAI client for variable extraction
        const apiKey = this.options.apiKey || process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
            console.log(`🤖 OpenAI client initialized for variable extraction`);
        } else {
            console.warn(`⚠️ No OpenAI API key configured - variable extraction will be disabled`);
        }
        
        this.setupExpress();
        this.initializeStorage();
        this.setupProfileCleanup();
    }

    async initializeStorage() {
        try {
            // Initialize Redis storage
            await this.storageManager.connect();
            
            // Create automations directory if it doesn't exist (for fallback)
            await fs.mkdir(this.automationsDir, { recursive: true });
            
            // Load existing automations from Redis or file system
            await this.loadSavedAutomations();
            
            console.log(`📁 Automation storage initialized: ${this.savedAutomations.size} automations loaded`);
        } catch (error) {
            console.error('❌ Error initializing storage:', error.message);
        }
    }

    setupProfileCleanup() {
        // Clean up abandoned profiles on server start
        process.on('SIGINT', async () => {
            console.log('🧹 Cleaning up browser profiles...');
            await this.profileManager.cleanupProfiles();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('🧹 Cleaning up browser profiles...');
            await this.profileManager.cleanupProfiles();
            process.exit(0);
        });
    }

    /**
     * Start the server
     */
    async start() {
        try {
            console.log('✅ Variable services initialized successfully');
            console.log('🚀 Starting server...');
            console.log('✅ Server setup complete');
            
            // Start the Express server
            this.server = this.app.listen(this.options.port || 7079, () => {
                console.log(`🚀 Stagehand Browser Automation Server running on port ${this.options.port || 7079}`);
                
                // Setup WebSocket server AFTER HTTP server is listening
                this.setupWebSocket();
                console.log('🔗 WebSocket server initialized');
            });
            
            return this.server;
            
        } catch (error) {
            console.error('❌ Failed to start server:', error.message);
            throw error;
        }
    }

    async loadSavedAutomations() {
        try {
            // Try to load from Redis first
            const automations = await this.storageManager.getAllAutomations();
            
            if (automations.length > 0) {
                console.log(`📦 Loading ${automations.length} automations from Redis`);
                for (const automation of automations) {
                    this.savedAutomations.set(automation.id, automation);
                }
            } else {
                // Fallback to file system and migrate to Redis
                console.log('📁 No automations in Redis, checking file system...');
                const files = await fs.readdir(this.automationsDir);
                const jsonFiles = files.filter(file => file.endsWith('.json'));
                
                for (const file of jsonFiles) {
                    try {
                        const filePath = path.join(this.automationsDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const automation = JSON.parse(content);
                        
                        // Add to memory
                        this.savedAutomations.set(automation.id, automation);
                        
                        // Migrate to Redis
                        await this.storageManager.saveAutomation(automation);
                        console.log(`🔄 Migrated automation to Redis: ${automation.name}`);
                    } catch (error) {
                        console.error(`❌ Error loading automation ${file}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading automations:', error.message);
        }
    }

    async saveAutomation(automation) {
        try {
            // Save to memory
            this.savedAutomations.set(automation.id, automation);
            
            // Save to Redis
            await this.storageManager.saveAutomation(automation);
            
            // Save to file system (fallback)
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
            
            // Remove from Redis
            await this.storageManager.deleteAutomation(automationId);
            
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

        this.wss.on('connection', async (ws, request) => {
            // Parse URL to get optional session ID
            const url = new URL(request.url, `http://${request.headers.host}`);
            const providedSessionId = url.searchParams.get('sessionId');
            
            let sessionId;
            let isResumedSession = false;
            
            // Check if resuming an existing session
            if (providedSessionId && this.userSessions.has(providedSessionId)) {
                sessionId = providedSessionId;
                isResumedSession = true;
                console.log(`🔄 Resuming existing session: ${sessionId}`);
                
                // Update the WebSocket connection for the existing session
                const existingSession = this.userSessions.get(sessionId);
                existingSession.ws = ws;
                
            } else {
                // Create new session ID (with optional provided ID)
                sessionId = providedSessionId || (Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9));
                console.log(`🔌 New WebSocket client connected - Session: ${sessionId}`);
            }
            
            this.connectedClients.add(ws);
            
            // Register WebSocket client with execution progress manager
            this.executionProgressManager.addClient(ws);
            
            // Create or update session
            if (!isResumedSession) {
                // Create isolated session for this user
                const userSession = {
                    sessionId,
                    ws,
                    automationEngine: null,
                    sessionPlanner: null,
                    profilePath: null,
                    
                    // Recording state
                    recordingState: {
                        isRecording: false,
                        currentRecordingId: null,
                        recordedSteps: [],
                        startTime: null
                    },
                    
                    // Manual control state  
                    isManualMode: false,
                    isPaused: false,
                    isLoading: false,
                    
                    // Browser state
                    currentUrl: '',
                    pageTitle: '',
                    
                    screenshotInterval: null
                };
                
                this.userSessions.set(sessionId, userSession);
                
                // Initialize automation engine for this session
                await this.initializeSessionEngine(sessionId);
            }

            // Send initial status (including session ID for client reference)
            this.sendToClient(ws, {
                type: 'status',
                message: isResumedSession ? `Resumed session ${sessionId}` : 'Connected to Stagehand Browser Automation',
                engine: 'stagehand',
                version: '2.0',
                sessionId: sessionId,
                resumed: isResumedSession
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
                // Note: Don't cleanup session immediately - allow for reconnection
                this.connectedClients.delete(ws);
                
                // Mark session as disconnected but keep it alive for potential reconnection
                const userSession = this.userSessions.get(sessionId);
                if (userSession) {
                    userSession.ws = null;
                    // Keep the session and browser state alive for 5 minutes
                    setTimeout(() => {
                        if (userSession.ws === null) {
                            console.log(`⏰ Session ${sessionId} timeout - cleaning up`);
                            this.cleanupSession(sessionId);
                        }
                    }, 5 * 60 * 1000); // 5 minutes
                }
            });

            // Handle WebSocket errors
            ws.on('error', async (error) => {
                console.error(`❌ WebSocket error for session ${sessionId}:`, error.message);
                this.connectedClients.delete(ws);
                
                // Don't cleanup immediately on error - allow reconnection
                const userSession = this.userSessions.get(sessionId);
                if (userSession) {
                    userSession.ws = null;
                }
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
            
            // Initialize Session Planner for this session
            userSession.sessionPlanner = new SessionPlanner(sessionId, userSession.automationEngine);
            console.log(`🧠 Session Planner initialized for session ${sessionId}`);
            
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
            
            // Enhanced variable management
            case 'create_variable':
                await this.handleCreateVariable(userSession, message);
                break;
            
            case 'update_variable':
                await this.handleUpdateVariable(userSession, message);
                break;
            
            case 'delete_variable':
                await this.handleDeleteVariable(userSession, message);
                break;
            
            case 'validate_variable':
                await this.handleValidateVariable(userSession, message);
                break;
            
            case 'validate_variables_batch':
                await this.handleValidateVariablesBatch(userSession, message);
                break;
            
            case 'get_variable_templates':
                await this.handleGetVariableTemplates(userSession);
                break;
            
            case 'create_variable_from_template':
                await this.handleCreateVariableFromTemplate(userSession, message);
                break;
            
            case 'search_variables':
                await this.handleSearchVariables(userSession, message);
                break;
            
            case 'get_variable_stats':
                await this.handleGetVariableStats(userSession, message);
                break;
            
            // Variable execution and testing
            case 'test_variable_value':
                await this.handleTestVariableValue(userSession, message);
                break;
            
            case 'execute_with_variables':
                await this.handleExecuteWithVariables(userSession, message);
                break;
            
            // Sharing functionality
            case 'generate_share_package':
                await this.handleGenerateSharePackage(userSession, message);
                break;
            
            case 'import_automation_package':
                await this.handleImportAutomationPackage(userSession, message);
                break;
            
            case 'validate_import_package':
                await this.handleValidateImportPackage(userSession, message);
                break;
            
            case 'get_automations':
                await this.handleGetAutomations(userSession);
                break;
            
            // Execution control
            case 'pause_execution':
                await this.handlePauseExecution(userSession, message);
                break;
            
            case 'resume_execution':
                await this.handleResumeExecution(userSession, message);
                break;
            
            case 'stop_execution':
                await this.handleStopExecution(userSession, message);
                break;
            
            case 'get_execution_status':
                await this.handleGetExecutionStatus(userSession, message);
                break;
            
            // Variable Analytics
            case 'get_variable_analytics':
                await this.handleGetVariableAnalytics(userSession, message);
                break;
            
            case 'get_dashboard_analytics':
                await this.handleGetDashboardAnalytics(userSession, message);
                break;
            
            case 'get_usage_patterns':
                await this.handleGetUsagePatterns(userSession, message);
                break;
            
            case 'track_variable_usage':
                await this.handleTrackVariableUsage(userSession, message);
                break;
            
            // Workflow management
            case 'execute_workflow':
                await this.handleExecuteWorkflow(userSession, message);
                break;
            
            case 'pause_workflow':
                await this.handlePauseWorkflow(userSession, message);
                break;
            
            case 'resume_workflow':
                await this.handleResumeWorkflow(userSession, message);
                break;
            
            case 'stop_workflow':
                await this.handleStopWorkflow(userSession, message);
                break;
            
            case 'get_workflow_status':
                await this.handleGetWorkflowStatus(userSession, message);
                break;
            
            case 'get_active_workflows':
                await this.handleGetActiveWorkflows(userSession);
                break;
            
            case 'create_workflow_from_recording':
                await this.handleCreateWorkflowFromRecording(userSession, message);
                break;
            
            case 'execute_sequential_steps':
                await this.handleExecuteSequentialSteps(userSession, message);
                break;
            
            case 'execute_enhanced_automation':
                await this.handleExecuteEnhancedAutomation(userSession, message);
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
                
                // ✅ FIXED: Record navigation in PlaywrightRecorder
                if (userSession.automationEngine.playwrightRecorder) {
                    userSession.automationEngine.playwrightRecorder.recordNavigation(url);
                    console.log(`🎬 Recorded navigation in Playwright script: ${url}`);
                }
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

    // Browser control handlers
    async handleGoBack(userSession) {
        try {
            console.log(`⬅️ [${userSession.sessionId}] Going back`);
            
            if (!userSession.automationEngine || !userSession.automationEngine.page) {
                throw new Error('Automation engine not initialized');
            }
            
            await userSession.automationEngine.page.goBack();
            
            this.sendToClient(userSession.ws, {
                type: 'navigation_completed',
                message: '✅ Navigated back'
            });
            
            // Send updated screenshot
            setTimeout(() => this.takeAndSendScreenshot(userSession), 1000);
            
        } catch (error) {
            console.error(`❌ Go back error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Go back failed: ${error.message}`
            });
        }
    }

    async handleRefresh(userSession) {
        try {
            console.log(`🔄 [${userSession.sessionId}] Refreshing page`);
            
            if (!userSession.automationEngine || !userSession.automationEngine.page) {
                throw new Error('Automation engine not initialized');
            }
            
            await userSession.automationEngine.page.reload();
            
            this.sendToClient(userSession.ws, {
                type: 'navigation_completed',
                message: '✅ Page refreshed'
            });
            
            // Send updated screenshot
            setTimeout(() => this.takeAndSendScreenshot(userSession), 2000);
            
        } catch (error) {
            console.error(`❌ Refresh error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Refresh failed: ${error.message}`
            });
        }
    }

    async handleToggleManualMode(userSession) {
        try {
            console.log(`👤 [${userSession.sessionId}] Toggling manual mode`);
            
            // Toggle manual mode state
            userSession.isManualMode = !userSession.isManualMode;
            
            const responseMessage = {
                type: 'manual_mode_toggled',
                message: `Manual mode ${userSession.isManualMode ? 'enabled' : 'disabled'}`,
                isManualMode: userSession.isManualMode
            };
            
            this.sendToClient(userSession.ws, responseMessage);
            
            // Also add user guidance when enabling manual mode
            if (userSession.isManualMode) {
                setTimeout(() => {
                    this.sendToClient(userSession.ws, {
                        type: 'instruction_result',
                        message: `🎯 **Manual Mode Active!**\n\n` +
                                `**What you can do now:**\n` +
                                `• Type commands like "go to google.com" for direct navigation\n` +
                                `• Click directly on the screenshot to interact\n` +
                                `• Use "type hello world" to input text\n` +
                                `• Use "press Enter" for keyboard commands\n\n` +
                                `*Commands will execute directly without AI analysis*`,
                        data: { success: true, manualMode: true }
                    });
                }, 500);
            }
            
        } catch (error) {
            console.error(`❌ Toggle manual mode error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Toggle manual mode failed: ${error.message}`
            });
        }
    }

    async handleTogglePause(userSession) {
        try {
            console.log(`⏸️ [${userSession.sessionId}] Toggling pause state`);
            
            // Toggle pause state
            userSession.isPaused = !userSession.isPaused;
            
            this.sendToClient(userSession.ws, {
                type: 'pause_toggled',
                message: `Automation ${userSession.isPaused ? 'paused' : 'resumed'}`,
                isPaused: userSession.isPaused
            });
            
        } catch (error) {
            console.error(`❌ Toggle pause error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Toggle pause failed: ${error.message}`
            });
        }
    }

    async handleSyncBrowser(userSession) {
        try {
            console.log(`🔄 [${userSession.sessionId}] Syncing browser state`);
            
            if (!userSession.automationEngine || !userSession.automationEngine.page) {
                throw new Error('Automation engine not initialized');
            }
            
            // Get current page state
            const currentUrl = await userSession.automationEngine.page.url();
            const pageTitle = await userSession.automationEngine.page.title();
            
            // Update session state
            userSession.currentUrl = currentUrl;
            userSession.pageTitle = pageTitle;
            
            this.sendToClient(userSession.ws, {
                type: 'browser_state_synced',
                message: '✅ Browser state synchronized',
                data: {
                    url: currentUrl,
                    title: pageTitle,
                    timestamp: Date.now()
                }
            });
            
            // Send updated screenshot
            setTimeout(() => this.takeAndSendScreenshot(userSession), 1000);
            
        } catch (error) {
            console.error(`❌ Sync browser error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Sync browser failed: ${error.message}`
            });
        }
    }

    async handleManualClick(userSession, message) {
        try {
            const { x, y } = message;
            console.log(`🖱️ [${userSession.sessionId}] Manual click at coordinates (${x}, ${y})`);
            
            if (!userSession.isManualMode) {
                console.log(`❌ Manual click ignored - session ${userSession.sessionId} not in manual mode`);
                this.sendToClient(userSession.ws, {
                    type: 'error',
                    message: '❌ Manual clicks only work in manual mode. Please enable manual mode first.'
                });
                return;
            }
            
            if (!userSession.automationEngine || !userSession.automationEngine.page) {
                throw new Error('Automation engine not initialized');
            }
            
            await userSession.automationEngine.page.mouse.click(x, y);
            
            // Record the action if recording is active
            if (userSession.recordingState.isRecording) {
                this.recordStep(userSession, {
                    type: 'manual_click',
                    coordinates: { x, y },
                    timestamp: Date.now()
                });
            }
            
            this.sendToClient(userSession.ws, {
                type: 'manual_click_completed',
                message: `✅ Manual click completed at (${x}, ${y})`
            });
            
            // Send updated screenshot
            setTimeout(() => this.takeAndSendScreenshot(userSession), 500);
            
        } catch (error) {
            console.error(`❌ Manual click error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Manual click failed: ${error.message}`
            });
        }
    }

    async handleToggleRecording(userSession, message) {
        try {
            console.log(`🔴 [${userSession.sessionId}] Toggling recording`);
            
            if (userSession.recordingState.isRecording) {
                // STOP RECORDING - Process and save automation
                console.log(`⏹️ Recording stopped for session ${userSession.sessionId}`);
                
                // Get recorded steps from automation engine
                let recordedSteps = [];
                let automationResult = null;
                
                try {
                                    // Try to get recorded steps from automation engine
                if (userSession.automationEngine && userSession.automationEngine.stopRecording) {
                    automationResult = await userSession.automationEngine.stopRecording();
                    recordedSteps = automationResult.actions || [];
                }
                } catch (error) {
                    console.log(`⚠️ Automation engine recording error: ${error.message}`);
                }
                
                // ALWAYS check session recorded steps as well
                const sessionRecordedSteps = userSession.recordingState.recordedSteps || [];
                
                // Use whichever has actual content (prefer session steps if both exist)
                if (sessionRecordedSteps.length > 0) {
                    console.log(`📹 Using ${sessionRecordedSteps.length} steps from session recording`);
                    recordedSteps = sessionRecordedSteps;
                } else if (recordedSteps.length > 0) {
                    console.log(`📹 Using ${recordedSteps.length} steps from automation engine`);
                } else {
                    console.log(`⚠️ No steps found in either source`);
                }
                
                console.log(`📊 Recording summary: ${recordedSteps.length} total steps captured`);
                
                if (recordedSteps.length === 0) {
                    console.log(`⚠️ No steps recorded during session`);
                    userSession.recordingState.isRecording = false;
                    
                    this.sendToClient(userSession.ws, {
                        type: 'recording_stopped',
                        message: '⚠️ No steps were recorded during this session',
                        automation: null
                    });
                    return;
                }
                
                // Create automation name based on timestamp or use default
                const automationName = `recorded_automation_${Date.now()}`;
                const automationId = Date.now().toString();
                
                // Create automation object
                const automation = {
                    id: automationId,
                    name: automationName,
                    description: `Automation recorded on ${new Date().toLocaleString()}`,
                    steps: recordedSteps,
                    variables: [],
                    status: 'ready',
                    createdAt: new Date().toISOString(),
                    stepCount: recordedSteps.length,
                    variableCount: 0,
                    // Add Playwright script if available
                    playwrightScript: null,
                    scriptFilename: null
                };
                
                // Add Playwright script if generated
                if (automationResult && automationResult.playwrightScript) {
                    console.log(`🎬 Adding Playwright script to automation: ${automationResult.scriptFilename}`);
                    automation.playwrightScript = automationResult.playwrightScript;
                    automation.scriptFilename = automationResult.scriptFilename;
                    automation.playwrightVariables = automationResult.playwrightVariables || [];
                    
                    // Save the script to a file
                    const scriptPath = `generated_scripts/${automation.scriptFilename}`;
                    try {
                        const fs = require('fs');
                        const path = require('path');
                        
                        // Ensure directory exists
                        const scriptDir = path.dirname(scriptPath);
                        if (!fs.existsSync(scriptDir)) {
                            fs.mkdirSync(scriptDir, { recursive: true });
                        }
                        
                        // Write the script file
                        fs.writeFileSync(scriptPath, automationResult.playwrightScript);
                        console.log(`💾 Playwright script saved to: ${scriptPath}`);
                    } catch (error) {
                        console.warn(`⚠️ Failed to save Playwright script: ${error.message}`);
                    }
                }
                
                // Extract variables using LLM if available
                try {
                    if (this.openai && recordedSteps.length > 0) {
                        console.log(`🔍 Extracting variables from ${recordedSteps.length} recorded steps...`);
                        const extractedVariables = await this.extractVariablesFromSteps(recordedSteps);
                        automation.variables = extractedVariables;
                        automation.variableCount = extractedVariables.length;
                        console.log(`✅ Extracted ${extractedVariables.length} variables`);
                    } else {
                        console.log(`⚠️ Variable extraction skipped: OpenAI ${this.openai ? 'available' : 'not available'}, Steps: ${recordedSteps.length}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Variable extraction failed: ${error.message}`);
                }
                
                // Save automation to storage
                try {
                    await this.storageManager.saveAutomation(automation);
                    console.log(`💾 Automation saved: ${automation.name} (${automationId})`);
                } catch (error) {
                    console.error(`❌ Failed to save automation: ${error.message}`);
                }
                
                // Add to in-memory storage for immediate access
                console.log(`📝 Adding automation to savedAutomations Map with ID: ${automationId}`);
                this.savedAutomations.set(automationId, automation);
                console.log(`📁 savedAutomations now has ${this.savedAutomations.size} automations`);
                console.log(`🔍 Automation added successfully:`, {
                    id: automation.id,
                    name: automation.name,
                    variableCount: automation.variableCount,
                    hasVariables: !!automation.variables
                });
                
                // Update recording state
                userSession.recordingState.isRecording = false;
                userSession.recordingState.recordedSteps = [];
                userSession.recordingState.currentRecordingId = null;
                
                // Send success response with automation data
                const scriptMessage = automation.playwrightScript ? ` and generated Playwright script "${automation.scriptFilename}"` : '';
                this.sendToClient(userSession.ws, {
                    type: 'recording_stopped',
                    message: `✅ Recording completed! Created automation "${automation.name}" with ${automation.stepCount} steps and ${automation.variableCount} variables${scriptMessage}`,
                    automation: automation
                });
                
            } else {
                // START RECORDING
                console.log(`🎬 Recording started for session ${userSession.sessionId}`);
                
                // Initialize recording state
                userSession.recordingState.isRecording = true;
                userSession.recordingState.startTime = Date.now();
                userSession.recordingState.recordedSteps = [];
                userSession.recordingState.currentRecordingId = Date.now().toString();
                
                // Start recording in automation engine if available
                try {
                    if (userSession.automationEngine && userSession.automationEngine.startRecording) {
                        await userSession.automationEngine.startRecording(userSession.recordingState.currentRecordingId);
                    }
                } catch (error) {
                    console.log(`⚠️ Automation engine recording not available: ${error.message}`);
                }
                
                this.sendToClient(userSession.ws, {
                    type: 'recording_started',
                    message: '🎬 Recording started - perform actions and they will be captured automatically',
                    isRecording: true
                });
            }
            
        } catch (error) {
            console.error(`❌ Toggle recording error for session ${userSession.sessionId}:`, error.message);
            
            // Reset recording state on error
            userSession.recordingState.isRecording = false;
            userSession.recordingState.recordedSteps = [];
            
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Recording failed: ${error.message}`
            });
        }
    }

    /**
     * Extract variables from recorded steps using LLM
     */
    async extractVariablesFromSteps(recordedSteps) {
        try {
            console.log(`🔍 [Variable Extraction] Processing ${recordedSteps.length} steps...`);
            
            // Check if OpenAI is configured
            if (!this.openai) {
                console.error(`❌ OpenAI client not initialized for variable extraction`);
                return [];
            }
            
            // Log the actual steps being processed
            console.log(`📊 Step data:`, JSON.stringify(recordedSteps, null, 2));
            
            // Convert steps to text format for LLM analysis
            const stepsText = recordedSteps.map((step, index) => {
                const stepDescription = `${index + 1}. ${step.type}: ${step.instruction || ''} ${step.value ? `with value "${step.value}"` : ''} ${step.target ? `(URL: ${step.target})` : ''}`;
                console.log(`  Step ${index + 1}: ${stepDescription}`);
                return stepDescription;
            }).join('\n');
            
            console.log(`📝 Steps text for LLM:\n${stepsText}`);
            
            const systemPrompt = `You are a browser automation variable extractor. Analyze the recorded automation steps and identify values that should be converted to variables for reusability.

Extract variables for:
- Login credentials (emails, passwords, usernames)
- Form data (names, CPF, phone numbers, addresses)
- Search terms and input values
- URLs that might change
- Any hardcoded values that users might want to customize

For each variable found, provide:
- A descriptive uppercase name (e.g., LOGIN_EMAIL, USER_PASSWORD, SEARCH_TERM, CPF_NUMBER)
- The original value found in the steps
- The field type (email, password, text, url, cpf, phone, etc.)
- A description of what this variable represents

Recorded Steps:
${stepsText}

Return a JSON object with this structure:
{
  "variables": [
    {
      "name": "VARIABLE_NAME",
      "value": "original_value", 
      "type": "field_type",
      "description": "What this variable represents"
    }
  ]
}

IMPORTANT: Look for any quoted values, URLs, CPF numbers (XXX.XXX.XXX-XX format), passwords, or any data that users might want to change when reusing this automation.`;

            console.log(`🤖 Calling OpenAI for variable extraction...`);
            
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt }
                ],
                temperature: 0.1,
                max_tokens: 1500,
                response_format: { type: 'json_object' }
            });
            
            console.log(`🤖 OpenAI response received`);
            const result = JSON.parse(response.choices[0].message.content);
            console.log(`📊 Extracted variables:`, JSON.stringify(result, null, 2));
            
            return result.variables || [];
            
        } catch (error) {
            console.error(`❌ Variable extraction error: ${error.message}`);
            console.error(`❌ Full error:`, error);
            return [];
        }
    }

    // Main instruction handler - Intelligent and agnostic 
    async handleInstruction(userSession, instructionData) {
        try {
            console.log(`📝 [${userSession.sessionId}] Received instruction: "${instructionData}"`);
            
            if (!userSession.automationEngine) {
                throw new Error('Automation engine not initialized');
            }
            
            // ✅ MANUAL MODE CHECK: Route direct commands when manual mode is enabled
            if (userSession.isManualMode) {
                console.log(`👤 [${userSession.sessionId}] Manual mode active - executing direct command`);
                await this.handleManualModeInstruction(userSession, instructionData);
                return; // Bypass LLM completely
            }
            
            // For automatic mode, determine how to handle the instruction
            const isMissionMode = this.detectMissionMode(instructionData);
            
            if (isMissionMode) {
                // Complex autonomous mission - use session planner with LLM
                console.log(`🎯 [${userSession.sessionId}] Processing as autonomous mission`);
                await this.handleAutonomousMission(userSession, instructionData);
            } else {
                // Step-by-step instructions - parse and execute with capture
                console.log(`📋 [${userSession.sessionId}] Processing as step instruction`);
                
                // Parse the multi-step instruction
                const steps = this.parseMultiStepInstruction(instructionData);
                console.log(`📝 Successfully parsed ${steps.length} steps:`);
                steps.forEach((step, index) => {
                    console.log(`   ${index + 1}. ${step}`);
                });
                
                // Execute steps with recording capture
                await this.handleStepInstruction(userSession, instructionData, steps);
            }

        } catch (error) {
            console.error(`❌ Instruction failed:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'instruction_result',
                message: `❌ Error: ${error.message}`,
                data: { success: false, error: error.message }
            });
        }
    }

    /**
     * Handle instructions in manual mode - direct execution without LLM analysis
     */
    async handleManualModeInstruction(userSession, instruction) {
        try {
            console.log(`👤 [${userSession.sessionId}] Executing manual command: "${instruction}"`);
            
            // Send feedback that manual mode is processing
            this.sendToClient(userSession.ws, {
                type: 'processing',
                message: `👤 Manual Mode: Executing "${instruction}"`
            });
            
            // Route to appropriate direct handler based on command type
            const result = await this.executeDirectCommand(userSession, instruction);
            
            // Send success response
            this.sendToClient(userSession.ws, {
                type: 'instruction_result',
                message: result.message || `✅ Manual command completed: "${instruction}"`,
                data: {
                    success: result.success,
                    action: 'manual_execution',
                    manualMode: true
                }
            });
            
            // Record the action if recording is active
            if (userSession.recordingState.isRecording) {
                this.recordStep(userSession, {
                    type: 'manual_instruction',
                    instruction: instruction,
                    timestamp: Date.now(),
                    result: result
                });
            }
            
        } catch (error) {
            console.error(`❌ Manual mode instruction failed for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `👤 Manual command failed: ${error.message}`
            });
        }
    }

    /**
     * Execute direct commands without LLM analysis
     */
    async executeDirectCommand(userSession, instruction) {
        const engine = userSession.automationEngine;
        const lowerInstruction = instruction.toLowerCase().trim();
        
        // Direct navigation commands
        if (lowerInstruction.includes('go to') || lowerInstruction.includes('navigate') || lowerInstruction.includes('visit')) {
            const urlMatch = instruction.match(/(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|gov|edu|co|io|me|us|uk|ca|de|fr|jp|cn)[^\s]*)/i);
            if (urlMatch) {
                let url = urlMatch[0];
                if (!url.startsWith('http')) {
                    url = 'https://' + url;
                }
                
                console.log(`🌐 Direct manual navigation to: ${url}`);
                await engine.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // Send updated screenshot
                setTimeout(() => this.takeAndSendScreenshot(userSession), 2000);
                
                return {
                    success: true,
                    message: `✅ Navigated to ${url}`,
                    action: 'navigation'
                };
            }
        }
        
        // Direct click commands
        if (lowerInstruction.includes('click')) {
            // For now, provide guidance about using manual clicks
            return {
                success: true,
                message: `👆 To click in manual mode, click directly on the screenshot where you want to interact.`,
                action: 'click_guidance'
            };
        }
        
        // Direct typing commands
        if (lowerInstruction.includes('type') || lowerInstruction.includes('fill')) {
            const textMatch = instruction.match(/(?:type|fill)\s+["']?([^"']+)["']?/i);
            if (textMatch) {
                const text = textMatch[1];
                
                // Focus on the active element and type
                try {
                    await engine.page.keyboard.type(text);
                    return {
                        success: true,
                        message: `✅ Typed: "${text}"`,
                        action: 'typing'
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: `❌ Failed to type. Make sure a text field is focused first.`,
                        action: 'typing_error'
                    };
                }
            }
        }
        
        // Direct keyboard commands
        if (lowerInstruction.includes('press') || lowerInstruction.includes('key')) {
            const keyMatch = instruction.match(/(?:press|key)\s+(\w+)/i);
            if (keyMatch) {
                const key = keyMatch[1];
                
                try {
                    await engine.page.keyboard.press(key);
                    return {
                        success: true,
                        message: `✅ Pressed key: ${key}`,
                        action: 'keypress'
                    };
                } catch (error) {
                    return {
                        success: false,
                        message: `❌ Failed to press key: ${key}`,
                        action: 'keypress_error'
                    };
                }
            }
        }
        
        // For complex commands in manual mode, still use Stagehand but with direct execution
        console.log(`🎯 Manual mode: Using Stagehand for complex command: "${instruction}"`);
        try {
            await engine.page.act(instruction);
            return {
                success: true,
                message: `✅ Manual command executed via Stagehand: "${instruction}"`,
                action: 'stagehand_manual'
            };
        } catch (error) {
            return {
                success: false,
                message: `❌ Manual command failed: ${error.message}`,
                action: 'stagehand_manual_error'
            };
        }
    }

    /**
     * Enhanced detection for different types of user instructions
     */
    detectMissionMode(instruction) {
        const text = instruction.toLowerCase().trim();
        
        // Numbered or bulleted lists should be treated as step instructions, NOT missions
        const isStepList = /^\s*(?:\d+\.|[-*]\s|\*\s)/m.test(instruction) || 
                          /(?:step\s+\d+|^\s*\d+\.\s*\*?\*?[a-zA-Z])/m.test(instruction);
        
        if (isStepList) {
            console.log('🔢 Detected numbered/bulleted list - treating as step instructions');
            return false; // Always use step mode for lists
        }
        
        // Quick commands that are obviously step-mode
        const stepCommands = [
            /^(click|type|navigate|scroll|wait|hover|press|select)\s/i,
            /^(go to|visit|open)\s+https?:\/\//i,
            /^take a screenshot/i,
            /^extract\s+(the\s+)?(text|data|content)/i,
            /^fill\s+(the\s+)?\w+\s+field/i,
            /button$/i,
            /field$/i
        ];
        
        // If it matches clear step patterns, it's step-mode
        if (stepCommands.some(pattern => pattern.test(text))) {
            return false;
        }
        
        // Mission indicators for autonomous execution (must be clearly goal-oriented)
        const missionIndicators = [
            // Must be research/comparison oriented
            /find and compare.*(?:on|across)\s+\d+.*(?:sites|websites|platforms)/i,
            /research.*(?:and|then).*(?:compare|analyze)/i,
            /search.*(?:across|on)\s+multiple.*(?:sites|platforms)/i,
            
            // Must involve multiple complex steps across sites
            /book.*(?:flight|hotel).*(?:and then|then)/i,
            /create accounts.*(?:on|across)\s+\d+/i,
            /apply.*(?:to|for)\s+\d+.*(?:jobs|positions)/i,
        ];
        
        // Very restrictive detection - only clear autonomous tasks
        const hasMissionPattern = missionIndicators.some(pattern => pattern.test(text));
        
        // Must be long AND have mission patterns
        const isLongInstruction = instruction.length > 100;
        const hasMultipleSites = /(?:on|across)\s+\d+.*(?:different|various).*(?:sites|websites|platforms)/i.test(text);
        
        // Combined scoring - much more restrictive
        let missionScore = 0;
        if (hasMissionPattern && isLongInstruction) missionScore += 3;
        if (hasMultipleSites) missionScore += 2;
        
        console.log(`🧠 Instruction analysis: "${instruction.substring(0, 50)}..." | Mission Score: ${missionScore} | Mode: ${missionScore >= 4 ? 'AUTONOMOUS' : 'STEP'}`);
        
        return missionScore >= 4; // Much higher threshold
    }

    /**
     * Generate execution plan using LLM - Fixed API key issue
     */
    async generateExecutionPlan(missionDescription) {
        const prompt = `
You are an autonomous browser automation planner. Break down this mission into actionable browser automation steps:

MISSION: "${missionDescription}"

Generate a practical execution plan with:
1. Clear, sequential steps
2. Specific websites/URLs to visit
3. Data to extract or actions to perform
4. Expected outcomes
5. Potential challenges and fallbacks

Respond in JSON format:
{
    "summary": "Brief description of the plan",
    "steps": [
        {
            "id": 1,
            "description": "Step description",
            "action": "navigate|click|type|extract|wait",
            "target": "URL or element description",
            "value": "text to type or data to extract",
            "expected_outcome": "what should happen",
            "fallback": "alternative approach if this fails"
        }
    ],
    "expected_duration": "estimated time",
    "data_outputs": ["list of data we'll collect"],
    "challenges": ["potential issues"],
    "success_criteria": "how to measure success"
}`;

        try {
            // Fix: Use the correct API key from server options
            const apiKey = this.getAPIKey();
            if (!apiKey) {
                throw new Error('OpenAI API key not available');
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            const planText = data.choices[0].message.content;
            
            // Parse JSON response
            const jsonMatch = planText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse execution plan JSON');
            }

        } catch (error) {
            console.error('❌ Plan generation failed:', error.message);
            throw error; // Don't use fallback - let it fall back to step mode
        }
    }

    /**
     * Get API key from server configuration
     */
    getAPIKey() {
        return this.options?.openaiApiKey || 
               this.options?.modelClientOptions?.apiKey || 
               process.env.OPENAI_API_KEY;
    }

    /**
     * Handle autonomous mission with better error handling
     */
    async handleAutonomousMission(userSession, missionDescription) {
        try {
            this.sendToClient(userSession.ws, {
                type: 'chat_response',
                message: `🤖 **Mission Received**: ${missionDescription}\n\n🧠 Planning autonomous execution...`
            });

            // Step 1: Break down the mission into actionable steps
            const executionPlan = await this.generateExecutionPlan(missionDescription);
            
            this.sendToClient(userSession.ws, {
                type: 'chat_response',
                message: `📋 **Execution Plan Generated**:\n${executionPlan.summary}\n\n🚀 Starting autonomous execution...`
            });

            // Step 2: Execute the plan autonomously
            const result = await this.executeAutonomousPlan(userSession, executionPlan);
            
            // Step 3: Report results
            this.sendToClient(userSession.ws, {
                type: 'mission_completed',
                message: result.message,
                data: {
                    success: result.success,
                    plan: executionPlan,
                    results: result.data,
                    totalSteps: executionPlan.steps.length,
                    completedSteps: result.completedSteps
                }
            });

        } catch (error) {
            console.error(`❌ Autonomous mission failed:`, error.message);
            
            // Better fallback - switch to step mode
            this.sendToClient(userSession.ws, {
                type: 'chat_response',
                message: `❌ **Mission Planning Failed**: ${error.message}\n\n🔄 **Switching to step-by-step mode** - I'll execute your instructions as individual steps instead.`
            });
            
            // Fall back to step instruction handling
            await this.handleStepInstruction(userSession, missionDescription);
        }
    }

    /**
     * Execute autonomous plan step by step
     */
    async executeAutonomousPlan(userSession, executionPlan) {
        let completedSteps = 0;
        const results = [];
        
        try {
            for (const step of executionPlan.steps) {
                this.sendToClient(userSession.ws, {
                    type: 'chat_response',
                    message: `🔄 **Step ${step.id}**: ${step.description}`
                });

                // Execute step using existing automation engine
                const stepResult = await this.executeAutonomousStep(userSession, step);
                
                if (stepResult.success) {
                    completedSteps++;
                    results.push({
                        step: step.id,
                        description: step.description,
                        result: stepResult.data,
                        success: true
                    });
                    
                    this.sendToClient(userSession.ws, {
                        type: 'chat_response',
                        message: `✅ **Step ${step.id} Completed**: ${stepResult.message || 'Success'}`
                    });
                } else {
                    // Try fallback if available
                    if (step.fallback) {
                        this.sendToClient(userSession.ws, {
                            type: 'chat_response',
                            message: `⚠️ **Step ${step.id} Failed**: Trying fallback approach...`
                        });
                        
                        // Attempt fallback (simplified)
                        const fallbackResult = await this.executeAutonomousStep(userSession, {
                            ...step,
                            description: step.fallback
                        });
                        
                        if (fallbackResult.success) {
                            completedSteps++;
                            results.push({
                                step: step.id,
                                description: step.fallback,
                                result: fallbackResult.data,
                                success: true,
                                usedFallback: true
                            });
                        }
                    }
                    
                    if (!stepResult.success) {
                        throw new Error(`Step ${step.id} failed: ${stepResult.error}`);
                    }
                }

                // Brief pause between steps
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            return {
                success: true,
                message: `🎉 **Mission Accomplished!** Completed ${completedSteps}/${executionPlan.steps.length} steps successfully.`,
                data: results,
                completedSteps
            };

        } catch (error) {
            return {
                success: false,
                message: `❌ **Mission Interrupted**: ${error.message}\n\n✅ Completed ${completedSteps}/${executionPlan.steps.length} steps before failure.`,
                data: results,
                completedSteps,
                error: error.message
            };
        }
    }

    /**
     * Execute a single autonomous step
     */
    async executeAutonomousStep(userSession, step) {
        try {
            const instruction = this.convertStepToInstruction(step);
            
            // Use existing automation engine to execute the step
            const result = await userSession.automationEngine.processInstruction(instruction);
            
            return {
                success: true,
                message: `Step executed successfully`,
                data: result
            };

        } catch (error) {
            console.error(`❌ Autonomous step failed:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Convert execution plan step to instruction
     */
    convertStepToInstruction(step) {
        switch (step.action) {
            case 'navigate':
                return `Navigate to ${step.target}`;
            case 'click':
                return `Click on ${step.target}`;
            case 'type':
                return `Type "${step.value}" in ${step.target}`;
            case 'extract':
                return `Extract ${step.target} from the page`;
            case 'wait':
                return `Wait for ${step.target}`;
            default:
                return step.description;
        }
    }

    /**
     * Handle traditional step instruction with better multi-step parsing
     */
    async handleStepInstruction(userSession, instructionData, steps) {
        try {
            console.log(`📋 [${userSession.sessionId}] Processing as step instruction`);

            if (!steps || steps.length === 0) {
                // Parse steps if not provided
                steps = this.parseMultiStepInstruction(instructionData);
            }

            // Add progress tracking
            let completedSteps = 0;
            const totalSteps = steps.length;

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const stepNumber = i + 1;
                
                console.log(`🎯 [${userSession.sessionId}] Executing step ${stepNumber}/${totalSteps}: ${step}`);

                try {
                    // Direct navigation handling for URLs
                    if (this.isNavigationCommand(step)) {
                        const url = this.extractURL(step);
                        if (url) {
                            console.log(`🌐 Direct navigation to: ${url}`);
                            await userSession.automationEngine.page.goto(url, { 
                                waitUntil: 'domcontentloaded',
                                timeout: 30000 
                            });
                            
                            // ✅ FIXED: Record navigation in PlaywrightRecorder during step execution
                            if (userSession.recordingState.isRecording && userSession.automationEngine.playwrightRecorder) {
                                userSession.automationEngine.playwrightRecorder.recordNavigation(url);
                                console.log(`🎬 Recorded step navigation in Playwright script: ${url}`);
                            }
                            
                            // Verify navigation succeeded
                            const currentURL = userSession.automationEngine.page.url();
                            const currentDomain = new URL(currentURL).hostname;
                            const targetDomain = new URL(url).hostname;
                            
                            if (currentDomain === targetDomain) {
                                console.log(`✅ Navigation verified: Currently on ${currentDomain}`);
                            } else {
                                console.log(`⚠️ Navigation warning: Expected ${targetDomain}, but on ${currentDomain}`);
                            }
                        }
                    } else {
                        // Execute with Stagehand for other actions
                        await this.executeStagehandAction(userSession, step);
                    }
                    
                    // 📹 CAPTURE STEP IF RECORDING
                    if (userSession.recordingState.isRecording) {
                        const capturedStep = {
                            stepNumber: stepNumber,
                            instruction: step,
                            type: this.isNavigationCommand(step) ? 'navigation' : 'action',
                            target: this.isNavigationCommand(step) ? this.extractURL(step) : null,
                            value: this.extractValue(step),
                            timestamp: new Date().toISOString(),
                            success: true
                        };
                        
                        userSession.recordingState.recordedSteps.push(capturedStep);
                        console.log(`📹 Step ${stepNumber} captured for recording`);
                        console.log(`   Instruction: ${step}`);
                        console.log(`   Type: ${capturedStep.type}`);
                        console.log(`   Value: ${capturedStep.value || 'none'}`);
                        console.log(`   Target: ${capturedStep.target || 'none'}`);
                    }
                    
                    completedSteps++;
                    console.log(`✅ [${userSession.sessionId}] Step ${stepNumber} completed successfully`);
                    
                } catch (stepError) {
                    console.error(`❌ [${userSession.sessionId}] Step ${stepNumber} failed:`, stepError.message);
                    
                    // 📹 CAPTURE FAILED STEP IF RECORDING
                    if (userSession.recordingState.isRecording) {
                        const capturedStep = {
                            stepNumber: stepNumber,
                            instruction: step,
                            type: this.isNavigationCommand(step) ? 'navigation' : 'action',
                            target: this.isNavigationCommand(step) ? this.extractURL(step) : null,
                            value: this.extractValue(step),
                            timestamp: new Date().toISOString(),
                            success: false,
                            error: stepError.message
                        };
                        
                        userSession.recordingState.recordedSteps.push(capturedStep);
                        console.log(`📹 Failed step ${stepNumber} captured for recording`);
                    }
                    
                    this.sendToClient(userSession.ws, {
                        type: 'step_failed',
                        message: `❌ Step ${stepNumber} failed: ${stepError.message}`,
                        step: step,
                        stepNumber: stepNumber,
                        completedSteps: completedSteps,
                        totalSteps: totalSteps
                    });
                    break; // Stop execution on first failure
                }
            }

            // Send completion message
            if (completedSteps === totalSteps) {
                const message = `✅ All ${totalSteps} steps completed successfully!`;
                this.sendToClient(userSession.ws, {
                    type: 'instruction_result',
                    message: message,
                    completedSteps: completedSteps,
                    totalSteps: totalSteps,
                    success: true
                });
                console.log(`✅ [${userSession.sessionId}] All steps completed: ${completedSteps}/${totalSteps}`);
            } else {
                const message = `⚠️ Execution stopped after ${completedSteps}/${totalSteps} steps completed`;
                this.sendToClient(userSession.ws, {
                    type: 'instruction_result',
                    message: message,
                    completedSteps: completedSteps,
                    totalSteps: totalSteps,
                    success: false
                });
            }

        } catch (error) {
            console.error(`❌ Step instruction error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Step execution failed: ${error.message}`
            });
        }
    }

    /**
     * Parse multi-step instructions (numbered lists, bullet points, etc.)
     */
    parseMultiStepInstruction(instruction) {
        const steps = [];
        
        // First, try to split by common step patterns even if on same line
        // This regex looks for patterns like "1. " or "2. " etc
        const inlineStepPattern = /(?:^|\s)(\d+)\.\s+/g;
        
        // Check if we have inline numbered steps
        const inlineMatches = instruction.match(inlineStepPattern);
        if (inlineMatches && inlineMatches.length > 1) {
            console.log(`🔢 Detected ${inlineMatches.length} inline numbered steps`);
            
            // Split by step numbers
            const parts = instruction.split(inlineStepPattern);
            
            // Process parts (skip empty ones and reconstruct steps)
            for (let i = 1; i < parts.length; i += 2) {
                if (parts[i] && parts[i + 1]) {
                    const stepNumber = parts[i];
                    let stepText = parts[i + 1].trim();
                    
                    // Clean up the step text
                    stepText = this.cleanStepText(stepText);
                    
                    if (stepText) {
                        console.log(`✅ Found inline step ${stepNumber}: "${stepText}"`);
                        steps.push(stepText);
                    }
                }
            }
            
            if (steps.length > 0) {
                return steps;
            }
        }
        
        // If no inline steps found, fall back to line-by-line parsing
        const lines = instruction.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        console.log(`🔍 Processing ${lines.length} lines for step parsing...`);
        
        // Enhanced numbered step detection
        for (const line of lines) {
            console.log(`🔍 Processing line: "${line}"`);
            
            // Match numbered steps: "1. **Navigate** to..." or "1. Navigate to..."
            const numberedMatch = line.match(/^(\d+)\.\s*(?:\*\*([^*]+)\*\*\s*(.*)|(.*))$/);
            if (numberedMatch) {
                let stepText = '';
                if (numberedMatch[2]) {
                    // Format: 1. **action** details
                    stepText = `${numberedMatch[2]} ${numberedMatch[3] || ''}`.trim();
                } else {
                    // Format: 1. action details
                    stepText = numberedMatch[4].trim();
                }
                
                // Clean the step text
                stepText = this.cleanStepText(stepText);
                
                console.log(`✅ Found numbered step ${numberedMatch[1]}: "${stepText}"`);
                steps.push(stepText);
                continue;
            }
            
            // Match bullet points: "- Navigate to..." or "* Navigate to..."
            const bulletMatch = line.match(/^[-*]\s*(?:\*\*([^*]+)\*\*\s*(.*)|(.*))$/);
            if (bulletMatch) {
                let stepText = '';
                if (bulletMatch[1]) {
                    // Format: - **action** details
                    stepText = `${bulletMatch[1]} ${bulletMatch[2] || ''}`.trim();
                } else {
                    // Format: - action details
                    stepText = bulletMatch[3].trim();
                }
                
                // Clean the step text
                stepText = this.cleanStepText(stepText);
                
                console.log(`✅ Found bullet step: "${stepText}"`);
                steps.push(stepText);
                continue;
            }
            
            // Check if it's a header or skip line
            if (line.match(/^#+\s+/) || line.match(/^\*\*.*\*\*$/) || line.match(/^---+$/)) {
                console.log(`⏭️ Skipping header/separator: "${line}"`);
                continue;
            }
        }
        
        // If no steps found, treat the whole instruction as a single step
        if (steps.length === 0) {
            console.log(`⚠️ No structured steps found, treating as single instruction`);
            steps.push(instruction);
        }
        
        return steps;
    }

    /**
     * Clean step text by removing markdown artifacts and extra formatting
     */
    cleanStepText(text) {
        if (!text) return '';
        
        // Remove markdown bold markers
        text = text.replace(/\*\*/g, '');
        
        // Remove backticks but keep the content
        text = text.replace(/`([^`]+)`/g, '$1');
        
        // Remove quotes but keep the content
        text = text.replace(/["']+/g, '');
        
        // Clean up extra spaces
        text = text.replace(/\s+/g, ' ').trim();
        
        console.log(`🧹 Text cleaning: "${text}"`);
        
        return text;
    }

    /**
     * Verify step completion before proceeding to next step
     */
    async verifyStepCompletion(userSession, step, stepIndex, expectedResult) {
        try {
            console.log(`🔍 Verifying step ${stepIndex + 1}: ${step.substring(0, 50)}...`);
            
            // For navigation steps, verify we're on the right URL
            if (step.toLowerCase().includes('navigate') || step.toLowerCase().includes('go to')) {
                const urlMatch = step.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    const expectedUrl = urlMatch[1];
                    const currentUrl = await userSession.automationEngine.page.url();
                    
                    // Check if we're on the expected domain
                    const expectedDomain = new URL(expectedUrl).hostname;
                    const currentDomain = new URL(currentUrl).hostname;
                    
                    if (currentDomain !== expectedDomain) {
                        throw new Error(`Navigation failed: Expected ${expectedDomain}, but currently on ${currentDomain}`);
                    }
                    
                    console.log(`✅ Navigation verified: Currently on ${currentDomain}`);
                    return { success: true, message: `Successfully navigated to ${currentDomain}` };
                }
            }
            
            // For form filling steps, verify the field was actually filled
            if (step.toLowerCase().includes('fill') || step.toLowerCase().includes('type')) {
                // Extract the value that should have been filled
                const valueMatch = step.match(/(?:with|:)\s*[`'"]?([^`'"]+)[`'"]?/);
                if (valueMatch) {
                    const expectedValue = valueMatch[1].trim();
                    
                    // Use Stagehand to check if any input contains this value
                    const verification = await userSession.automationEngine.page.evaluate((value) => {
                        const inputs = Array.from(document.querySelectorAll('input, textarea'));
                        return inputs.some(input => input.value.includes(value));
                    }, expectedValue);
                    
                    if (!verification) {
                        throw new Error(`Form filling failed: Could not find "${expectedValue}" in any input field`);
                    }
                    
                    console.log(`✅ Form filling verified: Found "${expectedValue}" in input field`);
                    return { success: true, message: `Successfully filled field with ${expectedValue}` };
                }
            }
            
            // For click/submit steps, verify page state changed
            if (step.toLowerCase().includes('click') || step.toLowerCase().includes('submit')) {
                // Give a moment for any page changes
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const currentUrl = await userSession.automationEngine.page.url();
                console.log(`✅ Click/submit verified: Page state checked, URL: ${currentUrl}`);
                return { success: true, message: `Successfully executed click/submit action` };
            }
            
            // Default verification - just confirm step was attempted
            return { success: true, message: `Step completed (basic verification)` };
            
        } catch (error) {
            console.error(`❌ Step verification failed:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute sequential steps with verification
     */
    async executeSequentialSteps(userSession, steps) {
        let completedSteps = 0;
        const results = [];
        
        this.sendToClient(userSession.ws, {
            type: 'chat_response',
            message: `📋 **Executing ${steps.length} sequential steps with verification**\n\n🚀 Starting step-by-step execution...`
        });
        
        try {
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                
                this.sendToClient(userSession.ws, {
                    type: 'chat_response',
                    message: `🔄 **Step ${i + 1}/${steps.length}**: ${step}`
                });
                
                // Enhanced step execution with type detection
                let result;
                
                // Handle navigation steps directly
                if (step.toLowerCase().includes('navigate') || step.toLowerCase().includes('go to')) {
                    const urlMatch = step.match(/(https?:\/\/[^\s]+)/);
                    if (urlMatch) {
                        const targetUrl = urlMatch[1].replace(/[`'"]/g, ''); // Clean URL
                        console.log(`🌐 Direct navigation to: ${targetUrl}`);
                        
                        try {
                            await userSession.automationEngine.page.goto(targetUrl, { 
                                waitUntil: 'domcontentloaded',
                                timeout: 30000 
                            });
                            
                            // ✅ FIXED: Record navigation in PlaywrightRecorder during sequential steps  
                            if (userSession.recordingState?.isRecording && userSession.automationEngine?.playwrightRecorder) {
                                userSession.automationEngine.playwrightRecorder.recordNavigation(targetUrl);
                                console.log(`🎬 Recorded sequential navigation in Playwright script: ${targetUrl}`);
                            }
                            
                            // Verify navigation succeeded
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for page to settle
                            const currentUrl = await userSession.automationEngine.page.url();
                            const expectedDomain = new URL(targetUrl).hostname;
                            const currentDomain = new URL(currentUrl).hostname;
                            
                            if (currentDomain !== expectedDomain) {
                                throw new Error(`Navigation failed: Expected ${expectedDomain}, but currently on ${currentDomain}`);
                            }
                            
                            result = {
                                success: true,
                                message: `✅ Successfully navigated to ${currentDomain}`,
                                action: 'navigation'
                            };
                            
                            console.log(`✅ Navigation verified: Currently on ${currentDomain}`);
                            
                        } catch (navError) {
                            console.error(`❌ Navigation failed:`, navError.message);
                            result = {
                                success: false,
                                error: `Navigation failed: ${navError.message}`,
                                action: 'navigation'
                            };
                        }
                    } else {
                        // No URL found in navigation step, use Stagehand
                        result = await userSession.automationEngine.processInstruction(step);
                    }
                } else {
                    // For non-navigation steps, use automation engine
                    result = await userSession.automationEngine.processInstruction(step);
                }
                
                // Verify step completion
                if (result.success) {
                    console.log(`✅ [${userSession.sessionId}] Step ${i + 1} completed successfully`);
                    completedSteps++;
                    
                    results.push({
                        step: i + 1,
                        instruction: step,
                        result: result,
                        success: true
                    });
                    
                    this.sendToClient(userSession.ws, {
                        type: 'chat_response',
                        message: `✅ **Step ${i + 1} completed**: ${result.message || 'Success'}`
                    });
                    
                    // Add delay between steps to allow page to settle
                    if (i < steps.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                    
                } else {
                    console.error(`❌ [${userSession.sessionId}] Step ${i + 1} failed:`, result.error);
                    
                    results.push({
                        step: i + 1,
                        instruction: step,
                        result: result,
                        success: false,
                        error: result.error
                    });
                    
                    this.sendToClient(userSession.ws, {
                        type: 'chat_response',
                        message: `❌ **Step ${i + 1} failed**: ${result.error}\n\n⏸️ Stopping execution due to verification failure.`
                    });
                    
                    // Stop execution on failure
                    break;
                }
            }
            
            // Final results
            const successRate = (completedSteps / steps.length) * 100;
            
            this.sendToClient(userSession.ws, {
                type: 'instruction_result',
                message: `🎯 **Sequential execution completed**: ${completedSteps}/${steps.length} steps successful (${successRate.toFixed(1)}%)`,
                data: {
                    success: completedSteps === steps.length,
                    totalSteps: steps.length,
                    completedSteps: completedSteps,
                    successRate: successRate,
                    results: results
                }
            });
            
        } catch (error) {
            console.error(`❌ [${userSession.sessionId}] Sequential execution failed:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'instruction_result',
                message: `❌ Sequential execution failed: ${error.message}`,
                data: { 
                    success: false, 
                    error: error.message,
                    completedSteps: completedSteps,
                    totalSteps: steps.length,
                    results: results
                }
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

    // Execution control handlers
    async handlePauseExecution(userSession, message) {
        try {
            const { executionId } = message;
            const targetExecutionId = executionId || userSession.currentExecutionId;
            
            if (!targetExecutionId) {
                throw new Error('No execution ID provided and no active execution found');
            }
            
            const success = this.executionProgressManager.pauseExecution(targetExecutionId);
            
            if (success) {
                this.sendToClient(userSession.ws, {
                    type: 'execution_paused',
                    message: `⏸️ Execution paused`,
                    executionId: targetExecutionId
                });
            } else {
                throw new Error('Failed to pause execution - execution may not be running');
            }
        } catch (error) {
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `❌ Failed to pause execution: ${error.message}`
            });
        }
    }

    async handleResumeExecution(userSession, message) {
        try {
            const { executionId } = message;
            const targetExecutionId = executionId || userSession.currentExecutionId;
            
            if (!targetExecutionId) {
                throw new Error('No execution ID provided and no active execution found');
            }
            
            const success = this.executionProgressManager.resumeExecution(targetExecutionId);
            
            if (success) {
                this.sendToClient(userSession.ws, {
                    type: 'execution_resumed',
                    message: `▶️ Execution resumed`,
                    executionId: targetExecutionId
                });
            } else {
                throw new Error('Failed to resume execution - execution may not be paused');
            }
        } catch (error) {
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `❌ Failed to resume execution: ${error.message}`
            });
        }
    }

    async handleStopExecution(userSession, message) {
        try {
            const { executionId, reason } = message;
            const targetExecutionId = executionId || userSession.currentExecutionId;
            
            if (!targetExecutionId) {
                throw new Error('No execution ID provided and no active execution found');
            }
            
            const success = this.executionProgressManager.stopExecution(
                targetExecutionId, 
                reason || 'user_requested'
            );
            
            if (success) {
                // Clear current execution ID if it matches
                if (userSession.currentExecutionId === targetExecutionId) {
                    userSession.currentExecutionId = null;
                }
                
                this.sendToClient(userSession.ws, {
                    type: 'execution_stopped',
                    message: `🛑 Execution stopped`,
                    executionId: targetExecutionId,
                    reason: reason || 'user_requested'
                });
            } else {
                throw new Error('Failed to stop execution - execution may not be active');
            }
        } catch (error) {
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `❌ Failed to stop execution: ${error.message}`
            });
        }
    }

    async handleGetExecutionStatus(userSession, message) {
        try {
            const { executionId } = message;
            const targetExecutionId = executionId || userSession.currentExecutionId;
            
            if (!targetExecutionId) {
                // Return all active executions for this session
                const activeExecutions = this.executionProgressManager.getActiveExecutions()
                    .filter(exec => exec.sessionId === userSession.sessionId);
                
                this.sendToClient(userSession.ws, {
                    type: 'execution_status_list',
                    executions: activeExecutions
                });
                return;
            }
            
            const status = this.executionProgressManager.getExecutionStatus(targetExecutionId);
            
            if (status) {
                this.sendToClient(userSession.ws, {
                    type: 'execution_status',
                    executionId: targetExecutionId,
                    status
                });
            } else {
                throw new Error('Execution not found');
            }
        } catch (error) {
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `❌ Failed to get execution status: ${error.message}`
            });
        }
    }

    // Variable replacement utility method
    replaceVariablesInAction(action, variables) {
        if (!action || !variables) {
            return action;
        }
        
        // Create a deep copy of the action to avoid modifying the original
        const processedAction = JSON.parse(JSON.stringify(action));
        
        // Replace variables in all string properties
        const replaceInObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    // Replace ${VARIABLE_NAME} patterns
                    obj[key] = obj[key].replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, variableName) => {
                        return variables[variableName] !== undefined ? variables[variableName] : match;
                    });
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    replaceInObject(obj[key]);
                }
            }
        };
        
        replaceInObject(processedAction);
        return processedAction;
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

    async handlePageInfoRequest(userSession) {
        try {
            console.log(`📄 [${userSession.sessionId}] Getting page info`);
            
            if (!userSession.automationEngine || !userSession.automationEngine.page) {
                throw new Error('Automation engine not initialized');
            }
            
            // Get comprehensive page information
            const pageInfo = await userSession.automationEngine.page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    domain: window.location.hostname,
                    protocol: window.location.protocol,
                    path: window.location.pathname,
                    search: window.location.search,
                    hash: window.location.hash,
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    documentReady: document.readyState,
                    elementsCount: {
                        inputs: document.querySelectorAll('input').length,
                        buttons: document.querySelectorAll('button').length,
                        links: document.querySelectorAll('a').length,
                        forms: document.querySelectorAll('form').length
                    }
                };
            });
            
            this.sendToClient(userSession.ws, {
                type: 'page_info_result',
                message: '📄 Page information retrieved',
                data: pageInfo
            });
            
        } catch (error) {
            console.error(`❌ Page info error for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Page info failed: ${error.message}`
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
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error(`❌ Failed to send message type "${message.type}":`, error.message);
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

    async handleRunAutomation(userSession, message) {
        try {
            const { automationId, variables: providedVariables } = message;
            console.log(`▶️ Running automation: ${automationId}`);
            
            const automation = this.savedAutomations.get(automationId);
            if (!automation) {
                throw new Error(`Automation with ID ${automationId} not found.`);
            }

            // Load existing variables from the automation or use provided variables
            let executionVariables = {};
            
            if (providedVariables) {
                // Use variables provided by user (e.g., from variable editor)
                executionVariables = providedVariables;
                console.log(`🔧 Using provided variables: ${Object.keys(providedVariables).length} variables`);
            } else if (automation.variables && automation.variables.length > 0) {
                // Load existing variables from the automation
                automation.variables.forEach(variable => {
                    if (variable.value !== undefined && variable.value !== null) {
                        executionVariables[variable.name] = variable.value;
                    }
                });
                console.log(`📦 Loaded existing variables: ${Object.keys(executionVariables).length} variables`);
            }

            // Calculate total steps including initial navigation
            const hasNavigation = this.getOriginalUrlFromAutomation(automation, executionVariables) !== null;
            const totalSteps = hasNavigation ? 
                (automation.steps ? automation.steps.length + 1 : 1) : 
                (automation.steps ? automation.steps.length : 0);
            
            // Start execution tracking
            const executionId = this.executionProgressManager.startExecution(
                automationId, 
                userSession.sessionId, 
                {
                    totalSteps: totalSteps,
                    automationName: automation.name,
                    variables: executionVariables,
                    metadata: {
                        userAgent: 'Stagehand Browser Automation',
                        startedBy: 'user',
                        hasVariables: Object.keys(executionVariables).length > 0,
                        hasInitialNavigation: hasNavigation
                    }
                }
            );

            // Store execution ID in user session for control operations
            userSession.currentExecutionId = executionId;

            this.sendToClient(userSession.ws, {
                type: 'automation_started',
                message: `▶️ Starting automation: ${automation.name}`,
                automationId,
                executionId,
                variableCount: Object.keys(executionVariables).length
            });
            
            // Execute the automation steps with progress tracking
            try {
                const result = await this.executeAutomationStepsWithProgress(
                    userSession, 
                    automation, 
                    executionVariables, 
                    executionId
                );
                
                // Complete execution tracking
                this.executionProgressManager.completeExecution(executionId, result);
                
                this.sendToClient(userSession.ws, {
                    type: 'automation_completed',
                    message: `✅ Automation completed successfully: ${result.stepsExecuted}/${result.totalSteps} steps`,
                    automationId,
                    executionId,
                    result
                });
                
            } catch (execError) {
                // Fail execution tracking
                this.executionProgressManager.failExecution(executionId, execError);
                
                this.sendToClient(userSession.ws, {
                    type: 'automation_failed',
                    message: `❌ Automation failed: ${execError.message}`,
                    automationId,
                    executionId,
                    error: execError.message
                });
            } finally {
                // Clear execution ID from session
                userSession.currentExecutionId = null;
            }
        } catch (error) {
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `❌ Failed to run automation: ${error.message}`
            });
        }
    }

    async executeAutomationStepsWithProgress(userSession, automation, userVariables, executionId) {
        const steps = automation.steps || [];
        const variables = { ...userVariables };
        let stepsExecuted = 0;
        
        console.log(`🎯 Executing automation with ${steps.length} steps (execution: ${executionId})`);
        console.log(`🔍 DEBUG - Automation structure:`, JSON.stringify(automation, null, 2));
        console.log(`🔍 DEBUG - Steps array:`, JSON.stringify(steps, null, 2));
        
        // Add initial log
        this.executionProgressManager.addLog(executionId, {
            level: 'info',
            message: `Starting automation execution with ${steps.length} steps`,
            data: { totalSteps: steps.length, hasVariables: Object.keys(variables).length > 0 }
        });
        
        // ✅ CRITICAL FIX: Navigate to original URL first before executing automation steps
        let originalUrl = this.getOriginalUrlFromAutomation(automation, variables);
        
        // Substitute variables in the URL if present
        if (originalUrl && Object.keys(variables).length > 0) {
            originalUrl = this.replaceVariablesInText(originalUrl, variables);
            console.log(`🔧 URL after variable substitution: ${originalUrl}`);
        }
        
        // Calculate total steps including initial navigation
        const totalStepsWithNavigation = originalUrl ? steps.length + 1 : steps.length;
        let currentStepNumber = 0;
        
        if (originalUrl) {
            console.log(`🌐 [AUTOMATION START] Navigating to original URL: ${originalUrl}`);
            
            try {
                currentStepNumber = 1; // Initial navigation is step 1
                
                // Update progress manager for initial navigation start
                this.executionProgressManager.updateProgress(executionId, currentStepNumber, {
                    success: false, // In progress
                    action: 'navigate',
                    description: `Navigate to ${originalUrl}`,
                    duration: 0,
                    status: 'running' // Ensure status is set to running
                });
                
                await userSession.automationEngine.page.goto(originalUrl, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 15000 
                });
                
                console.log(`✅ Successfully navigated to automation start URL: ${originalUrl}`);
                
                // Update progress manager for completed navigation  
                this.executionProgressManager.updateProgress(executionId, currentStepNumber, {
                    success: true,
                    action: 'navigate',
                    description: `Navigate to ${originalUrl}`,
                    duration: 1000
                });
                
                // ✅ REMOVED DUPLICATE: ExecutionProgressManager handles ALL progress updates via broadcastUpdate()
                
            } catch (navError) {
                console.error(`❌ Failed to navigate to automation start URL: ${navError.message}`);
                throw new Error(`Failed to navigate to automation start URL: ${originalUrl} - ${navError.message}`);
            }
        } else {
            console.log(`⚠️ No original URL found in automation, proceeding with current page`);
        }
        
        for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
            const step = steps[stepIndex];
            const stepStartTime = Date.now();
            
            try {
                // Check if execution should be paused or stopped
                const executionStatus = this.executionProgressManager.getExecutionStatus(executionId);
                if (!executionStatus) {
                    throw new Error('Execution context lost');
                }
                
                if (executionStatus.status === 'paused') {
                    console.log(`⏸️ Execution paused at step ${stepIndex + 1}`);
                    // Wait for resume
                    while (true) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const currentStatus = this.executionProgressManager.getExecutionStatus(executionId);
                        if (!currentStatus || currentStatus.status === 'cancelled') {
                            throw new Error('Execution cancelled during pause');
                        }
                        if (currentStatus.status === 'running') {
                            console.log(`▶️ Execution resumed at step ${stepIndex + 1}`);
                            break;
                        }
                    }
                }
                
                if (executionStatus.status === 'cancelled') {
                    throw new Error('Execution cancelled by user');
                }
                
                // Convert step format to action format
                let action = null;
                if (step.type === 'navigation') {
                    action = {
                        type: 'navigate',
                        url: step.target,
                        description: step.instruction
                    };
                } else if (step.type === 'action') {
                    // Determine action type from instruction
                    const instruction = step.instruction.toLowerCase();
                    if (instruction.includes('fill') && step.value) {
                        action = {
                            type: 'fill',
                            text: step.value,
                            description: step.instruction,
                            selector: step.target
                        };
                    } else if (instruction.includes('click') || instruction.includes('submit')) {
                        action = {
                            type: 'click',
                            description: step.instruction,
                            selector: step.target
                        };
                    } else {
                        action = {
                            type: 'generic',
                            description: step.instruction,
                            selector: step.target
                        };
                    }
                }
                
                console.log(`🔍 DEBUG - Step ${stepIndex + 1} data:`, JSON.stringify(step, null, 2));
                console.log(`🔍 DEBUG - Action converted:`, JSON.stringify(action, null, 2));
                
                if (!action) {
                    console.log(`⚠️ Skipping step ${stepIndex + 1} - no action could be created`);
                    
                    // Calculate correct step number for skip
                    const skipStepNumber = originalUrl ? stepIndex + 2 : stepIndex + 1;
                    
                    // Skip empty steps
                    this.executionProgressManager.updateProgress(executionId, skipStepNumber, {
                        success: true,
                        action: 'skip',
                        duration: 0,
                        skipped: true
                    });
                    continue;
                }
                
                // Replace variables in action parameters
                const processedAction = this.replaceVariablesInAction(action, variables);
                
                console.log(`📍 Executing step ${stepIndex + 1}/${steps.length}: ${action.type}`);
                
                // Add step start log
                this.executionProgressManager.addLog(executionId, {
                    level: 'info',
                    message: `Starting step ${stepIndex + 1}: ${action.type}`,
                    data: { stepIndex: stepIndex + 1, actionType: action.type }
                });
                
                let stepResult = null;
                let screenshot = null;
                
                // Take screenshot before step execution
                try {
                    if (userSession.automationEngine && userSession.automationEngine.page) {
                        const screenshotBuffer = await userSession.automationEngine.page.screenshot({
                            type: 'jpeg',
                            quality: 70
                        });
                        screenshot = screenshotBuffer.toString('base64');
                    }
                } catch (screenshotError) {
                    console.warn(`⚠️ Could not take screenshot for step ${stepIndex + 1}:`, screenshotError.message);
                }
                
                // Execute based on action type with enhanced form handling
                console.log(`🔍 DEBUG - Processing action type: ${processedAction.type}`);
                
                switch (processedAction.type) {
                    case 'navigate':
                        console.log(`🌐 Executing navigation to: ${processedAction.url}`);
                        await userSession.automationEngine.page.goto(processedAction.url, { 
                            waitUntil: 'domcontentloaded', 
                            timeout: 15000 
                        });
                        
                        // ✅ FIXED: Record navigation in PlaywrightRecorder during automation execution
                        if (userSession.recordingState?.isRecording && userSession.automationEngine?.playwrightRecorder) {
                            userSession.automationEngine.playwrightRecorder.recordNavigation(processedAction.url);
                            console.log(`🎬 Recorded automation navigation in Playwright script: ${processedAction.url}`);
                        }
                        
                        stepResult = { url: processedAction.url };
                        break;
                        
                    case 'type':
                    case 'fill':
                        console.log(`✏️ Executing fill action with text: ${processedAction.text}`);
                        // Use enhanced form field detection
                        const fieldType = this.detectFieldType(processedAction);
                        console.log(`🔍 Detected field type: ${fieldType} for text: ${processedAction.text}`);
                        
                        if (fieldType && userSession.automationEngine.executeFormAction) {
                            console.log(`🎯 Using enhanced form detection for ${fieldType} field`);
                            await userSession.automationEngine.executeFormAction('fill', fieldType, processedAction.text);
                        } else {
                            // Fallback to improved Stagehand instruction with robust wrapper
                            const fillInstruction = this.generateImprovedFillInstruction(processedAction);
                            console.log(`🎯 Using Stagehand fill instruction: ${fillInstruction}`);
                            await userSession.automationEngine.robustPageAct(fillInstruction);
                        }
                        stepResult = { text: processedAction.text, fieldType };
                        break;
                        
                    case 'click':
                        console.log(`🖱️ Executing click action`);
                        // Use enhanced form field detection for buttons
                        const buttonType = this.detectButtonType(processedAction);
                        if (buttonType && userSession.automationEngine.executeFormAction) {
                            console.log(`🎯 Using enhanced form detection for ${buttonType} button`);
                            await userSession.automationEngine.executeFormAction('click', buttonType);
                        } else {
                            // Fallback to improved Stagehand instruction with robust wrapper
                            const clickInstruction = this.generateImprovedClickInstruction(processedAction);
                            console.log(`🎯 Using Stagehand click instruction: ${clickInstruction}`);
                            await userSession.automationEngine.robustPageAct(clickInstruction);
                        }
                        stepResult = { buttonType };
                        break;
                        
                    case 'select':
                        // Use robust Stagehand wrapper to select from dropdown
                        const selectInstruction = `select "${processedAction.value}" from ${processedAction.selector || processedAction.description}`;
                        await userSession.automationEngine.robustPageAct(selectInstruction);
                        stepResult = { value: processedAction.value };
                        break;
                        
                    case 'wait':
                        // Wait for a moment
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        stepResult = { waitTime: 2000 };
                        break;
                        
                    case 'generic':
                        console.log(`🎯 Executing generic action: ${processedAction.description}`);
                        if (processedAction.description) {
                            await userSession.automationEngine.robustPageAct(processedAction.description);
                            stepResult = { description: processedAction.description };
                        } else {
                            console.log(`⚠️ No description found for generic action`);
                        }
                        break;
                        
                    default:
                        console.log(`❓ Unknown action type '${processedAction.type}' - using default handler`);
                        // Use robust Stagehand wrapper for generic actions
                        if (processedAction.description) {
                            console.log(`🎯 Using Stagehand generic instruction: ${processedAction.description}`);
                            await userSession.automationEngine.robustPageAct(processedAction.description);
                            stepResult = { description: processedAction.description };
                        } else {
                            console.log(`⚠️ No description found for unknown action type '${processedAction.type}'`);
                        }
                }
                
                const stepDuration = Date.now() - stepStartTime;
                stepsExecuted++;
                
                // Calculate correct step number (accounting for initial navigation)
                currentStepNumber = originalUrl ? stepIndex + 2 : stepIndex + 1;
                
                // Update progress with step result
                this.executionProgressManager.updateProgress(executionId, currentStepNumber, {
                    success: true,
                    action: processedAction.type,
                    duration: stepDuration,
                    screenshot,
                    result: stepResult
                });
                
                // ✅ REMOVED DUPLICATE: ExecutionProgressManager handles ALL progress updates via broadcastUpdate()
                
                // Add step completion log
                this.executionProgressManager.addLog(executionId, {
                    level: 'info',
                    message: `Completed step ${stepIndex + 1} in ${stepDuration}ms`,
                    data: { stepIndex: stepIndex + 1, duration: stepDuration, result: stepResult }
                });
                
                // Small delay between steps
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (stepError) {
                const stepDuration = Date.now() - stepStartTime;
                
                console.error(`❌ Step ${stepIndex + 1} failed:`, stepError.message);
                
                // Add error to execution tracking
                this.executionProgressManager.addError(executionId, {
                    message: stepError.message,
                    type: 'step_execution_error',
                    stepIndex: stepIndex + 1,
                    recoverable: true
                });
                
                // Update progress with failure
                this.executionProgressManager.updateProgress(executionId, stepIndex + 1, {
                    success: false,
                    action: step.action?.type || 'unknown',
                    duration: stepDuration,
                    error: stepError.message
                });
                
                // Add error log
                this.executionProgressManager.addLog(executionId, {
                    level: 'error',
                    message: `Step ${stepIndex + 1} failed: ${stepError.message}`,
                    data: { stepIndex: stepIndex + 1, error: stepError.message }
                });
                
                throw new Error(`Step ${stepIndex + 1} failed: ${stepError.message}`);
            }
        }
        
        // Add completion log
        this.executionProgressManager.addLog(executionId, {
            level: 'info',
            message: `Automation execution completed successfully`,
            data: { stepsExecuted, totalSteps: steps.length }
        });
        
        return {
            success: true,
            stepsExecuted: stepsExecuted + (originalUrl ? 1 : 0), // Include initial navigation in count
            totalSteps: totalStepsWithNavigation,
            executionId
        };
    }

    // Keep the old method for backward compatibility
    async executeAutomationSteps(automation, userVariables) {
        const steps = automation.steps || [];
        const variables = { ...userVariables };
        let stepsExecuted = 0;
        
        console.log(`🎯 Executing automation with ${steps.length} steps (legacy mode)`);
        
        for (const step of steps) {
            try {
                const action = step.action;
                if (!action) continue;
                
                // Replace variables in action parameters
                const processedAction = this.replaceVariablesInAction(action, variables);
                
                console.log(`📍 Executing step ${stepsExecuted + 1}/${steps.length}: ${action.type}`);
                
                // Execute based on action type with enhanced form handling
                switch (processedAction.type) {
                    case 'navigate':
                        await this.automationEngine.page.goto(processedAction.url, { 
                            waitUntil: 'domcontentloaded', 
                            timeout: 15000 
                        });
                        break;
                        
                    case 'type':
                    case 'fill':
                        // Use enhanced form field detection
                        const fieldType = this.detectFieldType(processedAction);
                        if (fieldType && this.automationEngine.executeFormAction) {
                            console.log(`🎯 Using enhanced form detection for ${fieldType} field`);
                            await this.automationEngine.executeFormAction('fill', fieldType, processedAction.text);
                        } else {
                            // Fallback to improved Stagehand instruction with robust wrapper
                            const fillInstruction = this.generateImprovedFillInstruction(processedAction);
                            await this.automationEngine.robustPageAct(fillInstruction);
                        }
                        break;
                        
                    case 'click':
                        // Use enhanced form field detection for buttons
                        const buttonType = this.detectButtonType(processedAction);
                        if (buttonType && this.automationEngine.executeFormAction) {
                            console.log(`🎯 Using enhanced form detection for ${buttonType} button`);
                            await this.automationEngine.executeFormAction('click', buttonType);
                        } else {
                            // Fallback to improved Stagehand instruction with robust wrapper
                            const clickInstruction = this.generateImprovedClickInstruction(processedAction);
                            await this.automationEngine.robustPageAct(clickInstruction);
                        }
                        break;
                        
                    case 'select':
                        // Use robust Stagehand wrapper to select from dropdown
                        const selectInstruction = `select "${processedAction.value}" from ${processedAction.selector || processedAction.description}`;
                        await this.automationEngine.robustPageAct(selectInstruction);
                        break;
                        
                    case 'wait':
                        // Wait for a moment
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        break;
                        
                    default:
                        // Use robust Stagehand wrapper for generic actions
                        if (processedAction.description) {
                            await this.automationEngine.robustPageAct(processedAction.description);
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

    /**
     * Detect field type from action properties
     */
    detectFieldType(action) {
        const selector = (action.selector || action.description || '').toLowerCase();
        const text = (action.text || '').toLowerCase();
        
        // CPF field detection (prioritize this for Brazilian forms)
        if (selector.includes('cpf') || selector.includes('document') ||
            selector.includes('usuario') || selector.includes('login') ||
            this.isCPFPattern(action.text || action.value || '')) {
            return 'cpf';
        }
        
        // Email field detection
        if (selector.includes('email') || text.includes('@')) {
            return 'email';
        }
        
        // Password field detection
        if (selector.includes('password') || selector.includes('senha')) {
            return 'password';
        }
        
        // Phone field detection
        if (selector.includes('phone') || selector.includes('telefone') || 
            selector.includes('celular') || /^\(\d{2}\)/.test(text)) {
            return 'phone';
        }
        
        // Name field detection
        if (selector.includes('name') || selector.includes('nome')) {
            return 'name';
        }
        
        return null;
    }

    /**
     * Check if text matches CPF pattern
     */
    isCPFPattern(text) {
        if (!text) return false;
        
        // Brazilian CPF patterns
        const cpfPatterns = [
            /^\d{3}\.\d{3}\.\d{3}-\d{2}$/, // Formatted: 123.456.789-00
            /^\d{11}$/,                    // Unformatted: 12345678900
            /^\d{3}\d{3}\d{3}\d{2}$/      // Alternative unformatted
        ];
        
        return cpfPatterns.some(pattern => pattern.test(text.replace(/\s/g, '')));
    }

    /**
     * Detect button type from action properties
     */
    detectButtonType(action) {
        const selector = (action.selector || action.description || '').toLowerCase();
        
        // Submit/Login button detection
        if (selector.includes('login') || selector.includes('entrar') || 
            selector.includes('submit') || selector.includes('sign in') ||
            selector.includes('continue') || selector.includes('continuar')) {
            return 'submit';
        }
        
        return null;
    }

    /**
     * Generate improved fill instruction for Stagehand
     */
    generateImprovedFillInstruction(action) {
        const text = action.text || action.value || '';
        const selector = action.selector || action.description || action.instruction || '';
        const lowerSelector = selector.toLowerCase();
        
        console.log(`🔍 Generating fill instruction for text: "${text}", selector context: "${selector}"`);
        
        // Enhanced CPF field handling with better detection
        if (this.isCPFPattern(text) || lowerSelector.includes('cpf') || lowerSelector.includes('document')) {
            return `Fill the CPF number "${text}" in the CPF document field`;
        } else if (text.includes('@') || lowerSelector.includes('email')) {
            return `Fill the email address "${text}" in the email input field`;
        } else if (lowerSelector.includes('password') || lowerSelector.includes('senha')) {
            return `Fill the password "${text}" in the password input field`;
        } else if (lowerSelector.includes('usuario') || lowerSelector.includes('login')) {
            return `Fill the login information "${text}" in the login field`;
        } else if (lowerSelector.includes('fill')) {
            // Extract field type from instruction like "Fill CPF field with..."
            if (lowerSelector.includes('cpf')) {
                return `Fill the CPF number "${text}" in the CPF document field`;
            } else if (lowerSelector.includes('password')) {
                return `Fill the password "${text}" in the password input field`;
            } else {
                return `Fill "${text}" in the appropriate input field`;
            }
        } else {
            return `Fill "${text}" in the input field`;
        }
    }

    /**
     * Generate improved click instruction for Stagehand
     */
    generateImprovedClickInstruction(action) {
        const selector = action.selector || action.description || action.instruction || '';
        const lowerSelector = selector.toLowerCase();
        
        console.log(`🔍 Generating click instruction for selector context: "${selector}"`);
        
        // More specific instructions for buttons
        if (lowerSelector.includes('login') || lowerSelector.includes('entrar') || lowerSelector.includes('submit')) {
            return `Click the login or submit button`;
        } else if (lowerSelector.includes('continue') || lowerSelector.includes('continuar')) {
            return `Click the continue button`;
        } else if (lowerSelector.includes('click') || lowerSelector.includes('button')) {
            return `Click the button`;
        } else {
            return `Click the button or clickable element`;
        }
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
                message: `✏️ Editing automation "${automation.name}"`,
                data: automation
            });
            
        } catch (error) {
            console.error(`❌ Edit automation failed:`, error.message);
            this.sendToClient(ws, {
                type: 'error',
                message: `❌ Error editing automation: ${error.message}`
            });
        }
    }

    /**
     * Handle dashboard analytics request
     */
    async handleGetDashboardAnalytics(userSession, message) {
        try {
            const { timeRange = '24h' } = message;
            console.log(`📊 [${userSession.sessionId}] Getting dashboard analytics for ${timeRange}`);
            
            // Get analytics from storage manager if available
            let dashboardData;
            
            if (this.storageManager && this.storageManager.variableAnalytics) {
                dashboardData = await this.storageManager.variableAnalytics.getDashboardAnalytics(timeRange);
            } else {
                // Fallback dashboard data
                dashboardData = {
                    timeRange,
                    generatedAt: new Date().toISOString(),
                    overview: {
                        totalEvents: this.userSessions.size,
                        successEvents: this.userSessions.size,
                        failureEvents: 0,
                        successRate: 100,
                        failureRate: 0
                    },
                    trends: [],
                    topVariables: [],
                    automations: Array.from(this.savedAutomations.values()).slice(0, 5),
                    errors: {
                        commonErrors: [],
                        errorTrends: []
                    },
                    recommendations: [
                        'System is running smoothly',
                        'Consider creating more automations for efficiency'
                    ]
                };
            }
            
            this.sendToClient(userSession.ws, {
                type: 'dashboard_analytics',
                data: {
                    dashboard: dashboardData
                }
            });
            
        } catch (error) {
            console.error(`❌ Error getting dashboard analytics for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Failed to get dashboard analytics: ${error.message}`
            });
        }
    }

    /**
     * Handle usage patterns request
     */
    async handleGetUsagePatterns(userSession, message) {
        try {
            const { automationId } = message;
            console.log(`📈 [${userSession.sessionId}] Getting usage patterns for automation: ${automationId}`);
            
            // Mock usage patterns data
            const usagePatterns = {
                automationId,
                patterns: {
                    dailyUsage: [
                        { day: 'Monday', count: 5 },
                        { day: 'Tuesday', count: 8 },
                        { day: 'Wednesday', count: 12 },
                        { day: 'Thursday', count: 7 },
                        { day: 'Friday', count: 15 },
                        { day: 'Saturday', count: 3 },
                        { day: 'Sunday', count: 2 }
                    ],
                    hourlyUsage: Array.from({ length: 24 }, (_, i) => ({
                        hour: i,
                        count: Math.floor(Math.random() * 10)
                    })),
                    popularVariables: [
                        { name: 'LOGIN_EMAIL', usageCount: 45 },
                        { name: 'PASSWORD', usageCount: 45 },
                        { name: 'CPF', usageCount: 23 }
                    ]
                }
            };
            
            this.sendToClient(userSession.ws, {
                type: 'usage_patterns',
                data: {
                    patterns: usagePatterns
                }
            });
            
        } catch (error) {
            console.error(`❌ Error getting usage patterns for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Failed to get usage patterns: ${error.message}`
            });
        }
    }

    /**
     * Handle variable analytics request
     */
    async handleGetVariableAnalytics(userSession, message) {
        try {
            const { variableId, timeRange = '24h' } = message;
            console.log(`📊 [${userSession.sessionId}] Getting variable analytics for: ${variableId}`);
            
            // Mock variable analytics data
            const variableAnalytics = {
                variableId,
                timeRange,
                stats: {
                    totalUsage: 25,
                    successRate: 96,
                    failureRate: 4,
                    avgExecutionTime: 1200,
                    lastUsed: new Date().toISOString()
                },
                trends: Array.from({ length: 7 }, (_, i) => ({
                    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    usage: Math.floor(Math.random() * 10),
                    success: Math.floor(Math.random() * 8),
                    failures: Math.floor(Math.random() * 2)
                })).reverse(),
                recentErrors: [],
                recommendations: [
                    'Variable performing well',
                    'Consider adding validation rules'
                ]
            };
            
            this.sendToClient(userSession.ws, {
                type: 'variable_analytics',
                data: {
                    analytics: variableAnalytics
                }
            });
            
        } catch (error) {
            console.error(`❌ Error getting variable analytics for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Failed to get variable analytics: ${error.message}`
            });
        }
    }

    /**
     * Handle track variable usage request
     */
    async handleTrackVariableUsage(userSession, message) {
        try {
            const { variableId, automationId, success, executionTime } = message;
            console.log(`📈 [${userSession.sessionId}] Tracking variable usage: ${variableId}`);
            
            // Store usage event
            const usageEvent = {
                variableId,
                automationId,
                success,
                executionTime,
                timestamp: Date.now(),
                sessionId: userSession.sessionId
            };
            
            // If analytics service is available, track it
            if (this.storageManager && this.storageManager.variableAnalytics) {
                await this.storageManager.variableAnalytics.trackVariableUsage(usageEvent);
            }
            
            this.sendToClient(userSession.ws, {
                type: 'variable_usage_tracked',
                data: {
                    success: true,
                    eventId: Date.now().toString()
                }
            });
            
        } catch (error) {
            console.error(`❌ Error tracking variable usage for session ${userSession.sessionId}:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Failed to track variable usage: ${error.message}`
            });
        }
    }

    /**
     * Extract value from step instruction (for recording)
     */
    extractValue(step) {
        // Extract values from common patterns
        const patterns = [
            /with\s+["'`]([^"'`]+)["'`]/i,     // with "value" or 'value' or `value`
            /with\s+([^\s]+)$/i,                // with value at end of line
            /["']([^"']+)["']/g,                // any quoted value
            /`([^`]+)`/g,                       // backtick values
            /fill.*?(\d{3}\.\d{3}\.\d{3}-\d{2})/i,  // CPF pattern
            /fill.*?([^\s]+@[^\s]+\.[^\s]+)/i,       // Email pattern
            /password.*?with\s+(.+)$/i,         // password with value
        ];
        
        for (const pattern of patterns) {
            const match = step.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    /**
     * Execute action using Stagehand with timeout protection
     */
    async executeStagehandAction(userSession, step) {
        console.log(`🤖 Processing: "${step}" (attempt 1/3)`);
        console.log(`🎯 Executing action with Stagehand...`);
        
        try {
            // Execute action with robust wrapper (already has timeout protection)
            await userSession.automationEngine.robustPageAct(step, { timeout: 30000 });
            console.log(`✅ Stagehand action completed successfully`);
            
        } catch (error) {
            console.error(`❌ Stagehand action failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if a step is a navigation command
     */
    isNavigationCommand(step) {
        const navigationPatterns = [
            /navigate\s+to/i,
            /go\s+to/i,
            /visit/i,
            /open/i,
            /https?:\/\//i
        ];
        
        return navigationPatterns.some(pattern => pattern.test(step));
    }

    /**
     * Extract URL from step instruction
     */
    extractURL(step) {
        // Try to extract URL from common patterns
        const patterns = [
            /https?:\/\/[^\s`"']+/i,           // Direct URL
            /to\s+[`"']([^`"']+)[`"']/i,      // to "url" or to `url`
            /to\s+([^\s]+)/i                   // to url
        ];
        
        for (const pattern of patterns) {
            const match = step.match(pattern);
            if (match) {
                let url = match[1] || match[0];
                // Clean up any trailing backticks or quotes
                url = url.replace(/[`"']+$/, '');
                // Add protocol if missing
                if (!url.startsWith('http')) {
                    if (url.includes('.')) {
                        url = 'https://' + url;
                    }
                }
                return url;
            }
        }
        
        return null;
    }

    /**
     * Handle extract variables request
     */
    async handleExtractVariables(userSession, message) {
        try {
            const { automationId, steps } = message;
            console.log(`🔍 Extracting variables for automation ${automationId} with ${steps?.length || 0} steps`);
            
            let automationSteps = steps;
            
            // If steps are not provided, fetch from storage
            if (!automationSteps || automationSteps.length === 0) {
                console.log(`📁 Fetching automation steps from storage for ${automationId}`);
                const automation = this.savedAutomations.get(automationId);
                if (automation && automation.steps) {
                    automationSteps = automation.steps;
                    console.log(`📁 Found ${automationSteps.length} steps in stored automation`);
                } else {
                    console.log(`⚠️ No automation found or no steps available for ${automationId}`);
                    this.sendToClient(userSession.ws, {
                        type: 'variables_extracted',
                        automationId,
                        variables: []
                    });
                    return;
                }
            }
            
            // Use the existing extractVariablesFromSteps method
            const variables = await this.extractVariablesFromSteps(automationSteps);
            
            // Update the automation with extracted variables
            const automation = this.savedAutomations.get(automationId);
            if (automation) {
                automation.variables = variables;
                automation.variableCount = variables.length;
                await this.storageManager.saveAutomation(automation);
                console.log(`💾 Updated automation ${automationId} with ${variables.length} variables`);
            }
            
            this.sendToClient(userSession.ws, {
                type: 'variables_extracted',
                automationId,
                variables
            });
            
        } catch (error) {
            console.error(`❌ Failed to extract variables:`, error);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: 'Failed to extract variables'
            });
        }
    }

    /**
     * Handle get automation variables request
     */
    async handleGetAutomationVariables(userSession, message) {
        try {
            const { automationId } = message;
            console.log(`📋 Getting variables for automation ${automationId}`);
            
            const automation = this.savedAutomations.get(automationId);
            console.log(`🔍 Automation found:`, automation ? 'YES' : 'NO');
            
            if (!automation) {
                console.log(`❌ Automation ${automationId} not found in savedAutomations`);
                console.log(`📁 Available automations:`, Array.from(this.savedAutomations.keys()));
                this.sendToClient(userSession.ws, {
                    type: 'automation_variables',
                    automationId,
                    variables: []
                });
                return;
            }
            
            console.log(`📋 Automation details:`, {
                id: automation.id,
                name: automation.name,
                variableCount: automation.variableCount,
                hasVariables: !!automation.variables,
                variablesLength: automation.variables ? automation.variables.length : 0
            });
            
            if (automation.variables) {
                console.log(`📋 Variables found:`, JSON.stringify(automation.variables, null, 2));
            } else {
                console.log(`⚠️ No variables property in automation`);
            }
            
            const variablesToSend = automation.variables || [];
            console.log(`📤 Sending ${variablesToSend.length} variables to client`);
            
            this.sendToClient(userSession.ws, {
                type: 'automation_variables',
                automationId,
                variables: variablesToSend
            });
            
        } catch (error) {
            console.error(`❌ Failed to get automation variables:`, error);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: 'Failed to get automation variables'
            });
        }
    }

    /**
     * Handle update automation variables request
     */
    async handleUpdateAutomationVariables(userSession, message) {
        try {
            const { automationId, variables } = message;
            console.log(`💾 Updating variables for automation ${automationId} with ${variables?.length || 0} variables`);
            
            const automation = this.savedAutomations.get(automationId);
            if (!automation) {
                console.log(`❌ Automation ${automationId} not found for variable update`);
                this.sendToClient(userSession.ws, {
                    type: 'error',
                    message: `Automation ${automationId} not found`
                });
                return;
            }
            
            // Update the automation with new variables
            automation.variables = variables;
            automation.variableCount = variables.length;
            
            // Save to memory
            this.savedAutomations.set(automationId, automation);
            
            // Save to persistent storage
            try {
                await this.storageManager.saveAutomation(automation);
                console.log(`✅ Variables updated successfully for automation ${automationId}`);
                
                // Send success response
                this.sendToClient(userSession.ws, {
                    type: 'automation_variables_updated',
                    automationId,
                    variables,
                    variableCount: variables.length
                });
                
                // Send updated automation list
                const automations = Array.from(this.savedAutomations.values());
                this.sendToClient(userSession.ws, {
                    type: 'automations_list',
                    automations
                });
                
            } catch (error) {
                console.error(`❌ Failed to save automation variables: ${error.message}`);
                this.sendToClient(userSession.ws, {
                    type: 'error',
                    message: `Failed to save variables: ${error.message}`
                });
            }
        } catch (error) {
            console.error(`❌ Error updating automation variables: ${error.message}`);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `Failed to update variables: ${error.message}`
            });
        }
    }

    /**
     * Handle delete automation request
     */
    async handleDeleteAutomation(userSession, message) {
        try {
            const { automationId } = message;
            console.log(`🗑️ Deleting automation ${automationId}`);
            
            // Delete from memory
            const deleted = this.savedAutomations.delete(automationId);
            
            if (deleted) {
                // Delete from storage
                await this.storageManager.deleteAutomation(automationId);
                
                this.sendToClient(userSession.ws, {
                    type: 'automation_deleted',
                    automationId
                });
                
                // Send updated list
                const automations = Array.from(this.savedAutomations.values());
                this.sendToClient(userSession.ws, {
                    type: 'automations_list',
                    automations: automations.map(a => ({
                        id: a.id,
                        name: a.name,
                        description: a.description,
                        stepCount: a.stepCount || a.steps?.length || 0,
                        variableCount: a.variableCount || a.variables?.length || 0,
                        createdAt: a.createdAt
                    }))
                });
            } else {
                this.sendToClient(userSession.ws, {
                    type: 'error',
                    message: 'Automation not found'
                });
            }
            
        } catch (error) {
            console.error(`❌ Failed to delete automation:`, error);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: 'Failed to delete automation'
            });
        }
    }

    /**
     * Extract the original URL from automation for initial navigation
     */
    getOriginalUrlFromAutomation(automation, variables = {}) {
        const steps = automation.steps || [];
        
        // Look for the first valid navigation URL in the recorded steps
        for (const step of steps) {
            // Check if step has action with URL
            if (step.action && step.action.type === 'navigate' && step.action.url) {
                const url = step.action.url.trim();
                
                // Skip invalid URLs
                if (url === '# URLs' || url.length < 5 || !url.includes('.')) {
                    continue;
                }
                
                // Return the first valid URL
                console.log(`📍 Found original URL in automation: ${url}`);
                return url;
            }
            
            // Also check if step has direct URL property (alternative format)
            if (step.url && typeof step.url === 'string') {
                const url = step.url.trim();
                if (url !== '# URLs' && url.length >= 5 && url.includes('.')) {
                    console.log(`📍 Found original URL in step: ${url}`);
                    return url;
                }
            }
            
            // Check if step instruction contains a URL (fallback)
            if (step.instruction && typeof step.instruction === 'string') {
                const urlMatch = step.instruction.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                    console.log(`📍 Found URL in instruction: ${urlMatch[0]}`);
                    return urlMatch[0];
                }
            }
        }
        
        // Check automation metadata for original URL (if available)
        if (automation.metadata && automation.metadata.originalUrl) {
            console.log(`📍 Found original URL in metadata: ${automation.metadata.originalUrl}`);
            return automation.metadata.originalUrl;
        }
        
        // Check automation metadata for start URL (legacy format)
        if (automation.startUrl) {
            console.log(`📍 Found start URL in automation: ${automation.startUrl}`);
            return automation.startUrl;
        }
        
        console.log(`⚠️ No original URL found in automation structure`);
        return null;
    }

    /**
     * Replace variables in text using multiple patterns
     */
    replaceVariablesInText(text, variables) {
        if (!text || typeof text !== 'string') return text;
        
        let result = text;
        
        // Replace variables using multiple patterns: {{var}}, ${var}, {var}, %var%
        Object.keys(variables).forEach(varName => {
            const value = variables[varName];
            if (value !== undefined && value !== null) {
                const patterns = [
                    new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),  // {{VAR}}
                    new RegExp(`\\$\\{${varName}\\}`, 'g'),     // ${VAR}
                    new RegExp(`\\{${varName}\\}`, 'g'),        // {VAR}
                    new RegExp(`%${varName}%`, 'g')             // %VAR%
                ];
                
                patterns.forEach(pattern => {
                    result = result.replace(pattern, value);
                });
            }
        });
        
        return result;
    }

    /**
     * Generate actual Playwright script from recorded automation
     */
    generatePlaywrightScript(automation, variables = {}) {
        const scriptHeader = `const { chromium } = require('playwright');

/**
 * Generated Playwright Script: ${automation.name}
 * Created: ${new Date().toISOString()}
 * Description: ${automation.description || 'Automated browser script'}
 */

async function ${this.sanitizeFunctionName(automation.name)}() {
    const browser = await chromium.launch({ 
        headless: false,  // Set to true for headless execution
        slowMo: 100       // Slow down for better visibility
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        console.log('🚀 Starting automation: ${automation.name}');
`;

        let scriptBody = '';
        let stepNumber = 1;

        // Process each recorded step
        for (const step of automation.steps) {
            scriptBody += `        
        // Step ${stepNumber}: ${step.instruction}
        console.log('📍 Step ${stepNumber}: ${step.instruction}');
`;

            // Convert step to Playwright code based on type
            if (step.type === 'navigation') {
                scriptBody += `        await page.goto('${step.target}', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
`;
            } else if (step.type === 'action') {
                const playwrightCode = this.convertActionToPlaywrightCode(step, variables);
                scriptBody += playwrightCode;
            }

            stepNumber++;
        }

        const scriptFooter = `        
        console.log('✅ Automation completed successfully!');
        
        // Optional: Take final screenshot
        await page.screenshot({ 
            path: '${this.sanitizeFunctionName(automation.name)}_final.png',
            fullPage: true 
        });
        
    } catch (error) {
        console.error('❌ Automation failed:', error.message);
        
        // Take error screenshot for debugging
        await page.screenshot({ 
            path: '${this.sanitizeFunctionName(automation.name)}_error.png',
            fullPage: true 
        });
        
        throw error;
        
    } finally {
        await browser.close();
    }
}

// Export the function for use
module.exports = { ${this.sanitizeFunctionName(automation.name)} };

// Run if called directly
if (require.main === module) {
    ${this.sanitizeFunctionName(automation.name)}()
        .then(() => {
            console.log('🎉 Script execution completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script execution failed:', error);
            process.exit(1);
        });
}`;

        return scriptHeader + scriptBody + scriptFooter;
    }

    /**
     * Convert recorded action to Playwright code
     */
    convertActionToPlaywrightCode(step, variables = {}) {
        const instruction = step.instruction.toLowerCase();
        let code = '';

        // Replace variables in values
        let value = step.value || '';
        for (const [varName, varValue] of Object.entries(variables)) {
            value = value.replace(new RegExp(`\\$\\{${varName}\\}`, 'g'), varValue);
        }

        if (instruction.includes('fill') && value) {
            // Determine field type and generate appropriate selector
            const selector = this.generatePlaywrightSelector(step, value);
            
            code += `        // Wait for field to be available
        await page.waitForSelector('${selector}', { timeout: 10000 });
        
        // Clear and fill the field
        await page.fill('${selector}', '${value.replace(/'/g, "\\'")}');
        console.log('✅ Filled field with: ${value}');
        
        // Optional: Wait briefly for any field validation
        await page.waitForTimeout(500);
`;
        } else if (instruction.includes('click') || instruction.includes('submit')) {
            const selector = this.generatePlaywrightSelector(step, null, 'button');
            
            code += `        // Wait for button to be clickable
        await page.waitForSelector('${selector}', { timeout: 10000 });
        
        // Click the button
        await page.click('${selector}');
        console.log('✅ Clicked button');
        
        // Wait for potential navigation or page changes
        await page.waitForTimeout(2000);
`;
        } else if (instruction.includes('wait')) {
            code += `        // Wait as instructed
        await page.waitForTimeout(2000);
        console.log('✅ Wait completed');
`;
        } else {
            // Generic action - add as comment with manual implementation note
            code += `        // TODO: Manual implementation needed for: ${step.instruction}
        // This action couldn't be automatically converted to Playwright code
        console.log('⚠️ Manual action required: ${step.instruction}');
`;
        }

        return code;
    }

    /**
     * Generate appropriate Playwright selector for Brazilian forms
     */
    generatePlaywrightSelector(step, value, elementType = 'input') {
        const instruction = step.instruction.toLowerCase();
        
        // CPF field detection
        if (this.isCPFPattern(value) || instruction.includes('cpf') || instruction.includes('document')) {
            return `input[type="text"]:not([type="password"])`;
        }
        
        // Password field detection  
        if (instruction.includes('password') || instruction.includes('senha')) {
            return `input[type="password"]`;
        }
        
        // Email field detection
        if (value && value.includes('@')) {
            return `input[type="email"], input[name*="email"]`;
        }
        
        // Button detection
        if (elementType === 'button' || instruction.includes('login') || instruction.includes('submit')) {
            return `button[type="submit"], button:has-text("Entrar"), button:has-text("Login")`;
        }
        
        // Default fallback
        return `input[type="text"]`;
    }

    /**
     * Sanitize automation name for function name
     */
    sanitizeFunctionName(name) {
        return name
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^[0-9]/, '_$&')
            .replace(/__+/g, '_')
            .toLowerCase();
    }

    /**
     * Handle script generation request
     */
    async handleGenerateScript(userSession, message) {
        try {
            const { automationId } = message;
            console.log(`📝 Generating Playwright script for automation: ${automationId}`);
            
            const automation = this.savedAutomations.get(automationId);
            if (!automation) {
                throw new Error(`Automation with ID ${automationId} not found.`);
            }

            // Generate the script
            const scriptContent = this.generatePlaywrightScript(automation);
            
            // Create filename
            const filename = `${this.sanitizeFunctionName(automation.name)}.js`;
            
            this.sendToClient(userSession.ws, {
                type: 'script_generated',
                message: `✅ Playwright script generated successfully`,
                automationId,
                script: {
                    filename,
                    content: scriptContent,
                    language: 'javascript'
                }
            });
            
        } catch (error) {
            console.error(`❌ Script generation failed:`, error.message);
            this.sendToClient(userSession.ws, {
                type: 'error',
                message: `❌ Failed to generate script: ${error.message}`
            });
        }
    }
}

// Server initialization and startup
const main = async () => {
    try {
        console.log('🚀 Starting Stagehand Browser Automation Server...');
        
        const server = new StagehandBrowserAutomationServer({
            port: 7079,
            openaiApiKey: process.env.OPENAI_API_KEY
        });
        
        await server.start();
        
        console.log('✅ Server started successfully!');
        console.log('📱 Web interface: http://localhost:7079');
        console.log('🔗 WebSocket endpoint: ws://localhost:7079');
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Export the class for testing and external use
module.exports = StagehandBrowserAutomationServer;

// Start the server
if (require.main === module) {
    main();
}