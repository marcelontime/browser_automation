const EventEmitter = require('events');

/**
 * Adaptive Timing Controller
 * Dynamically adjusts timeouts based on network conditions, page complexity, and historical data
 */
class AdaptiveTimingController extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            baseTimeout: options.baseTimeout || 5000,
            maxTimeout: options.maxTimeout || 60000,
            minTimeout: options.minTimeout || 1000,
            networkCheckInterval: options.networkCheckInterval || 5000,
            complexityAnalysisTimeout: options.complexityAnalysisTimeout || 2000,
            historyRetentionDays: options.historyRetentionDays || 30,
            enableLearning: options.enableLearning !== false,
            ...options
        };
        
        this.networkConditions = {
            latency: 0,
            bandwidth: 0,
            connectionType: 'unknown',
            isOnline: true,
            lastCheck: 0
        };
        
        this.pageComplexity = {
            domSize: 0,
            scriptCount: 0,
            styleCount: 0,
            imageCount: 0,
            ajaxRequests: 0,
            dynamicContent: false,
            lastAnalysis: 0
        };
        
        this.timingHistory = new Map();
        this.actionBaselines = new Map();
        this.contextualFactors = new Map();
        
        this.initializeBaselines();
        this.startNetworkMonitoring();
    }

    /**
     * Initialize baseline timings for different action types
     */
    initializeBaselines() {
        this.actionBaselines.set('navigation', {
            base: 10000,
            networkMultiplier: 2.0,
            complexityMultiplier: 1.5,
            description: 'Page navigation and loading'
        });
        
        this.actionBaselines.set('click', {
            base: 2000,
            networkMultiplier: 1.2,
            complexityMultiplier: 1.3,
            description: 'Element click interactions'
        });
        
        this.actionBaselines.set('type', {
            base: 1000,
            networkMultiplier: 1.1,
            complexityMultiplier: 1.1,
            description: 'Text input operations'
        });
        
        this.actionBaselines.set('wait', {
            base: 3000,
            networkMultiplier: 1.5,
            complexityMultiplier: 1.2,
            description: 'Element visibility waits'
        });
        
        this.actionBaselines.set('extraction', {
            base: 2000,
            networkMultiplier: 1.3,
            complexityMultiplier: 1.4,
            description: 'Data extraction operations'
        });
        
        this.actionBaselines.set('ajax', {
            base: 5000,
            networkMultiplier: 2.5,
            complexityMultiplier: 1.1,
            description: 'AJAX request completion'
        });
    }

    /**
     * Calculate optimal timeout for an action
     */
    async calculateOptimalTimeout(action, context = {}) {
        const startTime = Date.now();
        
        try {
            // Get base timeout for action type
            const baseline = this.actionBaselines.get(action.type) || this.actionBaselines.get('click');
            let timeout = baseline.base;
            
            // Apply network conditions multiplier
            const networkMultiplier = await this.getNetworkMultiplier();
            timeout *= networkMultiplier * baseline.networkMultiplier;
            
            // Apply page complexity multiplier
            const complexityMultiplier = await this.getComplexityMultiplier(context.page);
            timeout *= complexityMultiplier * baseline.complexityMultiplier;
            
            // Apply historical learning
            const historyMultiplier = this.getHistoryMultiplier(action, context);
            timeout *= historyMultiplier;
            
            // Apply contextual factors
            const contextMultiplier = this.getContextMultiplier(action, context);
            timeout *= contextMultiplier;
            
            // Ensure timeout is within bounds
            timeout = Math.max(this.options.minTimeout, Math.min(timeout, this.options.maxTimeout));
            
            const strategy = this.selectWaitStrategy(action, context);
            const fallbackStrategies = this.getFallbackStrategies(action, context);
            
            const result = {
                timeout: Math.round(timeout),
                strategy,
                fallbackStrategies,
                factors: {
                    base: baseline.base,
                    network: networkMultiplier,
                    complexity: complexityMultiplier,
                    history: historyMultiplier,
                    context: contextMultiplier
                },
                calculationTime: Date.now() - startTime
            };
            
            this.emit('timeoutCalculated', {
                action,
                result,
                context
            });
            
            return result;
            
        } catch (error) {
            console.warn('Timeout calculation failed, using default:', error.message);
            return {
                timeout: this.options.baseTimeout,
                strategy: 'element-visible',
                fallbackStrategies: ['timeout'],
                error: error.message
            };
        }
    }

    /**
     * Analyze page complexity
     */
    async analyzePageComplexity(page) {
        if (!page) {
            return this.pageComplexity;
        }
        
        const now = Date.now();
        
        // Skip analysis if recently done
        if (now - this.pageComplexity.lastAnalysis < this.options.complexityAnalysisTimeout) {
            return this.pageComplexity;
        }
        
        try {
            const complexity = await page.evaluate(() => {
                const scripts = document.querySelectorAll('script').length;
                const styles = document.querySelectorAll('link[rel="stylesheet"], style').length;
                const images = document.querySelectorAll('img').length;
                const domSize = document.querySelectorAll('*').length;
                
                // Check for dynamic content indicators
                const dynamicIndicators = [
                    document.querySelectorAll('[data-react-root]').length > 0,
                    document.querySelectorAll('[ng-app], [data-ng-app]').length > 0,
                    document.querySelectorAll('[data-vue-root]').length > 0,
                    window.jQuery !== undefined,
                    window.React !== undefined,
                    window.Vue !== undefined,
                    window.angular !== undefined
                ];
                
                const hasDynamicContent = dynamicIndicators.some(indicator => indicator);
                
                return {
                    domSize,
                    scriptCount: scripts,
                    styleCount: styles,
                    imageCount: images,
                    dynamicContent: hasDynamicContent,
                    timestamp: Date.now()
                };
            });
            
            // Monitor AJAX requests
            const ajaxCount = await this.countActiveAjaxRequests(page);
            
            this.pageComplexity = {
                ...complexity,
                ajaxRequests: ajaxCount,
                lastAnalysis: now
            };
            
            this.emit('complexityAnalyzed', this.pageComplexity);
            
        } catch (error) {
            console.warn('Page complexity analysis failed:', error.message);
        }
        
        return this.pageComplexity;
    }

    /**
     * Count active AJAX requests
     */
    async countActiveAjaxRequests(page) {
        try {
            return await page.evaluate(() => {
                // This is a simplified check - in production, you'd want more sophisticated monitoring
                const performanceEntries = performance.getEntriesByType('navigation');
                const navigationEntry = performanceEntries[0];
                
                if (navigationEntry && navigationEntry.loadEventEnd === 0) {
                    return 1; // Page still loading
                }
                
                return 0;
            });
        } catch (error) {
            return 0;
        }
    }

    /**
     * Check DOM stability
     */
    async checkDOMStability(page, options = {}) {
        const checkInterval = options.checkInterval || 100;
        const stabilityThreshold = options.stabilityThreshold || 500;
        const maxChecks = options.maxChecks || 50;
        
        let lastDOMSize = 0;
        let stableCount = 0;
        let checks = 0;
        
        return new Promise((resolve) => {
            const checkStability = async () => {
                try {
                    const currentDOMSize = await page.evaluate(() => document.querySelectorAll('*').length);
                    
                    if (currentDOMSize === lastDOMSize) {
                        stableCount++;
                        if (stableCount >= stabilityThreshold / checkInterval) {
                            resolve(true);
                            return;
                        }
                    } else {
                        stableCount = 0;
                        lastDOMSize = currentDOMSize;
                    }
                    
                    checks++;
                    if (checks >= maxChecks) {
                        resolve(false);
                        return;
                    }
                    
                    setTimeout(checkStability, checkInterval);
                } catch (error) {
                    resolve(false);
                }
            };
            
            checkStability();
        });
    }

    /**
     * Get network conditions multiplier
     */
    async getNetworkMultiplier() {
        await this.updateNetworkConditions();
        
        let multiplier = 1.0;
        
        // Adjust based on connection type
        switch (this.networkConditions.connectionType) {
            case 'slow-2g':
                multiplier = 3.0;
                break;
            case '2g':
                multiplier = 2.5;
                break;
            case '3g':
                multiplier = 1.8;
                break;
            case '4g':
                multiplier = 1.2;
                break;
            case 'wifi':
                multiplier = 1.0;
                break;
            default:
                multiplier = 1.5;
        }
        
        // Adjust based on latency
        if (this.networkConditions.latency > 1000) {
            multiplier *= 2.0;
        } else if (this.networkConditions.latency > 500) {
            multiplier *= 1.5;
        } else if (this.networkConditions.latency > 200) {
            multiplier *= 1.2;
        }
        
        // Adjust if offline
        if (!this.networkConditions.isOnline) {
            multiplier *= 5.0;
        }
        
        return Math.max(0.5, Math.min(multiplier, 5.0));
    }

    /**
     * Get page complexity multiplier
     */
    async getComplexityMultiplier(page) {
        const complexity = await this.analyzePageComplexity(page);
        
        let multiplier = 1.0;
        
        // DOM size factor
        if (complexity.domSize > 5000) {
            multiplier *= 1.8;
        } else if (complexity.domSize > 2000) {
            multiplier *= 1.4;
        } else if (complexity.domSize > 1000) {
            multiplier *= 1.2;
        }
        
        // Script count factor
        if (complexity.scriptCount > 20) {
            multiplier *= 1.5;
        } else if (complexity.scriptCount > 10) {
            multiplier *= 1.3;
        } else if (complexity.scriptCount > 5) {
            multiplier *= 1.1;
        }
        
        // Dynamic content factor
        if (complexity.dynamicContent) {
            multiplier *= 1.4;
        }
        
        // Active AJAX requests factor
        if (complexity.ajaxRequests > 0) {
            multiplier *= 1.3;
        }
        
        return Math.max(0.8, Math.min(multiplier, 3.0));
    }

    /**
     * Get historical performance multiplier
     */
    getHistoryMultiplier(action, context) {
        const historyKey = this.generateHistoryKey(action, context);
        const history = this.timingHistory.get(historyKey);
        
        if (!history || history.samples.length < 3) {
            return 1.0; // Not enough data
        }
        
        // Calculate average success rate and timing
        const successRate = history.successes / history.attempts;
        const avgTiming = history.samples.reduce((sum, sample) => sum + sample.duration, 0) / history.samples.length;
        const baseTimeout = this.actionBaselines.get(action.type)?.base || this.options.baseTimeout;
        
        let multiplier = 1.0;
        
        // Adjust based on success rate
        if (successRate < 0.7) {
            multiplier *= 1.5; // Increase timeout for low success rate
        } else if (successRate > 0.95) {
            multiplier *= 0.9; // Decrease timeout for high success rate
        }
        
        // Adjust based on historical timing
        if (avgTiming > baseTimeout * 1.5) {
            multiplier *= 1.3; // Increase timeout if historically slow
        } else if (avgTiming < baseTimeout * 0.5) {
            multiplier *= 0.8; // Decrease timeout if historically fast
        }
        
        return Math.max(0.5, Math.min(multiplier, 2.0));
    }

    /**
     * Get contextual factors multiplier
     */
    getContextMultiplier(action, context) {
        let multiplier = 1.0;
        
        // Time of day factor (server load patterns)
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) {
            multiplier *= 1.2; // Business hours - potentially higher load
        }
        
        // Browser factor
        if (context.browser) {
            switch (context.browser.toLowerCase()) {
                case 'firefox':
                    multiplier *= 1.1;
                    break;
                case 'safari':
                    multiplier *= 1.2;
                    break;
                case 'edge':
                    multiplier *= 1.1;
                    break;
                // Chrome is baseline
            }
        }
        
        // Device factor
        if (context.device === 'mobile') {
            multiplier *= 1.3;
        } else if (context.device === 'tablet') {
            multiplier *= 1.1;
        }
        
        return Math.max(0.8, Math.min(multiplier, 1.5));
    }

    /**
     * Select appropriate wait strategy
     */
    selectWaitStrategy(action, context) {
        const actionType = action.type;
        const hasAjax = context.hasAjax || this.pageComplexity.ajaxRequests > 0;
        const isDynamic = this.pageComplexity.dynamicContent;
        
        switch (actionType) {
            case 'navigation':
                if (hasAjax || isDynamic) {
                    return 'networkidle';
                }
                return 'domcontentloaded';
                
            case 'click':
                if (hasAjax) {
                    return 'networkidle';
                }
                if (action.target && action.target.includes('button')) {
                    return 'element-stable';
                }
                return 'element-visible';
                
            case 'type':
                return 'element-stable';
                
            case 'wait':
                if (action.waitFor === 'element') {
                    return 'element-visible';
                }
                if (action.waitFor === 'ajax') {
                    return 'networkidle';
                }
                return 'timeout';
                
            default:
                return 'element-visible';
        }
    }

    /**
     * Get fallback strategies
     */
    getFallbackStrategies(action, context) {
        const primary = this.selectWaitStrategy(action, context);
        const fallbacks = [];
        
        // Add complementary strategies
        if (primary !== 'timeout') {
            fallbacks.push('timeout');
        }
        
        if (primary !== 'element-visible' && action.target) {
            fallbacks.push('element-visible');
        }
        
        if (primary !== 'networkidle' && (context.hasAjax || this.pageComplexity.ajaxRequests > 0)) {
            fallbacks.push('networkidle');
        }
        
        if (primary !== 'domcontentloaded') {
            fallbacks.push('domcontentloaded');
        }
        
        return fallbacks.slice(0, 3); // Limit to 3 fallbacks
    }

    /**
     * Record timing result for learning
     */
    recordTimingResult(action, context, result) {
        if (!this.options.enableLearning) {
            return;
        }
        
        const historyKey = this.generateHistoryKey(action, context);
        
        if (!this.timingHistory.has(historyKey)) {
            this.timingHistory.set(historyKey, {
                attempts: 0,
                successes: 0,
                samples: [],
                lastUpdate: Date.now()
            });
        }
        
        const history = this.timingHistory.get(historyKey);
        
        history.attempts++;
        if (result.success) {
            history.successes++;
        }
        
        history.samples.push({
            duration: result.duration,
            success: result.success,
            strategy: result.strategy,
            timestamp: Date.now(),
            networkConditions: { ...this.networkConditions },
            pageComplexity: { ...this.pageComplexity }
        });
        
        // Keep only recent samples (last 50)
        if (history.samples.length > 50) {
            history.samples = history.samples.slice(-50);
        }
        
        history.lastUpdate = Date.now();
        
        // Clean old history entries
        this.cleanOldHistory();
    }

    /**
     * Generate history key for action and context
     */
    generateHistoryKey(action, context) {
        const parts = [
            action.type,
            action.target ? action.target.substring(0, 50) : 'no-target',
            context.url ? new URL(context.url).hostname : 'unknown-host'
        ];
        
        return parts.join('|');
    }

    /**
     * Clean old history entries
     */
    cleanOldHistory() {
        const cutoffTime = Date.now() - (this.options.historyRetentionDays * 24 * 60 * 60 * 1000);
        
        for (const [key, history] of this.timingHistory) {
            if (history.lastUpdate < cutoffTime) {
                this.timingHistory.delete(key);
            }
        }
    }

    /**
     * Update network conditions
     */
    async updateNetworkConditions() {
        const now = Date.now();
        
        // Skip if recently checked
        if (now - this.networkConditions.lastCheck < this.options.networkCheckInterval) {
            return;
        }
        
        try {
            // Use Navigator API if available
            if (typeof navigator !== 'undefined' && navigator.connection) {
                const connection = navigator.connection;
                this.networkConditions.connectionType = connection.effectiveType || 'unknown';
                this.networkConditions.bandwidth = connection.downlink || 0;
            }
            
            // Simple latency check
            const startTime = Date.now();
            try {
                await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
                this.networkConditions.latency = Date.now() - startTime;
            } catch (error) {
                this.networkConditions.latency = 5000; // Assume high latency on error
            }
            
            this.networkConditions.isOnline = navigator.onLine !== false;
            this.networkConditions.lastCheck = now;
            
        } catch (error) {
            console.warn('Network condition check failed:', error.message);
        }
    }

    /**
     * Start network monitoring
     */
    startNetworkMonitoring() {
        // Monitor online/offline status
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.networkConditions.isOnline = true;
                this.emit('networkStatusChanged', this.networkConditions);
            });
            
            window.addEventListener('offline', () => {
                this.networkConditions.isOnline = false;
                this.emit('networkStatusChanged', this.networkConditions);
            });
        }
        
        // Periodic network condition updates
        setInterval(() => {
            this.updateNetworkConditions();
        }, this.options.networkCheckInterval);
    }

    /**
     * Get timing statistics
     */
    getTimingStats() {
        const stats = {
            historyEntries: this.timingHistory.size,
            totalAttempts: 0,
            totalSuccesses: 0,
            averageSuccessRate: 0,
            networkConditions: { ...this.networkConditions },
            pageComplexity: { ...this.pageComplexity }
        };
        
        for (const [key, history] of this.timingHistory) {
            stats.totalAttempts += history.attempts;
            stats.totalSuccesses += history.successes;
        }
        
        if (stats.totalAttempts > 0) {
            stats.averageSuccessRate = stats.totalSuccesses / stats.totalAttempts;
        }
        
        return stats;
    }

    /**
     * Export timing history
     */
    exportTimingHistory() {
        return {
            history: Object.fromEntries(this.timingHistory),
            networkConditions: this.networkConditions,
            pageComplexity: this.pageComplexity,
            timestamp: Date.now()
        };
    }

    /**
     * Import timing history
     */
    importTimingHistory(data) {
        if (data.history) {
            this.timingHistory.clear();
            for (const [key, value] of Object.entries(data.history)) {
                this.timingHistory.set(key, value);
            }
        }
        
        if (data.networkConditions) {
            this.networkConditions = { ...data.networkConditions };
        }
        
        if (data.pageComplexity) {
            this.pageComplexity = { ...data.pageComplexity };
        }
        
        this.emit('historyImported', data);
    }

    /**
     * Clear all timing data
     */
    clearTimingData() {
        this.timingHistory.clear();
        this.emit('timingDataCleared');
    }
}

module.exports = AdaptiveTimingController;