/**
 * Extraction step handler for data collection from web pages
 */
class ExtractionHandler {
    constructor(options = {}) {
        this.options = {
            defaultTimeout: options.defaultTimeout || 30000,
            retryAttempts: options.retryAttempts || 3,
            retryDelay: options.retryDelay || 1000,
            ...options
        };
    }

    /**
     * Execute extraction step
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
                case 'getText':
                    result = await this.handleGetText(page, target, step, context);
                    break;
                    
                case 'getAttribute':
                    result = await this.handleGetAttribute(page, target, value, step, context);
                    break;
                    
                case 'getMultiple':
                    result = await this.handleGetMultiple(page, target, step, context);
                    break;
                    
                case 'screenshot':
                    result = await this.handleScreenshot(page, target, step, context);
                    break;
                    
                case 'getHtml':
                    result = await this.handleGetHtml(page, target, step, context);
                    break;
                    
                case 'getUrl':
                    result = await this.handleGetUrl(page, step, context);
                    break;
                    
                case 'getCookies':
                    result = await this.handleGetCookies(page, step, context);
                    break;
                    
                case 'getLocalStorage':
                    result = await this.handleGetLocalStorage(page, step, context);
                    break;
                    
                default:
                    throw new Error(`Unsupported extraction action: ${action}`);
            }

            const executionTime = Date.now() - startTime;
            
            // Store extracted data in context variables if specified
            if (step.storeAs) {
                context.setVariable(step.storeAs, result.data);
            }
            
            return {
                success: true,
                action,
                target,
                result,
                executionTime,
                extractedAt: new Date()
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            throw new Error(`Extraction ${action} failed: ${error.message}`, {
                cause: error,
                executionTime,
                step: step.id
            });
        }
    }

    /**
     * Handle text extraction
     */
    async handleGetText(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        // Wait for element if specified
        if (step.waitFor !== false) {
            await this.waitForElement(page, processedSelector, step);
        }
        
        let textData;
        
        if (step.multiple) {
            // Extract text from multiple elements
            textData = await page.$$eval(processedSelector, (elements) => {
                return elements.map(el => el.textContent?.trim() || '');
            });
        } else {
            // Extract text from single element
            textData = await page.$eval(processedSelector, (element) => {
                return element.textContent?.trim() || '';
            });
        }
        
        // Apply text processing if specified
        if (step.processing) {
            textData = this.processExtractedText(textData, step.processing);
        }

        return {
            type: 'text',
            selector: processedSelector,
            data: textData,
            count: Array.isArray(textData) ? textData.length : 1
        };
    }

    /**
     * Handle attribute extraction
     */
    async handleGetAttribute(page, selector, attributeName, step, context) {
        const processedSelector = this.processSelector(selector, context);
        const processedAttribute = this.processText(attributeName, context);
        
        // Wait for element if specified
        if (step.waitFor !== false) {
            await this.waitForElement(page, processedSelector, step);
        }
        
        let attributeData;
        
        if (step.multiple) {
            // Extract attribute from multiple elements
            attributeData = await page.$$eval(processedSelector, (elements, attr) => {
                return elements.map(el => el.getAttribute(attr) || '');
            }, processedAttribute);
        } else {
            // Extract attribute from single element
            attributeData = await page.$eval(processedSelector, (element, attr) => {
                return element.getAttribute(attr) || '';
            }, processedAttribute);
        }

        return {
            type: 'attribute',
            selector: processedSelector,
            attribute: processedAttribute,
            data: attributeData,
            count: Array.isArray(attributeData) ? attributeData.length : 1
        };
    }

    /**
     * Handle multiple data extraction
     */
    async handleGetMultiple(page, selector, step, context) {
        const processedSelector = this.processSelector(selector, context);
        
        // Wait for elements if specified
        if (step.waitFor !== false) {
            await this.waitForElement(page, processedSelector, step);
        }
        
        // Define what data to extract
        const extractionConfig = step.extract || {
            text: true,
            attributes: []
        };
        
        const extractedData = await page.$$eval(processedSelector, (elements, config) => {
            return elements.map(element => {
                const data = {};
                
                // Extract text if requested
                if (config.text) {
                    data.text = element.textContent?.trim() || '';
                }
                
                // Extract inner HTML if requested
                if (config.html) {
                    data.html = element.innerHTML;
                }
                
                // Extract attributes if requested
                if (config.attributes && Array.isArray(config.attributes)) {
                    config.attributes.forEach(attr => {
                        data[attr] = element.getAttribute(attr) || '';
                    });
                }
                
                // Extract custom properties if requested
                if (config.properties && Array.isArray(config.properties)) {
                    config.properties.forEach(prop => {
                        data[prop] = element[prop] || '';
                    });
                }
                
                return data;
            });
        }, extractionConfig);

        return {
            type: 'multiple',
            selector: processedSelector,
            config: extractionConfig,
            data: extractedData,
            count: extractedData.length
        };
    }

    /**
     * Handle screenshot capture
     */
    async handleScreenshot(page, target, step, context) {
        let screenshotOptions = {
            type: step.format || 'png',
            quality: step.quality || 90,
            fullPage: step.fullPage || false,
            timeout: step.timeout || this.options.defaultTimeout
        };
        
        let screenshotData;
        
        if (target && target !== 'page') {
            // Screenshot of specific element
            const processedSelector = this.processSelector(target, context);
            await this.waitForElement(page, processedSelector, step);
            
            const element = await page.$(processedSelector);
            screenshotData = await element.screenshot(screenshotOptions);
        } else {
            // Full page screenshot
            screenshotData = await page.screenshot(screenshotOptions);
        }
        
        // Convert to base64 if requested
        const base64Data = step.base64 !== false ? screenshotData.toString('base64') : null;

        return {
            type: 'screenshot',
            target: target || 'page',
            data: base64Data || screenshotData,
            format: screenshotOptions.type,
            size: screenshotData.length,
            options: screenshotOptions
        };
    }

