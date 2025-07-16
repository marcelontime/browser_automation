const { RecordingSession, Variable, VariableTypes } = require('../storage/models');
const VariableAnalyzer = require('../analysis/variable-analyzer');
const ElementContextAnalyzer = require('../analysis/element-context-analyzer');
const ValidationRuleGenerator = require('../analysis/validation-rule-generator');

/**
 * 📹 ENHANCED RECORDER
 * 
 * Main recording orchestrator that integrates with Stagehand engine
 * to provide intelligent recording with variable detection and analysis
 */
class EnhancedRecorder {
    constructor(automationEngine, storageManager, options = {}) {
        this.automationEngine = automationEngine;
        this.storageManager = storageManager;
        
        this.options = {
            enableVariableDetection: options.enableVariableDetection !== false,
            sensitiveDataHandling: options.sensitiveDataHandling || 'flag', // 'mask', 'exclude', 'flag'
            patternDetectionLevel: options.patternDetectionLevel || 'advanced', // 'basic', 'advanced', 'comprehensive'
            autoSaveInterval: options.autoSaveInterval || 30000, // 30 seconds
            maxRecordingDuration: options.maxRecordingDuration || 3600000, // 1 hour
            ...options
        };
        
        // Recording state
        this.activeRecordings = new Map(); // sessionId -> recordingData
        this.recordingStats = {
            totalRecordings: 0,
            totalActions: 0,
            totalVariables: 0,
            averageRecordingDuration: 0
        };
        
        // Analysis components
        this.variableAnalyzer = new VariableAnalyzer({
            confidenceThreshold: 0.7,
            enableAdvancedPatterns: this.options.patternDetectionLevel !== 'basic',
            sensitiveDataDetection: this.options.sensitiveDataHandling !== 'exclude'
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
        
        // Set up auto-save interval
        this.setupAutoSave();
    }

    /**
     * Start a new recording session
     */
    async startRecording(sessionId, automationId, options = {}) {
        if (this.activeRecordings.has(sessionId)) {
            throw new Error(`Recording session ${sessionId} is already active`);
        }

        console.log(`📹 Starting enhanced recording session: ${sessionId} for automation: ${automationId}`);
        
        try {
            // Create recording session
            const recordingSession = new RecordingSession({
                automationId: automationId,
                sessionId: sessionId,
                metadata: {
                    options: { ...this.options, ...options },
                    startedBy: options.userId || 'unknown',
                    userAgent: options.userAgent || 'unknown',
                    initialUrl: options.initialUrl || '',
                    recordingMode: options.recordingMode || 'automatic'
                }
            });
            
            // Initialize recording data
            const recordingData = {
                session: recordingSession,
                actions: [],
                detectedVariables: [],
                lastSaved: Date.now(),
                eventListeners: new Set(),
                analysisQueue: []
            };
            
            this.activeRecordings.set(sessionId, recordingData);
            
            // Start recording in automation engine
            await this.automationEngine.startRecording(automationId, options);
            
            // Set up session monitoring
            this.setupSessionMonitoring(sessionId);
            
            // Save initial session
            await this.storageManager.saveRecordingSession(recordingSession);
            
            console.log(`✅ Recording session started: ${sessionId}`);
            
            this.recordingStats.totalRecordings++;
            
            return recordingSession;
            
        } catch (error) {
            console.error(`❌ Error starting recording session ${sessionId}:`, error.message);
            this.activeRecordings.delete(sessionId);
            throw error;
        }
    }

    /**
     * Stop a recording session
     */
    async stopRecording(sessionId) {
        const recordingData = this.activeRecordings.get(sessionId);
        if (!recordingData) {
            throw new Error(`No active recording session found: ${sessionId}`);
        }

        console.log(`⏹️ Stopping recording session: ${sessionId}`);
        
        try {
            // Stop recording in automation engine
            const engineResult = await this.automationEngine.stopRecording();
            
            // Update recording data with engine results
            recordingData.actions = engineResult.actions || [];
            recordingData.session.actionsCaptured = recordingData.actions.length;
            
            // Perform final variable analysis
            const finalVariables = await this.performFinalAnalysis(recordingData);
            recordingData.detectedVariables = finalVariables;
            recordingData.session.variablesDetected = finalVariables.length;
            
            // Complete the session
            recordingData.session.complete();
            
            // Save final session state
            await this.storageManager.saveRecordingSession(recordingData.session);
            
            // Save detected variables
            for (const variable of finalVariables) {
                variable.automationId = recordingData.session.automationId;
                await this.storageManager.saveVariable(variable);
            }
            
            // Clean up
            this.cleanupSession(sessionId);
            
            // Update statistics
            this.updateRecordingStats(recordingData);
            
            const result = {
                session: recordingData.session,
                actions: recordingData.actions,
                variables: finalVariables,
                actionCount: recordingData.actions.length,
                variableCount: finalVariables.length,
                duration: recordingData.session.completedAt ? 
                    new Date(recordingData.session.completedAt).getTime() - 
                    new Date(recordingData.session.startedAt).getTime() : 0
            };
            
            console.log(`✅ Recording session completed: ${sessionId} - ${result.actionCount} actions, ${result.variableCount} variables`);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error stopping recording session ${sessionId}:`, error.message);
            
            // Mark session as failed
            recordingData.session.fail(error.message);
            await this.storageManager.saveRecordingSession(recordingData.session);
            
            this.cleanupSession(sessionId);
            throw error;
        }
    }

    /**
     * Pause a recording session
     */
    async pauseRecording(sessionId) {
        const recordingData = this.activeRecordings.get(sessionId);
        if (!recordingData) {
            throw new Error(`No active recording session found: ${sessionId}`);
        }

        recordingData.session.status = 'paused';
        recordingData.session.metadata.pausedAt = new Date().toISOString();
        
        await this.storageManager.saveRecordingSession(recordingData.session);
        
        console.log(`⏸️ Recording session paused: ${sessionId}`);
    }

    /**
     * Resume a paused recording session
     */
    async resumeRecording(sessionId) {
        const recordingData = this.activeRecordings.get(sessionId);
        if (!recordingData) {
            throw new Error(`No active recording session found: ${sessionId}`);
        }

        recordingData.session.status = 'active';
        recordingData.session.metadata.resumedAt = new Date().toISOString();
        
        await this.storageManager.saveRecordingSession(recordingData.session);
        
        console.log(`▶️ Recording session resumed: ${sessionId}`);
    }

    /**
     * Add an action to a recording session
     */
    async addAction(sessionId, action) {
        const recordingData = this.activeRecordings.get(sessionId);
        if (!recordingData || recordingData.session.status !== 'active') {
            return; // Ignore actions if not actively recording
        }

        try {
            // Process and enhance the action
            const enhancedAction = await this.enhanceAction(action);
            
            // Add to recording data
            recordingData.actions.push(enhancedAction);
            recordingData.session.addAction(enhancedAction);
            
            // Queue for variable analysis if it's a typing action
            if (enhancedAction.type === 'type' && enhancedAction.value) {
                recordingData.analysisQueue.push(enhancedAction);
            }
            
            // Perform real-time analysis for immediate feedback
            if (this.options.enableVariableDetection) {
                await this.performRealtimeAnalysis(recordingData, enhancedAction);
            }
            
            console.log(`📝 Action added to recording ${sessionId}: ${enhancedAction.type}`);
            
        } catch (error) {
            console.error(`❌ Error adding action to recording ${sessionId}:`, error.message);
        }
    }

    /**
     * Enhance an action with additional metadata
     */
    async enhanceAction(action) {
        const enhanced = {
            ...action,
            id: action.id || Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            timestamp: action.timestamp || Date.now(),
            enhanced: true
        };
        
        // Add element context if available
        if (action.element) {
            try {
                const contextAnalysis = this.elementContextAnalyzer.analyzeElementContext(action.element);
                enhanced.elementContext = contextAnalysis.context;
                enhanced.elementSemantics = contextAnalysis.semantics;
            } catch (error) {
                console.warn('⚠️ Could not analyze element context:', error.message);
            }
        }
        
        // Add screenshot for important actions
        if (['click', 'submit', 'navigate'].includes(enhanced.type)) {
            try {
                enhanced.screenshot = await this.automationEngine.takeScreenshot();
            } catch (error) {
                console.warn('⚠️ Could not capture screenshot for action');
            }
        }
        
        return enhanced;
    }

    /**
     * Perform real-time variable analysis during recording
     */
    async performRealtimeAnalysis(recordingData, action) {
        if (action.type !== 'type' || !action.value) {
            return;
        }

        try {
            // Quick variable detection for immediate feedback
            const candidates = await this.variableAnalyzer.analyzeInputValue(action);
            
            for (const candidate of candidates) {
                if (candidate.confidence >= 0.8) { // High confidence threshold for real-time
                    // Check if we already detected this variable
                    const existing = recordingData.detectedVariables.find(v => 
                        v.value === candidate.value && v.type === candidate.type
                    );
                    
                    if (!existing) {
                        const variable = new Variable({
                            ...candidate,
                            automationId: recordingData.session.automationId
                        });
                        
                        recordingData.detectedVariables.push(variable);
                        recordingData.session.addDetectedVariable(variable);
                        
                        console.log(`🔍 Real-time variable detected: ${variable.name} (${variable.type})`);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error in real-time analysis:', error.message);
        }
    }

    /**
     * Perform final comprehensive analysis
     */
    async performFinalAnalysis(recordingData) {
        console.log(`🔍 Performing final analysis for recording session: ${recordingData.session.sessionId}`);
        
        try {
            // Comprehensive variable analysis
            const allVariables = await this.variableAnalyzer.analyzeRecording(recordingData.actions);
            
            // Enhance variables with context and validation
            const enhancedVariables = [];
            for (const candidate of allVariables) {
                // Context analysis
                const contextAnalysis = this.elementContextAnalyzer.analyzeElementContext(
                    candidate.element,
                    candidate.value
                );
                
                // Validation rules
                const validationRules = this.validationRuleGenerator.generateValidationRules(
                    candidate.type,
                    candidate.value,
                    contextAnalysis.context
                );
                
                // Create enhanced variable
                const variable = new Variable({
                    ...candidate,
                    name: contextAnalysis.recommendedName || candidate.name,
                    description: candidate.description || contextAnalysis.semantics.purpose,
                    validation: validationRules,
                    elementInfo: {
                        ...candidate.element,
                        context: contextAnalysis.context,
                        relationships: contextAnalysis.relationships,
                        semantics: contextAnalysis.semantics
                    }
                });
                
                enhancedVariables.push(variable);
            }
            
            // Merge with real-time detected variables
            const finalVariables = this.mergeVariables(enhancedVariables, recordingData.detectedVariables);
            
            console.log(`✅ Final analysis completed: ${finalVariables.length} variables detected`);
            return finalVariables;
            
        } catch (error) {
            console.error('❌ Error in final analysis:', error.message);
            return recordingData.detectedVariables; // Return real-time variables as fallback
        }
    }

    /**
     * Merge variables from different analysis phases
     */
    mergeVariables(comprehensiveVariables, realtimeVariables) {
        const merged = new Map();
        
        // Add comprehensive variables (higher quality)
        for (const variable of comprehensiveVariables) {
            const key = `${variable.value}_${variable.type}`;
            merged.set(key, variable);
        }
        
        // Add real-time variables that weren't found in comprehensive analysis
        for (const variable of realtimeVariables) {
            const key = `${variable.value}_${variable.type}`;
            if (!merged.has(key)) {
                merged.set(key, variable);
            }
        }
        
        return Array.from(merged.values());
    }

    /**
     * Set up session monitoring for timeouts and auto-save
     */
    setupSessionMonitoring(sessionId) {
        const recordingData = this.activeRecordings.get(sessionId);
        if (!recordingData) return;
        
        // Set up maximum recording duration timeout
        const timeoutId = setTimeout(async () => {
            console.log(`⏰ Recording session ${sessionId} reached maximum duration, stopping...`);
            try {
                await this.stopRecording(sessionId);
            } catch (error) {
                console.error(`❌ Error auto-stopping recording ${sessionId}:`, error.message);
            }
        }, this.options.maxRecordingDuration);
        
        recordingData.timeoutId = timeoutId;
    }

    /**
     * Set up auto-save functionality
     */
    setupAutoSave() {
        setInterval(async () => {
            await this.autoSaveActiveSessions();
        }, this.options.autoSaveInterval);
    }

    /**
     * Auto-save all active recording sessions
     */
    async autoSaveActiveSessions() {
        for (const [sessionId, recordingData] of this.activeRecordings) {
            try {
                const now = Date.now();
                if (now - recordingData.lastSaved > this.options.autoSaveInterval) {
                    await this.storageManager.saveRecordingSession(recordingData.session);
                    recordingData.lastSaved = now;
                    console.log(`💾 Auto-saved recording session: ${sessionId}`);
                }
            } catch (error) {
                console.error(`❌ Error auto-saving recording ${sessionId}:`, error.message);
            }
        }
    }

    /**
     * Clean up a recording session
     */
    cleanupSession(sessionId) {
        const recordingData = this.activeRecordings.get(sessionId);
        if (recordingData) {
            // Clear timeout
            if (recordingData.timeoutId) {
                clearTimeout(recordingData.timeoutId);
            }
            
            // Remove from active recordings
            this.activeRecordings.delete(sessionId);
            
            console.log(`🧹 Cleaned up recording session: ${sessionId}`);
        }
    }

    /**
     * Update recording statistics
     */
    updateRecordingStats(recordingData) {
        this.recordingStats.totalActions += recordingData.actions.length;
        this.recordingStats.totalVariables += recordingData.detectedVariables.length;
        
        // Update average duration
        const duration = recordingData.session.completedAt ? 
            new Date(recordingData.session.completedAt).getTime() - 
            new Date(recordingData.session.startedAt).getTime() : 0;
            
        const totalRecordings = this.recordingStats.totalRecordings;
        this.recordingStats.averageRecordingDuration = 
            (this.recordingStats.averageRecordingDuration * (totalRecordings - 1) + duration) / totalRecordings;
    }

    /**
     * Get recording session status
     */
    getRecordingStatus(sessionId) {
        const recordingData = this.activeRecordings.get(sessionId);
        if (!recordingData) {
            return null;
        }
        
        return {
            sessionId: sessionId,
            automationId: recordingData.session.automationId,
            status: recordingData.session.status,
            startedAt: recordingData.session.startedAt,
            actionCount: recordingData.actions.length,
            variableCount: recordingData.detectedVariables.length,
            duration: Date.now() - new Date(recordingData.session.startedAt).getTime()
        };
    }

    /**
     * Get all active recording sessions
     */
    getActiveRecordings() {
        const active = [];
        for (const [sessionId, recordingData] of this.activeRecordings) {
            active.push(this.getRecordingStatus(sessionId));
        }
        return active;
    }

    /**
     * Get recording statistics
     */
    getRecordingStats() {
        return {
            ...this.recordingStats,
            activeRecordings: this.activeRecordings.size,
            options: this.options
        };
    }

    /**
     * Clean up all resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Enhanced Recorder...');
        
        // Stop all active recordings
        const activeSessionIds = Array.from(this.activeRecordings.keys());
        for (const sessionId of activeSessionIds) {
            try {
                await this.stopRecording(sessionId);
            } catch (error) {
                console.error(`❌ Error stopping recording ${sessionId} during cleanup:`, error.message);
            }
        }
        
        console.log('✅ Enhanced Recorder cleanup completed');
    }
}

module.exports = EnhancedRecorder;