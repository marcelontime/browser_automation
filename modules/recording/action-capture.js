/**
 * 🎬 ACTION CAPTURE
 * 
 * Advanced browser action capture system with multi-strategy element identification
 * Supports complex form controls, dynamic content, visual fingerprinting, and AI-powered analysis
 */
class ActionCapture {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            captureScreenshots: options.captureScreenshots !== false,
            captureElementContext: options.captureElementContext !== false,
            captureDynamicContent: options.captureDynamicContent !== false,
            captureFormRelationships: options.captureFormRelationships !== false,
            screenshotQuality: options.screenshotQuality || 60,
            maxScreenshotSize: options.maxScreenshotSize || 1024 * 1024, // 1MB
            enableMultiStrategy: options.enableMultiStrategy !== false,
            enableVisualFingerprinting: options.enableVisualFingerprinting !== false,
            enableAccessibilityCapture: options.enableAccessibilityCapture !== false,
            selectorConfidenceThreshold: options.selectorConfidenceThreshold || 0.7,
            ...options
        };
        
        // Action capture state
        this.isCapturing = false;
        this.capturedActions = [];
        this.elementCache = new Map();
        this.dynamicContentObserver = null;
        
        // Multi-strategy element identification
        this.selectorStrategies = new Map();
        this.visualFingerprints = new Map();
        this.accessibilityMap = new Map();
        this.confidenceScorer = new SelectorConfidenceScorer();
        
        // Element selectors for different types of interactions
        this.interactiveSelectors = [
            'input', 'textarea', 'select', 'button',
            '[role="button"]', '[role="textbox"]', '[role="combobox"]',
            '[contenteditable="true"]', 'a[href]', '[onclick]',
            '[data-testid]', '[data-cy]', '[data-automation]'
        ];
        
        // Complex form control selectors
        this.complexControlSelectors = {
            datePickerTriggers: [
                '.date-picker', '.datepicker', '[data-date]',
                'input[type="date"]', '.calendar-trigger'
            ],
            dropdownTriggers: [
                '.dropdown-toggle', '.select2-selection', '.chosen-single',
                '.multiselect', '[data-toggle="dropdown"]'
            ],
            fileUploadAreas: [
                '.dropzone', '.file-upload-area', '[data-file-upload]',
                'input[type="file"]', '.upload-trigger'
            ],
            richTextEditors: [
                '.ql-editor', '.note-editable', '.fr-element',
                '[contenteditable="true"]', '.cke_editable'
            ],
            customCheckboxes: [
                '.custom-checkbox', '.styled-checkbox', '[role="checkbox"]',
                '.checkbox-wrapper input[type="checkbox"]'
            ],
            sliders: [
                'input[type="range"]', '.slider', '.range-slider',
                '[role="slider"]', '.ui-slider'
            ]
        };
    }

    /**
     * Start capturing browser actions
     */
    async startCapture() {
        if (this.isCapturing) {
            console.warn('⚠️ Action capture is already active');
            return;
        }

        console.log('🎬 Starting advanced action capture...');
        
        this.isCapturing = true;
        this.capturedActions = [];
        
        try {
            // Set up comprehensive event listeners
            await this.setupEventListeners();
            
            // Set up dynamic content observation
            if (this.options.captureDynamicContent) {
                await this.setupDynamicContentObserver();
            }
            
            // Initialize element cache
            await this.buildElementCache();
            
            console.log('✅ Action capture started successfully');
            
        } catch (error) {
            console.error('❌ Error starting action capture:', error.message);
            this.isCapturing = false;
            throw error;
        }
    }

    /**
     * Stop capturing browser actions
     */
    async stopCapture() {
        if (!this.isCapturing) {
            console.warn('⚠️ Action capture is not active');
            return [];
        }

        console.log('⏹️ Stopping action capture...');
        
        this.isCapturing = false;
        
        try {
            // Remove event listeners
            await this.removeEventListeners();
            
            // Stop dynamic content observation
            if (this.dynamicContentObserver) {
                await this.stopDynamicContentObserver();
            }
            
            // Clear element cache
            this.elementCache.clear();
            
            const capturedActions = [...this.capturedActions];
            this.capturedActions = [];
            
            console.log(`✅ Action capture stopped. Captured ${capturedActions.length} actions`);
            return capturedActions;
            
        } catch (error) {
            console.error('❌ Error stopping action capture:', error.message);
            return this.capturedActions;
        }
    }

    /**
     * Set up comprehensive event listeners for all interaction types
     */
    async setupEventListeners() {
        await this.page.addInitScript(() => {
            // Store original methods to avoid conflicts
            window._actionCapture = {
                originalAddEventListener: EventTarget.prototype.addEventListener,
                capturedEvents: [],
                isCapturing: true,
                eventHandlers: new Map()
            };

            // Enhanced event capture function
            const captureEvent = (event) => {
                if (!window._actionCapture.isCapturing) return;

                try {
                    const eventData = {
                        type: event.type,
                        timestamp: Date.now(),
                        target: extractElementInfo(event.target),
                        coordinates: event.clientX !== undefined ? {
                            x: event.clientX,
                            y: event.clientY,
                            pageX: event.pageX,
                            pageY: event.pageY
                        } : null,
                        keys: event.key ? {
                            key: event.key,
                            code: event.code,
                            altKey: event.altKey,
                            ctrlKey: event.ctrlKey,
                            shiftKey: event.shiftKey,
                            metaKey: event.metaKey
                        } : null,
                        value: event.target.value || '',
                        url: window.location.href,
                        viewport: {
                            width: window.innerWidth,
                            height: window.innerHeight,
                            scrollX: window.scrollX,
                            scrollY: window.scrollY
                        }
                    };

                    // Add form context if element is in a form
                    if (event.target.form) {
                        eventData.formContext = extractFormInfo(event.target.form);
                    }

                    // Add special handling for complex controls
                    eventData.complexControl = detectComplexControl(event.target);

                    window._actionCapture.capturedEvents.push(eventData);
                } catch (error) {
                    console.error('Error capturing event:', error);
                }
            };

            // Extract comprehensive element information with multi-strategy selectors
            const extractElementInfo = (element) => {
                if (!element) return null;

                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                
                const elementInfo = {
                    tagName: element.tagName,
                    type: element.type || '',
                    name: element.name || '',
                    id: element.id || '',
                    className: element.className || '',
                    value: element.value || '',
                    placeholder: element.placeholder || '',
                    title: element.title || '',
                    ariaLabel: element.ariaLabel || '',
                    ariaRole: element.getAttribute('role') || '',
                    
                    // Text content and labels
                    textContent: element.textContent ? element.textContent.substring(0, 100) : '',
                    innerText: element.innerText ? element.innerText.substring(0, 100) : '',
                    label: findElementLabel(element),
                    
                    // Position and dimensions
                    boundingRect: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height,
                        top: rect.top,
                        left: rect.left,
                        bottom: rect.bottom,
                        right: rect.right
                    },
                    
                    // Visibility and interaction state
                    visible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
                    enabled: !element.disabled,
                    focused: document.activeElement === element,
                    
                    // HTML attributes
                    attributes: extractAttributes(element),
                    
                    // Data attributes
                    dataset: element.dataset ? Object.assign({}, element.dataset) : {},
                    
                    // Parent and sibling context
                    parentInfo: element.parentElement ? {
                        tagName: element.parentElement.tagName,
                        className: element.parentElement.className,
                        id: element.parentElement.id
                    } : null,
                    
                    // CSS selector path (primary)
                    selectorPath: generateSelectorPath(element),
                    
                    // XPath (primary)
                    xpath: generateXPath(element),
                    
                    // Multi-strategy selectors
                    multiStrategy: generateMultiStrategySelectors(element)
                };

                return elementInfo;
            };

            // Generate multi-strategy selectors inline
            const generateMultiStrategySelectors = (element) => {
                const strategies = {
                    css: [],
                    xpath: [],
                    accessibility: {},
                    confidence: 0
                };

                try {
                    // CSS Strategies
                    if (element.id) {
                        strategies.css.push({ selector: `#${element.id}`, type: 'id', confidence: 0.95 });
                    }
                    
                    const dataAttrs = ['data-testid', 'data-cy', 'data-automation', 'data-qa'];
                    for (const attr of dataAttrs) {
                        if (element.hasAttribute(attr)) {
                            strategies.css.push({
                                selector: `[${attr}="${element.getAttribute(attr)}"]`,
                                type: 'data-attribute',
                                confidence: 0.9
                            });
                        }
                    }
                    
                    if (element.name) {
                        strategies.css.push({
                            selector: `${element.tagName.toLowerCase()}[name="${element.name}"]`,
                            type: 'name',
                            confidence: 0.85
                        });
                    }

                    // XPath Strategies
                    if (element.id) {
                        strategies.xpath.push({
                            xpath: `//*[@id="${element.id}"]`,
                            type: 'id-based',
                            confidence: 0.95
                        });
                    }
                    
                    if (element.textContent && element.textContent.trim()) {
                        const text = element.textContent.trim().substring(0, 30);
                        strategies.xpath.push({
                            xpath: `//${element.tagName.toLowerCase()}[contains(text(),"${text}")]`,
                            type: 'text-contains',
                            confidence: 0.65
                        });
                    }

                    // Accessibility Strategy
                    strategies.accessibility = {
                        ariaLabel: element.getAttribute('aria-label') || '',
                        role: element.getAttribute('role') || element.tagName.toLowerCase(),
                        accessibleName: getAccessibleName(element),
                        focusable: element.tabIndex >= 0 || ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName)
                    };

                    // Calculate overall confidence
                    const allSelectors = [...strategies.css, ...strategies.xpath];
                    strategies.confidence = allSelectors.length > 0 ? 
                        Math.max(...allSelectors.map(s => s.confidence)) : 0.5;

                } catch (error) {
                    console.error('Error generating multi-strategy selectors:', error);
                }

                return strategies;
            };

            // Get accessible name for element
            const getAccessibleName = (element) => {
                if (element.getAttribute('aria-label')) {
                    return element.getAttribute('aria-label');
                }
                
                if (element.getAttribute('aria-labelledby')) {
                    const labelId = element.getAttribute('aria-labelledby');
                    const labelElement = document.getElementById(labelId);
                    if (labelElement) {
                        return labelElement.textContent.trim();
                    }
                }
                
                if (element.labels && element.labels.length > 0) {
                    return element.labels[0].textContent.trim();
                }
                
                if (element.title) return element.title;
                if (element.placeholder) return element.placeholder;
                
                return element.textContent ? element.textContent.trim().substring(0, 50) : '';
            };

            // Extract form information
            const extractFormInfo = (form) => {
                return {
                    name: form.name || '',
                    id: form.id || '',
                    action: form.action || '',
                    method: form.method || 'GET',
                    enctype: form.enctype || '',
                    fieldCount: form.elements.length,
                    fields: Array.from(form.elements).slice(0, 10).map(field => ({
                        name: field.name,
                        type: field.type,
                        required: field.required
                    }))
                };
            };

            // Find associated label for an element
            const findElementLabel = (element) => {
                // Try different methods to find label
                if (element.labels && element.labels.length > 0) {
                    return element.labels[0].textContent.trim();
                }
                
                if (element.id) {
                    const label = document.querySelector(`label[for="${element.id}"]`);
                    if (label) return label.textContent.trim();
                }
                
                // Look for parent label
                let parent = element.parentElement;
                while (parent && parent.tagName !== 'FORM') {
                    if (parent.tagName === 'LABEL') {
                        return parent.textContent.trim();
                    }
                    parent = parent.parentElement;
                }
                
                // Look for sibling label
                if (element.parentElement) {
                    const siblings = element.parentElement.children;
                    for (const sibling of siblings) {
                        if (sibling.tagName === 'LABEL' && sibling !== element) {
                            return sibling.textContent.trim();
                        }
                    }
                }
                
                return '';
            };

            // Extract relevant HTML attributes
            const extractAttributes = (element) => {
                const attrs = {};
                const relevantAttrs = [
                    'data-testid', 'data-cy', 'data-automation', 'data-qa',
                    'autocomplete', 'pattern', 'min', 'max', 'step',
                    'minlength', 'maxlength', 'required', 'readonly',
                    'multiple', 'accept', 'capture'
                ];
                
                for (const attr of relevantAttrs) {
                    if (element.hasAttribute(attr)) {
                        attrs[attr] = element.getAttribute(attr);
                    }
                }
                
                return attrs;
            };

            // Detect complex form controls
            const detectComplexControl = (element) => {
                const complexTypes = {
                    datePicker: false,
                    dropdown: false,
                    fileUpload: false,
                    richTextEditor: false,
                    customCheckbox: false,
                    slider: false,
                    multiSelect: false
                };

                // Date picker detection
                if (element.type === 'date' || 
                    element.classList.contains('date-picker') ||
                    element.classList.contains('datepicker') ||
                    element.hasAttribute('data-date')) {
                    complexTypes.datePicker = true;
                }

                // Dropdown detection
                if (element.tagName === 'SELECT' ||
                    element.classList.contains('dropdown-toggle') ||
                    element.classList.contains('select2-selection') ||
                    element.hasAttribute('data-toggle') && element.getAttribute('data-toggle') === 'dropdown') {
                    complexTypes.dropdown = true;
                }

                // File upload detection
                if (element.type === 'file' ||
                    element.classList.contains('dropzone') ||
                    element.classList.contains('file-upload-area')) {
                    complexTypes.fileUpload = true;
                }

                // Rich text editor detection
                if (element.contentEditable === 'true' ||
                    element.classList.contains('ql-editor') ||
                    element.classList.contains('note-editable')) {
                    complexTypes.richTextEditor = true;
                }

                // Custom checkbox detection
                if (element.type === 'checkbox' && 
                    (element.classList.contains('custom-checkbox') ||
                     element.classList.contains('styled-checkbox'))) {
                    complexTypes.customCheckbox = true;
                }

                // Slider detection
                if (element.type === 'range' ||
                    element.classList.contains('slider') ||
                    element.getAttribute('role') === 'slider') {
                    complexTypes.slider = true;
                }

                // Multi-select detection
                if (element.tagName === 'SELECT' && element.multiple) {
                    complexTypes.multiSelect = true;
                }

                return complexTypes;
            };

            // Generate CSS selector path
            const generateSelectorPath = (element) => {
                const path = [];
                let current = element;
                
                while (current && current.nodeType === Node.ELEMENT_NODE) {
                    let selector = current.tagName.toLowerCase();
                    
                    if (current.id) {
                        selector += `#${current.id}`;
                        path.unshift(selector);
                        break;
                    } else if (current.className) {
                        const classes = current.className.split(' ').filter(c => c.trim());
                        if (classes.length > 0) {
                            selector += `.${classes.join('.')}`;
                        }
                    }
                    
                    // Add nth-child if needed for uniqueness
                    const siblings = current.parentElement ? 
                        Array.from(current.parentElement.children).filter(e => e.tagName === current.tagName) : [];
                    if (siblings.length > 1) {
                        const index = siblings.indexOf(current) + 1;
                        selector += `:nth-child(${index})`;
                    }
                    
                    path.unshift(selector);
                    current = current.parentElement;
                    
                    if (path.length > 10) break; // Prevent overly long selectors
                }
                
                return path.join(' > ');
            };

            // Generate XPath
            const generateXPath = (element) => {
                const path = [];
                let current = element;
                
                while (current && current.nodeType === Node.ELEMENT_NODE) {
                    let index = 1;
                    let sibling = current.previousSibling;
                    
                    while (sibling) {
                        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
                            index++;
                        }
                        sibling = sibling.previousSibling;
                    }
                    
                    const tagName = current.tagName.toLowerCase();
                    path.unshift(`${tagName}[${index}]`);
                    current = current.parentElement;
                    
                    if (path.length > 10) break; // Prevent overly long XPaths
                }
                
                return '/' + path.join('/');
            };

            // Set up event listeners for all interaction types
            const eventTypes = [
                'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
                'keydown', 'keyup', 'keypress',
                'input', 'change', 'focus', 'blur',
                'submit', 'reset',
                'dragstart', 'dragend', 'drop',
                'touchstart', 'touchend', 'touchmove',
                'wheel', 'scroll'
            ];

            for (const eventType of eventTypes) {
                document.addEventListener(eventType, captureEvent, {
                    capture: true,
                    passive: true
                });
            }

            console.log('✅ Enhanced event listeners set up for action capture');
        });
    }

    /**
     * Remove event listeners
     */
    async removeEventListeners() {
        await this.page.evaluate(() => {
            if (window._actionCapture) {
                window._actionCapture.isCapturing = false;
                // Event listeners will be automatically removed when page reloads
                // or we can store references and remove them explicitly
            }
        });
    }

    /**
     * Set up dynamic content observer for AJAX-loaded elements
     */
    async setupDynamicContentObserver() {
        await this.page.addInitScript(() => {
            if (!window._actionCapture) return;

            // Set up MutationObserver to detect dynamic content
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                // Check if added node contains interactive elements
                                const interactiveElements = node.querySelectorAll ? 
                                    node.querySelectorAll('input, button, select, textarea, [role="button"]') : [];
                                
                                if (interactiveElements.length > 0 || 
                                    (node.tagName && ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(node.tagName))) {
                                    
                                    window._actionCapture.capturedEvents.push({
                                        type: 'dynamic_content_added',
                                        timestamp: Date.now(),
                                        target: extractElementInfo ? extractElementInfo(node) : null,
                                        interactiveElementCount: interactiveElements.length,
                                        url: window.location.href
                                    });
                                }
                            }
                        });
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false,
                characterData: false
            });

            window._actionCapture.dynamicObserver = observer;
        });
    }

    /**
     * Stop dynamic content observer
     */
    async stopDynamicContentObserver() {
        await this.page.evaluate(() => {
            if (window._actionCapture && window._actionCapture.dynamicObserver) {
                window._actionCapture.dynamicObserver.disconnect();
                delete window._actionCapture.dynamicObserver;
            }
        });
    }

    /**
     * Build element cache for faster lookups
     */
    async buildElementCache() {
        const elements = await this.page.evaluate(() => {
            const interactiveElements = document.querySelectorAll(
                'input, textarea, select, button, [role="button"], [contenteditable="true"], a[href]'
            );
            
            return Array.from(interactiveElements).map((element, index) => ({
                index,
                tagName: element.tagName,
                type: element.type || '',
                id: element.id || '',
                name: element.name || '',
                className: element.className || '',
                selectorPath: generateSelectorPath ? generateSelectorPath(element) : ''
            }));
        });

        this.elementCache.clear();
        elements.forEach(element => {
            this.elementCache.set(element.index, element);
        });

        console.log(`📋 Built element cache with ${elements.length} interactive elements`);
    }

    /**
     * Get captured events from the page
     */
    async getCapturedEvents() {
        if (!this.isCapturing) {
            return [];
        }

        try {
            const events = await this.page.evaluate(() => {
                if (!window._actionCapture) return [];
                
                const events = window._actionCapture.capturedEvents.slice();
                window._actionCapture.capturedEvents = []; // Clear collected events
                return events;
            });

            // Process events into actions
            const actions = [];
            for (const event of events) {
                const action = await this.processEventToAction(event);
                if (action) {
                    actions.push(action);
                }
            }

            this.capturedActions.push(...actions);
            return actions;
        } catch (error) {
            console.error('❌ Error getting captured events:', error.message);
            return [];
        }
    }

    /**
     * Process a captured event into a standardized action with multi-strategy selectors
     */
    async processEventToAction(event) {
        try {
            const action = {
                id: `${event.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                type: this.mapEventTypeToActionType(event.type),
                timestamp: event.timestamp,
                element: event.target,
                value: event.value || '',
                coordinates: event.coordinates,
                keys: event.keys,
                url: event.url,
                viewport: event.viewport,
                formContext: event.formContext,
                complexControl: event.complexControl
            };

            // Generate enhanced multi-strategy selectors if enabled
            if (this.options.enableMultiStrategy && event.target) {
                try {
                    action.multiStrategySelectors = await this.generateMultiStrategySelectors(event.target);
                    
                    // Store in cache for future reference
                    if (action.multiStrategySelectors.confidence > this.options.selectorConfidenceThreshold) {
                        this.selectorStrategies.set(action.id, action.multiStrategySelectors);
                    }
                } catch (error) {
                    console.warn('⚠️ Could not generate multi-strategy selectors:', error.message);
                }
            }

            // Generate visual fingerprint if enabled
            if (this.options.enableVisualFingerprinting && event.target && this.shouldCaptureScreenshot(action.type)) {
                try {
                    action.visualFingerprint = await this.generateVisualFingerprint(event.target);
                    
                    // Store in visual fingerprints cache
                    if (action.visualFingerprint) {
                        this.visualFingerprints.set(action.id, action.visualFingerprint);
                    }
                } catch (error) {
                    console.warn('⚠️ Could not generate visual fingerprint:', error.message);
                }
            }

            // Add screenshot for important actions
            if (this.options.captureScreenshots && this.shouldCaptureScreenshot(action.type)) {
                try {
                    action.screenshot = await this.captureScreenshot();
                } catch (error) {
                    console.warn('⚠️ Could not capture screenshot for action');
                }
            }

            return action;
        } catch (error) {
            console.error('❌ Error processing event to action:', error.message);
            return null;
        }
    }

    /**
     * Map event types to action types
     */
    mapEventTypeToActionType(eventType) {
        const mapping = {
            'click': 'click',
            'dblclick': 'double_click',
            'input': 'type',
            'change': 'change',
            'keydown': 'key_down',
            'keyup': 'key_up',
            'keypress': 'key_press',
            'submit': 'submit',
            'focus': 'focus',
            'blur': 'blur',
            'dragstart': 'drag_start',
            'dragend': 'drag_end',
            'drop': 'drop',
            'scroll': 'scroll',
            'wheel': 'wheel',
            'touchstart': 'touch_start',
            'touchend': 'touch_end',
            'dynamic_content_added': 'dynamic_content'
        };
        
        return mapping[eventType] || eventType;
    }

    /**
     * Determine if screenshot should be captured for action type
     */
    shouldCaptureScreenshot(actionType) {
        const screenshotActions = [
            'click', 'double_click', 'submit', 'change', 'dynamic_content'
        ];
        return screenshotActions.includes(actionType);
    }

    /**
     * Capture screenshot with optimization
     */
    async captureScreenshot() {
        try {
            const screenshot = await this.page.screenshot({
                type: 'jpeg',
                quality: this.options.screenshotQuality,
                fullPage: false
            });

            // Check size limit
            if (screenshot.length > this.options.maxScreenshotSize) {
                console.warn('⚠️ Screenshot too large, skipping');
                return null;
            }

            return screenshot.toString('base64');
        } catch (error) {
            console.error('❌ Error capturing screenshot:', error.message);
            return null;
        }
    }

    /**
     * Get capture statistics
     */
    getCaptureStats() {
        return {
            isCapturing: this.isCapturing,
            totalActionsCaptured: this.capturedActions.length,
            elementsCached: this.elementCache.size,
            selectorStrategies: this.selectorStrategies.size,
            visualFingerprints: this.visualFingerprints.size,
            accessibilityMappings: this.accessibilityMap.size,
            options: this.options
        };
    }

    /**
     * 🎯 MULTI-STRATEGY ELEMENT CAPTURE
     * Generate multiple selector strategies for robust element identification
     */
    async generateMultiStrategySelectors(element) {
        const strategies = {
            css: [],
            xpath: [],
            accessibility: {},
            visual: null,
            semantic: {},
            confidence: 0,
            fallbackOrder: []
        };

        try {
            // CSS Selector Strategies
            strategies.css = await this.generateCSSSelectors(element);
            
            // XPath Strategies
            strategies.xpath = await this.generateXPathSelectors(element);
            
            // Accessibility Selectors
            if (this.options.enableAccessibilityCapture) {
                strategies.accessibility = await this.generateAccessibilitySelectors(element);
            }
            
            // Visual Fingerprinting
            if (this.options.enableVisualFingerprinting) {
                strategies.visual = await this.generateVisualFingerprint(element);
            }
            
            // Semantic Context
            strategies.semantic = await this.generateSemanticContext(element);
            
            // Calculate confidence scores and fallback order
            const scoredStrategies = await this.scoreStrategies(strategies, element);
            strategies.confidence = scoredStrategies.overallConfidence;
            strategies.fallbackOrder = scoredStrategies.fallbackOrder;
            
            return strategies;
        } catch (error) {
            console.error('❌ Error generating multi-strategy selectors:', error.message);
            return strategies;
        }
    }

    /**
     * Generate multiple CSS selector strategies
     */
    async generateCSSSelectors(element) {
        return await this.page.evaluate((elementInfo) => {
            const selectors = [];
            const el = document.querySelector(elementInfo.selectorPath);
            if (!el) return selectors;

            // Strategy 1: ID-based (highest priority)
            if (el.id) {
                selectors.push({
                    selector: `#${el.id}`,
                    type: 'id',
                    confidence: 0.95
                });
            }

            // Strategy 2: Data attribute selectors
            const dataAttrs = ['data-testid', 'data-cy', 'data-automation', 'data-qa'];
            for (const attr of dataAttrs) {
                if (el.hasAttribute(attr)) {
                    selectors.push({
                        selector: `[${attr}="${el.getAttribute(attr)}"]`,
                        type: 'data-attribute',
                        confidence: 0.9
                    });
                }
            }

            // Strategy 3: Name attribute (for form elements)
            if (el.name) {
                selectors.push({
                    selector: `${el.tagName.toLowerCase()}[name="${el.name}"]`,
                    type: 'name',
                    confidence: 0.85
                });
            }

            // Strategy 4: Class-based selectors
            if (el.className) {
                const classes = el.className.split(' ').filter(c => c.trim());
                if (classes.length > 0) {
                    // Single class
                    selectors.push({
                        selector: `.${classes[0]}`,
                        type: 'class-single',
                        confidence: 0.6
                    });
                    
                    // Multiple classes
                    if (classes.length > 1) {
                        selectors.push({
                            selector: `.${classes.join('.')}`,
                            type: 'class-multiple',
                            confidence: 0.75
                        });
                    }
                }
            }

            // Strategy 5: Attribute combination selectors
            const attrs = ['type', 'placeholder', 'title', 'value'];
            for (const attr of attrs) {
                if (el.hasAttribute(attr) && el.getAttribute(attr)) {
                    selectors.push({
                        selector: `${el.tagName.toLowerCase()}[${attr}="${el.getAttribute(attr)}"]`,
                        type: 'attribute',
                        confidence: 0.7
                    });
                }
            }

            // Strategy 6: Text content selectors
            if (el.textContent && el.textContent.trim()) {
                const text = el.textContent.trim().substring(0, 50);
                selectors.push({
                    selector: `${el.tagName.toLowerCase()}:contains("${text}")`,
                    type: 'text-content',
                    confidence: 0.65
                });
            }

            // Strategy 7: Structural selectors (nth-child, etc.)
            const parent = el.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(child => child.tagName === el.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(el) + 1;
                    selectors.push({
                        selector: `${parent.tagName.toLowerCase()} > ${el.tagName.toLowerCase()}:nth-child(${index})`,
                        type: 'structural',
                        confidence: 0.5
                    });
                }
            }

            return selectors;
        }, element);
    }

    /**
     * Generate multiple XPath strategies
     */
    async generateXPathSelectors(element) {
        return await this.page.evaluate((elementInfo) => {
            const xpaths = [];
            const el = document.querySelector(elementInfo.selectorPath);
            if (!el) return xpaths;

            // Strategy 1: Absolute XPath
            const absoluteXPath = generateAbsoluteXPath(el);
            xpaths.push({
                xpath: absoluteXPath,
                type: 'absolute',
                confidence: 0.4
            });

            // Strategy 2: Relative XPath with attributes
            if (el.id) {
                xpaths.push({
                    xpath: `//*[@id="${el.id}"]`,
                    type: 'id-based',
                    confidence: 0.95
                });
            }

            // Strategy 3: Text-based XPath
            if (el.textContent && el.textContent.trim()) {
                const text = el.textContent.trim();
                xpaths.push({
                    xpath: `//${el.tagName.toLowerCase()}[text()="${text}"]`,
                    type: 'text-based',
                    confidence: 0.7
                });
                
                xpaths.push({
                    xpath: `//${el.tagName.toLowerCase()}[contains(text(),"${text.substring(0, 20)}")]`,
                    type: 'text-contains',
                    confidence: 0.65
                });
            }

            // Strategy 4: Attribute-based XPath
            const attrs = ['name', 'class', 'type', 'placeholder'];
            for (const attr of attrs) {
                if (el.hasAttribute(attr)) {
                    xpaths.push({
                        xpath: `//${el.tagName.toLowerCase()}[@${attr}="${el.getAttribute(attr)}"]`,
                        type: 'attribute-based',
                        confidence: 0.8
                    });
                }
            }

            // Strategy 5: Position-based XPath
            const parent = el.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(child => child.tagName === el.tagName);
                const position = siblings.indexOf(el) + 1;
                xpaths.push({
                    xpath: `//${parent.tagName.toLowerCase()}/${el.tagName.toLowerCase()}[${position}]`,
                    type: 'position-based',
                    confidence: 0.5
                });
            }

            function generateAbsoluteXPath(element) {
                const path = [];
                let current = element;
                
                while (current && current.nodeType === Node.ELEMENT_NODE) {
                    let index = 1;
                    let sibling = current.previousSibling;
                    
                    while (sibling) {
                        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
                            index++;
                        }
                        sibling = sibling.previousSibling;
                    }
                    
                    path.unshift(`${current.tagName.toLowerCase()}[${index}]`);
                    current = current.parentElement;
                }
                
                return '/' + path.join('/');
            }

            return xpaths;
        }, element);
    }

    /**
     * Generate accessibility-based selectors
     */
    async generateAccessibilitySelectors(element) {
        return await this.page.evaluate((elementInfo) => {
            const accessibility = {};
            const el = document.querySelector(elementInfo.selectorPath);
            if (!el) return accessibility;

            // ARIA attributes
            const ariaAttrs = [
                'aria-label', 'aria-labelledby', 'aria-describedby',
                'aria-role', 'aria-expanded', 'aria-selected',
                'aria-checked', 'aria-disabled', 'aria-hidden'
            ];

            for (const attr of ariaAttrs) {
                if (el.hasAttribute(attr)) {
                    accessibility[attr] = el.getAttribute(attr);
                }
            }

            // Role-based selectors
            const role = el.getAttribute('role') || el.tagName.toLowerCase();
            accessibility.role = role;

            // Label associations
            const labels = [];
            if (el.labels) {
                for (const label of el.labels) {
                    labels.push(label.textContent.trim());
                }
            }
            accessibility.labels = labels;

            // Accessible name calculation
            accessibility.accessibleName = getAccessibleName(el);

            // Keyboard accessibility
            accessibility.focusable = el.tabIndex >= 0 || ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(el.tagName);
            accessibility.tabIndex = el.tabIndex;

            function getAccessibleName(element) {
                // Simplified accessible name calculation
                if (element.getAttribute('aria-label')) {
                    return element.getAttribute('aria-label');
                }
                
                if (element.getAttribute('aria-labelledby')) {
                    const labelId = element.getAttribute('aria-labelledby');
                    const labelElement = document.getElementById(labelId);
                    if (labelElement) {
                        return labelElement.textContent.trim();
                    }
                }
                
                if (element.labels && element.labels.length > 0) {
                    return element.labels[0].textContent.trim();
                }
                
                if (element.title) {
                    return element.title;
                }
                
                if (element.placeholder) {
                    return element.placeholder;
                }
                
                return element.textContent ? element.textContent.trim() : '';
            }

            return accessibility;
        }, element);
    }

    /**
     * Generate visual fingerprint for element
     */
    async generateVisualFingerprint(element) {
        try {
            const elementHandle = await this.page.$(element.selectorPath);
            if (!elementHandle) return null;

            const boundingBox = await elementHandle.boundingBox();
            if (!boundingBox) return null;

            // Capture element screenshot
            const screenshot = await elementHandle.screenshot({
                type: 'png'
            });

            // Generate visual hash
            const crypto = require('crypto');
            const visualHash = crypto.createHash('md5').update(screenshot).digest('hex');

            // Get surrounding context
            const surroundingContext = await this.page.evaluate((selector) => {
                const el = document.querySelector(selector);
                if (!el) return [];

                const context = [];
                const rect = el.getBoundingClientRect();
                
                // Find nearby elements
                const allElements = document.querySelectorAll('*');
                for (const other of allElements) {
                    if (other === el) continue;
                    
                    const otherRect = other.getBoundingClientRect();
                    const distance = Math.sqrt(
                        Math.pow(rect.x - otherRect.x, 2) + 
                        Math.pow(rect.y - otherRect.y, 2)
                    );
                    
                    if (distance < 100) { // Within 100px
                        context.push({
                            tagName: other.tagName,
                            className: other.className,
                            textContent: other.textContent ? other.textContent.substring(0, 50) : '',
                            distance: Math.round(distance)
                        });
                    }
                }
                
                return context.slice(0, 5); // Top 5 closest elements
            }, element.selectorPath);

            return {
                screenshot: screenshot.toString('base64'),
                boundingBox: boundingBox,
                visualHash: visualHash,
                surroundingContext: surroundingContext,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('❌ Error generating visual fingerprint:', error.message);
            return null;
        }
    }

    /**
     * Generate semantic context for element
     */
    async generateSemanticContext(element) {
        return await this.page.evaluate((elementInfo) => {
            const el = document.querySelector(elementInfo.selectorPath);
            if (!el) return {};

            const semantic = {
                role: '',
                label: '',
                purpose: '',
                businessContext: '',
                formContext: null,
                interactionType: ''
            };

            // Determine role
            semantic.role = el.getAttribute('role') || inferRole(el);

            // Determine label
            semantic.label = getElementLabel(el);

            // Determine purpose
            semantic.purpose = inferPurpose(el);

            // Business context
            semantic.businessContext = inferBusinessContext(el);

            // Form context
            if (el.form) {
                semantic.formContext = {
                    formName: el.form.name || el.form.id || '',
                    fieldPosition: Array.from(el.form.elements).indexOf(el) + 1,
                    totalFields: el.form.elements.length
                };
            }

            // Interaction type
            semantic.interactionType = inferInteractionType(el);

            function inferRole(element) {
                const tagName = element.tagName.toLowerCase();
                const type = element.type;
                
                if (tagName === 'button' || type === 'button' || type === 'submit') return 'button';
                if (tagName === 'input' && ['text', 'email', 'password'].includes(type)) return 'textbox';
                if (tagName === 'textarea') return 'textbox';
                if (tagName === 'select') return 'combobox';
                if (tagName === 'a') return 'link';
                if (type === 'checkbox') return 'checkbox';
                if (type === 'radio') return 'radio';
                
                return tagName;
            }

            function getElementLabel(element) {
                if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
                if (element.labels && element.labels.length > 0) return element.labels[0].textContent.trim();
                if (element.placeholder) return element.placeholder;
                if (element.title) return element.title;
                if (element.textContent) return element.textContent.trim().substring(0, 50);
                return '';
            }

            function inferPurpose(element) {
                const label = getElementLabel(element).toLowerCase();
                const name = (element.name || '').toLowerCase();
                const id = (element.id || '').toLowerCase();
                const className = (element.className || '').toLowerCase();
                
                const combined = `${label} ${name} ${id} ${className}`;
                
                if (/email|mail/.test(combined)) return 'email-input';
                if (/password|pwd/.test(combined)) return 'password-input';
                if (/phone|tel/.test(combined)) return 'phone-input';
                if (/name|first|last/.test(combined)) return 'name-input';
                if (/address/.test(combined)) return 'address-input';
                if (/search/.test(combined)) return 'search-input';
                if (/submit|send|save/.test(combined)) return 'submit-action';
                if (/cancel|close/.test(combined)) return 'cancel-action';
                if (/login|signin/.test(combined)) return 'login-action';
                if (/register|signup/.test(combined)) return 'register-action';
                
                return 'general-input';
            }

            function inferBusinessContext(element) {
                const pageTitle = document.title.toLowerCase();
                const url = window.location.href.toLowerCase();
                const formContext = element.form ? (element.form.name || element.form.id || '').toLowerCase() : '';
                
                const context = `${pageTitle} ${url} ${formContext}`;
                
                if (/login|signin|auth/.test(context)) return 'authentication';
                if (/register|signup|create/.test(context)) return 'registration';
                if (/checkout|payment|billing/.test(context)) return 'ecommerce';
                if (/profile|account|settings/.test(context)) return 'user-management';
                if (/contact|support|help/.test(context)) return 'customer-service';
                if (/search|find|lookup/.test(context)) return 'search';
                
                return 'general';
            }

            function inferInteractionType(element) {
                const tagName = element.tagName.toLowerCase();
                const type = element.type;
                
                if (tagName === 'input') {
                    if (['text', 'email', 'password', 'tel', 'url'].includes(type)) return 'text-input';
                    if (type === 'checkbox') return 'toggle';
                    if (type === 'radio') return 'select-one';
                    if (type === 'file') return 'file-upload';
                    if (['submit', 'button'].includes(type)) return 'click';
                }
                
                if (tagName === 'textarea') return 'text-input';
                if (tagName === 'select') return element.multiple ? 'select-multiple' : 'select-one';
                if (tagName === 'button') return 'click';
                if (tagName === 'a') return 'navigate';
                
                return 'click';
            }

            return semantic;
        }, element);
    }

    /**
     * Score selector strategies and determine fallback order
     */
    async scoreStrategies(strategies, element) {
        const scores = [];
        
        // Score CSS selectors
        for (const css of strategies.css) {
            scores.push({
                type: 'css',
                selector: css.selector,
                confidence: css.confidence,
                strategy: css.type
            });
        }
        
        // Score XPath selectors
        for (const xpath of strategies.xpath) {
            scores.push({
                type: 'xpath',
                selector: xpath.xpath,
                confidence: xpath.confidence,
                strategy: xpath.type
            });
        }
        
        // Score accessibility selectors
        if (strategies.accessibility.accessibleName) {
            scores.push({
                type: 'accessibility',
                selector: `[aria-label="${strategies.accessibility.accessibleName}"]`,
                confidence: 0.85,
                strategy: 'accessible-name'
            });
        }
        
        // Sort by confidence
        scores.sort((a, b) => b.confidence - a.confidence);
        
        // Calculate overall confidence
        const overallConfidence = scores.length > 0 ? scores[0].confidence : 0;
        
        // Create fallback order
        const fallbackOrder = scores.map(score => ({
            type: score.type,
            selector: score.selector,
            confidence: score.confidence,
            strategy: score.strategy
        }));
        
        return {
            overallConfidence,
            fallbackOrder
        };
    }
}

/**
 * 🎯 SELECTOR CONFIDENCE SCORER
 * Calculates confidence scores for different selector strategies
 */
class SelectorConfidenceScorer {
    constructor() {
        this.weights = {
            uniqueness: 0.4,
            stability: 0.3,
            readability: 0.2,
            performance: 0.1
        };
    }

    /**
     * Calculate confidence score for a selector
     */
    async calculateConfidence(selector, selectorType, page) {
        try {
            const scores = {
                uniqueness: await this.scoreUniqueness(selector, page),
                stability: this.scoreStability(selector, selectorType),
                readability: this.scoreReadability(selector, selectorType),
                performance: this.scorePerformance(selector, selectorType)
            };

            const weightedScore = Object.keys(scores).reduce((total, key) => {
                return total + (scores[key] * this.weights[key]);
            }, 0);

            return Math.min(Math.max(weightedScore, 0), 1);
        } catch (error) {
            console.error('❌ Error calculating confidence:', error.message);
            return 0.5; // Default confidence
        }
    }

    /**
     * Score selector uniqueness (how many elements it matches)
     */
    async scoreUniqueness(selector, page) {
        try {
            const count = await page.evaluate((sel) => {
                try {
                    return document.querySelectorAll(sel).length;
                } catch (e) {
                    return 999; // Invalid selector gets low score
                }
            }, selector);

            if (count === 1) return 1.0;
            if (count === 0) return 0.0;
            if (count <= 5) return 0.8;
            if (count <= 10) return 0.6;
            return 0.2;
        } catch (error) {
            return 0.0;
        }
    }

    /**
     * Score selector stability (likelihood to remain valid)
     */
    scoreStability(selector, selectorType) {
        const stabilityScores = {
            'id': 0.95,
            'data-attribute': 0.9,
            'name': 0.85,
            'aria-label': 0.85,
            'class-multiple': 0.7,
            'attribute': 0.65,
            'class-single': 0.5,
            'text-content': 0.4,
            'structural': 0.3,
            'absolute': 0.2
        };

        return stabilityScores[selectorType] || 0.5;
    }

    /**
     * Score selector readability (human understanding)
     */
    scoreReadability(selector, selectorType) {
        const readabilityScores = {
            'id': 0.9,
            'data-attribute': 0.85,
            'name': 0.8,
            'aria-label': 0.8,
            'text-content': 0.7,
            'class-single': 0.6,
            'attribute': 0.5,
            'class-multiple': 0.4,
            'structural': 0.3,
            'absolute': 0.1
        };

        return readabilityScores[selectorType] || 0.5;
    }

    /**
     * Score selector performance (query speed)
     */
    scorePerformance(selector, selectorType) {
        const performanceScores = {
            'id': 1.0,
            'class-single': 0.9,
            'attribute': 0.8,
            'data-attribute': 0.8,
            'name': 0.8,
            'class-multiple': 0.7,
            'structural': 0.6,
            'text-content': 0.4,
            'absolute': 0.3
        };

        return performanceScores[selectorType] || 0.5;
    }
}

module.exports = ActionCapture;