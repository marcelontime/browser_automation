/**
 * Validation step handler for content and element validation
 */
class ValidationHandler {
    constructor(options = {}) {
        this.options = {
            defaultTimeout: options.defaultTimeout || 30000,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            ...options
        };
    }

    /**
     * Execute validation step
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
                case 'checkExists':
                    result = await this.handleCheckExists(page, target, step, context);
                    break;
                    
                case 'checkText':
                    result = await this.handleCheckText(page, target, value, step, context);
                    break;
                    
                case 'checkAttribute':
                    result = await this.handleCheckAttribute(page, target, value, step, context);
                    break;
                    
                case 'checkUrl':
                    result = await this.handleCheckUrl(page, value, step, context);
                    break;
                    
                case 'checkVisible':
                    result = await this.handleCheckVisible(page, target, step, context);
                    break;
                    
                case 'checkEnabled':
                    result = await this.handleCheckEnabled(page, target, step, context);
                    break;
                    
                case 'checkValue':
                    result = await this.handleCheckValue(page, target, value, step, context);
                    break;
                    
                case 'checkCount':
                    result = await this.handleCheckCount(page, target, value, step, context);
                    break;
                    
                case 'checkCondition':
                    result = await this.handleCheckCondition(page, step, context);
                    break;
                    
                default:
                    throw new Error(`Unsupported validation action: ${action}`);
            }

            const executionTime = Date.now() - startTime;
            
            // Handle validation failure
            if (!result.valid && step.failOnError !== false) {
                throw new Error(`Validation failed: ${result.message}`);
            }
            
            return {
                success: true,
                action,
                target,
                value,
                result,
                executionTime,
                validatedAt: new Date()
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            throw new Error(`Validation ${action} failed: ${error.message}`, {
                cause: error,
                executionTime,
                step: step.id
            });
        }
    }

    /**
     * Handle element existence validation
     */
    async handleCheckExists(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        try {
            const timeout = step.timeout || 5000; // Shorter timeout for existence check
            await page.waitForSelector(processedSelector, { 
                timeout,
                state: step.state || 'attached'
            });
            
            const elementCount = await page.$$eval(processedSelector, elements => elements.length);
            
            return {
                valid: true,
                selector: processedSelector,
                exists: true,
                count: elementCount,
                message: `Element ${processedSelector} exists (${elementCount} found)`
            };
        } catch (error) {
            return {
                valid: false,
                selector: processedSelector,
                exists: false,
                count: 0,
                message: `Element ${processedSelector} does not exist`,
                error: error.message
            };
        }
    }

