const EventEmitter = require('events');

/**
 * Self-Healing Element Detection Engine
 * Implements AI-powered element detection with fallback strategies
 */
class SelfHealingEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = {
            maxRetries: options.maxRetries || 5,
            confidenceThreshold: options.confidenceThreshold || 0.7,
            visualSimilarityThreshold: options.visualSimilarityThreshold || 0.8,
            enableLearning: options.enableLearning !== false,
            ...options
        };
        
        this.selectorStrategies = new Map();
        this.visualFingerprints = new Map();
        this.semanticContexts = new Map();
        this.learningData = new Map();
        this.successfulFallbacks = new Map();
        
        this.initializeStrategies();
    }

    /**
     * Initialize element finding strategies
     */
    initializeStrategies() {
        // Primary strategies (in order of preference)
        this.selectorStrategies.set('css', {
            priority: 1,
            execute: this.findByCssSelector.bind(this),
            confidence: 0.9
        });
        
        this.selectorStrategies.set('xpath', {
            priority: 2,
            execute: this.findByXPath.bind(this),
            confidence: 0.85
        });
        
        this.selectorStrategies.set('accessibility', {
            priority: 3,
            execute: this.findByAccessibility.bind(this),
            confidence: 0.8
        });
        
        // Fallback strategies
        this.selectorStrategies.set('visual', {
            priority: 4,
            execute: this.findByVisualSimilarity.bind(this),
            confidence: 0.75
        });
        
        this.selectorStrategies.set('semantic', {
            priority: 5,
            execute: this.findBySemanticContext.bind(this),
            confidence: 0.7
        });
        
        this.selectorStrategies.set('fuzzy', {
            priority: 6,
            execute: this.findByFuzzyMatching.bind(this),
            confidence: 0.6
        });
    }

    /**
     * Main element finding method with self-healing capabilities
     */
    async findElement(page, elementSelector, context = {}) {
        const startTime = Date.now();
        const attempts = [];
        
        try {
            // Prepare element selector data
            const selectorData = this.prepareSelectorData(elementSelector, context);
            
            // Try strategies in order of priority and success history
            const strategies = this.getOrderedStrategies(selectorData);
            
            for (const strategy of strategies) {
                const attempt = {
                    strategy: strategy.name,
                    startTime: Date.now(),
                    confidence: strategy.confidence
                };
                
                try {
                    const element = await strategy.execute(page, selectorData, context);
                    
                    if (element) {
                        attempt.success = true;
                        attempt.executionTime = Date.now() - attempt.startTime;
                        attempts.push(attempt);
                        
                        // Learn from successful strategy
                        await this.learnFromSuccess(selectorData, strategy, element);
                        
                        // Emit success event
                        this.emit('elementFound', {
                            selector: elementSelector,
                            strategy: strategy.name,
                            attempts,
                            totalTime: Date.now() - startTime,
                            confidence: strategy.confidence
                        });
                        
                        return {
                            element,
                            strategy: strategy.name,
                            confidence: strategy.confidence,
                            attempts,
                            executionTime: Date.now() - startTime
                        };
                    }
                } catch (error) {
                    attempt.success = false;
                    attempt.error = error.message;
                    attempt.executionTime = Date.now() - attempt.startTime;
                }
                
                attempts.push(attempt);
            }
            
            // All strategies failed
            const error = new Error(`Element not found after trying ${attempts.length} strategies`);
            error.attempts = attempts;
            error.selector = elementSelector;
            
            this.emit('elementNotFound', {
                selector: elementSelector,
                attempts,
                totalTime: Date.now() - startTime
            });
            
            throw error;
            
        } catch (error) {
            this.emit('findElementError', {
                selector: elementSelector,
                error: error.message,
                attempts,
                totalTime: Date.now() - startTime
            });
            
            throw error;
        }
    }

    /**
     * Prepare selector data for element finding
     */
    prepareSelectorData(elementSelector, context) {
        if (typeof elementSelector === 'string') {
            return {
                primary: elementSelector,
                css: [elementSelector],
                xpath: [],
                accessibility: {},
                visual: null,
                semantic: null,
                context
            };
        }
        
        return {
            primary: elementSelector.primary || elementSelector.css?.[0] || elementSelector.xpath?.[0],
            css: elementSelector.css || [],
            xpath: elementSelector.xpath || [],
            accessibility: elementSelector.accessibility || {},
            visual: elementSelector.visual || null,
            semantic: elementSelector.semantic || null,
            context: { ...elementSelector.context, ...context }
        };
    }

    /**
     * Get strategies ordered by priority and success history
     */
    getOrderedStrategies(selectorData) {
        const strategies = Array.from(this.selectorStrategies.entries())
            .map(([name, strategy]) => ({ name, ...strategy }))
            .sort((a, b) => {
                // Consider success history for this selector
                const aHistory = this.getStrategyHistory(selectorData.primary, a.name);
                const bHistory = this.getStrategyHistory(selectorData.primary, b.name);
                
                // Boost priority based on historical success
                const aScore = a.priority + (aHistory.successRate * 2);
                const bScore = b.priority + (bHistory.successRate * 2);
                
                return aScore - bScore;
            });
        
        return strategies;
    }

    /**
     * Find element by CSS selector
     */
    async findByCssSelector(page, selectorData, context) {
        const selectors = selectorData.css || [selectorData.primary];
        
        for (const selector of selectors) {
            try {
                const processedSelector = this.processSelector(selector, context);
                const element = await page.$(processedSelector);
                
                if (element && await this.isElementInteractable(element)) {
                    return element;
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    /**
     * Find element by XPath
     */
    async findByXPath(page, selectorData, context) {
        const xpaths = selectorData.xpath || [];
        
        for (const xpath of xpaths) {
            try {
                const processedXPath = this.processSelector(xpath, context);
                const elements = await page.$x(processedXPath);
                
                if (elements.length > 0) {
                    const element = elements[0];
                    if (await this.isElementInteractable(element)) {
                        return element;
                    }
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }

    /**
     * Find element by accessibility attributes
     */
    async findByAccessibility(page, selectorData, context) {
        const accessibility = selectorData.accessibility;
        
        if (!accessibility || Object.keys(accessibility).length === 0) {
            return null;
        }
        
        try {
            // Build accessibility-based selector
            let selector = '';
            
            if (accessibility.role) {
                selector += `[role="${accessibility.role}"]`;
            }
            
            if (accessibility.label) {
                selector += `[aria-label*="${accessibility.label}"]`;
            }
            
            if (accessibility.labelledby) {
                selector += `[aria-labelledby="${accessibility.labelledby}"]`;
            }
            
            if (accessibility.describedby) {
                selector += `[aria-describedby="${accessibility.describedby}"]`;
            }
            
            if (selector) {
                const element = await page.$(selector);
                if (element && await this.isElementInteractable(element)) {
                    return element;
                }
            }
            
            // Try text-based accessibility search
            if (accessibility.text) {
                const textSelector = `text=${accessibility.text}`;
                const element = await page.$(textSelector);
                if (element && await this.isElementInteractable(element)) {
                    return element;
                }
            }
            
        } catch (error) {
            // Accessibility search failed
        }
        
        return null;
    }

    /**
     * Find element by visual similarity
     */
    async findByVisualSimilarity(page, selectorData, context) {
        const visualData = selectorData.visual;
        
        if (!visualData || !visualData.screenshot) {
            return null;
        }
        
        try {
            // Take current page screenshot
            const currentScreenshot = await page.screenshot({ fullPage: true });
            
            // Find visually similar elements
            const similarElements = await this.findVisuallySimilarElements(
                currentScreenshot,
                visualData,
                page
            );
            
            // Return the most similar element that's interactable
            for (const element of similarElements) {
                if (await this.isElementInteractable(element.element)) {
                    return element.element;
                }
            }
            
        } catch (error) {
            console.warn('Visual similarity search failed:', error.message);
        }
        
        return null;
    }

    /**
     * Find element by semantic context
     */
    async findBySemanticContext(page, selectorData, context) {
        const semantic = selectorData.semantic;
        
        if (!semantic) {
            return null;
        }
        
        try {
            // Use semantic information to build intelligent selectors
            const candidates = await this.findSemanticCandidates(page, semantic);
            
            // Score candidates based on semantic similarity
            const scoredCandidates = await this.scoreSemanticCandidates(candidates, semantic);
            
            // Return the best candidate
            const bestCandidate = scoredCandidates
                .filter(c => c.score >= this.options.confidenceThreshold)
                .sort((a, b) => b.score - a.score)[0];
            
            if (bestCandidate && await this.isElementInteractable(bestCandidate.element)) {
                return bestCandidate.element;
            }
            
        } catch (error) {
            console.warn('Semantic context search failed:', error.message);
        }
        
        return null;
    }

    /**
     * Find element by fuzzy matching
     */
    async findByFuzzyMatching(page, selectorData, context) {
        try {
            // Generate fuzzy selectors based on the original selector
            const fuzzySelectors = this.generateFuzzySelectors(selectorData.primary);
            
            for (const fuzzySelector of fuzzySelectors) {
                try {
                    const element = await page.$(fuzzySelector);
                    if (element && await this.isElementInteractable(element)) {
                        return element;
                    }
                } catch (error) {
                    continue;
                }
            }
            
        } catch (error) {
            console.warn('Fuzzy matching failed:', error.message);
        }
        
        return null;
    }

    /**
     * Check if element is interactable
     */
    async isElementInteractable(element) {
        try {
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            
            return isVisible && isEnabled;
        } catch (error) {
            return false;
        }
    }

    /**
     * Process selector with variable substitution
     */
    processSelector(selector, context) {
        if (!selector || !selector.includes('{{')) {
            return selector;
        }

        let processedSelector = selector;
        const variablePattern = /\{\{([^}]+)\}\}/g;
        let match;

        while ((match = variablePattern.exec(selector)) !== null) {
            const variableName = match[1].trim();
            const variableValue = context.getVariable?.(variableName) || context[variableName];
            
            if (variableValue !== undefined && variableValue !== null) {
                processedSelector = processedSelector.replace(match[0], String(variableValue));
            }
        }

        return processedSelector;
    }

    /**
     * Learn from successful element finding
     */
    async learnFromSuccess(selectorData, strategy, element) {
        if (!this.options.enableLearning) {
            return;
        }
        
        const selectorKey = selectorData.primary;
        
        // Update strategy success history
        if (!this.successfulFallbacks.has(selectorKey)) {
            this.successfulFallbacks.set(selectorKey, new Map());
        }
        
        const strategyHistory = this.successfulFallbacks.get(selectorKey);
        const currentStats = strategyHistory.get(strategy.name) || { successes: 0, attempts: 0 };
        
        currentStats.successes++;
        currentStats.attempts++;
        currentStats.lastSuccess = Date.now();
        
        strategyHistory.set(strategy.name, currentStats);
        
        // Store element characteristics for future reference
        try {
            const elementInfo = await this.extractElementInfo(element);
            this.storeElementLearningData(selectorKey, strategy.name, elementInfo);
        } catch (error) {
            console.warn('Failed to extract element info for learning:', error.message);
        }
    }

    /**
     * Get strategy success history
     */
    getStrategyHistory(selector, strategyName) {
        const selectorHistory = this.successfulFallbacks.get(selector);
        if (!selectorHistory) {
            return { successRate: 0, attempts: 0, successes: 0 };
        }
        
        const strategyStats = selectorHistory.get(strategyName);
        if (!strategyStats) {
            return { successRate: 0, attempts: 0, successes: 0 };
        }
        
        return {
            successRate: strategyStats.successes / strategyStats.attempts,
            attempts: strategyStats.attempts,
            successes: strategyStats.successes,
            lastSuccess: strategyStats.lastSuccess
        };
    }

    /**
     * Extract element information for learning
     */
    async extractElementInfo(element) {
        try {
            const boundingBox = await element.boundingBox();
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());
            const className = await element.evaluate(el => el.className);
            const id = await element.evaluate(el => el.id);
            const textContent = await element.evaluate(el => el.textContent?.trim());
            
            return {
                tagName,
                className,
                id,
                textContent,
                boundingBox,
                timestamp: Date.now()
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Store element learning data
     */
    storeElementLearningData(selector, strategy, elementInfo) {
        if (!this.learningData.has(selector)) {
            this.learningData.set(selector, new Map());
        }
        
        const selectorLearning = this.learningData.get(selector);
        if (!selectorLearning.has(strategy)) {
            selectorLearning.set(strategy, []);
        }
        
        const strategyLearning = selectorLearning.get(strategy);
        strategyLearning.push(elementInfo);
        
        // Keep only recent learning data (last 10 entries)
        if (strategyLearning.length > 10) {
            strategyLearning.splice(0, strategyLearning.length - 10);
        }
    }

    /**
     * Generate fuzzy selectors for fallback
     */
    generateFuzzySelectors(originalSelector) {
        const fuzzySelectors = [];
        
        if (!originalSelector) {
            return fuzzySelectors;
        }
        
        // Remove specific indices
        fuzzySelectors.push(originalSelector.replace(/\[\d+\]/g, ''));
        
        // Make class selectors more generic
        fuzzySelectors.push(originalSelector.replace(/\.[a-zA-Z0-9_-]+/g, ''));
        
        // Remove ID selectors
        fuzzySelectors.push(originalSelector.replace(/#[a-zA-Z0-9_-]+/g, ''));
        
        // Make attribute selectors more generic
        fuzzySelectors.push(originalSelector.replace(/\[[^\]]*\]/g, ''));
        
        // Try parent selectors
        const parts = originalSelector.split(' ');
        if (parts.length > 1) {
            fuzzySelectors.push(parts.slice(1).join(' '));
            fuzzySelectors.push(parts.slice(0, -1).join(' '));
        }
        
        return fuzzySelectors.filter(s => s && s !== originalSelector);
    }

    /**
     * Find visually similar elements (placeholder implementation)
     */
    async findVisuallySimilarElements(currentScreenshot, visualData, page) {
        // This would implement actual visual similarity matching
        // For now, return empty array as placeholder
        return [];
    }

    /**
     * Find semantic candidates (placeholder implementation)
     */
    async findSemanticCandidates(page, semantic) {
        // This would implement semantic analysis
        // For now, return empty array as placeholder
        return [];
    }

    /**
     * Score semantic candidates (placeholder implementation)
     */
    async scoreSemanticCandidates(candidates, semantic) {
        // This would implement semantic scoring
        // For now, return empty array as placeholder
        return [];
    }

    /**
     * Get learning statistics
     */
    getLearningStats() {
        const stats = {
            totalSelectors: this.successfulFallbacks.size,
            totalStrategies: this.selectorStrategies.size,
            learningDataPoints: 0
        };
        
        for (const [selector, strategies] of this.successfulFallbacks) {
            for (const [strategy, data] of strategies) {
                stats.learningDataPoints += data.attempts;
            }
        }
        
        return stats;
    }

    /**
     * Clear learning data
     */
    clearLearningData() {
        this.successfulFallbacks.clear();
        this.learningData.clear();
        this.emit('learningDataCleared');
    }

    /**
     * Export learning data
     */
    exportLearningData() {
        return {
            successfulFallbacks: Object.fromEntries(
                Array.from(this.successfulFallbacks.entries()).map(([key, value]) => [
                    key,
                    Object.fromEntries(value)
                ])
            ),
            learningData: Object.fromEntries(
                Array.from(this.learningData.entries()).map(([key, value]) => [
                    key,
                    Object.fromEntries(
                        Array.from(value.entries()).map(([strategyKey, strategyValue]) => [
                            strategyKey,
                            strategyValue
                        ])
                    )
                ])
            ),
            timestamp: Date.now()
        };
    }

    /**
     * Import learning data
     */
    importLearningData(data) {
        if (data.successfulFallbacks) {
            this.successfulFallbacks.clear();
            for (const [key, value] of Object.entries(data.successfulFallbacks)) {
                this.successfulFallbacks.set(key, new Map(Object.entries(value)));
            }
        }
        
        if (data.learningData) {
            this.learningData.clear();
            for (const [key, value] of Object.entries(data.learningData)) {
                const strategyMap = new Map();
                for (const [strategyKey, strategyValue] of Object.entries(value)) {
                    strategyMap.set(strategyKey, strategyValue);
                }
                this.learningData.set(key, strategyMap);
            }
        }
        
        this.emit('learningDataImported', data);
    }
}

module.exports = SelfHealingEngine;