/**
 * 🎬 ACTION CAPTURE
 * 
 * Advanced browser action capture system with detailed element analysis
 * Supports complex form controls, dynamic content, and AJAX-loaded elements
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
            ...options
        };
        
        // Action capture state
        this.isCapturing = false;
        this.capturedActions = [];
        this.elementCache = new Map();
        this.dynamicContentObserver = null;
        
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
        await this.page.evaluateOnNewDocument(() => {
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

            // Extract comprehensive element information
            const extractElementInfo = (element) => {
                if (!element) return null;

                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                
                return {
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
                    
                    // CSS selector path
                    selectorPath: generateSelectorPath(element),
                    
                    // XPath
                    xpath: generateXPath(element)
                };
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
        await this.page.evaluateOnNewDocument(() => {
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
     * Process a captured event into a standardized action
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
            options: this.options
        };
    }
}

module.exports = ActionCapture;