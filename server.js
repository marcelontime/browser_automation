const express = require('express');
const WebSocket = require('ws');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

class IntelligentBrowserAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.clients = new Set();
        this.isRecording = false;
        this.currentRecording = {
            name: '',
            description: '',
            steps: [],
            variables: [],
            startUrl: ''
        };
        this.savedScripts = new Map();
        this.actionHistory = [];
        this.screenshotInterval = null;
        
        // Manual control state
        this.isManualMode = false;
        this.automationPaused = false;
        this.lastKnownState = null;
        
        // Initialize Claude client
        this.claude = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        
        console.log('🤖 Claude Sonnet 4 integration initialized');
    }

    async initialize() {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.static('public'));
        
        const port = process.env.PORT || 7079;
        this.server = this.app.listen(port);
        
        this.wss = new WebSocket.Server({ server: this.server });
        this.setupWebSocket();
        
        await this.initBrowser();
        await this.loadSavedScripts();
        
        console.log(`🚀 Browser Automation System started at http://localhost:${port}`);
        console.log(`🤖 Claude integration: ${process.env.ANTHROPIC_API_KEY ? 'Enabled' : 'Disabled'}`);
    }

    async initBrowser() {
        console.log('🚀 Initializing browser...');
        this.browser = await puppeteer.launch({
            headless: false,
            devtools: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--start-maximized',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1400, height: 900 });
        
        // Navigate to a default page
        await this.page.goto('https://www.google.com');
        console.log('🌐 Browser initialized and navigated to Google');
        
        // Inject monitoring script
        await this.injectMonitoringScript();
        this.startScreenshotStream();
    }

    async injectMonitoringScript() {
        await this.page.evaluateOnNewDocument(() => {
            window.automationRecorder = {
                isRecording: false,
                actions: [],
                
                recordAction(type, element, value = null) {
                    if (!this.isRecording) return;
                    
                    const action = {
                        type,
                        timestamp: Date.now(),
                        element: this.getElementInfo(element),
                        value,
                        url: window.location.href
                    };
                    
                    // Send to server
                    window.postMessage({ type: 'recordAction', action }, '*');
                },
                
                getElementInfo(element) {
                    const rect = element.getBoundingClientRect();
                    return {
                        tagName: element.tagName,
                        id: element.id,
                        className: element.className,
                        textContent: element.textContent?.substring(0, 50),
                        selector: this.generateSelector(element),
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                        attributes: this.getRelevantAttributes(element)
                    };
                },
                
                generateSelector(element) {
                    // Generate unique and robust selector
                    if (element.id) return `#${element.id}`;
                    
                    if (element.className) {
                        const classes = element.className.split(' ').filter(c => c.length > 0);
                        if (classes.length > 0) {
                            return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
                        }
                    }
                    
                    // Use hierarchical position
                    const parent = element.parentElement;
                    if (parent) {
                        const index = Array.from(parent.children).indexOf(element);
                        return `${this.generateSelector(parent)} > ${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
                    }
                    
                    return element.tagName.toLowerCase();
                },

                generateMultipleSelectors(element) {
                    const selectors = [];
                    
                    // ID selector (highest priority)
                    if (element.id) {
                        selectors.push(`#${element.id}`);
                    }
                    
                    // Name attribute
                    if (element.name) {
                        selectors.push(`[name="${element.name}"]`);
                    }
                    
                    // Placeholder-based selector
                    if (element.placeholder) {
                        selectors.push(`[placeholder="${element.placeholder}"]`);
                    }
                    
                    // Aria-label selector
                    if (element.getAttribute('aria-label')) {
                        selectors.push(`[aria-label="${element.getAttribute('aria-label')}"]`);
                    }
                    
                    // Class-based selectors
                    if (element.className) {
                        const classes = element.className.split(' ').filter(c => c.length > 0);
                        classes.forEach(cls => {
                            selectors.push(`.${cls}`);
                        });
                    }
                    
                    // Type-based selector
                    if (element.type) {
                        selectors.push(`${element.tagName.toLowerCase()}[type="${element.type}"]`);
                    }
                    
                    // Text content selector (for buttons/links)
                    if (element.textContent && element.textContent.trim()) {
                        const text = element.textContent.trim();
                        if (text.length < 50) { // Avoid very long text
                            selectors.push(`${element.tagName.toLowerCase()}:contains("${text}")`);
                        }
                    }
                    
                    // Position-based selector (nth-child)
                    const parent = element.parentElement;
                    if (parent) {
                        const siblings = Array.from(parent.children).filter(child => child.tagName === element.tagName);
                        const index = siblings.indexOf(element);
                        if (index >= 0) {
                            selectors.push(`${element.tagName.toLowerCase()}:nth-of-type(${index + 1})`);
                        }
                    }
                    
                    // Fallback to tag name
                    selectors.push(element.tagName.toLowerCase());
                    
                    return selectors;
                },
                
                getRelevantAttributes(element) {
                    const attrs = {};
                    ['type', 'name', 'placeholder', 'value', 'href', 'src'].forEach(attr => {
                        if (element.hasAttribute(attr)) {
                            attrs[attr] = element.getAttribute(attr);
                        }
                    });
                    return attrs;
                }
            };
            
            // Monitor events
            ['click', 'input', 'change', 'submit'].forEach(eventType => {
                document.addEventListener(eventType, (e) => {
                    window.automationRecorder.recordAction(eventType, e.target, e.target.value);
                }, true);
            });
            
            // Intercept navigation
            const originalPushState = history.pushState;
            history.pushState = function(...args) {
                window.automationRecorder.recordAction('navigate', document.body, args[2]);
                return originalPushState.apply(history, args);
            };
        });

        // Listen to messages from injected script
        this.page.on('console', msg => {
            if (msg.text().includes('recordAction')) {
                console.log('Action recorded:', msg.text());
            }
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            console.log('👤 Client connected');

            // Send initial state
            ws.send(JSON.stringify({
                type: 'init',
                scripts: Array.from(this.savedScripts.keys()),
                isRecording: this.isRecording
            }));

            ws.on('message', async (message) => {
                const data = JSON.parse(message);
                await this.handleMessage(data, ws);
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('👤 Client disconnected');
            });
        });
    }

    async handleMessage(data, ws) {
        try {
            switch (data.type) {
                case 'chat_instruction':
                    await this.processNaturalLanguageInstruction(data.message);
                    break;
                    
                case 'start_recording':
                    await this.startRecording(data.name, data.description);
                    break;
                    
                case 'stop_recording':
                    await this.stopRecording();
                    break;
                    
                case 'execute_script':
                    await this.executeScript(data.scriptName, data.variables);
                    break;
                    
                case 'get_page_info':
                    await this.getPageInfo();
                    break;
                    
                case 'navigate':
                    await this.navigateTo(data.url);
                    break;
                    
                case 'delete_script':
                    await this.deleteScript(data.scriptName);
                    break;
                    
                case 'toggle_manual_mode':
                    await this.toggleManualMode();
                    break;
                    
                case 'pause_automation':
                    await this.pauseAutomation();
                    break;
                    
                case 'resume_automation':
                    await this.resumeAutomation();
                    break;
                    
                case 'sync_browser_state':
                    await this.syncBrowserState();
                    break;
                    
                case 'get_script_variables':
                    await this.getScriptVariables(data.scriptName);
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.broadcast({
                type: 'error',
                message: `Error: ${error.message}`
            });
        }
    }

    async processNaturalLanguageInstruction(instruction) {
        this.broadcast({
            type: 'chat_response',
            message: `🤖 Processing: "${instruction}"`
        });

        // Check if this is a request for guidance
        if (this.isGuidanceRequest(instruction)) {
            await this.provideGuidance(instruction);
            return;
        }

        // For direct commands, use pattern matching first (fast and reliable)
        const action = await this.parseInstruction(instruction);
        
        if (action) {
            await this.executeAction(action);
            
            // If recording, add to sequence with smart variable detection
            if (this.isRecording) {
                this.currentRecording.steps.push({
                    instruction,
                    action,
                    timestamp: Date.now(),
                    screenshot: await this.page.screenshot({ encoding: 'base64' })
                });
            }
        } else {
            this.broadcast({
                type: 'chat_response',
                message: `❌ Could not understand instruction: "${instruction}"`
            });
        }
    }

    async parseInstruction(instruction) {
        // First try direct navigation commands
        const navigationAction = this.parseNavigationCommand(instruction);
        if (navigationAction) {
            return navigationAction;
        }

        // Then try element-based action detection
        return await this.intelligentActionDetection(instruction);
    }

    parseNavigationCommand(instruction) {
        const lowerInstruction = instruction.toLowerCase();
        
        // Common navigation patterns
        const navigationPatterns = [
            { pattern: /^(?:go to|navigate to|visit|open)\s+(.+)$/i, type: 'navigate' },
            { pattern: /^(?:search for|find|look for)\s+(.+)$/i, type: 'search' },
            { pattern: /^(?:click|press|tap)\s+(.+)$/i, type: 'click_text' },
            { pattern: /^(?:type|enter|input)\s+(.+?)(?:\s+(?:in|into|on)\s+(.+))?$/i, type: 'type_text' },
            { pattern: /^(?:fill|complete)\s+(.+?)(?:\s+(?:with|as)\s+(.+))?$/i, type: 'fill_field' }
        ];

        for (const { pattern, type } of navigationPatterns) {
            const match = instruction.match(pattern);
            if (match) {
                console.log(`🎯 Matched navigation pattern: ${type}`, match);
                
                switch (type) {
                    case 'navigate':
                        return {
                            type: 'navigate',
                            url: match[1].trim(),
                            original: instruction
                        };
                    case 'search':
                        // This will be handled by element detection
                        return null;
                    case 'click_text':
                        return {
                            type: 'click',
                            searchText: match[1].trim(),
                            original: instruction
                        };
                    case 'type_text':
                        return {
                            type: 'type',
                            text: match[1].trim(),
                            target: match[2] ? match[2].trim() : null,
                            original: instruction
                        };
                    case 'fill_field':
                        return {
                            type: 'type',
                            target: match[1].trim(),
                            text: match[2] ? match[2].trim() : '',
                            original: instruction
                        };
                }
            }
        }

        return null;
    }

    isGuidanceRequest(instruction) {
        // Only activate Claude if user explicitly asks for guidance with a question
        return instruction.trim().endsWith('?') && instruction.length > 10;
    }

    async provideGuidance(instruction) {
        if (!this.claude || !process.env.ANTHROPIC_API_KEY) {
            this.broadcast({
                type: 'chat_response',
                message: `💡 Guidance: For complex automation, try recording your actions step by step. Use simple commands like "click login button" or "type username in email field".`
            });
            return;
        }

        try {
            const prompt = `You are a browser automation guide. The user has a recording-based automation system where they can:

1. Record actions by clicking "Start Recording"
2. Perform actions manually or via simple commands
3. Stop recording to create reusable scripts with variables
4. Execute scripts with different parameters

User request: "${instruction}"

Provide helpful, concise guidance (2-3 sentences max) on how to achieve their goal using this recording-based approach. Focus on the "record once, reuse many times" workflow.`;

            const response = await this.claude.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 200,
                temperature: 0.3,
                messages: [{ role: 'user', content: prompt }]
            });

            this.broadcast({
                type: 'chat_response',
                message: `💡 ${response.content[0].text}`
            });

        } catch (error) {
            console.error('Guidance error:', error);
            this.broadcast({
                type: 'chat_response',
                message: `💡 Guidance: Record your actions step by step, then reuse the script with different variables. Start with "Start Recording" and perform the actions you want to automate.`
            });
        }
    }



    async intelligentActionDetection(instruction) {
        try {
            console.log(`🔍 Starting intelligent action detection for: "${instruction}"`);
            
            // Enhanced element detection with dynamic content awareness
            const elements = await this.page.evaluate(() => {
                // Wait for dynamic content to load
                const waitForDynamicContent = () => {
                    return new Promise((resolve) => {
                        let checkCount = 0;
                        const maxChecks = 10;
                        
                        const checkForChanges = () => {
                            checkCount++;
                            const currentElementCount = document.querySelectorAll('input, button, select, textarea, a, [onclick], [role="button"], [contenteditable]').length;
                            
                            if (checkCount >= maxChecks) {
                                resolve();
                            } else {
                                setTimeout(checkForChanges, 200);
                            }
                        };
                        
                        checkForChanges();
                    });
                };
                
                // Enhanced element selection with better attribute checking
                const allElements = document.querySelectorAll('input, button, select, textarea, a, [onclick], [role="button"], [contenteditable], [data-testid], [data-cy]');
                return Array.from(allElements)
                    .filter(el => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        
                        // Enhanced visibility checks
                        const isVisible = rect.width > 0 && 
                                        rect.height > 0 && 
                                        style.display !== 'none' && 
                                        style.visibility !== 'hidden' &&
                                        style.opacity !== '0' &&
                                        !el.hasAttribute('hidden') &&
                                        !el.disabled;
                        
                        // Check if element is in viewport
                        const isInViewport = rect.top >= 0 && 
                                           rect.left >= 0 && 
                                           rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && 
                                           rect.right <= (window.innerWidth || document.documentElement.clientWidth);
                        
                        return isVisible && (isInViewport || rect.top < window.innerHeight + 1000); // Allow elements slightly below viewport
                    })
                    .map(el => {
                        // Enhanced element information extraction
                        const computedStyle = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        
                        return {
                            tagName: el.tagName,
                            type: el.type,
                            id: el.id,
                            className: el.className,
                            textContent: el.textContent?.trim().substring(0, 200),
                            placeholder: el.placeholder,
                            name: el.name,
                            ariaLabel: el.getAttribute('aria-label'),
                            ariaRole: el.getAttribute('role'),
                            title: el.title,
                            value: el.value,
                            alt: el.alt,
                            href: el.href,
                            dataTestId: el.getAttribute('data-testid'),
                            dataCy: el.getAttribute('data-cy'),
                            tabIndex: el.tabIndex,
                            // Enhanced selector generation
                            selector: window.automationRecorder.generateSelector(el),
                            selectors: window.automationRecorder.generateMultipleSelectors(el),
                            // Position and size information
                            rect: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            },
                            // Style information
                            isClickable: computedStyle.cursor === 'pointer' || el.tagName === 'BUTTON' || el.tagName === 'A',
                            zIndex: computedStyle.zIndex,
                            opacity: computedStyle.opacity
                        };
                    })
                    .sort((a, b) => {
                        // Prioritize elements by relevance
                        const aScore = this.calculateElementPriority(a);
                        const bScore = this.calculateElementPriority(b);
                        return bScore - aScore;
                    });
            });

            console.log(`🔍 Found ${elements.length} interactive elements on page`);
            
            // Enhanced element matching with multiple strategies
            const matchingStrategies = [
                // Strategy 1: Exact semantic matching
                (instruction, elements) => this.findExactSemanticMatch(instruction, elements),
                // Strategy 2: Fuzzy semantic matching
                (instruction, elements) => this.findFuzzySemanticMatch(instruction, elements),
                // Strategy 3: Context-aware matching
                (instruction, elements) => this.findContextAwareMatch(instruction, elements),
                // Strategy 4: Position-based matching
                (instruction, elements) => this.findPositionBasedMatch(instruction, elements)
            ];
            
            let bestMatch = null;
            for (const strategy of matchingStrategies) {
                try {
                    bestMatch = strategy(instruction, elements);
                    if (bestMatch && bestMatch.score > 0.3) {
                        console.log(`✅ Element found using strategy with score: ${bestMatch.score.toFixed(2)}`);
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ Matching strategy failed: ${error.message}`);
                }
            }
            
            if (bestMatch) {
                console.log(`✅ Best element match found:`, bestMatch);
                
                // Enhanced action type determination
                const actionType = this.determineActionType(bestMatch, instruction);
                return {
                    type: actionType,
                    target: bestMatch.selector,
                    element: bestMatch,
                    confidence: bestMatch.score,
                    fallbackSelectors: bestMatch.selectors,
                    searchText: this.extractSearchText(instruction, bestMatch)
                };
            }

            console.log('❌ No suitable element found for instruction:', instruction);
            return null;
        } catch (error) {
            console.error('Error in intelligent action detection:', error);
            return null;
        }
    }

    // NEW: Calculate element priority for better sorting
    calculateElementPriority(element) {
        let score = 0;
        
        // Prioritize by element type
        if (element.tagName === 'BUTTON') score += 10;
        if (element.tagName === 'INPUT') score += 8;
        if (element.tagName === 'A') score += 6;
        if (element.tagName === 'SELECT') score += 7;
        
        // Prioritize by attributes
        if (element.id) score += 5;
        if (element.name) score += 3;
        if (element.dataTestId) score += 4;
        if (element.ariaLabel) score += 3;
        if (element.placeholder) score += 2;
        
        // Prioritize by visibility and accessibility
        if (element.isClickable) score += 3;
        if (element.tabIndex >= 0) score += 2;
        
        // Prioritize by position (elements higher on page)
        if (element.rect.y < 500) score += 2;
        if (element.rect.y < 200) score += 1;
        
        return score;
    }

    // NEW: Exact semantic matching
    findExactSemanticMatch(instruction, elements) {
        const instructionLower = instruction.toLowerCase();
        
        for (const element of elements) {
            const score = this.calculateSimilarity(instruction, element);
            
            // Check for exact matches in key attributes
            if (element.id && instructionLower.includes(element.id.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.9) };
            }
            if (element.name && instructionLower.includes(element.name.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.85) };
            }
            if (element.dataTestId && instructionLower.includes(element.dataTestId.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.9) };
            }
            if (element.ariaLabel && instructionLower.includes(element.ariaLabel.toLowerCase())) {
                return { ...element, score: Math.max(score, 0.8) };
            }
            
            if (score > 0.7) {
                return { ...element, score };
            }
        }
        
        return null;
    }

    // NEW: Fuzzy semantic matching with improved algorithm
    findFuzzySemanticMatch(instruction, elements) {
        let bestMatch = null;
        let highestScore = 0;
        
        for (const element of elements) {
            const score = this.calculateEnhancedSimilarity(instruction, element);
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = { ...element, score };
            }
        }
        
        return highestScore > 0.3 ? bestMatch : null;
    }

    // NEW: Context-aware matching
    findContextAwareMatch(instruction, elements) {
        const context = this.analyzeInstructionContext(instruction);
        
        for (const element of elements) {
            let score = this.calculateSimilarity(instruction, element);
            
            // Context-based scoring adjustments
            if (context.isLogin && (element.type === 'password' || element.type === 'email')) {
                score += 0.3;
            }
            if (context.isSearch && (element.type === 'search' || element.placeholder?.toLowerCase().includes('search'))) {
                score += 0.3;
            }
            if (context.isSubmit && (element.type === 'submit' || element.tagName === 'BUTTON')) {
                score += 0.3;
            }
            
            if (score > 0.4) {
                return { ...element, score };
            }
        }
        
        return null;
    }

    // NEW: Position-based matching
    findPositionBasedMatch(instruction, elements) {
        const positionKeywords = {
            'first': (elements) => elements[0],
            'last': (elements) => elements[elements.length - 1],
            'top': (elements) => elements.sort((a, b) => a.rect.y - b.rect.y)[0],
            'bottom': (elements) => elements.sort((a, b) => b.rect.y - a.rect.y)[0],
            'left': (elements) => elements.sort((a, b) => a.rect.x - b.rect.x)[0],
            'right': (elements) => elements.sort((a, b) => b.rect.x - a.rect.x)[0]
        };
        
        const instructionLower = instruction.toLowerCase();
        
        for (const [keyword, selector] of Object.entries(positionKeywords)) {
            if (instructionLower.includes(keyword)) {
                const relevantElements = elements.filter(el => 
                    this.calculateSimilarity(instruction, el) > 0.2
                );
                
                if (relevantElements.length > 0) {
                    const selected = selector(relevantElements);
                    return { ...selected, score: 0.6 };
                }
            }
        }
        
        return null;
    }

    // NEW: Enhanced similarity calculation
    calculateEnhancedSimilarity(instruction, element) {
        const baseScore = this.calculateSimilarity(instruction, element);
        
        // Additional scoring factors
        let enhancementScore = 0;
        
        // Boost for semantic relevance
        const semanticKeywords = {
            'login': ['login', 'signin', 'sign-in', 'log-in'],
            'search': ['search', 'find', 'lookup'],
            'submit': ['submit', 'send', 'go', 'enter'],
            'cancel': ['cancel', 'close', 'dismiss'],
            'next': ['next', 'continue', 'proceed'],
            'back': ['back', 'previous', 'return']
        };
        
        const instructionLower = instruction.toLowerCase();
        for (const [category, keywords] of Object.entries(semanticKeywords)) {
            if (keywords.some(kw => instructionLower.includes(kw))) {
                if (element.textContent?.toLowerCase().includes(category) ||
                    element.className?.toLowerCase().includes(category) ||
                    element.id?.toLowerCase().includes(category)) {
                    enhancementScore += 0.2;
                }
            }
        }
        
        // Boost for common UI patterns
        if (element.tagName === 'BUTTON' && instructionLower.includes('click')) {
            enhancementScore += 0.1;
        }
        if (element.tagName === 'INPUT' && instructionLower.includes('type')) {
            enhancementScore += 0.1;
        }
        
        return Math.min(baseScore + enhancementScore, 1.0);
    }

    // NEW: Analyze instruction context
    analyzeInstructionContext(instruction) {
        const lower = instruction.toLowerCase();
        
        return {
            isLogin: lower.includes('login') || lower.includes('signin') || lower.includes('sign in'),
            isSearch: lower.includes('search') || lower.includes('find') || lower.includes('lookup'),
            isSubmit: lower.includes('submit') || lower.includes('send') || lower.includes('go'),
            isNavigation: lower.includes('navigate') || lower.includes('go to') || lower.includes('visit'),
            isForm: lower.includes('form') || lower.includes('fill') || lower.includes('enter'),
            isClick: lower.includes('click') || lower.includes('press') || lower.includes('tap'),
            isType: lower.includes('type') || lower.includes('enter') || lower.includes('input')
        };
    }

    // NEW: Extract search text for fallback
    extractSearchText(instruction, element) {
        const words = instruction.toLowerCase().split(/\s+/);
        const relevantWords = words.filter(word => 
            word.length > 2 && 
            !['click', 'the', 'button', 'field', 'box', 'input', 'on', 'in', 'at'].includes(word)
        );
        
        return relevantWords.join(' ') || element.textContent?.substring(0, 50) || '';
    }

    findBestElementMatch(instruction, elements) {
        let bestMatch = null;
        let highestScore = 0;

        console.log(`🔍 Matching instruction "${instruction}" against ${elements.length} elements`);
        
        for (const element of elements) {
            const score = this.calculateSimilarity(instruction, element);
            
            console.log(`🎯 Element: ${element.tagName}${element.id ? '#' + element.id : ''}${element.className ? '.' + element.className.split(' ')[0] : ''} - Score: ${score.toFixed(2)}`);
            
            if (score > highestScore) {
                highestScore = score;
                bestMatch = { ...element, score };
            }
        }

        console.log(`🏆 Best match score: ${highestScore.toFixed(2)}, threshold: 0.2`);
        
        // Lower threshold for better matching
        return highestScore > 0.2 ? bestMatch : null;
    }

    calculateSimilarity(instruction, element) {
        const instructionWords = instruction.toLowerCase().split(/\s+/);
        const elementTexts = [
            element.textContent,
            element.placeholder,
            element.id,
            element.name,
            element.ariaLabel,
            element.title,
            element.className,
            element.value
        ].filter(Boolean).join(' ').toLowerCase();

        let score = 0;
        let exactMatches = 0;
        let partialMatches = 0;
        
        for (const word of instructionWords) {
            if (elementTexts.includes(word)) {
                score += 1;
                exactMatches++;
            } else {
                // Check for partial matches with improved fuzzy matching
                const partialMatch = elementTexts.split(' ').some(text => {
                    // Exact substring match
                    if (text.includes(word) || word.includes(text)) return true;
                    // Fuzzy matching for typos (Levenshtein distance)
                    if (this.levenshteinDistance(text, word) <= 2 && Math.min(text.length, word.length) >= 3) return true;
                    return false;
                });
                if (partialMatch) {
                    score += 0.5;
                    partialMatches++;
                }
            }
        }

        // Enhanced scoring system
        const baseScore = score / instructionWords.length;
        
        // Boost score for common search terms and element types
        let typeBoost = 0;
        const searchTerms = ['search', 'box', 'field', 'input', 'button', 'click', 'type', 'login', 'submit', 'form'];
        for (const term of searchTerms) {
            if (instruction.toLowerCase().includes(term)) {
                if (element.tagName === 'INPUT' && ['search', 'box', 'field', 'input'].includes(term)) {
                    typeBoost += 0.3;
                } else if (element.tagName === 'BUTTON' && ['button', 'click', 'submit'].includes(term)) {
                    typeBoost += 0.3;
                } else if (element.type === 'submit' && ['submit', 'login'].includes(term)) {
                    typeBoost += 0.4;
                }
            }
        }

        // Additional context-aware scoring
        let contextBoost = 0;
        if (element.id && instruction.toLowerCase().includes(element.id.toLowerCase())) {
            contextBoost += 0.2;
        }
        if (element.name && instruction.toLowerCase().includes(element.name.toLowerCase())) {
            contextBoost += 0.2;
        }
        if (element.placeholder && instruction.toLowerCase().includes(element.placeholder.toLowerCase())) {
            contextBoost += 0.2;
        }

        return Math.min(baseScore + typeBoost + contextBoost, 1.0);
    }

    // NEW: Levenshtein distance for fuzzy matching
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

    determineActionType(element, instruction) {
        // Determine action based purely on element type and context
        if (element.tagName === 'INPUT') {
            const inputType = element.type?.toLowerCase();
            if (['text', 'email', 'password', 'search', 'url', 'tel', 'number'].includes(inputType)) {
                return 'type';
            }
            if (['checkbox', 'radio'].includes(inputType)) {
                return 'click';
            }
            if (inputType === 'submit' || inputType === 'button') {
                return 'click';
            }
        }
        
        if (element.tagName === 'TEXTAREA') {
            return 'type';
        }
        
        if (element.tagName === 'SELECT') {
            return 'select';
        }
        
        if (element.tagName === 'BUTTON' || 
            element.tagName === 'A' || 
            element.hasAttribute('onclick') ||
            element.getAttribute('role') === 'button') {
            return 'click';
        }
        
        // Default to click for any other interactive element
        return 'click';
    }



    async startRecording(name, description) {
        this.isRecording = true;
        this.currentRecording = {
            name,
            description,
            steps: [],
            variables: [],
            startUrl: this.page.url(),
            createdAt: new Date().toISOString()
        };

        await this.page.evaluate(() => {
            window.automationRecorder.isRecording = true;
        });

        this.broadcast({
            type: 'recording_started',
            message: `🔴 Recording: "${name}"`
        });
    }

    async stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        
        await this.page.evaluate(() => {
            window.automationRecorder.isRecording = false;
        });

        // Analyze variables in recorded steps
        this.currentRecording.variables = this.extractVariables(this.currentRecording.steps);
        
        // Save the script
        await this.saveScript(this.currentRecording);

        this.broadcast({
            type: 'recording_stopped',
            script: this.currentRecording,
            message: `✅ Script "${this.currentRecording.name}" saved successfully!`
        });

        this.currentRecording = null;
    }

    extractVariables(steps) {
        const variables = [];
        const seenValues = new Set();

        for (const step of steps) {
            // Extract ALL URL parameters as potential variables
            if (step.action && step.action.url) {
                const url = step.action.url;
                const queryParams = url.match(/[?&]([^=]+)=([^&]+)/g);
                if (queryParams) {
                    queryParams.forEach(param => {
                        const [key, value] = param.substring(1).split('=');
                        const decodedValue = decodeURIComponent(value.replace(/\+/g, ' '));
                        if (decodedValue.length > 1 && !seenValues.has(decodedValue)) {
                            variables.push({
                                name: key,
                                value: decodedValue,
                                type: this.detectValueType(decodedValue),
                                description: `${key} parameter`
                            });
                            seenValues.add(decodedValue);
                        }
                    });
                }
            }
            
            // Extract ALL typed text as potential variables
            if (step.action && step.action.text && !seenValues.has(step.action.text)) {
                const text = step.action.text;
                
                if (text.length > 0) {
                    const varName = this.generateGenericVariableName(text, step.action.target, variables.length);
                    variables.push({
                        name: varName,
                        value: text,
                        type: this.detectValueType(text),
                        description: `User input: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
                    });
                    seenValues.add(text);
                }
            }
        }

        return variables;
    }

    detectValueType(value) {
        // Generic type detection without hardcoded patterns
        if (!value || typeof value !== 'string') return 'text';
        
        // Check if it's a number
        if (!isNaN(value) && !isNaN(parseFloat(value))) {
            return 'number';
        }
        
        // Check if it contains @ symbol (likely email)
        if (value.includes('@') && value.includes('.')) {
            return 'email';
        }
        
        // Check if it looks like a date (contains date separators)
        if (value.match(/\d+[\/\-\.]\d+[\/\-\.]\d+/)) {
            return 'date';
        }
        
        // Check if it's a URL
        if (value.startsWith('http') || value.includes('://')) {
            return 'url';
        }
        
        // Default to text
        return 'text';
    }

    generateGenericVariableName(text, target, index) {
        // Generate variable name based on position and context
        if (target) {
            // Extract meaningful words from target selector
            const targetWords = target.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2);
            
            if (targetWords.length > 0) {
                return targetWords[0];
            }
        }
        
        // Fallback to generic indexed name
        return `var_${index + 1}`;
    }

    async saveScript(script) {
        this.savedScripts.set(script.name, script);
        
        // Save to file
        try {
            await fs.mkdir(path.join(__dirname, 'scripts'), { recursive: true });
            await fs.writeFile(
                path.join(__dirname, 'scripts', `${script.name}.json`),
                JSON.stringify(script, null, 2)
            );
        } catch (error) {
            console.error('Error saving script:', error);
        }
    }

    async loadSavedScripts() {
        try {
            const scriptsDir = path.join(__dirname, 'scripts');
            await fs.mkdir(scriptsDir, { recursive: true });
            
            const files = await fs.readdir(scriptsDir);
            for (const file of files.filter(f => f.endsWith('.json'))) {
                const content = await fs.readFile(path.join(scriptsDir, file), 'utf8');
                const script = JSON.parse(content);
                this.savedScripts.set(script.name, script);
            }
        } catch (error) {
            console.error('Error loading scripts:', error);
        }
    }

    async deleteScript(scriptName) {
        try {
            this.savedScripts.delete(scriptName);
            await fs.unlink(path.join(__dirname, 'scripts', `${scriptName}.json`));
            
            this.broadcast({
                type: 'script_deleted',
                scriptName,
                message: `✅ Script "${scriptName}" deleted successfully!`
            });
        } catch (error) {
            console.error('Error deleting script:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error deleting script: ${error.message}`
            });
        }
    }

    async executeScript(scriptName, variables = {}) {
        const script = this.savedScripts.get(scriptName);
        if (!script) {
            this.broadcast({
                type: 'error',
                message: `❌ Script "${scriptName}" not found`
            });
            return;
        }

        console.log(`🎬 Starting script execution: "${scriptName}"`);
        console.log(`📋 Script has ${script.steps.length} steps`);
        console.log(`🔧 Variables provided:`, variables);

        // Enhanced variable validation
        const validationResult = this.validateScriptVariables(script, variables);
        if (!validationResult.isValid) {
            this.broadcast({
                type: 'error',
                message: `❌ Variable validation failed: ${validationResult.error}`
            });
            return;
        }

        this.broadcast({
            type: 'script_execution_started',
            message: `🎬 Executing script: "${scriptName}"`
        });

        // Enhanced execution context
        const executionContext = {
            startTime: Date.now(),
            scriptName,
            variables,
            currentStep: 0,
            errors: [],
            retryCount: 0,
            maxRetries: 3
        };

        try {
            // Navigate to initial URL if necessary
            if (script.startUrl && this.page.url() !== script.startUrl) {
                console.log(`🏠 Navigating to start URL: ${script.startUrl}`);
                await this.executeNavigateAction({ url: script.startUrl });
                console.log(`✅ Start URL loaded: ${this.page.url()}`);
                await this.waitForPageStability();
            }

            // Execute each step with enhanced error handling
            for (let i = 0; i < script.steps.length; i++) {
                const step = script.steps[i];
                executionContext.currentStep = i + 1;
                
                console.log(`\n📍 Step ${i + 1}/${script.steps.length}: ${step.instruction || 'Action step'}`);
                console.log(`🎯 Original Action:`, step.action);
                
                this.broadcast({
                    type: 'script_step',
                    message: `Step ${i + 1}: ${step.instruction || 'Executing action'}`,
                    step: i + 1,
                    total: script.steps.length
                });

                // Enhanced step execution with retry logic
                let stepSuccess = false;
                let stepRetries = 0;
                const maxStepRetries = 2;

                while (!stepSuccess && stepRetries <= maxStepRetries) {
                    try {
                        // Replace variables with enhanced validation
                        const action = this.replaceVariables(step.action, variables);
                        console.log(`🔄 Action after variable replacement:`, action);
                        
                        // Pre-execution validation
                        const preValidation = await this.validateActionPreExecution(action);
                        if (!preValidation.isValid) {
                            console.log(`⚠️ Pre-execution validation failed: ${preValidation.error}`);
                            // Try to auto-correct common issues
                            const correctedAction = await this.autoCorrectAction(action, preValidation);
                            if (correctedAction) {
                                console.log(`🔧 Auto-corrected action:`, correctedAction);
                                await this.executeAction(correctedAction);
                            } else {
                                throw new Error(`Action validation failed: ${preValidation.error}`);
                            }
                        } else {
                            // Execute the action
                            await this.executeAction(action);
                        }
                        
                        // Post-execution validation
                        const postValidation = await this.validateActionPostExecution(action);
                        if (postValidation.isValid) {
                            stepSuccess = true;
                            console.log(`✅ Step ${i + 1} completed successfully`);
                        } else {
                            throw new Error(`Post-execution validation failed: ${postValidation.error}`);
                        }
                        
                    } catch (error) {
                        stepRetries++;
                        console.log(`❌ Step ${i + 1} failed (attempt ${stepRetries}/${maxStepRetries + 1}): ${error.message}`);
                        
                        if (stepRetries <= maxStepRetries) {
                            console.log(`🔄 Retrying step ${i + 1} in 3 seconds...`);
                            await this.page.waitForTimeout(3000);
                            
                            // Take diagnostic screenshot
                            await this.takeScreenshot();
                            
                            // Try to recover from common errors
                            await this.attemptErrorRecovery(error, step);
                        } else {
                            // Final failure - decide whether to continue or abort
                            const shouldContinue = await this.handleStepFailure(error, step, executionContext);
                            if (shouldContinue) {
                                console.log(`⚠️ Continuing execution despite step failure`);
                                stepSuccess = true; // Mark as success to continue
                            } else {
                                throw error; // Abort execution
                            }
                        }
                    }
                }
                
                // Verify current page state
                console.log(`📍 Current URL after step ${i + 1}: ${this.page.url()}`);
                
                // Enhanced inter-step wait
                await this.waitForPageStability();
                await this.page.waitForTimeout(1500);
            }

            const executionTime = Date.now() - executionContext.startTime;
            console.log(`✅ Script "${scriptName}" execution completed successfully!`);
            console.log(`🏁 Final URL: ${this.page.url()}`);
            console.log(`⏱️ Total execution time: ${executionTime}ms`);

            this.broadcast({
                type: 'script_execution_completed',
                message: `✅ Script "${scriptName}" executed successfully! (${executionTime}ms)`
            });

        } catch (error) {
            const executionTime = Date.now() - executionContext.startTime;
            console.error(`❌ Error executing script "${scriptName}":`, error);
            console.error(`📍 Failed at step ${executionContext.currentStep}/${script.steps.length}`);
            console.error(`📍 Current URL when error occurred: ${this.page.url()}`);
            console.error(`⏱️ Execution time before failure: ${executionTime}ms`);
            
            this.broadcast({
                type: 'error',
                message: `❌ Script execution failed at step ${executionContext.currentStep}: ${error.message}`
            });
        }
    }

    // NEW: Validate script variables
    validateScriptVariables(script, variables) {
        if (!script.variables || script.variables.length === 0) {
            return { isValid: true };
        }

        const missingVariables = [];
        const invalidVariables = [];

        for (const scriptVar of script.variables) {
            const varName = scriptVar.name;
            const varValue = variables[varName];

            if (varValue === undefined || varValue === null) {
                missingVariables.push(varName);
            } else if (scriptVar.type === 'number' && isNaN(varValue)) {
                invalidVariables.push(`${varName} must be a number`);
            } else if (scriptVar.type === 'email' && !this.isValidEmail(varValue)) {
                invalidVariables.push(`${varName} must be a valid email`);
            }
        }

        if (missingVariables.length > 0) {
            return {
                isValid: false,
                error: `Missing required variables: ${missingVariables.join(', ')}`
            };
        }

        if (invalidVariables.length > 0) {
            return {
                isValid: false,
                error: `Invalid variables: ${invalidVariables.join(', ')}`
            };
        }

        return { isValid: true };
    }

    // NEW: Pre-execution action validation
    async validateActionPreExecution(action) {
        if (!action || !action.type) {
            return { isValid: false, error: 'Action missing or invalid type' };
        }

        switch (action.type) {
            case 'navigate':
                if (!action.url && !action.target) {
                    return { isValid: false, error: 'Navigate action missing URL' };
                }
                break;
            case 'click':
                if (!action.target && !action.searchText) {
                    return { isValid: false, error: 'Click action missing target or search text' };
                }
                break;
            case 'type':
                if (!action.text) {
                    return { isValid: false, error: 'Type action missing text' };
                }
                break;
        }

        return { isValid: true };
    }

    // NEW: Post-execution action validation
    async validateActionPostExecution(action) {
        try {
            switch (action.type) {
                case 'navigate':
                    // Verify navigation was successful
                    const currentUrl = this.page.url();
                    const expectedUrl = action.url || action.target;
                    
                    if (expectedUrl && !currentUrl.includes(expectedUrl.replace(/^https?:\/\//, ''))) {
                        return { isValid: false, error: `Navigation failed: expected ${expectedUrl}, got ${currentUrl}` };
                    }
                    break;
                    
                case 'click':
                    // Verify click had some effect (page change, element state change, etc.)
                    await this.page.waitForTimeout(500);
                    // Could add more sophisticated validation here
                    break;
            }
            
            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    // NEW: Auto-correct common action issues
    async autoCorrectAction(action, validationResult) {
        const correctedAction = { ...action };
        
        if (action.type === 'navigate') {
            // Auto-correct URL format
            if (action.url && !action.url.startsWith('http')) {
                correctedAction.url = 'https://' + action.url;
                console.log(`🔧 Auto-corrected URL: ${action.url} → ${correctedAction.url}`);
                return correctedAction;
            }
        }
        
        return null; // No auto-correction possible
    }

    // NEW: Attempt error recovery
    async attemptErrorRecovery(error, step) {
        console.log(`🔧 Attempting error recovery for: ${error.message}`);
        
        try {
            // Common recovery strategies
            if (error.message.includes('timeout') || error.message.includes('not found')) {
                console.log('🔄 Refreshing page for timeout/not found error');
                await this.page.reload({ waitUntil: 'networkidle2' });
                await this.waitForPageStability();
            } else if (error.message.includes('click')) {
                console.log('🔄 Scrolling to make elements visible');
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight / 2);
                });
                await this.page.waitForTimeout(1000);
            } else if (error.message.includes('navigation')) {
                console.log('🔄 Clearing browser cache and retrying');
                await this.page.evaluate(() => {
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                            registrations.forEach(registration => registration.unregister());
                        });
                    }
                });
            }
            
            console.log('✅ Error recovery completed');
        } catch (recoveryError) {
            console.log(`❌ Error recovery failed: ${recoveryError.message}`);
        }
    }

    // NEW: Handle step failure
    async handleStepFailure(error, step, executionContext) {
        console.log(`🤔 Handling step failure: ${error.message}`);
        
        // Determine if we should continue or abort based on error type and context
        const continuableErrors = [
            'element not found',
            'click failed',
            'timeout',
            'selector not found'
        ];
        
        const shouldContinue = continuableErrors.some(errorType => 
            error.message.toLowerCase().includes(errorType.toLowerCase())
        );
        
        if (shouldContinue) {
            console.log('⚠️ Error is continuable, proceeding with next step');
            this.broadcast({
                type: 'warning',
                message: `⚠️ Step ${executionContext.currentStep} failed but continuing: ${error.message}`
            });
        } else {
            console.log('💥 Error is critical, aborting execution');
        }
        
        return shouldContinue;
    }

    // NEW: Email validation helper
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async executeClickAction(action) {
        const selectors = action.fallbackSelectors || [action.target];
        
        console.log(`🎯 Attempting to click with ${selectors.length} selector strategies`);
        
        // Enhanced waiting strategy
        for (let i = 0; i < selectors.length; i++) {
            const selector = selectors[i];
            console.log(`🔍 Trying selector ${i + 1}/${selectors.length}: ${selector}`);
            
            try {
                // Wait for element to be available with timeout
                await this.page.waitForSelector(selector, { timeout: 5000 }).catch(() => {
                    console.log(`⏰ Selector ${selector} not found within 5 seconds`);
                });
                
                // Check if element exists and is visible
                const element = await this.page.$(selector);
                if (element) {
                    // Enhanced visibility check
                    const isVisible = await this.page.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        if (!el) return false;
                        
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        
                        return rect.width > 0 && 
                               rect.height > 0 && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden' &&
                               style.opacity !== '0' &&
                               !el.disabled &&
                               rect.top >= 0 &&
                               rect.left >= 0;
                    }, selector);
                    
                    if (isVisible) {
                        // Try multiple click strategies
                        const clickStrategies = [
                            async () => await this.page.click(selector),
                            async () => await element.click(),
                            async () => await this.page.evaluate((sel) => {
                                document.querySelector(sel).click();
                            }, selector),
                            async () => await this.page.focus(selector).then(() => this.page.keyboard.press('Enter'))
                        ];
                        
                        for (const strategy of clickStrategies) {
                            try {
                                await strategy();
                                console.log(`✅ Successfully clicked using selector: ${selector}`);
                                this.broadcast({
                                    type: 'action_executed',
                                    action: `✅ Clicked: ${selector}`
                                });
                                return;
                            } catch (clickError) {
                                console.log(`⚠️ Click strategy failed: ${clickError.message}`);
                            }
                        }
                    } else {
                        console.log(`⚠️ Element found but not visible/clickable: ${selector}`);
                    }
                } else {
                    console.log(`❌ Element not found: ${selector}`);
                }
            } catch (error) {
                console.log(`❌ Error with selector ${selector}:`, error.message);
            }
        }
        
        // Enhanced text-based search with multiple strategies
        if (action.searchText) {
            console.log(`🔍 Trying enhanced text-based search for: "${action.searchText}"`);
            
            const textSearchStrategies = [
                // Exact text match
                `*:contains("${action.searchText}")`,
                // Case-insensitive match
                `*:contains("${action.searchText.toLowerCase()}")`,
                // Partial match
                `*[textContent*="${action.searchText}" i]`,
                // Placeholder match
                `input[placeholder*="${action.searchText}" i]`,
                // Value match
                `input[value*="${action.searchText}" i]`,
                // Aria-label match
                `*[aria-label*="${action.searchText}" i]`,
                // Title match
                `*[title*="${action.searchText}" i]`
            ];
            
            for (const strategy of textSearchStrategies) {
                try {
                    const elements = await this.page.$$eval('*', (elements, searchText) => {
                        return elements
                            .filter(el => {
                                const text = (el.textContent || '').toLowerCase();
                                const placeholder = (el.placeholder || '').toLowerCase();
                                const value = (el.value || '').toLowerCase();
                                const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
                                const title = (el.title || '').toLowerCase();
                                
                                return text.includes(searchText.toLowerCase()) ||
                                       placeholder.includes(searchText.toLowerCase()) ||
                                       value.includes(searchText.toLowerCase()) ||
                                       ariaLabel.includes(searchText.toLowerCase()) ||
                                       title.includes(searchText.toLowerCase());
                            })
                            .filter(el => {
                                const rect = el.getBoundingClientRect();
                                const style = window.getComputedStyle(el);
                                return rect.width > 0 && rect.height > 0 && 
                                       style.display !== 'none' && 
                                       style.visibility !== 'hidden' &&
                                       style.opacity !== '0';
                            })
                            .map(el => ({
                                tagName: el.tagName,
                                textContent: el.textContent.trim(),
                                selector: el.id ? `#${el.id}` : 
                                         el.className ? `.${el.className.split(' ')[0]}` : 
                                         `${el.tagName.toLowerCase()}:nth-of-type(${Array.from(el.parentNode.children).indexOf(el) + 1})`
                            }));
                    }, action.searchText);
                    
                    if (elements.length > 0) {
                        const element = elements[0];
                        await this.page.click(element.selector);
                        console.log(`✅ Successfully clicked via text search: ${element.textContent}`);
                        this.broadcast({
                            type: 'action_executed',
                            action: `✅ Clicked: ${element.textContent}`
                        });
                        return;
                    }
                } catch (error) {
                    console.log(`❌ Text search strategy failed:`, error.message);
                }
            }
        }
        
        throw new Error(`Failed to click element. Tried ${selectors.length} selectors${action.searchText ? ' and enhanced text search' : ''}`);
    }

    async navigateTo(url) {
        try {
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            await this.page.goto(url);
            await this.page.waitForTimeout(1000);
            
            this.broadcast({
                type: 'navigation_completed',
                message: `✅ Navigated to: ${url}`
            });
        } catch (error) {
            console.error('Error navigating:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error navigating: ${error.message}`
            });
        }
    }

    async getPageInfo() {
        try {
            const info = await this.page.evaluate(() => ({
                title: document.title,
                url: window.location.href,
                forms: Array.from(document.forms).length,
                inputs: document.querySelectorAll('input').length,
                buttons: document.querySelectorAll('button').length
            }));

            this.broadcast({
                type: 'page_info',
                info
            });
        } catch (error) {
            console.error('Error getting page info:', error);
        }
    }

    startScreenshotStream() {
        this.screenshotInterval = setInterval(async () => {
            try {
                if (this.page && !this.page.isClosed()) {
                    const screenshot = await this.page.screenshot({
                        encoding: 'base64',
                        quality: 60,
                        type: 'jpeg'
                    });

                    this.broadcast({
                        type: 'screenshot',
                        data: screenshot,
                        url: this.page.url()
                    });
                    
                    console.log('📸 Screenshot sent, URL:', this.page.url());
                }
            } catch (error) {
                console.error('Screenshot error:', error.message);
            }
        }, 2000);
    }

    broadcast(data) {
        const message = JSON.stringify(data);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
        
        // Log non-screenshot messages for debugging
        if (data.type !== 'screenshot') {
            console.log('📡 Broadcasting:', data.type, data.message || '');
        }
    }

    async toggleManualMode() {
        this.isManualMode = !this.isManualMode;
        
        if (this.isManualMode) {
            // Entering manual mode
            console.log('👤 Entering manual control mode');
            this.lastKnownState = {
                url: this.page.url(),
                title: await this.page.title(),
                timestamp: Date.now()
            };
            
            this.broadcast({
                type: 'manual_mode_enabled',
                message: '👤 Manual control enabled. You can now interact directly with the browser.',
                state: this.lastKnownState
            });
        } else {
            // Exiting manual mode
            console.log('🤖 Exiting manual control mode');
            await this.syncBrowserState();
            
            this.broadcast({
                type: 'manual_mode_disabled',
                message: '🤖 Manual control disabled. Automation system resumed.',
                changes: this.lastKnownState
            });
        }
    }

    async pauseAutomation() {
        this.automationPaused = true;
        console.log('⏸️ Automation paused');
        
        this.broadcast({
            type: 'automation_paused',
            message: '⏸️ Automation paused. Browser is now under manual control.'
        });
    }

    async resumeAutomation() {
        this.automationPaused = false;
        await this.syncBrowserState();
        console.log('▶️ Automation resumed');
        
        this.broadcast({
            type: 'automation_resumed',
            message: '▶️ Automation resumed. System synchronized with browser state.'
        });
    }

    async syncBrowserState() {
        try {
            const currentState = {
                url: this.page.url(),
                title: await this.page.title(),
                timestamp: Date.now()
            };

            // Detect changes made during manual control
            const changes = [];
            if (this.lastKnownState) {
                if (currentState.url !== this.lastKnownState.url) {
                    changes.push(`URL changed: ${this.lastKnownState.url} → ${currentState.url}`);
                }
                if (currentState.title !== this.lastKnownState.title) {
                    changes.push(`Page title changed: ${this.lastKnownState.title} → ${currentState.title}`);
                }
            }

            console.log('🔄 Browser state synchronized:', currentState);
            if (changes.length > 0) {
                console.log('📝 Manual changes detected:', changes);
            }

            this.lastKnownState = currentState;

            this.broadcast({
                type: 'browser_state_synced',
                message: changes.length > 0 
                    ? `🔄 State synchronized. Changes detected: ${changes.join(', ')}`
                    : '🔄 Browser state synchronized.',
                state: currentState,
                changes
            });

            return currentState;
        } catch (error) {
            console.error('Error syncing browser state:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error syncing browser state: ${error.message}`
            });
        }
    }

    async getScriptVariables(scriptName) {
        try {
            const script = this.savedScripts.get(scriptName);
            if (!script) {
                this.broadcast({
                    type: 'error',
                    message: `❌ Script "${scriptName}" not found`
                });
                return;
            }

            console.log(`📋 Getting variables for script: "${scriptName}"`);
            console.log(`🔧 Script variables:`, script.variables);

            this.broadcast({
                type: 'script_variables',
                scriptName,
                variables: script.variables || []
            });

        } catch (error) {
            console.error('Error getting script variables:', error);
            this.broadcast({
                type: 'error',
                message: `❌ Error getting script variables: ${error.message}`
            });
        }
    }

    async executeAction(action) {
        console.log(`🎬 Executing action:`, action);
        
        // Enhanced retry mechanism
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxRetries} for action: ${action.type}`);
                
                switch (action.type) {
                    case 'navigate':
                        await this.executeNavigateAction(action);
                        break;
                    case 'click':
                        await this.executeClickAction(action);
                        break;
                    case 'type':
                        await this.executeTypeAction(action);
                        break;
                    case 'wait':
                        await this.page.waitForTimeout(action.duration || 2000);
                        break;
                    case 'screenshot':
                        await this.takeScreenshot();
                        break;
                    default:
                        throw new Error(`Unknown action type: ${action.type}`);
                }
                
                // Success - break out of retry loop
                console.log(`✅ Action completed successfully on attempt ${attempt}`);
                break;
                
            } catch (error) {
                console.log(`❌ Action failed on attempt ${attempt}:`, error.message);
                
                if (attempt === maxRetries) {
                    // Final attempt failed
                    console.error(`💥 Action failed after ${maxRetries} attempts:`, error);
                    this.broadcast({
                        type: 'error',
                        message: `❌ Action failed: ${error.message}`
                    });
                    throw error;
                } else {
                    // Wait before retry
                    console.log(`⏳ Waiting 2 seconds before retry...`);
                    await this.page.waitForTimeout(2000);
                    
                    // Take screenshot for debugging
                    await this.takeScreenshot();
                }
            }
        }
        
        // Enhanced post-action wait with page stability check
        await this.waitForPageStability();
        
        this.broadcast({
            type: 'action_executed',
            action: `✅ ${action.type} action completed`
        });
    }

    // NEW: Wait for page stability to ensure actions complete
    async waitForPageStability() {
        console.log('⏳ Waiting for page stability...');
        
        try {
            // Wait for network to be idle
            await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
                console.log('⚠️ Network idle timeout - continuing anyway');
            });
            
            // Wait for DOM to be stable
            await this.page.waitForFunction(() => {
                return document.readyState === 'complete';
            }, { timeout: 5000 }).catch(() => {
                console.log('⚠️ DOM ready timeout - continuing anyway');
            });
            
            // Additional wait for dynamic content
            await this.page.waitForTimeout(1000);
            
            console.log('✅ Page stability achieved');
        } catch (error) {
            console.log('⚠️ Page stability check failed:', error.message);
        }
    }

    async executeNavigateAction(action) {
        let url = action.url || action.target;
        
        // Enhanced URL validation and correction
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        console.log(`🎯 Attempting navigation to: ${url}`);
        
        try {
            // Enhanced navigation with multiple strategies
            const navigationStrategies = [
                // Strategy 1: Standard navigation
                async () => await this.page.goto(url, { 
                    waitUntil: 'networkidle2', 
                    timeout: 30000 
                }),
                // Strategy 2: Navigation with DOM content loaded
                async () => await this.page.goto(url, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 20000 
                }),
                // Strategy 3: Basic navigation
                async () => await this.page.goto(url, { 
                    waitUntil: 'load', 
                    timeout: 15000 
                })
            ];
            
            let navigationSuccess = false;
            for (const strategy of navigationStrategies) {
                try {
                    const response = await strategy();
                    if (response && response.ok()) {
                        navigationSuccess = true;
                        console.log(`✅ Navigation successful: ${response.status()} - ${this.page.url()}`);
                        break;
                    }
                } catch (navError) {
                    console.log(`⚠️ Navigation strategy failed: ${navError.message}`);
                }
            }
            
            if (!navigationSuccess) {
                throw new Error('All navigation strategies failed');
            }
            
            // Verify we're on the expected page
            const currentUrl = this.page.url();
            const expectedDomain = new URL(url).hostname;
            const currentDomain = new URL(currentUrl).hostname;
            
            if (!currentDomain.includes(expectedDomain.replace('www.', ''))) {
                console.log(`⚠️ Navigation may have redirected: expected ${expectedDomain}, got ${currentDomain}`);
            }
            
            // Enhanced post-navigation wait
            await this.waitForPageStability();
            
        } catch (error) {
            console.error('❌ Navigation failed:', error);
            throw new Error(`Navigation failed: ${error.message}`);
        }
    }

    async executeTypeAction(action) {
        if (action.target) {
            await this.page.click(action.target);
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('KeyA');
            await this.page.keyboard.up('Control');
            await this.page.type(action.target, action.text);
        } else {
            await this.page.keyboard.type(action.text);
        }
        this.broadcast({
            type: 'action_executed',
            action: `✅ Typed: "${action.text}"`
        });
    }

    async takeScreenshot() {
        try {
            const screenshot = await this.page.screenshot({
                encoding: 'base64',
                quality: 60,
                type: 'jpeg'
            });
            this.broadcast({
                type: 'screenshot',
                data: screenshot,
                url: this.page.url()
            });
            console.log('📸 Screenshot taken and broadcast');
        } catch (error) {
            console.error('Error taking screenshot:', error.message);
        }
    }

    async shutdown() {
        console.log('🛑 Shutting down system...');
        
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
        }
        if (this.browser) {
            await this.browser.close();
        }
        if (this.server) {
            this.server.close();
        }
    }
}

// Initialize the system
const system = new IntelligentBrowserAutomation();
system.initialize().catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
    await system.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await system.shutdown();
    process.exit(0);
});

// Export for use as module
module.exports = { IntelligentBrowserAutomation }; 
module.exports = { IntelligentBrowserAutomation }; 
module.exports = { IntelligentBrowserAutomation }; 
