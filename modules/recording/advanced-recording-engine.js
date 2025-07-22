/**
 * Advanced Multi-Layer Recording Engine
 * Captures comprehensive automation data during real-time remote control sessions
 */

const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const crypto = require('crypto');

class AdvancedRecordingEngine {
    constructor(sessionId, page, options = {}) {
        this.sessionId = sessionId;
        this.page = page;
        this.isRecording = false;
        this.recordingId = null;
        this.startTime = null;
        
        // Multi-layer recording data
        this.layers = {
            actions: [],           // User interactions (clicks, types, etc.)
            screenshots: [],       // Visual snapshots at key moments
            domSnapshots: [],      // DOM state at interaction points
            context: [],           // Page context (URL, title, viewport)
            performance: [],       // Performance metrics during recording
            variables: new Map(),  // Detected variables and patterns
            metadata: {}          // Recording session metadata
        };
        
        // Advanced options
        this.options = {
            captureScreenshots: options.captureScreenshots !== false,
            captureDOMSnapshots: options.captureDOMSnapshots !== false,
            capturePerformance: options.capturePerformance !== false,
            smartVariableDetection: options.smartVariableDetection !== false,
            contextAwareness: options.contextAwareness !== false,
            realTimeAnalysis: options.realTimeAnalysis !== false,
            ...options
        };
        
        // OpenAI for smart analysis
        if (options.openaiApiKey) {
            this.openai = new OpenAI({ apiKey: options.openaiApiKey });
        }
        
        // Performance tracking
        this.performanceObserver = null;
        this.lastScreenshotTime = 0;
        this.actionSequence = 0;
        
        console.log(`🎬 [${this.sessionId}] Advanced Recording Engine initialized`);
    }
    
    async startRecording(automationName = 'Untitled Recording') {
        if (this.isRecording) {
            console.warn(`⚠️ [${this.sessionId}] Recording already in progress`);
            return false;
        }
        
        this.recordingId = `recording_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        this.startTime = Date.now();
        this.isRecording = true;
        this.actionSequence = 0;
        
        console.log(`🎬 [${this.sessionId}] Starting advanced recording: ${this.recordingId}`);
        
        // Initialize recording metadata
        this.layers.metadata = {
            recordingId: this.recordingId,
            sessionId: this.sessionId,
            automationName,
            startTime: this.startTime,
            userAgent: await this.page.evaluate(() => navigator.userAgent),
            viewport: await this.page.viewportSize(),
            initialUrl: this.page.url(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: await this.page.evaluate(() => navigator.language),
            platform: await this.page.evaluate(() => navigator.platform)
        };
        
        // Capture initial context
        await this.captureContext('recording_start');
        
        // Start performance monitoring if enabled
        if (this.options.capturePerformance) {
            await this.startPerformanceMonitoring();
        }
        
        // Take initial screenshot
        if (this.options.captureScreenshots) {
            await this.captureScreenshot('recording_start', 'Initial page state');
        }
        
        // Capture initial DOM snapshot
        if (this.options.captureDOMSnapshots) {
            await this.captureDOMSnapshot('recording_start', 'Initial DOM state');
        }
        
        return true;
    }
    
    async stopRecording() {
        if (!this.isRecording) {
            console.warn(`⚠️ [${this.sessionId}] No recording in progress`);
            return null;
        }
        
        console.log(`🛑 [${this.sessionId}] Stopping recording: ${this.recordingId}`);
        
        // Capture final context
        await this.captureContext('recording_end');
        
        // Take final screenshot
        if (this.options.captureScreenshots) {
            await this.captureScreenshot('recording_end', 'Final page state');
        }
        
        // Stop performance monitoring
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Finalize metadata
        this.layers.metadata.endTime = Date.now();
        this.layers.metadata.duration = this.layers.metadata.endTime - this.startTime;
        this.layers.metadata.actionCount = this.layers.actions.length;
        this.layers.metadata.screenshotCount = this.layers.screenshots.length;
        this.layers.metadata.domSnapshotCount = this.layers.domSnapshots.length;
        
        // Generate comprehensive automation
        const automation = await this.generateAdvancedAutomation();
        
        // Save recording to disk
        await this.saveRecording(automation);
        
        this.isRecording = false;
        this.recordingId = null;
        
        console.log(`✅ [${this.sessionId}] Recording completed: ${automation.steps.length} steps recorded`);
        
        return automation;
    }
    
    // Multi-layer action recording
    async recordMouseAction(action) {
        if (!this.isRecording) return;
        
        const timestamp = Date.now();
        const sequenceId = ++this.actionSequence;
        
        console.log(`🖱️ [${this.sessionId}] Recording mouse action: ${action.type} at (${action.coordinates.x}, ${action.coordinates.y})`);
        
        // Capture page context before action
        const preContext = await this.captureActionContext('pre_mouse_action', action);
        
        // Record the action with enhanced metadata
        const recordedAction = {
            id: `action_${sequenceId}`,
            type: 'mouse',
            subType: action.type,
            timestamp,
            sequenceId,
            coordinates: action.coordinates,
            button: action.button,
            modifiers: action.modifiers || [],
            context: preContext,
            performance: await this.capturePerformanceSnapshot(),
            screenshot: null, // Will be populated if screenshots enabled
            domSnapshot: null // Will be populated if DOM snapshots enabled
        };
        
        // Capture screenshot for significant actions
        if (this.options.captureScreenshots && this.shouldCaptureScreenshot(action)) {
            recordedAction.screenshot = await this.captureScreenshot(
                `mouse_${action.type}_${sequenceId}`,
                `Mouse ${action.type} at (${action.coordinates.x}, ${action.coordinates.y})`
            );
        }
        
        // Capture DOM snapshot for form interactions
        if (this.options.captureDOMSnapshots && this.shouldCaptureDOMSnapshot(action)) {
            recordedAction.domSnapshot = await this.captureDOMSnapshot(
                `mouse_${action.type}_${sequenceId}`,
                `DOM state for mouse ${action.type}`
            );
        }
        
        // Smart variable detection for form fields  
        if (this.options.smartVariableDetection && recordedAction.context?.activeElement) {
            const fieldContext = await this.analyzeInputField(recordedAction.context);
            if (fieldContext.type !== 'unknown') {
                // This is a form field interaction, analyze for variables
                console.log(`🔍 [${this.sessionId}] Form field interaction detected: ${fieldContext.type}`);
            }
        }
        
        this.layers.actions.push(recordedAction);
        
        // Real-time analysis if enabled
        if (this.options.realTimeAnalysis) {
            await this.performRealTimeAnalysis(recordedAction);
        }
    }
    
    async recordKeyboardAction(action) {
        if (!this.isRecording) return;
        
        const timestamp = Date.now();
        const sequenceId = ++this.actionSequence;
        
        console.log(`⌨️ [${this.sessionId}] Recording keyboard action: ${action.type} - ${action.key || action.text}`);
        
        // Capture page context
        const preContext = await this.captureActionContext('pre_keyboard_action', action);
        
        // Record the action
        const recordedAction = {
            id: `action_${sequenceId}`,
            type: 'keyboard',
            subType: action.type,
            timestamp,
            sequenceId,
            key: action.key,
            text: action.text,
            modifiers: action.modifiers || [],
            context: preContext,
            performance: await this.capturePerformanceSnapshot(),
            screenshot: null,
            domSnapshot: null
        };
        
        // Enhanced recording for text input
        if (action.type === 'type_text' && this.options.smartVariableDetection) {
            // Detect if this is sensitive data or form field input
            const fieldContext = await this.analyzeInputField(preContext);
            recordedAction.fieldContext = fieldContext;
            
            // Smart variable detection
            await this.detectInputVariables(action.text, fieldContext, recordedAction);
        }
        
        // Capture screenshot for complex shortcuts
        if (this.options.captureScreenshots && this.shouldCaptureScreenshotForKeyboard(action)) {
            recordedAction.screenshot = await this.captureScreenshot(
                `keyboard_${action.type}_${sequenceId}`,
                `Keyboard ${action.type}: ${action.key || action.text}`
            );
        }
        
        this.layers.actions.push(recordedAction);
        
        if (this.options.realTimeAnalysis) {
            await this.performRealTimeAnalysis(recordedAction);
        }
    }
    
    async recordTouchAction(action) {
        if (!this.isRecording) return;
        
        const timestamp = Date.now();
        const sequenceId = ++this.actionSequence;
        
        console.log(`👆 [${this.sessionId}] Recording touch action: ${action.type}`);
        
        const preContext = await this.captureActionContext('pre_touch_action', action);
        
        const recordedAction = {
            id: `action_${sequenceId}`,
            type: 'touch',
            subType: action.type,
            timestamp,
            sequenceId,
            touches: action.touches,
            center: action.center,
            scale: action.scale,
            rotation: action.rotation,
            context: preContext,
            performance: await this.capturePerformanceSnapshot()
        };
        
        // Touch gestures always get screenshots for context
        if (this.options.captureScreenshots) {
            recordedAction.screenshot = await this.captureScreenshot(
                `touch_${action.type}_${sequenceId}`,
                `Touch ${action.type} gesture`
            );
        }
        
        this.layers.actions.push(recordedAction);
        
        if (this.options.realTimeAnalysis) {
            await this.performRealTimeAnalysis(recordedAction);
        }
    }
    
    async recordNavigationAction(url, context = {}) {
        if (!this.isRecording) return;
        
        const timestamp = Date.now();
        const sequenceId = ++this.actionSequence;
        
        console.log(`🌐 [${this.sessionId}] Recording navigation: ${url}`);
        
        const recordedAction = {
            id: `action_${sequenceId}`,
            type: 'navigation',
            timestamp,
            sequenceId,
            url,
            context: {
                previousUrl: this.page.url(),
                pageTitle: await this.page.title().catch(() => ''),
                ...context
            },
            performance: await this.capturePerformanceSnapshot()
        };
        
        // Always capture screenshots for navigation
        if (this.options.captureScreenshots) {
            recordedAction.screenshot = await this.captureScreenshot(
                `navigation_${sequenceId}`,
                `Navigation to ${url}`
            );
        }
        
        // Always capture DOM for navigation
        if (this.options.captureDOMSnapshots) {
            recordedAction.domSnapshot = await this.captureDOMSnapshot(
                `navigation_${sequenceId}`,
                `DOM after navigation to ${url}`
            );
        }
        
        // Update context
        await this.captureContext('navigation');
        
        this.layers.actions.push(recordedAction);
    }
    
    // Advanced context capture
    async captureActionContext(eventType, action) {
        try {
            return await this.page.evaluate((eventType, action) => {
                const context = {
                    url: window.location.href,
                    title: document.title,
                    timestamp: Date.now(),
                    eventType,
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight,
                        scrollX: window.scrollX,
                        scrollY: window.scrollY
                    },
                    forms: [],
                    activeElement: null,
                    visibleElements: 0
                };
                
                // Capture active element info
                if (document.activeElement) {
                    const active = document.activeElement;
                    context.activeElement = {
                        tagName: active.tagName,
                        type: active.type || '',
                        name: active.name || '',
                        id: active.id || '',
                        className: active.className || '',
                        placeholder: active.placeholder || '',
                        value: active.type === 'password' ? '[REDACTED]' : active.value || ''
                    };
                }
                
                // Capture form information
                const forms = document.querySelectorAll('form');
                forms.forEach((form, index) => {
                    const formData = {
                        index,
                        action: form.action || '',
                        method: form.method || 'GET',
                        elements: []
                    };
                    
                    const inputs = form.querySelectorAll('input, select, textarea');
                    inputs.forEach(input => {
                        formData.elements.push({
                            type: input.type || input.tagName.toLowerCase(),
                            name: input.name || '',
                            id: input.id || '',
                            placeholder: input.placeholder || '',
                            required: input.required || false,
                            value: input.type === 'password' ? '[REDACTED]' : input.value || ''
                        });
                    });
                    
                    context.forms.push(formData);
                });
                
                // Count visible elements
                context.visibleElements = document.querySelectorAll('*').length;
                
                return context;
            }, eventType, action);
        } catch (error) {
            console.error(`❌ Error capturing action context:`, error.message);
            return {
                url: this.page.url(),
                title: await this.page.title().catch(() => ''),
                timestamp: Date.now(),
                error: error.message
            };
        }
    }
    
    async captureContext(eventType) {
        try {
            const context = {
                eventType,
                timestamp: Date.now(),
                url: this.page.url(),
                title: await this.page.title(),
                viewport: await this.page.viewportSize(),
                cookies: await this.page.context().cookies(),
                localStorage: await this.page.evaluate(() => {
                    const storage = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        storage[key] = localStorage.getItem(key);
                    }
                    return storage;
                }).catch(() => ({})),
                performance: await this.capturePerformanceSnapshot()
            };
            
            this.layers.context.push(context);
            return context;
        } catch (error) {
            console.error(`❌ Error capturing context:`, error.message);
            return { eventType, timestamp: Date.now(), error: error.message };
        }
    }
    
    async captureScreenshot(identifier, description) {
        try {
            if (Date.now() - this.lastScreenshotTime < 500) {
                // Avoid too frequent screenshots
                return null;
            }
            
            const screenshot = await this.page.screenshot({
                type: 'jpeg',
                quality: 80,
                fullPage: false
            });
            
            const screenshotData = {
                id: identifier,
                description,
                timestamp: Date.now(),
                data: screenshot.toString('base64'),
                size: screenshot.length,
                viewport: await this.page.viewportSize()
            };
            
            this.layers.screenshots.push(screenshotData);
            this.lastScreenshotTime = Date.now();
            
            return screenshotData.id;
        } catch (error) {
            console.error(`❌ Error capturing screenshot:`, error.message);
            return null;
        }
    }
    
    async captureDOMSnapshot(identifier, description) {
        try {
            const domSnapshot = await this.page.evaluate(() => {
                // Simplified DOM snapshot focusing on structure
                const snapshot = {
                    forms: [],
                    inputs: [],
                    buttons: [],
                    links: [],
                    structure: {
                        title: document.title,
                        url: window.location.href,
                        elementCount: document.querySelectorAll('*').length
                    }
                };
                
                // Capture forms
                document.querySelectorAll('form').forEach((form, index) => {
                    snapshot.forms.push({
                        index,
                        action: form.action,
                        method: form.method,
                        elementCount: form.querySelectorAll('input, select, textarea').length
                    });
                });
                
                // Capture inputs
                document.querySelectorAll('input').forEach((input, index) => {
                    snapshot.inputs.push({
                        index,
                        type: input.type,
                        name: input.name,
                        id: input.id,
                        placeholder: input.placeholder,
                        required: input.required
                    });
                });
                
                // Capture buttons
                document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach((button, index) => {
                    snapshot.buttons.push({
                        index,
                        type: button.type || 'button',
                        text: button.textContent || button.value || '',
                        name: button.name,
                        id: button.id
                    });
                });
                
                return snapshot;
            });
            
            const snapshotData = {
                id: identifier,
                description,
                timestamp: Date.now(),
                snapshot: domSnapshot
            };
            
            this.layers.domSnapshots.push(snapshotData);
            return snapshotData.id;
        } catch (error) {
            console.error(`❌ Error capturing DOM snapshot:`, error.message);
            return null;
        }
    }
    
    async capturePerformanceSnapshot() {
        if (!this.options.capturePerformance) return null;
        
        try {
            return await this.page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                
                return {
                    timestamp: Date.now(),
                    navigation: navigation ? {
                        loadEventEnd: navigation.loadEventEnd,
                        domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
                        responseEnd: navigation.responseEnd
                    } : null,
                    paint: paint.map(p => ({
                        name: p.name,
                        startTime: p.startTime
                    })),
                    memory: performance.memory ? {
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize
                    } : null
                };
            });
        } catch (error) {
            console.error(`❌ Error capturing performance:`, error.message);
            return null;
        }
    }
    
    // Smart variable detection
    async detectInputVariables(text, fieldContext, action) {
        if (!this.openai) return;
        
        try {
            // Analyze input for variable patterns
            const analysis = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [{
                    role: 'system',
                    content: `Analyze the following text input and field context to determine if this should be a variable in automation.
                    
Consider:
- Is this likely user-specific data (emails, names, passwords, CPF, phone numbers)?
- Is this data that might change between automation runs?
- What type of field is this based on the context?

Field Context: ${JSON.stringify(fieldContext, null, 2)}
Input Text: "${text}"

Respond with JSON:
{
  "isVariable": boolean,
  "variableName": "SUGGESTED_NAME",
  "variableType": "email|password|text|number|cpf|phone|url",
  "description": "What this variable represents",
  "sensitive": boolean,
  "example": "example value"
}`
                }],
                temperature: 0.1,
                max_tokens: 300
            });
            
            const result = JSON.parse(analysis.choices[0].message.content);
            
            if (result.isVariable) {
                const variableId = `var_${result.variableName.toLowerCase()}`;
                
                this.layers.variables.set(variableId, {
                    id: variableId,
                    name: result.variableName,
                    type: result.variableType,
                    description: result.description,
                    originalValue: result.sensitive ? '[REDACTED]' : text,
                    example: result.example,
                    sensitive: result.sensitive,
                    fieldContext,
                    detectedAt: action.id,
                    timestamp: Date.now()
                });
                
                console.log(`🔍 [${this.sessionId}] Detected variable: ${result.variableName} (${result.variableType})`);
            }
        } catch (error) {
            console.error(`❌ Error in smart variable detection:`, error.message);
        }
    }
    
    // Decision helpers
    shouldCaptureScreenshot(action) {
        return ['click', 'double_click', 'right_click', 'drag_end'].includes(action.type);
    }
    
    shouldCaptureDOMSnapshot(action) {
        return ['click', 'double_click'].includes(action.type);
    }
    
    shouldCaptureScreenshotForKeyboard(action) {
        return action.type === 'shortcut' || (action.key && action.key.startsWith('F'));
    }
    
    // Advanced automation generation
    async generateAdvancedAutomation() {
        console.log(`🏗️ [${this.sessionId}] Generating advanced automation from ${this.layers.actions.length} actions`);
        
        const automation = {
            id: this.recordingId,
            name: this.layers.metadata.automationName,
            description: `Advanced automation recorded on ${new Date(this.startTime).toLocaleString()}`,
            version: '2.0',
            type: 'advanced_recording',
            
            // Core automation data
            steps: this.generateStepsFromActions(),
            variables: Array.from(this.layers.variables.values()),
            
            // Multi-layer recording data
            layers: {
                screenshots: this.layers.screenshots.map(s => ({
                    id: s.id,
                    description: s.description,
                    timestamp: s.timestamp,
                    size: s.size,
                    viewport: s.viewport
                    // Note: Base64 data saved separately for size optimization
                })),
                domSnapshots: this.layers.domSnapshots,
                context: this.layers.context,
                performance: this.layers.performance,
                metadata: this.layers.metadata
            },
            
            // Analysis and insights
            insights: await this.generateInsights(),
            
            // Execution metadata
            createdAt: this.startTime,
            duration: this.layers.metadata.duration,
            actionCount: this.layers.actions.length,
            variableCount: this.layers.variables.size,
            
            // Playback options
            playbackOptions: {
                delayBetweenSteps: 1000,
                screenshotComparison: true,
                adaptiveWaiting: true,
                contextValidation: true
            }
        };
        
        return automation;
    }
    
    generateStepsFromActions() {
        const steps = [];
        let lastUrl = this.layers.metadata.initialUrl;
        
        for (const action of this.layers.actions) {
            let step = null;
            
            switch (action.type) {
                case 'navigation':
                    step = {
                        type: 'navigation',
                        instruction: `Navigate to ${action.url}`,
                        target: action.url,
                        timestamp: action.timestamp,
                        actionId: action.id
                    };
                    lastUrl = action.url;
                    break;
                    
                case 'mouse':
                    if (action.subType === 'click') {
                        step = {
                            type: 'action',
                            instruction: `Click at coordinates (${action.coordinates.x}, ${action.coordinates.y})`,
                            target: `${action.coordinates.x},${action.coordinates.y}`,
                            action: 'click',
                            timestamp: action.timestamp,
                            actionId: action.id
                        };
                    } else if (action.subType === 'scroll') {
                        step = {
                            type: 'action',
                            instruction: 'Scroll on page',
                            action: 'scroll',
                            timestamp: action.timestamp,
                            actionId: action.id
                        };
                    }
                    break;
                    
                case 'keyboard':
                    if (action.subType === 'type_text') {
                        const variableMatch = Array.from(this.layers.variables.values())
                            .find(v => v.detectedAt === action.id);
                        
                        const value = variableMatch ? `\${${variableMatch.name}}` : action.text;
                        
                        step = {
                            type: 'action',
                            instruction: `Type "${value}"`,
                            value: value,
                            action: 'type',
                            timestamp: action.timestamp,
                            actionId: action.id,
                            variableId: variableMatch?.id
                        };
                    } else if (action.subType === 'key_press') {
                        step = {
                            type: 'action',
                            instruction: `Press ${action.key}`,
                            key: action.key,
                            action: 'keypress',
                            timestamp: action.timestamp,
                            actionId: action.id
                        };
                    }
                    break;
                    
                case 'touch':
                    step = {
                        type: 'action',
                        instruction: `${action.subType} gesture`,
                        action: 'touch',
                        touchType: action.subType,
                        timestamp: action.timestamp,
                        actionId: action.id
                    };
                    break;
            }
            
            if (step) {
                steps.push(step);
            }
        }
        
        return steps;
    }
    
    async generateInsights() {
        return {
            totalDuration: this.layers.metadata.duration,
            actionBreakdown: {
                mouse: this.layers.actions.filter(a => a.type === 'mouse').length,
                keyboard: this.layers.actions.filter(a => a.type === 'keyboard').length,
                touch: this.layers.actions.filter(a => a.type === 'touch').length,
                navigation: this.layers.actions.filter(a => a.type === 'navigation').length
            },
            variableTypes: Array.from(this.layers.variables.values()).reduce((acc, v) => {
                acc[v.type] = (acc[v.type] || 0) + 1;
                return acc;
            }, {}),
            screenshotCoverage: this.layers.screenshots.length,
            pagesCovered: new Set(this.layers.context.map(c => c.url)).size,
            formInteractions: this.layers.actions.filter(a => 
                a.context?.activeElement?.tagName === 'INPUT' || 
                a.context?.activeElement?.tagName === 'TEXTAREA'
            ).length
        };
    }
    
    async saveRecording(automation) {
        try {
            const recordingsDir = path.join(__dirname, '../../recordings');
            await fs.mkdir(recordingsDir, { recursive: true });
            
            // Save main automation file
            const automationPath = path.join(recordingsDir, `${this.recordingId}.json`);
            await fs.writeFile(automationPath, JSON.stringify(automation, null, 2));
            
            // Save screenshots separately
            const screenshotsDir = path.join(recordingsDir, this.recordingId, 'screenshots');
            await fs.mkdir(screenshotsDir, { recursive: true });
            
            for (const screenshot of this.layers.screenshots) {
                const screenshotPath = path.join(screenshotsDir, `${screenshot.id}.jpg`);
                const buffer = Buffer.from(screenshot.data, 'base64');
                await fs.writeFile(screenshotPath, buffer);
            }
            
            console.log(`💾 [${this.sessionId}] Recording saved: ${automationPath}`);
            
        } catch (error) {
            console.error(`❌ Error saving recording:`, error.message);
        }
    }
    
    // Performance monitoring
    async startPerformanceMonitoring() {
        try {
            await this.page.evaluate(() => {
                if ('PerformanceObserver' in window) {
                    const observer = new PerformanceObserver((list) => {
                        window.recordingPerformanceEntries = window.recordingPerformanceEntries || [];
                        window.recordingPerformanceEntries.push(...list.getEntries());
                    });
                    observer.observe({ entryTypes: ['navigation', 'paint', 'measure'] });
                    window.recordingPerformanceObserver = observer;
                }
            });
        } catch (error) {
            console.error(`❌ Error starting performance monitoring:`, error.message);
        }
    }
    
    async performRealTimeAnalysis(action) {
        // Real-time analysis for immediate feedback
        if (action.type === 'keyboard' && action.subType === 'type_text') {
            // Check for common patterns
            const text = action.text;
            if (this.isEmailPattern(text)) {
                console.log(`📧 [${this.sessionId}] Email detected: ${text}`);
            } else if (this.isCPFPattern(text)) {
                console.log(`🆔 [${this.sessionId}] CPF detected: ${text}`);
            } else if (this.isPhonePattern(text)) {
                console.log(`📞 [${this.sessionId}] Phone number detected: ${text}`);
            }
        }
    }
    
    // Pattern detection helpers
    isEmailPattern(text) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
    }
    
    isCPFPattern(text) {
        return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(text);
    }
    
    isPhonePattern(text) {
        return /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(text);
    }
    
    async analyzeInputField(context) {
        const activeElement = context.activeElement;
        if (!activeElement) return { type: 'unknown' };
        
        const type = activeElement.type?.toLowerCase();
        const name = activeElement.name?.toLowerCase();
        const placeholder = activeElement.placeholder?.toLowerCase();
        const id = activeElement.id?.toLowerCase();
        
        // Enhanced field type detection
        if (type === 'password') return { type: 'password', sensitive: true };
        if (type === 'email') return { type: 'email', sensitive: false };
        if (type === 'tel') return { type: 'phone', sensitive: true };
        
        // Name-based detection
        if (name?.includes('email') || placeholder?.includes('email')) {
            return { type: 'email', sensitive: false };
        }
        if (name?.includes('password') || placeholder?.includes('password')) {
            return { type: 'password', sensitive: true };
        }
        if (name?.includes('cpf') || placeholder?.includes('cpf')) {
            return { type: 'cpf', sensitive: true };
        }
        if (name?.includes('phone') || name?.includes('telefone')) {
            return { type: 'phone', sensitive: true };
        }
        
        return { type: 'text', sensitive: false };
    }
    
    getRecordingStats() {
        return {
            isRecording: this.isRecording,
            recordingId: this.recordingId,
            startTime: this.startTime,
            duration: this.isRecording ? Date.now() - this.startTime : 0,
            actionCount: this.layers.actions.length,
            screenshotCount: this.layers.screenshots.length,
            variableCount: this.layers.variables.size
        };
    }
}

module.exports = AdvancedRecordingEngine; 