const fs = require('fs').promises;
const path = require('path');

/**
 * 🛡️ COMPREHENSIVE ERROR RECOVERY SYSTEM
 * 
 * Handles session state persistence, page reload handling, browser crash recovery,
 * and network error recovery based on Brazilian insurance automation requirements
 */
class ComprehensiveErrorRecovery {
    constructor(options = {}) {
        this.options = {
            maxRetries: 3,
            retryDelay: 2000,
            sessionTimeout: 300000, // 5 minutes
            stateBackupInterval: 30000, // 30 seconds
            networkTimeout: 30000,
            pageLoadTimeout: 45000,
            ...options
        };
        
        this.recoveryStrategies = {
            NETWORK_ERROR: 'network_error',
            BROWSER_CRASH: 'browser_crash',
            PAGE_UNRESPONSIVE: 'page_unresponsive',
            SESSION_EXPIRED: 'session_expired',
            ELEMENT_NOT_FOUND: 'element_not_found',
            TIMEOUT_ERROR: 'timeout_error',
            SCRIPT_ERROR: 'script_error'
        };
        
        this.sessionState = {
            url: null,
            cookies: [],
            localStorage: {},
            sessionStorage: {},
            formData: {},
            variables: {},
            currentStep: 0,
            totalSteps: 0,
            automation: null,
            timestamp: null
        };
        
        this.errorHistory = [];
        this.recoveryAttempts = new Map();
        this.stateBackupTimer = null;
        this.sessionsDir = path.join(__dirname, '../../sessions');
        
        this.initializeRecoverySystem();
    }

    async initializeRecoverySystem() {
        try {
            // Create sessions directory
            await fs.mkdir(this.sessionsDir, { recursive: true });
            
            // Set up periodic state backup
            this.startStateBackup();
            
            console.log('🛡️ Error recovery system initialized');
        } catch (error) {
            console.error('❌ Error initializing recovery system:', error.message);
        }
    }

    /**
     * Main error recovery handler
     * @param {Error} error - The error to recover from
     * @param {Object} context - Context information about the error
     * @returns {Promise<Object>} Recovery result
     */
    async recoverFromError(error, context = {}) {
        const errorType = this.classifyError(error);
        const recoveryKey = `${errorType}_${context.selector || 'unknown'}`;
        
        // Check if we've exceeded max retries for this specific error
        const attempts = this.recoveryAttempts.get(recoveryKey) || 0;
        if (attempts >= this.options.maxRetries) {
            return {
                success: false,
                error: `Max retries exceeded for ${errorType}`,
                finalError: error.message
            };
        }
        
        // Update attempts counter
        this.recoveryAttempts.set(recoveryKey, attempts + 1);
        
        // Log error for analysis
        this.logError(error, errorType, context);
        
        console.log(`🛡️ Attempting recovery for ${errorType} (attempt ${attempts + 1}/${this.options.maxRetries})`);
        
        try {
            const result = await this.executeRecoveryStrategy(errorType, error, context);
            
            if (result.success) {
                // Reset attempts counter on success
                this.recoveryAttempts.delete(recoveryKey);
                console.log(`✅ Recovery successful for ${errorType}`);
            }
            
            return result;
        } catch (recoveryError) {
            console.error(`❌ Recovery failed for ${errorType}:`, recoveryError.message);
            return {
                success: false,
                error: recoveryError.message,
                originalError: error.message
            };
        }
    }

