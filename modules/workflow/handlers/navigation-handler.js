/**
 * Navigation step handler for page navigation operations
 */
class NavigationHandler {
    constructor(options = {}) {
        this.options = {
            defaultTimeout: options.defaultTimeout || 30000,
            waitForLoad: options.waitForLoad !== false,
            ...options
        };
    }

    /**
     * Execute navigation step
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
                case 'goto':
                    result = await this.handleGoto(page, target, step, context);
                    break;
                    
                case 'back':
                    result = await this.handleBack(page, step, context);
                    break;
                    
                case 'forward':
                    result = await this.handleForward(page, step, context);
                    break;
                    
                case 'refresh':
                    result = await this.handleRefresh(page, step, context);
                    break;
                    
                case 'close':
                    result = await this.handleClose(page, step, context);
                    break;
                    
                default:
                    throw new Error(`Unsupported navigation action: ${action}`);
            }

            const executionTime = Date.now() - startTime;
            
            return {
                success: true,
                action,
                target,
                result,
                executionTime,
                url: await page.url(),
                title: await page.title()
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            throw new Error(`Navigation ${action} failed: ${error.message}`, {
                cause: error,
                executionTime,
                step: step.id
            });
        }
    }

    /**
     * Handle goto navigation
     */
    async handleGoto(page, url, step, context) {
        if (!url) {
            throw new Error('URL is required for goto navigation');
        }

        // Process URL with variables if needed
        const processedUrl = this.processUrl(url, context);
        
        // Navigation options
        const options = {
            waitUntil: step.waitUntil || 'networkidle0',
            timeout: step.timeout || this.options.defaultTimeout
        };

        // Perform navigation
        const response = await page.goto(processedUrl, options);
        
        // Wait for additional conditions if specified
        if (step.waitFor) {
            await this.waitForCondition(page, step.waitFor, context);
        }

        return {
            url: processedUrl,
            status: response?.status(),
            statusText: response?.statusText(),
            headers: response?.headers(),
            loadTime: Date.now()
        };
    }

    /**
     * Handle back navigation
     */
    async handleBack(page, step, context) {
        const options = {
            waitUntil: step.waitUntil || 'networkidle0',
            timeout: step.timeout || this.options.defaultTimeout
        };

        const response = await page.goBack(options);
        
        if (step.waitFor) {
            await this.waitForCondition(page, step.waitFor, context);
        }

        return {
            success: true,
            previousUrl: await page.url(),
            response: response ? {
                status: response.status(),
                statusText: response.statusText()
            } : null
        };
    }

    /**
     * Handle forward navigation
     */
    async handleForward(page, step, context) {
        const options = {
            waitUntil: step.waitUntil || 'networkidle0',
            timeout: step.timeout || this.options.defaultTimeout
        };

        const response = await page.goForward(options);
        
        if (step.waitFor) {
            await this.waitForCondition(page, step.waitFor, context);
        }

        return {
            success: true,
            currentUrl: await page.url(),
            response: response ? {
                status: response.status(),
                statusText: response.statusText()
            } : null
        };
    }

    /**
     * Handle page refresh
     */
    async handleRefresh(page, step, context) {
        const options = {
            waitUntil: step.waitUntil || 'networkidle0',
            timeout: step.timeout || this.options.defaultTimeout
        };

        const response = await page.reload(options);
        
        if (step.waitFor) {
            await this.waitForCondition(page, step.waitFor, context);
        }

        return {
            success: true,
            url: await page.url(),
            response: {
                status: response.status(),
                statusText: response.statusText()
            }
        };
    }

    /**
     * Handle page close
     */
    async handleClose(page, step, context) {
        await page.close();
        
        return {
            success: true,
            action: 'close',
            timestamp: new Date()
        };
    }

    /**
     * Process URL with variable substitution
     */
    processUrl(url, context) {
        if (!url.includes('{{') || !url.includes('}}')) {
            return url;
        }

        let processedUrl = url;
        const variablePattern = /\{\{([^}]+)\}\}/g;
        let match;

        while ((match = variablePattern.exec(url)) !== null) {
            const variableName = match[1].trim();
            const variableValue = context.getVariable(variableName);
            
            if (variableValue !== undefined && variableValue !== null) {
                processedUrl = processedUrl.replace(match[0], String(variableValue));
            } else {
                console.warn(`Variable ${variableName} not found in context`);
            }
        }

        return processedUrl;
    }

    /**
     * Wait for additional conditions after navigation
     */
    async waitForCondition(page, waitFor, context) {
        if (typeof waitFor === 'string') {
            // Wait for selector
            await page.waitForSelector(waitFor, { timeout: 10000 });
        } else if (typeof waitFor === 'object') {
            switch (waitFor.type) {
                case 'selector':
                    await page.waitForSelector(waitFor.selector, {
                        timeout: waitFor.timeout || 10000,
                        visible: waitFor.visible !== false
                    });
                    break;
                    
                case 'function':
                    await page.waitForFunction(waitFor.function, {
                        timeout: waitFor.timeout || 10000
                    });
                    break;
                    
                case 'url':
                    await page.waitForURL(waitFor.pattern, {
                        timeout: waitFor.timeout || 10000
                    });
                    break;
                    
                case 'load':
                    await page.waitForLoadState(waitFor.state || 'networkidle', {
                        timeout: waitFor.timeout || 30000
                    });
                    break;
                    
                default:
                    console.warn(`Unknown wait condition type: ${waitFor.type}`);
            }
        }
    }

    /**
     * Validate navigation step
     */
    validate(step) {
        const { action, target } = step;
        
        switch (action) {
            case 'goto':
                if (!target) {
                    throw new Error('Navigation goto requires target URL');
                }
                break;
                
            case 'back':
            case 'forward':
            case 'refresh':
            case 'close':
                // These actions don't require additional validation
                break;
                
            default:
                throw new Error(`Unknown navigation action: ${action}`);
        }
        
        return true;
    }
}

module.exports = NavigationHandler;