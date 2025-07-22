const SelfHealingEngine = require('../../execution/self-healing-engine');
const VisualSimilarityMatcher = require('../../execution/visual-similarity-matcher');
const SemanticContextAnalyzer = require('../../execution/semantic-context-analyzer');

/**
 * Enhanced Interaction step handler with self-healing capabilities
 */
class InteractionHandler {
    constructor(options = {}) {
        this.options = {
            defaultTimeout: options.defaultTimeout || 30000,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            enableSelfHealing: options.enableSelfHealing !== false,
            ...options
        };
        
        // Initialize self-healing components
        if (this.options.enableSelfHealing) {
            this.selfHealingEngine = new SelfHealingEngine(options.selfHealing || {});
            this.visualMatcher = new VisualSimilarityMatcher(options.visualMatching || {});
            this.semanticAnalyzer = new SemanticContextAnalyzer(options.semanticAnalysis || {});
        }
    }

    /**
     * Execute interaction step
     */
    async execute(step, context) {
        const { action, target, value } = step;
        const automationEngine = context.automationEngine || context.browser;
        
        if (!automationEngine || !automationEngine.page) {
            throw new Error('Browser automation engine not available');
        }

        const page = automationEngine.page;
        const startTime = Date.now();

        try {
            let result;

            switch (action) {
                case 'click':
                    result = await this.handleClick(page, target, step, context);
                    break;
                    
                case 'type':
                    result = await this.handleType(page, target, value, step, context);
                    break;
                    
                case 'select':
                    result = await this.handleSelect(page, target, value, step, context);
                    break;
                    
                case 'hover':
                    result = await this.handleHover(page, target, step, context);
                    break;
                    
                case 'scroll':
                    result = await this.handleScroll(page, target, step, context);
                    break;
                    
                case 'drag':
                    result = await this.handleDrag(page, target, value, step, context);
                    break;
                    
                case 'focus':
                    result = await this.handleFocus(page, target, step, context);
                    break;
                    
                case 'blur':
                    result = await this.handleBlur(page, target, step, context);
                    break;
                    
                default:
                    throw new Error(`Unsupported interaction action: ${action}`);
            }

            const executionTime = Date.now() - startTime;
            
            return {
                success: true,
                action,
                target,
                value,
                result,
                executionTime
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            throw new Error(`Interaction ${action} failed: ${error.message}`, {
                cause: error,
                executionTime,
                step: step.id
            });
        }
    }

    /**
     * Handle click interaction with self-healing
     */
    async handleClick(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        // Try to find element with self-healing
        const element = await this.findElementWithHealing(page, processedSelector, step, context);
        
        if (!element) {
            throw new Error(`Click target not found: ${processedSelector}`);
        }
        
        // Get click options
        const options = {
            timeout: step.timeout || this.options.defaultTimeout,
            force: step.force || false,
            button: step.button || 'left',
            clickCount: step.clickCount || 1,
            delay: step.delay || 0
        };

        // Perform click on the found element
        await element.click(options);
        
        // Wait for any post-click conditions
        if (step.waitAfter) {
            await this.waitForCondition(page, step.waitAfter, context);
        }

        return {
            selector: processedSelector,
            options,
            timestamp: new Date(),
            selfHealed: element !== await page.$(processedSelector)
        };
    }

    /**
     * Handle type interaction with self-healing
     */
    async handleType(page, selector, text, step, context) {
        const processedSelector = this.processSelector(selector, context);
        const processedText = this.processText(text, context);
        
        // Try to find element with self-healing
        const element = await this.findElementWithHealing(page, processedSelector, step, context);
        
        if (!element) {
            throw new Error(`Type target not found: ${processedSelector}`);
        }
        
        // Clear existing text if specified
        if (step.clear !== false) {
            await element.fill('');
        }
        
        // Type options
        const options = {
            delay: step.typeDelay || 0,
            timeout: step.timeout || this.options.defaultTimeout
        };

        // Perform typing
        if (step.clear === false) {
            await element.type(processedText, options);
        } else {
            await element.fill(processedText);
        }
        
        // Trigger change event if needed
        if (step.triggerChange !== false) {
            await element.dispatchEvent('change');
        }
        
        // Wait for any post-type conditions
        if (step.waitAfter) {
            await this.waitForCondition(page, step.waitAfter, context);
        }

        return {
            selector: processedSelector,
            text: processedText,
            options,
            timestamp: new Date(),
            selfHealed: element !== await page.$(processedSelector)
        };
    }

    /**
     * Handle select interaction
     */
    async handleSelect(page, selector, value, step, context) {
        const processedSelector = this.processSelector(selector, context);
        const processedValue = this.processValue(value, context);
        
        // Wait for element to be available
        await this.waitForElement(page, processedSelector, step);
        
        let result;
        
        if (Array.isArray(processedValue)) {
            // Multiple selection
            result = await page.selectOption(processedSelector, processedValue);
        } else if (typeof processedValue === 'object') {
            // Selection by label, value, or index
            result = await page.selectOption(processedSelector, processedValue);
        } else {
            // Single value selection
            result = await page.selectOption(processedSelector, processedValue);
        }
        
        // Wait for any post-select conditions
        if (step.waitAfter) {
            await this.waitForCondition(page, step.waitAfter, context);
        }

        return {
            selector: processedSelector,
            value: processedValue,
            selectedOptions: result,
            timestamp: new Date()
        };
    }

    /**
     * Handle hover interaction
     */
    async handleHover(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        // Wait for element to be available
        await this.waitForElement(page, processedSelector, step);
        
        // Perform hover
        await page.hover(processedSelector, {
            timeout: step.timeout || this.options.defaultTimeout,
            force: step.force || false
        });
        
        // Wait for any post-hover conditions
        if (step.waitAfter) {
            await this.waitForCondition(page, step.waitAfter, context);
        }

        return {
            selector: processedSelector,
            timestamp: new Date()
        };
    }

    /**
     * Handle scroll interaction
     */
    async handleScroll(page, target, step, context) {
        let result;
        
        if (target && target !== 'page') {
            // Scroll to element
            const processedSelector = this.processSelector(target, context);
            await this.waitForElement(page, processedSelector, step);
            
            const element = await page.$(processedSelector);
            await element.scrollIntoView({
                behavior: step.behavior || 'smooth',
                block: step.block || 'center',
                inline: step.inline || 'center'
            });
            
            result = {
                type: 'element',
                selector: processedSelector
            };
        } else {
            // Scroll page
            const scrollOptions = {
                x: step.x || 0,
                y: step.y || 0,
                behavior: step.behavior || 'smooth'
            };
            
            await page.evaluate((options) => {
                window.scrollTo(options);
            }, scrollOptions);
            
            result = {
                type: 'page',
                options: scrollOptions
            };
        }
        
        // Wait for scroll to complete
        await page.waitForTimeout(step.waitAfter || 500);

        return {
            ...result,
            timestamp: new Date()
        };
    }

    /**
     * Handle drag interaction
     */
    async handleDrag(page, sourceSelector, targetInfo, step, context) {
        const processedSource = this.processSelector(sourceSelector, context);
        
        // Wait for source element
        await this.waitForElement(page, processedSource, step);
        
        let result;
        
        if (typeof targetInfo === 'string') {
            // Drag to target element
            const processedTarget = this.processSelector(targetInfo, context);
            await this.waitForElement(page, processedTarget, step);
            
            await page.dragAndDrop(processedSource, processedTarget, {
                timeout: step.timeout || this.options.defaultTimeout,
                force: step.force || false
            });
            
            result = {
                type: 'element',
                source: processedSource,
                target: processedTarget
            };
        } else if (typeof targetInfo === 'object' && targetInfo.x !== undefined) {
            // Drag to coordinates
            const sourceElement = await page.$(processedSource);
            const sourceBox = await sourceElement.boundingBox();
            
            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(targetInfo.x, targetInfo.y);
            await page.mouse.up();
            
            result = {
                type: 'coordinates',
                source: processedSource,
                target: targetInfo
            };
        } else {
            throw new Error('Invalid drag target: must be selector string or coordinates object');
        }
        
        // Wait for any post-drag conditions
        if (step.waitAfter) {
            await this.waitForCondition(page, step.waitAfter, context);
        }

        return {
            ...result,
            timestamp: new Date()
        };
    }

    /**
     * Handle focus interaction
     */
    async handleFocus(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        await this.waitForElement(page, processedSelector, step);
        await page.focus(processedSelector);
        
        return {
            selector: processedSelector,
            timestamp: new Date()
        };
    }

    /**
     * Handle blur interaction
     */
    async handleBlur(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        await page.evaluate((sel) => {
            const element = document.querySelector(sel);
            if (element) element.blur();
        }, processedSelector);
        
        return {
            selector: processedSelector,
            timestamp: new Date()
        };
    }

    /**
     * Wait for element to be available and interactable with self-healing
     */
    async waitForElement(page, selector, step) {
        const timeout = step.timeout || this.options.defaultTimeout;
        
        try {
            // Try standard element waiting first
            await page.waitForSelector(selector, {
                timeout: Math.min(timeout / 2, 15000), // Use half timeout for initial attempt
                state: step.waitForState || 'visible'
            });
            
            // Additional wait for element to be stable if specified
            if (step.waitForStable) {
                await page.waitForTimeout(step.waitForStable);
            }
            
            return true;
            
        } catch (error) {
            // If self-healing is enabled, try to find element using advanced strategies
            if (this.options.enableSelfHealing && this.selfHealingEngine) {
                console.log(`Standard element wait failed for ${selector}, attempting self-healing...`);
                
                try {
                    const result = await this.selfHealingEngine.findElement(page, selector, {
                        step,
                        timeout: timeout / 2,
                        getVariable: (name) => step.context?.getVariable?.(name)
                    });
                    
                    if (result && result.element) {
                        console.log(`Self-healing successful using ${result.strategy} strategy`);
                        return true;
                    }
                } catch (healingError) {
                    console.warn('Self-healing also failed:', healingError.message);
                }
            }
            
            // Re-throw original error if self-healing failed or is disabled
            throw error;
        }
    }

    /**
     * Enhanced element finding with self-healing capabilities
     */
    async findElementWithHealing(page, selector, step, context) {
        try {
            // Try standard selector first
            const element = await page.$(selector);
            if (element && await this.isElementInteractable(element)) {
                return element;
            }
            
            // If self-healing is enabled and element not found or not interactable
            if (this.options.enableSelfHealing && this.selfHealingEngine) {
                const result = await this.selfHealingEngine.findElement(page, selector, {
                    step,
                    context,
                    getVariable: (name) => context?.getVariable?.(name)
                });
                
                if (result && result.element) {
                    return result.element;
                }
            }
            
            return null;
            
        } catch (error) {
            console.warn(`Element finding failed for ${selector}:`, error.message);
            return null;
        }
    }

    /**
     * Check if element is interactable
     */
    async isElementInteractable(element) {
        try {
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            const boundingBox = await element.boundingBox();
            
            return isVisible && isEnabled && boundingBox && boundingBox.width > 0 && boundingBox.height > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Wait for post-action conditions
     */
    async waitForCondition(page, waitFor, context) {
        if (typeof waitFor === 'number') {
            await page.waitForTimeout(waitFor);
        } else if (typeof waitFor === 'string') {
            await page.waitForSelector(waitFor, { timeout: 10000 });
        } else if (typeof waitFor === 'object') {
            switch (waitFor.type) {
                case 'selector':
                    await page.waitForSelector(waitFor.selector, {
                        timeout: waitFor.timeout || 10000,
                        state: waitFor.state || 'visible'
                    });
                    break;
                    
                case 'function':
                    await page.waitForFunction(waitFor.function, {
                        timeout: waitFor.timeout || 10000
                    });
                    break;
                    
                case 'timeout':
                    await page.waitForTimeout(waitFor.duration);
                    break;
                    
                default:
                    console.warn(`Unknown wait condition type: ${waitFor.type}`);
            }
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
            const variableValue = context.getVariable(variableName);
            
            if (variableValue !== undefined && variableValue !== null) {
                processedSelector = processedSelector.replace(match[0], String(variableValue));
            }
        }

        return processedSelector;
    }

    /**
     * Process text with variable substitution
     */
    processText(text, context) {
        if (!text || !text.includes('{{')) {
            return text;
        }

        let processedText = text;
        const variablePattern = /\{\{([^}]+)\}\}/g;
        let match;

        while ((match = variablePattern.exec(text)) !== null) {
            const variableName = match[1].trim();
            const variableValue = context.getVariable(variableName);
            
            if (variableValue !== undefined && variableValue !== null) {
                processedText = processedText.replace(match[0], String(variableValue));
            }
        }

        return processedText;
    }

    /**
     * Process value with variable substitution
     */
    processValue(value, context) {
        if (Array.isArray(value)) {
            return value.map(v => this.processText(String(v), context));
        } else if (typeof value === 'object') {
            const processed = {};
            for (const [key, val] of Object.entries(value)) {
                processed[key] = this.processText(String(val), context);
            }
            return processed;
        } else {
            return this.processText(String(value), context);
        }
    }

    /**
     * Validate interaction step
     */
    validate(step) {
        const { action, target, value } = step;
        
        switch (action) {
            case 'click':
            case 'hover':
            case 'focus':
            case 'blur':
                if (!target) {
                    throw new Error(`${action} interaction requires target selector`);
                }
                break;
                
            case 'type':
            case 'select':
                if (!target) {
                    throw new Error(`${action} interaction requires target selector`);
                }
                if (value === undefined || value === null) {
                    throw new Error(`${action} interaction requires value`);
                }
                break;
                
            case 'scroll':
                // Scroll can work with or without target
                break;
                
            case 'drag':
                if (!target) {
                    throw new Error('Drag interaction requires source selector');
                }
                if (!value) {
                    throw new Error('Drag interaction requires target selector or coordinates');
                }
                break;
                
            default:
                throw new Error(`Unknown interaction action: ${action}`);
        }
        
        return true;
    }
}

module.exports = InteractionHandler;