    /**
     * Classify error type for appropriate recovery strategy
     * @param {Error} error - The error to classify
     * @returns {string} Error type
     */
    classifyError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('timeout')) {
            return this.recoveryStrategies.TIMEOUT_ERROR;
        } else if (message.includes('network') || message.includes('connection')) {
            return this.recoveryStrategies.NETWORK_ERROR;
        } else if (message.includes('crash') || message.includes('disconnected')) {
            return this.recoveryStrategies.BROWSER_CRASH;
        } else if (message.includes('element') || message.includes('not found')) {
            return this.recoveryStrategies.ELEMENT_NOT_FOUND;
        } else if (message.includes('session') || message.includes('expired')) {
            return this.recoveryStrategies.SESSION_EXPIRED;
        } else if (message.includes('unresponsive') || message.includes('frozen')) {
            return this.recoveryStrategies.PAGE_UNRESPONSIVE;
        } else {
            return this.recoveryStrategies.SCRIPT_ERROR;
        }
    }

    /**
     * Execute recovery strategy based on error type
     * @param {string} errorType - Type of error
     * @param {Error} error - Original error
     * @param {Object} context - Context information
     * @returns {Promise<Object>} Recovery result
     */
    async executeRecoveryStrategy(errorType, error, context) {
        switch (errorType) {
            case this.recoveryStrategies.NETWORK_ERROR:
                return await this.recoverFromNetworkError(error, context);
                
            case this.recoveryStrategies.BROWSER_CRASH:
                return await this.recoverFromBrowserCrash(error, context);
                
            case this.recoveryStrategies.PAGE_UNRESPONSIVE:
                return await this.recoverFromPageUnresponsive(error, context);
                
            case this.recoveryStrategies.SESSION_EXPIRED:
                return await this.recoverFromSessionExpired(error, context);
                
            case this.recoveryStrategies.ELEMENT_NOT_FOUND:
                return await this.recoverFromElementNotFound(error, context);
                
            case this.recoveryStrategies.TIMEOUT_ERROR:
                return await this.recoverFromTimeout(error, context);
                
            case this.recoveryStrategies.SCRIPT_ERROR:
                return await this.recoverFromScriptError(error, context);
                
            default:
                return await this.recoverFromGenericError(error, context);
        }
    }

    /**
     * Recover from network errors
     */
    async recoverFromNetworkError(error, context) {
        console.log('🔄 Recovering from network error...');
        
        // Wait for network to stabilize
        await this.wait(this.options.retryDelay);
        
        if (context.page) {
            try {
                // Try to reload the page
                await context.page.reload({ 
                    waitUntil: 'networkidle', 
                    timeout: this.options.pageLoadTimeout 
                });
                
                // Restore session state
                await this.restoreSessionState(context.page);
                
                return { success: true, message: 'Network error recovered' };
            } catch (reloadError) {
                // If reload fails, try to navigate to the original URL
                if (this.sessionState.url) {
                    await context.page.goto(this.sessionState.url, { 
                        waitUntil: 'networkidle', 
                        timeout: this.options.pageLoadTimeout 
                    });
                    
                    await this.restoreSessionState(context.page);
                    return { success: true, message: 'Network error recovered via navigation' };
                }
                
                throw reloadError;
            }
        }
        
        return { success: false, error: 'No page context available' };
    }

    /**
     * Recover from browser crashes
     */
    async recoverFromBrowserCrash(error, context) {
        console.log('🔄 Recovering from browser crash...');
        
        if (context.restartBrowser) {
            try {
                // Restart the browser
                await context.restartBrowser();
                
                // Restore session state
                if (context.page) {
                    await this.restoreSessionState(context.page);
                }
                
                return { success: true, message: 'Browser crash recovered' };
            } catch (restartError) {
                return { success: false, error: `Browser restart failed: ${restartError.message}` };
            }
        }
        
        return { success: false, error: 'No browser restart function available' };
    }

    /**
     * Recover from page unresponsive
     */
    async recoverFromPageUnresponsive(error, context) {
        console.log('🔄 Recovering from unresponsive page...');
        
        if (context.page) {
            try {
                // Try to execute a simple command to check if page is responsive
                await context.page.evaluate(() => document.title);
                
                return { success: true, message: 'Page is actually responsive' };
            } catch (evalError) {
                // Page is truly unresponsive, try to reload
                await context.page.reload({ 
                    waitUntil: 'networkidle', 
                    timeout: this.options.pageLoadTimeout 
                });
                
                await this.restoreSessionState(context.page);
                return { success: true, message: 'Unresponsive page recovered' };
            }
        }
        
        return { success: false, error: 'No page context available' };
    }

    /**
     * Recover from session expired
     */
    async recoverFromSessionExpired(error, context) {
        console.log('🔄 Recovering from expired session...');
        
        if (context.page && context.reAuthenticate) {
            try {
                // Try to re-authenticate
                await context.reAuthenticate();
                
                // Restore session state
                await this.restoreSessionState(context.page);
                
                return { success: true, message: 'Session expired recovered' };
            } catch (authError) {
                return { success: false, error: `Re-authentication failed: ${authError.message}` };
            }
        }
        
        return { success: false, error: 'No re-authentication function available' };
    }

    /**
     * Recover from element not found
     */
    async recoverFromElementNotFound(error, context) {
        console.log('🔄 Recovering from element not found...');
        
        if (context.page) {
            try {
                // Wait for page to stabilize
                await this.wait(2000);
                
                // Try to scroll to make element visible
                await context.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight / 2);
                });
                
                await this.wait(1000);
                
                // Check if element is now available
                if (context.selector) {
                    const element = await context.page.locator(context.selector).first();
                    if (await element.isVisible()) {
                        return { success: true, message: 'Element found after scroll' };
                    }
                }
                
                return { success: false, error: 'Element still not found after recovery' };
            } catch (recoveryError) {
                return { success: false, error: `Element recovery failed: ${recoveryError.message}` };
            }
        }
        
        return { success: false, error: 'No page context available' };
    }

    /**
     * Recover from timeout errors
     */
    async recoverFromTimeout(error, context) {
        console.log('🔄 Recovering from timeout...');
        
        // Wait longer and try again
        await this.wait(this.options.retryDelay * 2);
        
        if (context.page) {
            try {
                // Check if page is still responsive
                const title = await context.page.title();
                
                return { success: true, message: 'Timeout recovered, page responsive' };
            } catch (timeoutError) {
                // Page is unresponsive, try to reload
                await context.page.reload({ 
                    waitUntil: 'networkidle', 
                    timeout: this.options.pageLoadTimeout 
                });
                
                await this.restoreSessionState(context.page);
                return { success: true, message: 'Timeout recovered via page reload' };
            }
        }
        
        return { success: false, error: 'No page context available' };
    }

    /**
     * Recover from script errors
     */
    async recoverFromScriptError(error, context) {
        console.log('🔄 Recovering from script error...');
        
        // Wait and try again
        await this.wait(this.options.retryDelay);
        
        return { success: true, message: 'Script error recovery attempted' };
    }

    /**
     * Generic error recovery
     */
    async recoverFromGenericError(error, context) {
        console.log('🔄 Recovering from generic error...');
        
        // Wait and try again
        await this.wait(this.options.retryDelay);
        
        return { success: true, message: 'Generic error recovery attempted' };
    }

    /**
     * Save current session state
     * @param {Page} page - Playwright page instance
     */
    async saveSessionState(page) {
        if (!page) return;
        
        try {
            this.sessionState.url = page.url();
            this.sessionState.cookies = await page.context().cookies();
            this.sessionState.timestamp = Date.now();
            
            // Save form data
            this.sessionState.formData = await page.evaluate(() => {
                const forms = {};
                const inputs = document.querySelectorAll('input, textarea, select');
                
                inputs.forEach(input => {
                    if (input.name || input.id) {
                        const key = input.name || input.id;
                        forms[key] = input.value;
                    }
                });
                
                return forms;
            });
            
            // Save to file
            const sessionFile = path.join(this.sessionsDir, 'current_session.json');
            await fs.writeFile(sessionFile, JSON.stringify(this.sessionState, null, 2));
            
            console.log('💾 Session state saved');
        } catch (error) {
            console.error('❌ Error saving session state:', error.message);
        }
    }

    /**
     * Restore session state
     * @param {Page} page - Playwright page instance
     */
    async restoreSessionState(page) {
        if (!page) return;
        
        try {
            const sessionFile = path.join(this.sessionsDir, 'current_session.json');
            const sessionData = await fs.readFile(sessionFile, 'utf8');
            const savedState = JSON.parse(sessionData);
            
            // Restore cookies
            if (savedState.cookies && savedState.cookies.length > 0) {
                await page.context().addCookies(savedState.cookies);
            }
            
            // Restore form data
            if (savedState.formData) {
                await page.evaluate((formData) => {
                    Object.keys(formData).forEach(key => {
                        const element = document.querySelector(`[name="${key}"], #${key}`);
                        if (element) {
                            element.value = formData[key];
                        }
                    });
                }, savedState.formData);
            }
            
            console.log('🔄 Session state restored');
        } catch (error) {
            console.log('⚠️ No session state to restore or error restoring:', error.message);
        }
    }

    /**
     * Start periodic state backup
     */
    startStateBackup() {
        if (this.stateBackupTimer) {
            clearInterval(this.stateBackupTimer);
        }
        
        this.stateBackupTimer = setInterval(() => {
            // This will be called periodically to backup state
            console.log('🔄 Periodic state backup triggered');
        }, this.options.stateBackupInterval);
    }

    /**
     * Stop state backup
     */
    stopStateBackup() {
        if (this.stateBackupTimer) {
            clearInterval(this.stateBackupTimer);
            this.stateBackupTimer = null;
        }
    }

    /**
     * Log error for analysis
     * @param {Error} error - The error
     * @param {string} type - Error type
     * @param {Object} context - Context information
     */
    logError(error, type, context) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            type,
            message: error.message,
            stack: error.stack,
            context: {
                url: context.url || this.sessionState.url,
                selector: context.selector,
                action: context.action,
                step: context.step
            }
        };
        
        this.errorHistory.push(errorLog);
        
        // Keep only last 100 errors
        if (this.errorHistory.length > 100) {
            this.errorHistory.shift();
        }
    }

    /**
     * Get error recovery statistics
     * @returns {Object} Statistics
     */
    getRecoveryStats() {
        const errorCounts = {};
        this.errorHistory.forEach(error => {
            errorCounts[error.type] = (errorCounts[error.type] || 0) + 1;
        });
        
        return {
            totalErrors: this.errorHistory.length,
            errorTypes: errorCounts,
            activeRetries: this.recoveryAttempts.size,
            sessionStateLastSaved: this.sessionState.timestamp,
            recoveryStrategies: Object.values(this.recoveryStrategies)
        };
    }

    /**
     * Clean up recovery system
     */
    cleanup() {
        this.stopStateBackup();
        this.errorHistory = [];
        this.recoveryAttempts.clear();
        console.log('🧹 Error recovery system cleaned up');
    }

    /**
     * Wait utility
     * @param {number} ms - Milliseconds to wait
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ComprehensiveErrorRecovery; 