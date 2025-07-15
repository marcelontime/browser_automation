const { z } = require('zod');

/**
 * 🎯 ROBUST ELEMENT INTERACTION SYSTEM
 * 
 * Provides multiple selector strategies, timeout protection, and retry mechanisms
 * Inspired by the sophisticated element handling in Brazilian insurance automation
 */
class RobustElementInteraction {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            defaultTimeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
            visualVerification: true,
            stabilityWait: 500,
            ...options
        };
        
        this.selectorStrategies = [
            'css',
            'xpath',
            'accessibility',
            'text',
            'fuzzy',
            'position'
        ];
        
        this.interactionTypes = {
            CLICK: 'click',
            TYPE: 'type',
            SELECT: 'select',
            HOVER: 'hover',
            WAIT: 'wait',
            SCROLL: 'scroll',
            DRAG: 'drag'
        };
        
        this.elementStates = {
            VISIBLE: 'visible',
            HIDDEN: 'hidden',
            ENABLED: 'enabled',
            DISABLED: 'disabled',
            STABLE: 'stable',
            MOVING: 'moving'
        };
    }

    /**
     * Main interaction method with comprehensive error handling
     * @param {string} selector - Element selector or description
     * @param {string} action - Action to perform
     * @param {Object} options - Interaction options
     * @returns {Promise<Object>} Interaction result
     */
    async interact(selector, action, options = {}) {
        const startTime = Date.now();
        const config = { ...this.options, ...options };
        
        console.log(`🎯 Attempting ${action} on: ${selector}`);
        
        for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
            try {
                const element = await this.findElement(selector, config);
                
                if (!element) {
                    throw new Error(`Element not found: ${selector}`);
                }
                
                // Validate element state
                await this.validateElementState(element, action, config);
                
                // Perform the action
                const result = await this.performAction(element, action, config);
                
                // Visual verification if enabled
                if (config.visualVerification) {
                    await this.verifyActionResult(element, action, result, config);
                }
                
                const duration = Date.now() - startTime;
                console.log(`✅ ${action} completed in ${duration}ms (attempt ${attempt})`);
                
                return {
                    success: true,
                    action,
                    selector,
                    attempt,
                    duration,
                    result
                };
                
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`❌ ${action} failed (attempt ${attempt}/${config.retryAttempts}): ${error.message}`);
                
                if (attempt === config.retryAttempts) {
                    return {
                        success: false,
                        action,
                        selector,
                        attempt,
                        duration,
                        error: error.message,
                        screenshot: await this.captureErrorScreenshot()
                    };
                }
                
                // Wait before retry with exponential backoff
                const delay = config.exponentialBackoff 
                    ? config.retryDelay * Math.pow(2, attempt - 1)
                    : config.retryDelay;
                
                console.log(`⏳ Retrying in ${delay}ms...`);
                await this.wait(delay);
            }
        }
    }

    /**
     * Find element using multiple strategies
     * @param {string} selector - Element selector or description
     * @param {Object} config - Configuration options
     * @returns {Promise<ElementHandle|null>} Element handle or null
     */
    async findElement(selector, config) {
        const timeout = config.timeout || this.options.defaultTimeout;
        const startTime = Date.now();
        
        // Try each selector strategy
        for (const strategy of this.selectorStrategies) {
            try {
                const element = await this.tryElementStrategy(selector, strategy, config);
                
                if (element) {
                    console.log(`🎯 Element found using ${strategy} strategy`);
                    return element;
                }
            } catch (error) {
                console.log(`⚠️ ${strategy} strategy failed: ${error.message}`);
            }
            
            // Check timeout
            if (Date.now() - startTime > timeout) {
                throw new Error(`Timeout after ${timeout}ms finding element: ${selector}`);
            }
        }
        
        return null;
    }

    /**
     * Try different element detection strategies
     * @param {string} selector - Element selector or description
     * @param {string} strategy - Detection strategy to use
     * @param {Object} config - Configuration options
     * @returns {Promise<ElementHandle|null>} Element handle or null
     */
    async tryElementStrategy(selector, strategy, config) {
        switch (strategy) {
            case 'css':
                return await this.findByCSSSelector(selector, config);
                
            case 'xpath':
                return await this.findByXPath(selector, config);
                
            case 'accessibility':
                return await this.findByAccessibility(selector, config);
                
            case 'text':
                return await this.findByText(selector, config);
                
            case 'fuzzy':
                return await this.findByFuzzyMatch(selector, config);
                
            case 'position':
                return await this.findByPosition(selector, config);
                
            default:
                throw new Error(`Unknown strategy: ${strategy}`);
        }
    }

    /**
     * Find element by CSS selector
     */
    async findByCSSSelector(selector, config) {
        try {
            const element = await this.page.locator(selector).first();
            return await element.isVisible() ? element : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find element by XPath
     */
    async findByXPath(selector, config) {
        try {
            // Convert common selectors to XPath
            const xpath = this.convertToXPath(selector);
            const element = await this.page.locator(`xpath=${xpath}`).first();
            return await element.isVisible() ? element : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find element by accessibility features
     */
    async findByAccessibility(selector, config) {
        try {
            // Try role-based selection
            const byRole = await this.page.getByRole('button', { name: selector }).first();
            if (await byRole.isVisible()) return byRole;
            
            // Try label-based selection
            const byLabel = await this.page.getByLabel(selector).first();
            if (await byLabel.isVisible()) return byLabel;
            
            // Try placeholder-based selection
            const byPlaceholder = await this.page.getByPlaceholder(selector).first();
            if (await byPlaceholder.isVisible()) return byPlaceholder;
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find element by text content
     */
    async findByText(selector, config) {
        try {
            const element = await this.page.getByText(selector, { exact: false }).first();
            return await element.isVisible() ? element : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find element by fuzzy text matching
     */
    async findByFuzzyMatch(selector, config) {
        try {
            // Get all text elements
            const textElements = await this.page.locator('*').filter({ hasText: /.+/ }).all();
            
            for (const element of textElements) {
                const text = await element.textContent();
                if (text && this.fuzzyMatch(selector, text)) {
                    return element;
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Find element by position/context
     */
    async findByPosition(selector, config) {
        try {
            // Try to find nearby elements and use relative positioning
            const context = config.context || 'form';
            const contextElement = await this.page.locator(context).first();
            
            if (contextElement) {
                const childElement = await contextElement.locator(selector).first();
                return await childElement.isVisible() ? childElement : null;
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Validate element state before interaction
     */
    async validateElementState(element, action, config) {
        const checks = [];
        
        // Check visibility
        if (!(await element.isVisible())) {
            throw new Error('Element is not visible');
        }
        checks.push('visible');
        
        // Check if element is enabled for interactive actions
        if (['click', 'type', 'select'].includes(action)) {
            if (!(await element.isEnabled())) {
                throw new Error('Element is not enabled');
            }
            checks.push('enabled');
        }
        
        // Check element stability
        if (config.stabilityWait > 0) {
            await this.waitForStability(element, config.stabilityWait);
            checks.push('stable');
        }
        
        // Check if element is in viewport
        const boundingBox = await element.boundingBox();
        if (!boundingBox) {
            throw new Error('Element has no bounding box');
        }
        checks.push('positioned');
        
        console.log(`✅ Element state validated: ${checks.join(', ')}`);
    }

    /**
     * Perform the actual action on the element
     */
    async performAction(element, action, config) {
        switch (action) {
            case this.interactionTypes.CLICK:
                await element.click();
                return { action: 'click', timestamp: Date.now() };
                
            case this.interactionTypes.TYPE:
                if (!config.text) {
                    throw new Error('Text is required for type action');
                }
                await element.fill(config.text);
                return { action: 'type', text: config.text, timestamp: Date.now() };
                
            case this.interactionTypes.SELECT:
                if (!config.value) {
                    throw new Error('Value is required for select action');
                }
                await element.selectOption(config.value);
                return { action: 'select', value: config.value, timestamp: Date.now() };
                
            case this.interactionTypes.HOVER:
                await element.hover();
                return { action: 'hover', timestamp: Date.now() };
                
            case this.interactionTypes.SCROLL:
                await element.scrollIntoViewIfNeeded();
                return { action: 'scroll', timestamp: Date.now() };
                
            case this.interactionTypes.DRAG:
                if (!config.target) {
                    throw new Error('Target is required for drag action');
                }
                await element.dragTo(config.target);
                return { action: 'drag', timestamp: Date.now() };
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    /**
     * Verify action result
     */
    async verifyActionResult(element, action, result, config) {
        // Wait for potential UI updates
        await this.wait(config.stabilityWait || 500);
        
        switch (action) {
            case this.interactionTypes.CLICK:
                // Check if click triggered navigation or modal
                await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
                break;
                
            case this.interactionTypes.TYPE:
                // Verify text was entered
                const value = await element.inputValue();
                if (value !== config.text) {
                    console.warn(`⚠️ Text verification failed: expected "${config.text}", got "${value}"`);
                }
                break;
                
            case this.interactionTypes.SELECT:
                // Verify option was selected
                const selectedValue = await element.inputValue();
                if (selectedValue !== config.value) {
                    console.warn(`⚠️ Select verification failed: expected "${config.value}", got "${selectedValue}"`);
                }
                break;
        }
    }

    /**
     * Wait for element stability
     */
    async waitForStability(element, duration) {
        const startTime = Date.now();
        let lastPosition = await element.boundingBox();
        
        while (Date.now() - startTime < duration) {
            await this.wait(100);
            const currentPosition = await element.boundingBox();
            
            if (JSON.stringify(lastPosition) !== JSON.stringify(currentPosition)) {
                lastPosition = currentPosition;
                continue; // Reset wait if position changed
            }
        }
    }

    /**
     * Capture error screenshot
     */
    async captureErrorScreenshot() {
        try {
            const screenshot = await this.page.screenshot({
                type: 'png',
                fullPage: false
            });
            return screenshot.toString('base64');
        } catch (error) {
            console.error('Failed to capture error screenshot:', error.message);
            return null;
        }
    }

    /**
     * Enhanced dropdown selection with arrow keys (Brazilian insurance style)
     */
    async selectDropdownWithArrows(selector, targetText, config = {}) {
        const element = await this.findElement(selector, config);
        if (!element) {
            throw new Error(`Dropdown not found: ${selector}`);
        }
        
        // Click to open dropdown
        await element.click();
        await this.wait(500);
        
        // Try to find exact match first
        const options = await this.page.locator(`${selector} option`).all();
        for (const option of options) {
            const text = await option.textContent();
            if (text && text.trim() === targetText.trim()) {
                await option.click();
                return { success: true, method: 'direct' };
            }
        }
        
        // If not found, use arrow key navigation
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            await this.page.keyboard.press('ArrowDown');
            await this.wait(100);
            
            const currentValue = await element.inputValue();
            if (currentValue === targetText) {
                await this.page.keyboard.press('Enter');
                return { success: true, method: 'arrow_keys', attempts };
            }
            
            attempts++;
        }
        
        throw new Error(`Could not select "${targetText}" from dropdown after ${maxAttempts} attempts`);
    }

    /**
     * Utility methods
     */
    convertToXPath(selector) {
        // Simple CSS to XPath conversion
        if (selector.startsWith('#')) {
            return `//*[@id='${selector.substring(1)}']`;
        } else if (selector.startsWith('.')) {
            return `//*[@class='${selector.substring(1)}']`;
        } else if (selector.includes('[')) {
            // Handle attribute selectors
            const match = selector.match(/(\w+)\[(\w+)='([^']+)'\]/);
            if (match) {
                return `//${match[1]}[@${match[2]}='${match[3]}']`;
            }
        }
        return `//${selector}`;
    }

    fuzzyMatch(needle, haystack, threshold = 0.8) {
        if (!needle || !haystack) return false;
        
        const distance = this.levenshteinDistance(
            needle.toLowerCase().trim(),
            haystack.toLowerCase().trim()
        );
        
        const maxLength = Math.max(needle.length, haystack.length);
        const similarity = (maxLength - distance) / maxLength;
        
        return similarity >= threshold;
    }

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

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get interaction statistics
     */
    getStats() {
        return {
            supportedStrategies: this.selectorStrategies,
            supportedActions: Object.values(this.interactionTypes),
            defaultTimeout: this.options.defaultTimeout,
            retryAttempts: this.options.retryAttempts,
            visualVerification: this.options.visualVerification
        };
    }
}

module.exports = RobustElementInteraction; 