    /**
     * Handle HTML extraction
     */
    async handleGetHtml(page, selector, step, context) {
        let htmlData;
        
        if (selector && selector !== 'page') {
            // Extract HTML from specific element
            const processedSelector = this.processSelector(selector, context);
            await this.waitForElement(page, processedSelector, step);
            
            if (step.multiple) {
                htmlData = await page.$$eval(processedSelector, (elements) => {
                    return elements.map(el => el.outerHTML);
                });
            } else {
                htmlData = await page.$eval(processedSelector, (element) => {
                    return step.inner ? element.innerHTML : element.outerHTML;
                });
            }
        } else {
            // Extract full page HTML
            htmlData = await page.content();
        }

        return {
            type: 'html',
            selector: selector || 'page',
            data: htmlData,
            inner: step.inner || false,
            count: Array.isArray(htmlData) ? htmlData.length : 1
        };
    }

    /**
     * Handle URL extraction
     */
    async handleGetUrl(page, step, context) {
        const currentUrl = page.url();
        
        let urlData = {
            full: currentUrl,
            protocol: '',
            host: '',
            pathname: '',
            search: '',
            hash: ''
        };
        
        try {
            const url = new URL(currentUrl);
            urlData = {
                full: currentUrl,
                protocol: url.protocol,
                host: url.host,
                hostname: url.hostname,
                port: url.port,
                pathname: url.pathname,
                search: url.search,
                hash: url.hash,
                searchParams: Object.fromEntries(url.searchParams)
            };
        } catch (error) {
            console.warn('Failed to parse URL:', error.message);
        }

        return {
            type: 'url',
            data: step.part ? urlData[step.part] : urlData
        };
    }

    /**
     * Handle cookies extraction
     */
    async handleGetCookies(page, step, context) {
        const cookies = await page.context().cookies();
        
        let cookieData = cookies;
        
        // Filter cookies if specified
        if (step.filter) {
            if (step.filter.name) {
                cookieData = cookies.filter(cookie => cookie.name === step.filter.name);
            }
            if (step.filter.domain) {
                cookieData = cookieData.filter(cookie => 
                    cookie.domain.includes(step.filter.domain)
                );
            }
        }
        
        // Return specific cookie property if requested
        if (step.property) {
            cookieData = cookieData.map(cookie => cookie[step.property]);
        }

        return {
            type: 'cookies',
            data: cookieData,
            count: cookieData.length,
            filter: step.filter
        };
    }

    /**
     * Handle localStorage extraction
     */
    async handleGetLocalStorage(page, step, context) {
        const localStorageData = await page.evaluate(() => {
            const storage = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    storage[key] = localStorage.getItem(key);
                }
            }
            return storage;
        });
        
        let data = localStorageData;
        
        // Return specific key if requested
        if (step.key) {
            data = localStorageData[step.key] || null;
        }

        return {
            type: 'localStorage',
            data,
            key: step.key,
            count: step.key ? 1 : Object.keys(localStorageData).length
        };
    }

    /**
     * Wait for element to be available
     */
    async waitForElement(page, selector, step) {
        const timeout = step.timeout || this.options.defaultTimeout;
        
        await page.waitForSelector(selector, {
            timeout,
            state: step.waitForState || 'visible'
        });
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
     * Process extracted text data
     */
    processExtractedText(textData, processing) {
        if (!processing || !textData) {
            return textData;
        }

        const processText = (text) => {
            let processed = text;
            
            if (processing.trim) {
                processed = processed.trim();
            }
            
            if (processing.toLowerCase) {
                processed = processed.toLowerCase();
            }
            
            if (processing.toUpperCase) {
                processed = processed.toUpperCase();
            }
            
            if (processing.replace && Array.isArray(processing.replace)) {
                processing.replace.forEach(replacement => {
                    const { from, to, flags } = replacement;
                    const regex = new RegExp(from, flags || 'g');
                    processed = processed.replace(regex, to || '');
                });
            }
            
            if (processing.match) {
                const regex = new RegExp(processing.match, processing.matchFlags || 'g');
                const matches = processed.match(regex);
                processed = matches ? matches[0] : '';
            }
            
            return processed;
        };

        if (Array.isArray(textData)) {
            return textData.map(processText);
        } else {
            return processText(textData);
        }
    }

    /**
     * Validate extraction step
     */
    validate(step) {
        const { action, target, value } = step;
        
        switch (action) {
            case 'getText':
            case 'getHtml':
                if (!target) {
                    throw new Error(`${action} extraction requires target selector`);
                }
                break;
                
            case 'getAttribute':
                if (!target) {
                    throw new Error('getAttribute extraction requires target selector');
                }
                if (!value) {
                    throw new Error('getAttribute extraction requires attribute name');
                }
                break;
                
            case 'getMultiple':
                if (!target) {
                    throw new Error('getMultiple extraction requires target selector');
                }
                break;
                
            case 'screenshot':
                // Screenshot can work with or without target
                break;
                
            case 'getUrl':
            case 'getCookies':
            case 'getLocalStorage':
                // These don't require target
                break;
                
            default:
                throw new Error(`Unknown extraction action: ${action}`);
        }
        
        return true;
    }
}

module.exports = ExtractionHandler;