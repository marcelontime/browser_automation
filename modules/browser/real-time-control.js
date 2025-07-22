/**
 * Real-Time Browser Control System
 * Provides comprehensive remote control capabilities with local browser experience
 */

const AdvancedRecordingEngine = require('../recording/advanced-recording-engine');

class RealTimeScreenshotStreamer {
    constructor(page, websocket, sessionId) {
        this.page = page;
        this.ws = websocket;
        this.sessionId = sessionId;
        this.streaming = false;
        this.frameRate = 15; // 15 FPS for smooth experience
        this.quality = 80; // JPEG quality balance
        this.performanceMetrics = {
            latency: [],
            bandwidth: 0,
            cpuUsage: 0
        };
        this.adaptiveQuality = true;
    }
    
    async startStreaming() {
        if (this.streaming) return;
        
        this.streaming = true;
        console.log(`🎥 [${this.sessionId}] Starting real-time screenshot streaming at ${this.frameRate}fps`);
        
        // Start streaming loop
        this.streamLoop();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
    }
    
    async streamLoop() {
        while (this.streaming && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const startTime = Date.now();
            
            try {
                // Capture screenshot
                const screenshot = await this.page.screenshot({
                    type: 'jpeg',
                    quality: this.quality,
                    fullPage: false
                });
                
                const base64 = screenshot.toString('base64');
                const captureTime = Date.now() - startTime;
                
                // Send with metadata
                this.ws.send(JSON.stringify({
                    type: 'real_time_screenshot',
                    data: base64,
                    timestamp: Date.now(),
                    metadata: {
                        url: this.page.url(),
                        title: await this.page.title(),
                        viewport: await this.page.viewportSize(),
                        captureTime,
                        quality: this.quality,
                        frameRate: this.frameRate
                    }
                }));
                
                // Track latency
                this.performanceMetrics.latency.push(captureTime);
                if (this.performanceMetrics.latency.length > 20) {
                    this.performanceMetrics.latency.shift();
                }
                
                // Wait for next frame
                const frameDelay = Math.max(0, (1000 / this.frameRate) - captureTime);
                await new Promise(resolve => setTimeout(resolve, frameDelay));
                
            } catch (error) {
                console.error(`❌ [${this.sessionId}] Screenshot streaming error:`, error.message);
                // Retry after delay on error
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    
    startPerformanceMonitoring() {
        this.performanceInterval = setInterval(() => {
            if (this.adaptiveQuality) {
                this.adaptQuality();
            }
        }, 5000); // Every 5 seconds
    }
    
    adaptQuality() {
        const avgLatency = this.performanceMetrics.latency.slice(-10)
            .reduce((a, b) => a + b, 0) / Math.min(10, this.performanceMetrics.latency.length);
        
        console.log(`📊 [${this.sessionId}] Avg latency: ${avgLatency}ms, Quality: ${this.quality}, FPS: ${this.frameRate}`);
        
        if (avgLatency > 300) { // High latency
            this.frameRate = Math.max(5, this.frameRate - 2);
            this.quality = Math.max(50, this.quality - 10);
            console.log(`⬇️ [${this.sessionId}] Reducing quality due to high latency`);
        } else if (avgLatency < 100) { // Low latency
            this.frameRate = Math.min(30, this.frameRate + 1);
            this.quality = Math.min(90, this.quality + 5);
            console.log(`⬆️ [${this.sessionId}] Increasing quality due to low latency`);
        }
    }
    
    stopStreaming() {
        this.streaming = false;
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
        }
        console.log(`🛑 [${this.sessionId}] Stopped real-time screenshot streaming`);
    }
    
    adjustQualityForDevice(deviceType) {
        if (deviceType === 'mobile') {
            this.frameRate = Math.min(12, this.frameRate);
            this.quality = Math.min(70, this.quality);
        } else if (deviceType === 'desktop') {
            this.frameRate = Math.min(20, this.frameRate);
            this.quality = Math.min(85, this.quality);
        }
    }
}

class AdvancedInputController {
    constructor(page, websocket, sessionId, options = {}) {
        this.page = page;
        this.ws = websocket;
        this.sessionId = sessionId;
        this.inputBuffer = [];
        this.processingInput = false;
        this.lastActivity = Date.now();
        
        // Initialize advanced recording engine if recording is enabled
        if (options.recordingEnabled) {
            this.recordingEngine = new AdvancedRecordingEngine(sessionId, page, {
                captureScreenshots: true,
                captureDOMSnapshots: true,
                capturePerformance: true,
                smartVariableDetection: true,
                contextAwareness: true,
                realTimeAnalysis: true,
                openaiApiKey: options.openaiApiKey
            });
            console.log(`🎬 [${sessionId}] Advanced recording engine initialized for real-time controls`);
        }
    }
    
    // Enhanced mouse controls with all gestures
    async handleMouseEvent(event) {
        const { type, x, y, button, modifiers, deltaX, deltaY, pressure } = event;
        
        console.log(`🖱️ [${this.sessionId}] Mouse ${type} at (${x}, ${y})`);
        this.lastActivity = Date.now();
        
        try {
            switch (type) {
                case 'click':
                    await this.page.mouse.click(x, y, { 
                        button: button || 'left',
                        modifiers: modifiers || [],
                        clickCount: 1
                    });
                    break;
                    
                case 'double_click':
                    await this.page.mouse.click(x, y, { 
                        button: button || 'left',
                        clickCount: 2
                    });
                    break;
                    
                case 'right_click':
                    await this.page.mouse.click(x, y, { button: 'right' });
                    break;
                    
                case 'middle_click':
                    await this.page.mouse.click(x, y, { button: 'middle' });
                    break;
                    
                case 'mouse_down':
                    await this.page.mouse.down({ button: button || 'left' });
                    break;
                    
                case 'mouse_up':
                    await this.page.mouse.up({ button: button || 'left' });
                    break;
                    
                case 'mouse_move':
                case 'hover':
                    await this.page.mouse.move(x, y);
                    if (type === 'hover') {
                        await this.addHoverEffect(x, y);
                    }
                    break;
                    
                case 'drag_start':
                    await this.page.mouse.move(x, y);
                    await this.page.mouse.down();
                    await this.addDragEffect(x, y, 'start');
                    break;
                    
                case 'drag_move':
                    await this.page.mouse.move(x, y);
                    await this.addDragEffect(x, y, 'move');
                    break;
                    
                case 'drag_end':
                    await this.page.mouse.up();
                    await this.addDragEffect(x, y, 'end');
                    break;
                    
                case 'scroll':
                    await this.page.mouse.wheel(deltaX || 0, deltaY || 0);
                    break;
                    
                case 'zoom':
                    // Simulate Ctrl+Scroll for zoom
                    await this.page.keyboard.down('Control');
                    await this.page.mouse.wheel(0, deltaY || 0);
                    await this.page.keyboard.up('Control');
                    break;
            }
            
            // Record action for automation if recording is active
            if (this.recordingEngine?.isRecording) {
                await this.recordingEngine.recordMouseAction({
                    type,
                    coordinates: { x, y },
                    button,
                    modifiers,
                    timestamp: Date.now()
                });
            }
            
            // Send success confirmation
            this.sendResponse('mouse_action_completed', {
                type,
                coordinates: { x, y },
                success: true
            });
            
        } catch (error) {
            console.error(`❌ [${this.sessionId}] Mouse ${type} error:`, error.message);
            this.sendResponse('mouse_action_error', {
                type,
                error: error.message
            });
        }
    }
    
    // Enhanced keyboard controls with all shortcuts
    async handleKeyboardEvent(event) {
        const { type, key, text, modifiers } = event;
        
        console.log(`⌨️ [${this.sessionId}] Keyboard ${type}: ${key || text}`);
        this.lastActivity = Date.now();
        
        try {
            switch (type) {
                case 'key_down':
                    await this.page.keyboard.down(key, { modifiers });
                    break;
                    
                case 'key_up':
                    await this.page.keyboard.up(key);
                    break;
                    
                case 'key_press':
                    await this.page.keyboard.press(key, { modifiers });
                    break;
                    
                case 'type_text':
                    await this.page.keyboard.type(text, { delay: 50 });
                    break;
                    
                case 'shortcut':
                    await this.handleComplexShortcut(key);
                    break;
                    
                case 'function_key':
                    await this.handleFunctionKey(key);
                    break;
            }
            
            // Record action for automation if recording is active
            if (this.recordingEngine?.isRecording) {
                await this.recordingEngine.recordKeyboardAction({
                    type,
                    key,
                    text,
                    modifiers,
                    timestamp: Date.now()
                });
            }
            
            this.sendResponse('keyboard_action_completed', {
                type,
                key: key || text,
                success: true
            });
            
        } catch (error) {
            console.error(`❌ [${this.sessionId}] Keyboard ${type} error:`, error.message);
            this.sendResponse('keyboard_action_error', {
                type,
                error: error.message
            });
        }
    }
    
    async handleComplexShortcut(shortcut) {
        // Handle complex shortcuts like Ctrl+Shift+I, Alt+Tab, etc.
        const keys = shortcut.split('+').map(k => k.trim());
        
        // Press modifier keys first
        const modifiers = keys.slice(0, -1);
        const mainKey = keys[keys.length - 1];
        
        for (const modifier of modifiers) {
            await this.page.keyboard.down(modifier);
        }
        
        await this.page.keyboard.press(mainKey);
        
        // Release modifiers in reverse order
        for (const modifier of modifiers.reverse()) {
            await this.page.keyboard.up(modifier);
        }
    }
    
    async handleFunctionKey(key) {
        // Special handling for function keys
        switch (key) {
            case 'F5':
                await this.page.reload();
                break;
            case 'F11':
                // Toggle fullscreen (browser specific)
                await this.page.keyboard.press('F11');
                break;
            case 'F12':
                // Open developer tools
                await this.page.keyboard.press('F12');
                break;
            default:
                await this.page.keyboard.press(key);
        }
    }
    
    // Touch and gesture support for mobile devices
    async handleTouchEvent(event) {
        const { type, touches, center, scale, rotation } = event;
        
        console.log(`👆 [${this.sessionId}] Touch ${type}`);
        this.lastActivity = Date.now();
        
        try {
            switch (type) {
                case 'tap':
                case 'touch_start':
                    const { x, y } = touches[0];
                    await this.page.touchscreen.tap(x, y);
                    break;
                    
                case 'long_press':
                    const { x: lpX, y: lpY } = touches[0];
                    await this.simulateLongPress(lpX, lpY);
                    break;
                    
                case 'pinch_zoom':
                    await this.simulatePinchZoom(center, scale);
                    break;
                    
                case 'swipe':
                    await this.simulateSwipe(touches[0], touches[1]);
                    break;
                    
                case 'rotate':
                    await this.simulateRotation(center, rotation);
                    break;
                    
                case 'two_finger_scroll':
                    await this.simulateTwoFingerScroll(touches[0], touches[1]);
                    break;
            }
            
            // Record action for automation if recording is active
            if (this.recordingEngine?.isRecording) {
                await this.recordingEngine.recordTouchAction({
                    type,
                    touches,
                    center,
                    scale,
                    rotation,
                    timestamp: Date.now()
                });
            }
            
            this.sendResponse('touch_action_completed', {
                type,
                success: true
            });
            
        } catch (error) {
            console.error(`❌ [${this.sessionId}] Touch ${type} error:`, error.message);
            this.sendResponse('touch_action_error', {
                type,
                error: error.message
            });
        }
    }
    
    // Visual feedback methods
    async addHoverEffect(x, y) {
        await this.page.evaluate((x, y) => {
            // Remove existing hover indicator
            const existing = document.getElementById('remote-hover-indicator');
            if (existing) existing.remove();
            
            // Add new hover indicator
            const indicator = document.createElement('div');
            indicator.id = 'remote-hover-indicator';
            indicator.style.cssText = `
                position: fixed;
                left: ${x - 15}px;
                top: ${y - 15}px;
                width: 30px;
                height: 30px;
                border: 3px solid #3b82f6;
                border-radius: 50%;
                background: rgba(59, 130, 246, 0.1);
                pointer-events: none;
                z-index: 999999;
                animation: pulse 1s infinite;
                box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
            `;
            
            // Add CSS animation
            if (!document.getElementById('remote-control-styles')) {
                const style = document.createElement('style');
                style.id = 'remote-control-styles';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 0.8; }
                        50% { transform: scale(1.1); opacity: 1; }
                    }
                    @keyframes dragTrail {
                        0% { opacity: 1; transform: scale(1); }
                        100% { opacity: 0; transform: scale(0.5); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(indicator);
            
            // Auto-remove after 2 seconds
            setTimeout(() => {
                if (document.getElementById('remote-hover-indicator')) {
                    document.getElementById('remote-hover-indicator').remove();
                }
            }, 2000);
        }, x, y);
    }
    
    async addDragEffect(x, y, phase) {
        await this.page.evaluate((x, y, phase) => {
            if (phase === 'start') {
                const dragIndicator = document.createElement('div');
                dragIndicator.id = 'remote-drag-indicator';
                dragIndicator.style.cssText = `
                    position: fixed;
                    left: ${x - 10}px;
                    top: ${y - 10}px;
                    width: 20px;
                    height: 20px;
                    border: 2px solid #f59e0b;
                    border-radius: 50%;
                    background: rgba(245, 158, 11, 0.3);
                    pointer-events: none;
                    z-index: 999999;
                `;
                document.body.appendChild(dragIndicator);
            } else if (phase === 'move') {
                const indicator = document.getElementById('remote-drag-indicator');
                if (indicator) {
                    indicator.style.left = `${x - 10}px`;
                    indicator.style.top = `${y - 10}px`;
                    
                    // Add trail effect
                    const trail = document.createElement('div');
                    trail.style.cssText = `
                        position: fixed;
                        left: ${x - 5}px;
                        top: ${y - 5}px;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        background: rgba(245, 158, 11, 0.5);
                        pointer-events: none;
                        z-index: 999998;
                        animation: dragTrail 0.5s ease-out forwards;
                    `;
                    document.body.appendChild(trail);
                    
                    setTimeout(() => trail.remove(), 500);
                }
            } else if (phase === 'end') {
                const indicator = document.getElementById('remote-drag-indicator');
                if (indicator) indicator.remove();
            }
        }, x, y, phase);
    }
    
    async simulateLongPress(x, y) {
        await this.page.mouse.move(x, y);
        await this.page.mouse.down();
        await new Promise(resolve => setTimeout(resolve, 800)); // 800ms press
        await this.page.mouse.up();
    }
    
    async simulatePinchZoom(center, scale) {
        // Simulate pinch zoom using Ctrl+Scroll
        await this.page.keyboard.down('Control');
        const deltaY = scale > 1 ? -100 : 100; // Zoom in/out
        await this.page.mouse.wheel(0, deltaY);
        await this.page.keyboard.up('Control');
    }
    
    async simulateSwipe(startTouch, endTouch) {
        await this.page.mouse.move(startTouch.x, startTouch.y);
        await this.page.mouse.down();
        await this.page.mouse.move(endTouch.x, endTouch.y, { steps: 10 });
        await this.page.mouse.up();
    }
    
    async simulateRotation(center, rotation) {
        // Browser rotation simulation - limited support
        await this.page.evaluate((rotation) => {
            document.body.style.transform = `rotate(${rotation}deg)`;
            setTimeout(() => {
                document.body.style.transform = '';
            }, 1000);
        }, rotation);
    }
    
    async simulateTwoFingerScroll(touch1, touch2) {
        const centerX = (touch1.x + touch2.x) / 2;
        const centerY = (touch1.y + touch2.y) / 2;
        const deltaY = touch2.y - touch1.y;
        
        await this.page.mouse.move(centerX, centerY);
        await this.page.mouse.wheel(0, deltaY);
    }
    
    sendResponse(type, data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type,
                sessionId: this.sessionId,
                data,
                timestamp: Date.now()
            }));
        }
    }
    
    getLastActivity() {
        return this.lastActivity;
    }
}