    /**
     * Handle text content validation
     */
    async handleCheckText(page, selector, expectedText, step, context) {
        const processedSelector = this.processSelector(selector, context);
        const processedExpectedText = this.processText(expectedText, context);
        
        try {
            // Wait for element if it should exist
            if (step.waitFor !== false) {
                await page.waitForSelector(processedSelector, { 
                    timeout: step.timeout || this.options.defaultTimeout 
                });
            }
            
            const actualText = await page.$eval(processedSelector, element => 
                element.textContent?.trim() || ''
            );
            
            const comparison = step.comparison || 'equals';
            const valid = this.compareText(actualText, processedExpectedText, comparison);
            
            return {
                valid,
                selector: processedSelector,
                expected: processedExpectedText,
                actual: actualText,
                comparison,
                message: valid 
                    ? `Text validation passed: ${comparison}` 
                    : `Text validation failed: expected "${processedExpectedText}", got "${actualText}"`
            };
        } catch (error) {
            return {
                valid: false,
                selector: processedSelector,
                expected: processedExpectedText,
                actual: null,
                message: `Failed to get text from ${processedSelector}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Handle attribute validation
     */
    async handleCheckAttribute(page, selector, attributeConfig, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        // Parse attribute configuration
        let attributeName, expectedValue, comparison = 'equals';
        
        if (typeof attributeConfig === 'string') {
            // Simple format: "attribute=value"
            const parts = attributeConfig.split('=');
            attributeName = parts[0];
            expectedValue = parts[1] || '';
        } else if (typeof attributeConfig === 'object') {
            attributeName = attributeConfig.name;
            expectedValue = attributeConfig.value;
            comparison = attributeConfig.comparison || 'equals';
        } else {
            throw new Error('Invalid attribute configuration');
        }
        
        const processedExpectedValue = this.processText(expectedValue, context);
        
        try {
            // Wait for element if it should exist
            if (step.waitFor !== false) {
                await page.waitForSelector(processedSelector, { 
                    timeout: step.timeout || this.options.defaultTimeout 
                });
            }
            
            const actualValue = await page.$eval(processedSelector, (element, attr) => 
                element.getAttribute(attr) || '', attributeName
            );
            
            const valid = this.compareText(actualValue, processedExpectedValue, comparison);
            
            return {
                valid,
                selector: processedSelector,
                attribute: attributeName,
                expected: processedExpectedValue,
                actual: actualValue,
                comparison,
                message: valid 
                    ? `Attribute validation passed: ${attributeName} ${comparison} "${processedExpectedValue}"` 
                    : `Attribute validation failed: ${attributeName} expected "${processedExpectedValue}", got "${actualValue}"`
            };
        } catch (error) {
            return {
                valid: false,
                selector: processedSelector,
                attribute: attributeName,
                expected: processedExpectedValue,
                actual: null,
                message: `Failed to get attribute ${attributeName} from ${processedSelector}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Handle URL validation
     */
    async handleCheckUrl(page, expectedUrl, step, context) {
        const processedExpectedUrl = this.processText(expectedUrl, context);
        const currentUrl = page.url();
        
        const comparison = step.comparison || 'equals';
        const valid = this.compareText(currentUrl, processedExpectedUrl, comparison);
        
        return {
            valid,
            expected: processedExpectedUrl,
            actual: currentUrl,
            comparison,
            message: valid 
                ? `URL validation passed: ${comparison}` 
                : `URL validation failed: expected "${processedExpectedUrl}", got "${currentUrl}"`
        };
    }

    /**
     * Handle element visibility validation
     */
    async handleCheckVisible(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        try {
            const isVisible = await page.isVisible(processedSelector);
            const expectedVisible = step.visible !== false;
            const valid = isVisible === expectedVisible;
            
            return {
                valid,
                selector: processedSelector,
                expected: expectedVisible,
                actual: isVisible,
                message: valid 
                    ? `Visibility validation passed: element is ${isVisible ? 'visible' : 'hidden'}` 
                    : `Visibility validation failed: expected ${expectedVisible ? 'visible' : 'hidden'}, got ${isVisible ? 'visible' : 'hidden'}`
            };
        } catch (error) {
            return {
                valid: false,
                selector: processedSelector,
                message: `Failed to check visibility of ${processedSelector}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Handle element enabled state validation
     */
    async handleCheckEnabled(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        try {
            const isEnabled = await page.isEnabled(processedSelector);
            const expectedEnabled = step.enabled !== false;
            const valid = isEnabled === expectedEnabled;
            
            return {
                valid,
                selector: processedSelector,
                expected: expectedEnabled,
                actual: isEnabled,
                message: valid 
                    ? `Enabled state validation passed: element is ${isEnabled ? 'enabled' : 'disabled'}` 
                    : `Enabled state validation failed: expected ${expectedEnabled ? 'enabled' : 'disabled'}, got ${isEnabled ? 'enabled' : 'disabled'}`
            };
        } catch (error) {
            return {
                valid: false,
                selector: processedSelector,
                message: `Failed to check enabled state of ${processedSelector}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Handle form value validation
     */
    async handleCheckValue(page, selector, expectedValue, step, context) {
        const processedSelector = this.processSelector(selector, context);
        const processedExpectedValue = this.processText(expectedValue, context);
        
        try {
            const actualValue = await page.inputValue(processedSelector);
            const comparison = step.comparison || 'equals';
            const valid = this.compareText(actualValue, processedExpectedValue, comparison);
            
            return {
                valid,
                selector: processedSelector,
                expected: processedExpectedValue,
                actual: actualValue,
                comparison,
                message: valid 
                    ? `Value validation passed: ${comparison}` 
                    : `Value validation failed: expected "${processedExpectedValue}", got "${actualValue}"`
            };
        } catch (error) {
            return {
                valid: false,
                selector: processedSelector,
                expected: processedExpectedValue,
                actual: null,
                message: `Failed to get value from ${processedSelector}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Handle element count validation
     */
    async handleCheckCount(page, selector, expectedCount, step, context) {
        const processedSelector = this.processSelector(selector, context);
        const processedExpectedCount = parseInt(this.processText(String(expectedCount), context));
        
        try {
            const actualCount = await page.$$eval(processedSelector, elements => elements.length);
            const comparison = step.comparison || 'equals';
            const valid = this.compareNumbers(actualCount, processedExpectedCount, comparison);
            
            return {
                valid,
                selector: processedSelector,
                expected: processedExpectedCount,
                actual: actualCount,
                comparison,
                message: valid 
                    ? `Count validation passed: found ${actualCount} elements` 
                    : `Count validation failed: expected ${comparison} ${processedExpectedCount}, got ${actualCount}`
            };
        } catch (error) {
            return {
                valid: false,
                selector: processedSelector,
                expected: processedExpectedCount,
                actual: 0,
                message: `Failed to count elements ${processedSelector}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Handle custom condition validation
     */
    async handleCheckCondition(page, step, context) {
        const conditions = step.conditions || [];
        const results = [];
        let allValid = true;
        
        for (const condition of conditions) {
            try {
                const result = await this.evaluateCondition(page, condition, context);
                results.push(result);
                if (!result.valid) {
                    allValid = false;
                }
            } catch (error) {
                const result = {
                    valid: false,
                    condition: condition.description || 'Unknown condition',
                    message: `Condition evaluation failed: ${error.message}`,
                    error: error.message
                };
                results.push(result);
                allValid = false;
            }
        }
        
        return {
            valid: allValid,
            conditions: results,
            message: allValid 
                ? `All ${conditions.length} conditions passed` 
                : `${results.filter(r => !r.valid).length} of ${conditions.length} conditions failed`
        };
    }

    /**
     * Evaluate individual condition
     */
    async evaluateCondition(page, condition, context) {
        switch (condition.type) {
            case 'javascript':
                return await this.evaluateJavaScriptCondition(page, condition, context);
                
            case 'variable':
                return this.evaluateVariableCondition(condition, context);
                
            case 'element':
                return await this.evaluateElementCondition(page, condition, context);
                
            default:
                throw new Error(`Unknown condition type: ${condition.type}`);
        }
    }

    /**
     * Evaluate JavaScript condition
     */
    async evaluateJavaScriptCondition(page, condition, context) {
        try {
            const result = await page.evaluate((code, variables) => {
                // Create safe evaluation context
                const context = { variables };
                const func = new Function('context', `return ${code}`);
                return func(context);
            }, condition.code, context.getAllVariables());
            
            return {
                valid: Boolean(result),
                condition: condition.description || condition.code,
                result,
                message: `JavaScript condition ${Boolean(result) ? 'passed' : 'failed'}`
            };
        } catch (error) {
            return {
                valid: false,
                condition: condition.description || condition.code,
                message: `JavaScript condition failed: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Evaluate variable condition
     */
    evaluateVariableCondition(condition, context) {
        const variableValue = context.getVariable(condition.variable);
        const expectedValue = condition.value;
        const comparison = condition.comparison || 'equals';
        
        let valid;
        if (typeof expectedValue === 'number') {
            valid = this.compareNumbers(Number(variableValue), expectedValue, comparison);
        } else {
            valid = this.compareText(String(variableValue), String(expectedValue), comparison);
        }
        
        return {
            valid,
            condition: condition.description || `${condition.variable} ${comparison} ${expectedValue}`,
            variable: condition.variable,
            expected: expectedValue,
            actual: variableValue,
            comparison,
            message: `Variable condition ${valid ? 'passed' : 'failed'}`
        };
    }

    /**
     * Evaluate element condition
     */
    async evaluateElementCondition(page, condition, context) {
        const selector = this.processSelector(condition.selector, context);
        
        try {
            let result;
            
            switch (condition.check) {
                case 'exists':
                    result = await page.$(selector) !== null;
                    break;
                    
                case 'visible':
                    result = await page.isVisible(selector);
                    break;
                    
                case 'enabled':
                    result = await page.isEnabled(selector);
                    break;
                    
                default:
                    throw new Error(`Unknown element check: ${condition.check}`);
            }
            
            const expected = condition.expected !== false;
            const valid = result === expected;
            
            return {
                valid,
                condition: condition.description || `${selector} ${condition.check}`,
                selector,
                check: condition.check,
                expected,
                actual: result,
                message: `Element condition ${valid ? 'passed' : 'failed'}`
            };
        } catch (error) {
            return {
                valid: false,
                condition: condition.description || `${selector} ${condition.check}`,
                message: `Element condition failed: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Compare text values
     */
    compareText(actual, expected, comparison) {
        switch (comparison) {
            case 'equals':
                return actual === expected;
            case 'not_equals':
                return actual !== expected;
            case 'contains':
                return actual.includes(expected);
            case 'not_contains':
                return !actual.includes(expected);
            case 'starts_with':
                return actual.startsWith(expected);
            case 'ends_with':
                return actual.endsWith(expected);
            case 'regex':
                return new RegExp(expected).test(actual);
            case 'empty':
                return actual === '';
            case 'not_empty':
                return actual !== '';
            default:
                return actual === expected;
        }
    }

    /**
     * Compare numeric values
     */
    compareNumbers(actual, expected, comparison) {
        switch (comparison) {
            case 'equals':
                return actual === expected;
            case 'not_equals':
                return actual !== expected;
            case 'greater_than':
                return actual > expected;
            case 'greater_than_or_equal':
                return actual >= expected;
            case 'less_than':
                return actual < expected;
            case 'less_than_or_equal':
                return actual <= expected;
            default:
                return actual === expected;
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
     * Validate validation step
     */
    validate(step) {
        const { action, target, value } = step;
        
        switch (action) {
            case 'checkExists':
            case 'checkVisible':
            case 'checkEnabled':
                if (!target) {
                    throw new Error(`${action} validation requires target selector`);
                }
                break;
                
            case 'checkText':
            case 'checkValue':
            case 'checkCount':
                if (!target) {
                    throw new Error(`${action} validation requires target selector`);
                }
                if (value === undefined || value === null) {
                    throw new Error(`${action} validation requires expected value`);
                }
                break;
                
            case 'checkAttribute':
                if (!target) {
                    throw new Error('checkAttribute validation requires target selector');
                }
                if (!value) {
                    throw new Error('checkAttribute validation requires attribute configuration');
                }
                break;
                
            case 'checkUrl':
                if (!value) {
                    throw new Error('checkUrl validation requires expected URL');
                }
                break;
                
            case 'checkCondition':
                if (!step.conditions || !Array.isArray(step.conditions)) {
                    throw new Error('checkCondition validation requires conditions array');
                }
                break;
                
            default:
                throw new Error(`Unknown validation action: ${action}`);
        }
        
        return true;
    }
}

module.exports = ValidationHandler;