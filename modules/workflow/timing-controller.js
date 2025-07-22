const EventEmitter = require('events');
const AdaptiveTimingController = require('../execution/adaptive-timing-controller');

/**
 * Enhanced Timing controller with adaptive timing capabilities
 */
class TimingController extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            defaultTimeout: options.defaultTimeout || 30000,
            pageLoadTimeout: options.pageLoadTimeout || 60000,
            networkIdleTimeout: options.networkIdleTimeout || 2000,
            domStabilityTimeout: options.domStabilityTimeout || 1000,
            adaptiveTimeouts: options.adaptiveTimeouts !== false,
            enableAdvancedAdaptive: options.enableAdvancedAdaptive !== false,
            ...options
        };
        
        this.networkConditions = {
            slow: false,
            latency: 0,
            downloadSpeed: 0,
            uploadSpeed: 0
        };
        
        this.performanceMetrics = {
            averagePageLoadTime: 5000,
            averageNetworkLatency: 100,
            recentLoadTimes: []
        };
        
        // Initialize advanced adaptive timing controller
        if (this.options.enableAdvancedAdaptive) {
            this.adaptiveController = new AdaptiveTimingController({
                baseTimeout: this.options.defaultTimeout,
                maxTimeout: this.options.pageLoadTimeout,
                ...options.adaptive
            });
            
            // Forward events from adaptive controller
            this.adaptiveController.on('timeoutCalculated', (data) => {
                this.emit('adaptiveTimeoutCalculated', data);
            });
            
            this.adaptiveController.on('complexityAnalyzed', (data) => {
                this.emit('pageComplexityAnalyzed', data);
            });
        }
    }

    /**
     * Wait for page to fully load
     */
    async waitForPageLoad(page, options = {}) {
        const startTime = Date.now();
        const timeout = options.timeout || this.options.pageLoadTimeout;
        const waitUntil = options.waitUntil || 'networkidle0';
        
        try {
            this.emit('pageLoadStart', { url: page.url(), timeout, waitUntil });
            
            // Wait for basic load state
            await page.waitForLoadState('load', { timeout });
            
            // Wait for network idle if specified
            if (waitUntil.includes('networkidle')) {
                const idleTime = waitUntil === 'networkidle0' ? 500 : 2000;
                await this.waitForNetworkIdle(page, idleTime, timeout);
            }
            
            // Wait for DOM content loaded
            if (waitUntil === 'domcontentloaded') {
                await page.waitForLoadState('domcontentloaded', { timeout });
            }
            
            // Additional stability wait
            if (options.stabilityWait !== false) {
                await this.waitForDOMStability(page, options.stabilityTimeout);
            }
            
            const loadTime = Date.now() - startTime;
            this.updatePerformanceMetrics('pageLoad', loadTime);
            
            this.emit('pageLoadComplete', { 
                url: page.url(), 
                loadTime, 
                waitUntil 
            });
            
            return {
                success: true,
                loadTime,
                url: page.url(),
                waitUntil
            };
            
        } catch (error) {
            const loadTime = Date.now() - startTime;
            
            this.emit('pageLoadTimeout', { 
                url: page.url(), 
                timeout, 
                loadTime, 
                error: error.message 
            });
            
            throw new Error(`Page load timeout after ${timeout}ms: ${error.message}`);
        }
    }

    /**
     * Wait for element to be available and interactable
     */
    async waitForElement(page, selector, options = {}) {
        const startTime = Date.now();
        const timeout = this.calculateAdaptiveTimeout(options.timeout);
        const state = options.state || 'visible';
        
        try {
            this.emit('elementWaitStart', { selector, timeout, state });
            
            // Wait for element to exist
            await page.waitForSelector(selector, { 
                timeout, 
                state: 'attached' 
            });
            
            // Wait for specific state
            if (state !== 'attached') {
                await page.waitForSelector(selector, { 
                    timeout: timeout - (Date.now() - startTime), 
                    state 
                });
            }
            
            // Additional checks for interactability
            if (options.interactable) {
                await this.waitForElementInteractable(page, selector, options);
            }
            
            // Stability wait
            if (options.stable) {
                await this.waitForElementStability(page, selector, options.stableTimeout);
            }
            
            const waitTime = Date.now() - startTime;
            
            this.emit('elementWaitComplete', { 
                selector, 
                waitTime, 
                state 
            });
            
            return {
                success: true,
                selector,
                waitTime,
                state
            };
            
        } catch (error) {
            const waitTime = Date.now() - startTime;
            
            this.emit('elementWaitTimeout', { 
                selector, 
                timeout, 
                waitTime, 
                error: error.message 
            });
            
            throw new Error(`Element wait timeout for ${selector} after ${timeout}ms: ${error.message}`);
        }
    }

    /**
     * Wait for DOM stability (no changes for specified time)
     */
    async waitForDOMStability(page, timeout = null) {
        const stabilityTimeout = timeout || this.options.domStabilityTimeout;
        const checkInterval = 100;
        let lastDOMState = '';
        let stableCount = 0;
        const requiredStableChecks = Math.ceil(stabilityTimeout / checkInterval);
        
        const startTime = Date.now();
        const maxWaitTime = stabilityTimeout * 10; // Maximum wait time
        
        try {
            this.emit('domStabilityStart', { timeout: stabilityTimeout });
            
            while (stableCount < requiredStableChecks) {
                if (Date.now() - startTime > maxWaitTime) {
                    throw new Error(`DOM stability timeout after ${maxWaitTime}ms`);
                }
                
                // Get current DOM state
                const currentDOMState = await page.evaluate(() => {
                    return document.documentElement.outerHTML.length + 
                           document.querySelectorAll('*').length;
                });
                
                if (currentDOMState === lastDOMState) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastDOMState = currentDOMState;
                }
                
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
            
            const waitTime = Date.now() - startTime;
            
            this.emit('domStabilityComplete', { waitTime });
            
            return {
                success: true,
                waitTime,
                stabilityTimeout
            };
            
        } catch (error) {
            const waitTime = Date.now() - startTime;
            
            this.emit('domStabilityTimeout', { 
                waitTime, 
                error: error.message 
            });
            
            throw error;
        }
    }

    /**
     * Wait for network idle (no network requests for specified time)
     */
    async waitForNetworkIdle(page, idleTime = 2000, timeout = 30000) {
        const startTime = Date.now();
        
        try {
            this.emit('networkIdleStart', { idleTime, timeout });
            
            // Track network requests
            let activeRequests = 0;
            let lastRequestTime = Date.now();
            
            const requestStarted = () => {
                activeRequests++;
                lastRequestTime = Date.now();
            };
            
            const requestFinished = () => {
                activeRequests--;
                lastRequestTime = Date.now();
            };
            
            page.on('request', requestStarted);
            page.on('response', requestFinished);
            page.on('requestfailed', requestFinished);
            
            // Wait for network idle
            while (Date.now() - startTime < timeout) {
                const timeSinceLastRequest = Date.now() - lastRequestTime;
                
                if (activeRequests === 0 && timeSinceLastRequest >= idleTime) {
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Cleanup listeners
            page.off('request', requestStarted);
            page.off('response', requestFinished);
            page.off('requestfailed', requestFinished);
            
            const waitTime = Date.now() - startTime;
            
            if (waitTime >= timeout) {
                throw new Error(`Network idle timeout after ${timeout}ms`);
            }
            
            this.emit('networkIdleComplete', { waitTime, idleTime });
            
            return {
                success: true,
                waitTime,
                idleTime,
                activeRequests
            };
            
        } catch (error) {
            const waitTime = Date.now() - startTime;
            
            this.emit('networkIdleTimeout', { 
                waitTime, 
                error: error.message 
            });
            
            throw error;
        }
    }

    /**
     * Wait for element to be interactable
     */
    async waitForElementInteractable(page, selector, options = {}) {
        const timeout = options.timeout || this.options.defaultTimeout;
        const startTime = Date.now();
        
        try {
            // Wait for element to be visible and enabled
            await page.waitForFunction(
                (sel) => {
                    const element = document.querySelector(sel);
                    if (!element) return false;
                    
                    const style = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();
                    
                    return (
                        element.offsetParent !== null && // Not hidden
                        style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        rect.width > 0 &&
                        rect.height > 0 &&
                        !element.disabled &&
                        style.pointerEvents !== 'none'
                    );
                },
                selector,
                { timeout: timeout - (Date.now() - startTime) }
            );
            
            return {
                success: true,
                selector,
                waitTime: Date.now() - startTime
            };
            
        } catch (error) {
            throw new Error(`Element ${selector} not interactable: ${error.message}`);
        }
    }

    /**
     * Wait for element stability (position and size don't change)
     */
    async waitForElementStability(page, selector, timeout = 1000) {
        const checkInterval = 100;
        const requiredStableChecks = Math.ceil(timeout / checkInterval);
        let stableCount = 0;
        let lastBounds = null;
        
        const startTime = Date.now();
        const maxWaitTime = timeout * 5;
        
        try {
            while (stableCount < requiredStableChecks) {
                if (Date.now() - startTime > maxWaitTime) {
                    throw new Error(`Element stability timeout after ${maxWaitTime}ms`);
                }
                
                const currentBounds = await page.evaluate((sel) => {
                    const element = document.querySelector(sel);
                    if (!element) return null;
                    
                    const rect = element.getBoundingClientRect();
                    return {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    };
                }, selector);
                
                if (!currentBounds) {
                    throw new Error(`Element ${selector} not found`);
                }
                
                if (lastBounds && 
                    currentBounds.x === lastBounds.x &&
                    currentBounds.y === lastBounds.y &&
                    currentBounds.width === lastBounds.width &&
                    currentBounds.height === lastBounds.height) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastBounds = currentBounds;
                }
                
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
            
            return {
                success: true,
                selector,
                waitTime: Date.now() - startTime,
                bounds: lastBounds
            };
            
        } catch (error) {
            throw new Error(`Element stability wait failed: ${error.message}`);
        }
    }

    /**
     * Calculate adaptive timeout with advanced intelligence
     */
    async calculateAdaptiveTimeout(action, context = {}, baseTimeout = null) {
        if (!this.options.adaptiveTimeouts) {
            return baseTimeout || this.options.defaultTimeout;
        }
        
        // Use advanced adaptive controller if available
        if (this.options.enableAdvancedAdaptive && this.adaptiveController) {
            try {
                const result = await this.adaptiveController.calculateOptimalTimeout(action, context);
                return result.timeout;
            } catch (error) {
                console.warn('Advanced adaptive timeout calculation failed, falling back to basic:', error.message);
            }
        }
        
        // Fallback to basic adaptive calculation
        const base = baseTimeout || this.options.defaultTimeout;
        let multiplier = 1;
        
        // Adjust based on network conditions
        if (this.networkConditions.slow) {
            multiplier *= 2;
        }
        
        // Adjust based on recent performance
        if (this.performanceMetrics.averagePageLoadTime > 10000) {
            multiplier *= 1.5;
        }
        
        // Adjust based on network latency
        if (this.performanceMetrics.averageNetworkLatency > 500) {
            multiplier *= 1.3;
        }
        
        return Math.min(base * multiplier, base * 3); // Cap at 3x original timeout
    }

    /**
     * Enhanced wait for element with adaptive timing
     */
    async waitForElementAdaptive(page, selector, action, context = {}) {
        if (!this.adaptiveController) {
            return this.waitForElement(page, selector, context);
        }
        
        try {
            // Calculate optimal timeout and strategy
            const timingResult = await this.adaptiveController.calculateOptimalTimeout(action, {
                ...context,
                page
            });
            
            const startTime = Date.now();
            
            this.emit('adaptiveElementWaitStart', {
                selector,
                timeout: timingResult.timeout,
                strategy: timingResult.strategy,
                factors: timingResult.factors
            });
            
            // Execute wait with calculated strategy
            let result;
            switch (timingResult.strategy) {
                case 'element-stable':
                    await this.waitForElement(page, selector, { timeout: timingResult.timeout });
                    await this.waitForElementStability(page, selector, 500);
                    break;
                    
                case 'networkidle':
                    await this.waitForElement(page, selector, { timeout: timingResult.timeout });
                    await this.waitForNetworkIdle(page, 1000, 5000);
                    break;
                    
                case 'domcontentloaded':
                    await page.waitForLoadState('domcontentloaded', { timeout: timingResult.timeout });
                    await this.waitForElement(page, selector, { timeout: timingResult.timeout / 2 });
                    break;
                    
                default:
                    await this.waitForElement(page, selector, { timeout: timingResult.timeout });
            }
            
            const duration = Date.now() - startTime;
            
            // Record result for learning
            this.adaptiveController.recordTimingResult(action, context, {
                success: true,
                duration,
                strategy: timingResult.strategy
            });
            
            this.emit('adaptiveElementWaitComplete', {
                selector,
                duration,
                strategy: timingResult.strategy
            });
            
            return {
                success: true,
                selector,
                duration,
                strategy: timingResult.strategy,
                adaptive: true
            };
            
        } catch (error) {
            const duration = Date.now() - (context.startTime || Date.now());
            
            // Record failure for learning
            if (this.adaptiveController) {
                this.adaptiveController.recordTimingResult(action, context, {
                    success: false,
                    duration,
                    error: error.message
                });
            }
            
            this.emit('adaptiveElementWaitFailed', {
                selector,
                duration,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Check DOM stability with adaptive parameters
     */
    async checkDOMStabilityAdaptive(page, context = {}) {
        if (this.adaptiveController) {
            return this.adaptiveController.checkDOMStability(page, {
                checkInterval: 100,
                stabilityThreshold: 500,
                maxChecks: 50
            });
        }
        
        return this.waitForDOMStability(page);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(type, value) {
        switch (type) {
            case 'pageLoad':
                this.performanceMetrics.recentLoadTimes.push(value);
                if (this.performanceMetrics.recentLoadTimes.length > 10) {
                    this.performanceMetrics.recentLoadTimes.shift();
                }
                this.performanceMetrics.averagePageLoadTime = 
                    this.performanceMetrics.recentLoadTimes.reduce((a, b) => a + b, 0) / 
                    this.performanceMetrics.recentLoadTimes.length;
                break;
                
            case 'networkLatency':
                this.performanceMetrics.averageNetworkLatency = value;
                break;
        }
        
        this.emit('performanceMetricsUpdated', {
            type,
            value,
            metrics: this.performanceMetrics
        });
    }

    /**
     * Set network conditions for adaptive timeouts
     */
    setNetworkConditions(conditions) {
        this.networkConditions = {
            ...this.networkConditions,
            ...conditions
        };
        
        this.emit('networkConditionsChanged', this.networkConditions);
    }

    /**
     * Smart delay with jitter to avoid detection
     */
    async smartDelay(baseDelay, options = {}) {
        const jitter = options.jitter || 0.2;
        const minDelay = options.minDelay || 100;
        const maxDelay = options.maxDelay || baseDelay * 3;
        
        // Calculate delay with jitter
        const jitterAmount = baseDelay * jitter;
        const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
        let finalDelay = baseDelay + randomJitter;
        
        // Apply bounds
        finalDelay = Math.max(minDelay, Math.min(maxDelay, finalDelay));
        
        this.emit('delayStart', { 
            baseDelay, 
            finalDelay, 
            jitter: randomJitter 
        });
        
        await new Promise(resolve => setTimeout(resolve, finalDelay));
        
        this.emit('delayComplete', { 
            actualDelay: finalDelay 
        });
        
        return {
            baseDelay,
            actualDelay: finalDelay,
            jitter: randomJitter
        };
    }

    /**
     * Wait with exponential backoff
     */
    async waitWithBackoff(operation, options = {}) {
        const maxAttempts = options.maxAttempts || 5;
        const baseDelay = options.baseDelay || 1000;
        const maxDelay = options.maxDelay || 30000;
        const backoffFactor = options.backoffFactor || 2;
        
        let attempt = 1;
        let delay = baseDelay;
        
        while (attempt <= maxAttempts) {
            try {
                this.emit('backoffAttempt', { 
                    attempt, 
                    maxAttempts, 
                    delay 
                });
                
                const result = await operation();
                
                this.emit('backoffSuccess', { 
                    attempt, 
                    totalTime: delay * (attempt - 1) 
                });
                
                return result;
                
            } catch (error) {
                if (attempt === maxAttempts) {
                    this.emit('backoffFailed', { 
                        attempts: maxAttempts, 
                        error: error.message 
                    });
                    throw error;
                }
                
                this.emit('backoffRetry', { 
                    attempt, 
                    delay, 
                    error: error.message 
                });
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                delay = Math.min(delay * backoffFactor, maxDelay);
                attempt++;
            }
        }
    }

    /**
     * Get timing statistics
     */
    getTimingStats() {
        return {
            networkConditions: this.networkConditions,
            performanceMetrics: this.performanceMetrics,
            options: this.options
        };
    }

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
        this.performanceMetrics = {
            averagePageLoadTime: 5000,
            averageNetworkLatency: 100,
            recentLoadTimes: []
        };
        
        this.emit('performanceMetricsReset');
    }
}

module.exports = TimingController;