class RealTimeControlManager {
    constructor() {
        this.sessions = new Map();
        this.streamers = new Map();
        this.inputControllers = new Map();
    }
    
    createSession(sessionId, page, websocket, options = {}) {
        console.log(`🎮 [${sessionId}] Creating real-time control session`);
        
        // Create screenshot streamer
        const streamer = new RealTimeScreenshotStreamer(page, websocket, sessionId);
        if (options.deviceType) {
            streamer.adjustQualityForDevice(options.deviceType);
        }
        
        // Create input controller
        const inputController = new AdvancedInputController(
            page, 
            websocket, 
            sessionId, 
            {
                recordingEnabled: options.recordingEnabled || false,
                openaiApiKey: options.openaiApiKey
            }
        );
        
        // Store components
        this.streamers.set(sessionId, streamer);
        this.inputControllers.set(sessionId, inputController);
        
        // Create session object
        const session = {
            sessionId,
            page,
            websocket,
            streamer,
            inputController,
            options,
            createdAt: Date.now(),
            active: true
        };
        
        this.sessions.set(sessionId, session);
        
        console.log(`✅ [${sessionId}] Real-time control session created`);
        return session;
    }
    
    async startSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        
        console.log(`▶️ [${sessionId}] Starting real-time control session`);
        
        // Start screenshot streaming
        await session.streamer.startStreaming();
        
        session.active = true;
        
        // Send confirmation to client
        session.websocket.send(JSON.stringify({
            type: 'real_time_control_started',
            sessionId,
            capabilities: {
                mouse: ['click', 'double_click', 'right_click', 'drag', 'scroll', 'hover'],
                keyboard: ['type', 'shortcuts', 'function_keys'],
                touch: ['tap', 'long_press', 'pinch_zoom', 'swipe'],
                streaming: {
                    frameRate: session.streamer.frameRate,
                    quality: session.streamer.quality
                }
            }
        }));
        
        console.log(`✅ [${sessionId}] Real-time control session started`);
    }
    
    async stopSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        console.log(`⏹️ [${sessionId}] Stopping real-time control session`);
        
        // Stop streaming
        session.streamer.stopStreaming();
        
        session.active = false;
        
        // Send confirmation to client
        if (session.websocket && session.websocket.readyState === WebSocket.OPEN) {
            session.websocket.send(JSON.stringify({
                type: 'real_time_control_stopped',
                sessionId
            }));
        }
        
        console.log(`✅ [${sessionId}] Real-time control session stopped`);
    }
    
    async cleanupSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;
        
        console.log(`🧹 [${sessionId}] Cleaning up real-time control session`);
        
        // Stop streaming
        session.streamer.stopStreaming();
        
        // Remove from maps
        this.sessions.delete(sessionId);
        this.streamers.delete(sessionId);
        this.inputControllers.delete(sessionId);
        
        console.log(`✅ [${sessionId}] Real-time control session cleaned up`);
    }
    
    handleMouseEvent(sessionId, event) {
        const inputController = this.inputControllers.get(sessionId);
        if (inputController) {
            return inputController.handleMouseEvent(event);
        }
        throw new Error(`Session ${sessionId} not found`);
    }
    
    handleKeyboardEvent(sessionId, event) {
        const inputController = this.inputControllers.get(sessionId);
        if (inputController) {
            return inputController.handleKeyboardEvent(event);
        }
        throw new Error(`Session ${sessionId} not found`);
    }
    
    handleTouchEvent(sessionId, event) {
        const inputController = this.inputControllers.get(sessionId);
        if (inputController) {
            return inputController.handleTouchEvent(event);
        }
        throw new Error(`Session ${sessionId} not found`);
    }
    
    getSessionInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        return {
            sessionId: session.sessionId,
            active: session.active,
            createdAt: session.createdAt,
            lastActivity: session.inputController.getLastActivity(),
            streaming: {
                frameRate: session.streamer.frameRate,
                quality: session.streamer.quality,
                isStreaming: session.streamer.streaming
            }
        };
    }
    
    getAllSessions() {
        return Array.from(this.sessions.values()).map(session => ({
            sessionId: session.sessionId,
            active: session.active,
            createdAt: session.createdAt,
            lastActivity: session.inputController.getLastActivity()
        }));
    }
    
    // Advanced recording controls
    async startRecording(sessionId, automationName = 'Remote Control Recording') {
        const session = this.sessions.get(sessionId);
        if (!session || !session.inputController.recordingEngine) {
            throw new Error(`Session ${sessionId} not found or recording not enabled`);
        }
        
        console.log(`🎬 [${sessionId}] Starting advanced recording: ${automationName}`);
        
        const success = await session.inputController.recordingEngine.startRecording(automationName);
        
        if (success) {
            // Send confirmation to client
            session.websocket.send(JSON.stringify({
                type: 'advanced_recording_started',
                sessionId,
                automationName,
                capabilities: {
                    multiLayer: true,
                    smartVariables: true,
                    contextCapture: true,
                    performanceTracking: true,
                    realTimeAnalysis: true
                }
            }));
        }
        
        return success;
    }
    
    async stopRecording(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.inputController.recordingEngine) {
            throw new Error(`Session ${sessionId} not found or recording not enabled`);
        }
        
        console.log(`🛑 [${sessionId}] Stopping advanced recording`);
        
        const automation = await session.inputController.recordingEngine.stopRecording();
        
        if (automation) {
            // Send automation data to client
            session.websocket.send(JSON.stringify({
                type: 'advanced_recording_completed',
                sessionId,
                automation: {
                    id: automation.id,
                    name: automation.name,
                    description: automation.description,
                    stepCount: automation.steps.length,
                    variableCount: automation.variableCount,
                    duration: automation.duration,
                    insights: automation.insights
                }
            }));
        }
        
        return automation;
    }
    
    async recordNavigationAction(sessionId, url, context = {}) {
        const session = this.sessions.get(sessionId);
        if (session && session.inputController.recordingEngine?.isRecording) {
            await session.inputController.recordingEngine.recordNavigationAction(url, context);
        }
    }
    
    getRecordingStats(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session && session.inputController.recordingEngine) {
            return session.inputController.recordingEngine.getRecordingStats();
        }
        return null;
    }
    
    isRecordingEnabled(sessionId) {
        const session = this.sessions.get(sessionId);
        return !!(session && session.inputController.recordingEngine);
    }
    
    isCurrentlyRecording(sessionId) {
        const session = this.sessions.get(sessionId);
        return session?.inputController.recordingEngine?.isRecording || false;
    }
}

module.exports = {
    RealTimeScreenshotStreamer,
    AdvancedInputController,
    RealTimeControlManager
}; 