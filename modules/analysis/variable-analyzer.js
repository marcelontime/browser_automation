const { Variable, VariableTypes } = require('../storage/models');
const { v4: uuidv4 } = require('uuid');

/**
 * 🔍 VARIABLE ANALYZER
 * 
 * Intelligent analysis engine that processes recorded browser actions
 * to automatically detect and extract variables with AI-powered pattern recognition
 */
class VariableAnalyzer {
    constructor(options = {}) {
        this.options = {
            confidenceThreshold: options.confidenceThreshold || 0.7,
            enableAdvancedPatterns: options.enableAdvancedPatterns !== false,
            sensitiveDataDetection: options.sensitiveDataDetection !== false,
            enableAISuggestions: options.enableAISuggestions !== false,
            aiApiKey: options.aiApiKey || process.env.OPENAI_API_KEY,
            enableDataTypeDetection: options.enableDataTypeDetection !== false,
            enableVariablePreview: options.enableVariablePreview !== false,
            ...options
        };
        
        // Pattern definitions for different variable types
        this.patterns = this.initializePatterns();
        
        // Context keywords for better variable naming
        this.contextKeywords = this.initializeContextKeywords();
        
        // Statistics for pattern learning
        this.patternStats = new Map();
        
        // AI-powered analysis components
        this.aiAnalyzer = new AIVariableAnalyzer(this.options);
        this.dataTypeDetector = new AdvancedDataTypeDetector();
        this.variablePreviewGenerator = new VariablePreviewGenerator();
        
        // Advanced pattern recognition
        this.advancedPatterns = this.initializeAdvancedPatterns();
        this.contextualAnalyzer = new ContextualAnalyzer();
    }

    /**
     * Initialize pattern recognition rules
     */
    initializePatterns() {
        return {
            [VariableTypes.EMAIL]: {
                regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                confidence: 0.95,
                examples: ['user@example.com', 'test.email+tag@domain.co.uk'],
                validation: {
                    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                }
            },
            
            [VariableTypes.PHONE]: {
                regex: /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/,
                confidence: 0.85,
                examples: ['+1 (555) 123-4567', '555-123-4567', '+44 20 7946 0958'],
                validation: {
                    pattern: '^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$'
                }
            },
            
            [VariableTypes.DATE]: {
                regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})$/,
                confidence: 0.90,
                examples: ['12/25/2024', '2024-12-25', '25.12.2024'],
                validation: {
                    pattern: '^(\\d{1,2}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{2,4})|(\\d{4}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{1,2})$'
                }
            },
            
            [VariableTypes.URL]: {
                regex: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
                confidence: 0.95,
                examples: ['https://example.com', 'http://www.site.org/path'],
                validation: {
                    pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$'
                }
            },
            
            [VariableTypes.NUMBER]: {
                regex: /^-?\d+(\.\d+)?$/,
                confidence: 0.80,
                examples: ['123', '45.67', '-89.12'],
                validation: {
                    pattern: '^-?\\d+(\\.\\d+)?$'
                }
            },
            
            [VariableTypes.CURRENCY]: {
                regex: /^[\$\€\£\¥]?\s*\d{1,3}(,\d{3})*(\.\d{2})?$/,
                confidence: 0.85,
                examples: ['$1,234.56', '€999.99', '£50.00'],
                validation: {
                    pattern: '^[\\$\\€\\£\\¥]?\\s*\\d{1,3}(,\\d{3})*(\\.\\d{2})?$'
                }
            },
            
            [VariableTypes.NAME]: {
                regex: /^[A-Z][a-z]+ [A-Z][a-z]+( [A-Z][a-z]+)*$/,
                confidence: 0.75,
                examples: ['John Smith', 'Mary Jane Watson', 'José María García'],
                validation: {
                    minLength: 2,
                    maxLength: 100
                }
            },
            
            [VariableTypes.SENSITIVE]: {
                regex: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$|^\d{4}-?\d{4}-?\d{4}-?\d{4}$|^\d{3}-?\d{2}-?\d{4}$/,
                confidence: 0.90,
                examples: ['Password123!', '1234-5678-9012-3456', '123-45-6789'],
                validation: {
                    minLength: 8
                }
            }
        };
    }

    /**
     * Initialize context keywords for better variable naming
     */
    initializeContextKeywords() {
        return {
            email: ['email', 'e-mail', 'mail', 'address', 'contact'],
            name: ['name', 'nome', 'first', 'last', 'full', 'usuario', 'user'],
            phone: ['phone', 'tel', 'telefone', 'mobile', 'cell', 'number'],
            date: ['date', 'data', 'birth', 'nascimento', 'when', 'time'],
            url: ['url', 'link', 'site', 'website', 'address'],
            number: ['number', 'num', 'quantity', 'amount', 'count'],
            currency: ['price', 'cost', 'value', 'amount', 'money', 'currency'],
            password: ['password', 'senha', 'pass', 'pwd', 'secret'],
            text: ['text', 'description', 'comment', 'note', 'message']
        };
    }

    /**
     * Main method to analyze recorded actions and extract variables
     */
    async analyzeRecording(actions) {
        console.log(`🔍 Analyzing ${actions.length} recorded actions for variables...`);
        
        const variableCandidates = [];
        const processedValues = new Set(); // Avoid duplicate variables
        
        for (const action of actions) {
            if (action.type === 'type' && action.value && action.value.trim()) {
                const candidates = await this.analyzeInputValue(action);
                
                // Filter out duplicates and low-confidence candidates
                for (const candidate of candidates) {
                    const valueKey = `${candidate.value}_${candidate.type}`;
                    if (!processedValues.has(valueKey) && 
                        candidate.confidence >= this.options.confidenceThreshold) {
                        
                        processedValues.add(valueKey);
                        variableCandidates.push(candidate);
                    }
                }
            }
        }
        
        // Sort by confidence score (highest first)
        variableCandidates.sort((a, b) => b.confidence - a.confidence);
        
        console.log(`✅ Found ${variableCandidates.length} variable candidates`);
        return variableCandidates;
    }

    /**
     * Analyze a single input value to determine variable type and properties
     */
    async analyzeInputValue(action) {
        const { value, element } = action;
        const candidates = [];
        
        // Get element context for better analysis
        const context = this.extractElementContext(element);
        
        // Test against all patterns
        for (const [type, pattern] of Object.entries(this.patterns)) {
            const match = this.testPattern(value, pattern, context);
            
            if (match.matches) {
                const candidate = await this.createVariableCandidate(
                    value, 
                    type, 
                    element, 
                    context, 
                    match.confidence
                );
                candidates.push(candidate);
            }
        }
        
        // If no specific pattern matches, create a generic text variable
        if (candidates.length === 0) {
            const candidate = await this.createVariableCandidate(
                value,
                VariableTypes.TEXT,
                element,
                context,
                0.5
            );
            candidates.push(candidate);
        }
        
        return candidates;
    }

    /**
     * Test a value against a specific pattern
     */
    testPattern(value, pattern, context) {
        let confidence = 0;
        let matches = false;
        
        // Test regex pattern
        if (pattern.regex && pattern.regex.test(value)) {
            matches = true;
            confidence = pattern.confidence;
            
            // Boost confidence based on context
            confidence = this.adjustConfidenceByContext(confidence, pattern, context);
        }
        
        return { matches, confidence };
    }

    /**
     * Adjust confidence score based on element context
     */
    adjustConfidenceByContext(baseConfidence, pattern, context) {
        let adjustedConfidence = baseConfidence;
        
        // Check if element context matches variable type
        const contextText = [
            context.label,
            context.placeholder,
            context.fieldType,
            context.name,
            context.id
        ].join(' ').toLowerCase();
        
        // Find matching context keywords
        for (const [type, keywords] of Object.entries(this.contextKeywords)) {
            const keywordMatches = keywords.some(keyword => 
                contextText.includes(keyword.toLowerCase())
            );
            
            if (keywordMatches) {
                // If context matches the pattern type, boost confidence
                if (this.patterns[type] === pattern) {
                    adjustedConfidence = Math.min(0.98, adjustedConfidence + 0.15);
                } else {
                    // If context suggests different type, reduce confidence
                    adjustedConfidence = Math.max(0.3, adjustedConfidence - 0.1);
                }
                break;
            }
        }
        
        return adjustedConfidence;
    }

    /**
     * Extract context information from DOM element
     */
    extractElementContext(element) {
        if (!element) return {};
        
        return {
            label: element.label || '',
            placeholder: element.placeholder || '',
            fieldType: element.type || '',
            name: element.name || '',
            id: element.id || '',
            className: element.className || '',
            parentForm: element.parentForm || '',
            siblingElements: element.siblingElements || []
        };
    }

    /**
     * Create a variable candidate object
     */
    async createVariableCandidate(value, type, element, context, confidence) {
        const variableName = this.generateVariableName(type, context);
        const examples = this.generateExamples(type, value);
        const validation = this.generateValidationRules(type, value);
        
        return {
            id: uuidv4(),
            name: variableName,
            type: type,
            value: value,
            confidence: confidence,
            element: element,
            context: context,
            examples: examples,
            validation: validation,
            sensitive: this.isSensitiveData(type, value, context),
            description: this.generateDescription(type, context)
        };
    }

    /**
     * Generate appropriate variable name based on type and context
     */
    generateVariableName(type, context) {
        // Try to use element context for naming
        if (context.label) {
            return this.sanitizeVariableName(context.label);
        }
        
        if (context.placeholder) {
            return this.sanitizeVariableName(context.placeholder);
        }
        
        if (context.name) {
            return this.sanitizeVariableName(context.name);
        }
        
        // Fallback to type-based naming
        const typeNames = {
            [VariableTypes.EMAIL]: 'email',
            [VariableTypes.NAME]: 'name',
            [VariableTypes.PHONE]: 'phone',
            [VariableTypes.DATE]: 'date',
            [VariableTypes.URL]: 'url',
            [VariableTypes.NUMBER]: 'number',
            [VariableTypes.CURRENCY]: 'amount',
            [VariableTypes.TEXT]: 'text',
            [VariableTypes.SENSITIVE]: 'password'
        };
        
        return typeNames[type] || 'variable';
    }

    /**
     * Sanitize variable name to be code-friendly
     */
    sanitizeVariableName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 50) || 'variable';
    }

    /**
     * Generate example values for a variable type
     */
    generateExamples(type, currentValue) {
        const pattern = this.patterns[type];
        if (pattern && pattern.examples) {
            // Include current value and pattern examples
            return [currentValue, ...pattern.examples.slice(0, 2)];
        }
        
        return [currentValue];
    }

    /**
     * Generate validation rules for a variable type
     */
    generateValidationRules(type, value) {
        const pattern = this.patterns[type];
        if (pattern && pattern.validation) {
            return { ...pattern.validation };
        }
        
        // Generate basic validation based on current value
        const validation = {};
        
        if (typeof value === 'string') {
            validation.minLength = Math.max(1, value.length - 10);
            validation.maxLength = value.length + 50;
        }
        
        return validation;
    }

    /**
     * Check if data should be marked as sensitive
     */
    isSensitiveData(type, value, context) {
        if (type === VariableTypes.SENSITIVE) {
            return true;
        }
        
        // Check context for sensitive keywords
        const sensitiveKeywords = ['password', 'senha', 'secret', 'token', 'key', 'ssn', 'social'];
        const contextText = [
            context.label,
            context.placeholder,
            context.name,
            context.id
        ].join(' ').toLowerCase();
        
        return sensitiveKeywords.some(keyword => contextText.includes(keyword));
    }

    /**
     * Generate human-readable description for variable
     */
    generateDescription(type, context) {
        if (context.label) {
            return `${context.label} field`;
        }
        
        const descriptions = {
            [VariableTypes.EMAIL]: 'Email address',
            [VariableTypes.NAME]: 'Full name',
            [VariableTypes.PHONE]: 'Phone number',
            [VariableTypes.DATE]: 'Date value',
            [VariableTypes.URL]: 'Website URL',
            [VariableTypes.NUMBER]: 'Numeric value',
            [VariableTypes.CURRENCY]: 'Currency amount',
            [VariableTypes.TEXT]: 'Text input',
            [VariableTypes.SENSITIVE]: 'Sensitive data'
        };
        
        return descriptions[type] || 'User input';
    }

    /**
     * Get pattern statistics for learning and improvement
     */
    getPatternStats() {
        return {
            totalAnalyzed: Array.from(this.patternStats.values()).reduce((sum, stat) => sum + stat.count, 0),
            patternBreakdown: Object.fromEntries(this.patternStats),
            averageConfidence: this.calculateAverageConfidence()
        };
    }

    /**
     * Calculate average confidence across all patterns
     */
    calculateAverageConfidence() {
        const stats = Array.from(this.patternStats.values());
        if (stats.length === 0) return 0;
        
        const totalConfidence = stats.reduce((sum, stat) => sum + stat.totalConfidence, 0);
        const totalCount = stats.reduce((sum, stat) => sum + stat.count, 0);
        
        return totalCount > 0 ? totalConfidence / totalCount : 0;
    }

    /**
     * Update pattern statistics for learning
     */
    updatePatternStats(type, confidence) {
        if (!this.patternStats.has(type)) {
            this.patternStats.set(type, { count: 0, totalConfidence: 0 });
        }
        
        const stats = this.patternStats.get(type);
        stats.count++;
        stats.totalConfidence += confidence;
    }

    /**
     * 🤖 AI-POWERED VARIABLE ANALYSIS
     * Enhanced analysis with AI suggestions and advanced pattern recognition
     */
    async analyzeWithAI(actions) {
        console.log(`🤖 Starting AI-powered variable analysis for ${actions.length} actions...`);
        
        const variableCandidates = [];
        const processedValues = new Set();
        
        for (const action of actions) {
            if (action.type === 'type' && action.value && action.value.trim()) {
                // Standard pattern analysis
                const standardCandidates = await this.analyzeInputValue(action);
                
                // AI-powered analysis
                let aiCandidates = [];
                if (this.options.enableAISuggestions) {
                    aiCandidates = await this.aiAnalyzer.analyzeWithAI(action);
                }
                
                // Advanced data type detection
                let advancedCandidates = [];
                if (this.options.enableDataTypeDetection) {
                    advancedCandidates = await this.dataTypeDetector.detectAdvancedTypes(action);
                }
                
                // Merge and deduplicate candidates
                const allCandidates = [...standardCandidates, ...aiCandidates, ...advancedCandidates];
                const mergedCandidates = this.mergeCandidates(allCandidates);
                
                // Filter and add to results
                for (const candidate of mergedCandidates) {
                    const valueKey = `${candidate.value}_${candidate.type}`;
                    if (!processedValues.has(valueKey) && 
                        candidate.confidence >= this.options.confidenceThreshold) {
                        
                        processedValues.add(valueKey);
                        
                        // Generate preview if enabled
                        if (this.options.enableVariablePreview) {
                            candidate.preview = await this.variablePreviewGenerator.generatePreview(candidate);
                        }
                        
                        variableCandidates.push(candidate);
                    }
                }
            }
        }
        
        // Sort by confidence and AI score
        variableCandidates.sort((a, b) => {
            const scoreA = (a.confidence * 0.7) + ((a.aiScore || 0) * 0.3);
            const scoreB = (b.confidence * 0.7) + ((b.aiScore || 0) * 0.3);
            return scoreB - scoreA;
        });
        
        console.log(`✅ AI analysis complete. Found ${variableCandidates.length} enhanced variable candidates`);
        return variableCandidates;
    }

    /**
     * Initialize advanced pattern recognition
     */
    initializeAdvancedPatterns() {
        return {
            // Complex date patterns
            DATE_ADVANCED: {
                patterns: [
                    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i,
                    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i,
                    /^\d{1,2}(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i,
                    /^(Today|Tomorrow|Yesterday)$/i,
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
                ],
                confidence: 0.9,
                type: VariableTypes.DATE
            },
            
            // International phone numbers
            PHONE_INTERNATIONAL: {
                patterns: [
                    /^\+\d{1,3}\s?\(\d{1,4}\)\s?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{1,9}$/,
                    /^\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{1,9}$/,
                    /^00\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,9}$/
                ],
                confidence: 0.88,
                type: VariableTypes.PHONE
            },
            
            // Advanced email patterns
            EMAIL_ADVANCED: {
                patterns: [
                    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
                    /^.+@.+\..+$/
                ],
                confidence: 0.95,
                type: VariableTypes.EMAIL
            },
            
            // Credit card numbers
            CREDIT_CARD: {
                patterns: [
                    /^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/,
                    /^\d{4}[-\s]?\d{6}[-\s]?\d{5}$/,
                    /^\d{4}[-\s]?\d{6}[-\s]?\d{4}$/
                ],
                confidence: 0.92,
                type: VariableTypes.SENSITIVE
            },
            
            // Social Security Numbers
            SSN: {
                patterns: [
                    /^\d{3}-\d{2}-\d{4}$/,
                    /^\d{9}$/
                ],
                confidence: 0.95,
                type: VariableTypes.SENSITIVE
            },
            
            // Complex currency patterns
            CURRENCY_ADVANCED: {
                patterns: [
                    /^[A-Z]{3}\s?\d{1,3}(,\d{3})*(\.\d{2})?$/,
                    /^\d{1,3}(,\d{3})*(\.\d{2})?\s?[A-Z]{3}$/,
                    /^[\$\€\£\¥\₹\₽\₩\₪]\s?\d{1,3}(,\d{3})*(\.\d{2})?$/
                ],
                confidence: 0.87,
                type: VariableTypes.CURRENCY
            },
            
            // IP Addresses
            IP_ADDRESS: {
                patterns: [
                    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
                ],
                confidence: 0.93,
                type: 'IP_ADDRESS'
            },
            
            // Geographic coordinates
            COORDINATES: {
                patterns: [
                    /^-?\d{1,3}\.\d+,\s?-?\d{1,3}\.\d+$/,
                    /^\d{1,2}°\d{1,2}'\d{1,2}"\s?[NS],\s?\d{1,3}°\d{1,2}'\d{1,2}"\s?[EW]$/
                ],
                confidence: 0.85,
                type: 'COORDINATES'
            }
        };
    }

    /**
     * Merge candidate variables from different analysis methods
     */
    mergeCandidates(candidates) {
        const merged = new Map();
        
        for (const candidate of candidates) {
            const key = `${candidate.value}_${candidate.type}`;
            
            if (merged.has(key)) {
                const existing = merged.get(key);
                // Merge with higher confidence and additional metadata
                existing.confidence = Math.max(existing.confidence, candidate.confidence);
                existing.aiScore = Math.max(existing.aiScore || 0, candidate.aiScore || 0);
                existing.sources = [...(existing.sources || []), ...(candidate.sources || [])];
                existing.metadata = { ...existing.metadata, ...candidate.metadata };
            } else {
                merged.set(key, { ...candidate, sources: candidate.sources || ['pattern'] });
            }
        }
        
        return Array.from(merged.values());
    }
}

/**
 * 🤖 AI VARIABLE ANALYZER
 * Uses OpenAI API for intelligent variable analysis and suggestions
 */
class AIVariableAnalyzer {
    constructor(options = {}) {
        this.options = options;
        this.apiKey = options.aiApiKey;
        this.enabled = this.apiKey && options.enableAISuggestions;
    }

    async analyzeWithAI(action) {
        if (!this.enabled) return [];

        try {
            const prompt = this.buildAnalysisPrompt(action);
            const response = await this.callOpenAI(prompt);
            return this.parseAIResponse(response, action);
        } catch (error) {
            console.warn('⚠️ AI analysis failed:', error.message);
            return [];
        }
    }

    buildAnalysisPrompt(action) {
        const { value, element } = action;
        const context = element ? {
            label: element.label || '',
            placeholder: element.placeholder || '',
            name: element.name || '',
            type: element.type || '',
            id: element.id || ''
        } : {};

        return `Analyze this user input for variable extraction:

Value: "${value}"
Element Context:
- Label: "${context.label}"
- Placeholder: "${context.placeholder}"
- Name: "${context.name}"
- Type: "${context.type}"
- ID: "${context.id}"

Please provide:
1. Variable type (email, name, phone, date, url, number, currency, text, sensitive)
2. Confidence score (0-1)
3. Suggested variable name
4. Data validation rules
5. Whether this appears to be sensitive data
6. Business context (authentication, registration, ecommerce, etc.)

Respond in JSON format:
{
  "type": "variable_type",
  "confidence": 0.85,
  "variableName": "suggested_name",
  "validation": {"minLength": 5, "pattern": "regex"},
  "sensitive": false,
  "businessContext": "context",
  "reasoning": "explanation"
}`;
    }

    async callOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at analyzing user input data for automation variable extraction. Provide accurate, structured analysis.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    parseAIResponse(response, action) {
        try {
            const analysis = JSON.parse(response);
            
            return [{
                id: require('uuid').v4(),
                name: analysis.variableName || 'ai_variable',
                type: analysis.type || VariableTypes.TEXT,
                value: action.value,
                confidence: analysis.confidence || 0.5,
                aiScore: analysis.confidence || 0.5,
                element: action.element,
                validation: analysis.validation || {},
                sensitive: analysis.sensitive || false,
                businessContext: analysis.businessContext || 'general',
                reasoning: analysis.reasoning || '',
                sources: ['ai'],
                metadata: {
                    aiGenerated: true,
                    aiModel: 'gpt-3.5-turbo',
                    timestamp: Date.now()
                }
            }];
        } catch (error) {
            console.warn('⚠️ Failed to parse AI response:', error.message);
            return [];
        }
    }
}

/**
 * 🔬 ADVANCED DATA TYPE DETECTOR
 * Detects complex data types using advanced pattern matching
 */
class AdvancedDataTypeDetector {
    constructor() {
        this.complexPatterns = this.initializeComplexPatterns();
    }

    initializeComplexPatterns() {
        return {
            // Time patterns
            TIME: {
                patterns: [
                    /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\s?(AM|PM))?$/i,
                    /^([01]?[0-9]|2[0-3])\.[0-5][0-9](\.[0-5][0-9])?$/
                ],
                confidence: 0.9
            },
            
            // Color codes
            COLOR: {
                patterns: [
                    /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
                    /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
                    /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[01]?\.?\d*\s*\)$/
                ],
                confidence: 0.95
            },
            
            // File paths
            FILE_PATH: {
                patterns: [
                    /^[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*$/,
                    /^\/(?:[^\/\0]+\/)*[^\/\0]*$/,
                    /^\.{1,2}\/(?:[^\/\0]+\/)*[^\/\0]*$/
                ],
                confidence: 0.85
            },
            
            // Version numbers
            VERSION: {
                patterns: [
                    /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/,
                    /^v\d+\.\d+(\.\d+)?(-[a-zA-Z0-9]+)?$/
                ],
                confidence: 0.88
            },
            
            // UUIDs
            UUID: {
                patterns: [
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                ],
                confidence: 0.98
            }
        };
    }

    async detectAdvancedTypes(action) {
        const candidates = [];
        const { value } = action;

        for (const [type, config] of Object.entries(this.complexPatterns)) {
            for (const pattern of config.patterns) {
                if (pattern.test(value)) {
                    candidates.push({
                        id: require('uuid').v4(),
                        name: this.generateNameForType(type, action.element),
                        type: type,
                        value: value,
                        confidence: config.confidence,
                        element: action.element,
                        sources: ['advanced-pattern'],
                        metadata: {
                            patternType: 'advanced',
                            detectedPattern: pattern.toString()
                        }
                    });
                }
            }
        }

        return candidates;
    }

    generateNameForType(type, element) {
        const typeNames = {
            TIME: 'time',
            COLOR: 'color',
            FILE_PATH: 'file_path',
            VERSION: 'version',
            UUID: 'uuid'
        };

        const baseName = typeNames[type] || type.toLowerCase();
        
        if (element && element.name) {
            return `${element.name}_${baseName}`;
        }
        
        return baseName;
    }
}

/**
 * 👁️ VARIABLE PREVIEW GENERATOR
 * Generates preview information for variables
 */
class VariablePreviewGenerator {
    async generatePreview(candidate) {
        return {
            currentValue: candidate.value,
            exampleValues: this.generateExampleValues(candidate),
            validationPreview: this.generateValidationPreview(candidate),
            usageHints: this.generateUsageHints(candidate),
            confidenceIndicator: this.generateConfidenceIndicator(candidate.confidence)
        };
    }

    generateExampleValues(candidate) {
        const examples = [];
        
        switch (candidate.type) {
            case VariableTypes.EMAIL:
                examples.push('user@example.com', 'test.email@domain.org');
                break;
            case VariableTypes.PHONE:
                examples.push('+1 (555) 123-4567', '555-987-6543');
                break;
            case VariableTypes.DATE:
                examples.push('2024-12-25', '12/25/2024');
                break;
            case VariableTypes.NAME:
                examples.push('John Smith', 'Maria Garcia');
                break;
            default:
                examples.push('Example value 1', 'Example value 2');
        }
        
        return examples;
    }

    generateValidationPreview(candidate) {
        const validation = candidate.validation || {};
        const preview = [];
        
        if (validation.pattern) {
            preview.push(`Must match pattern: ${validation.pattern}`);
        }
        if (validation.minLength) {
            preview.push(`Minimum length: ${validation.minLength}`);
        }
        if (validation.maxLength) {
            preview.push(`Maximum length: ${validation.maxLength}`);
        }
        
        return preview;
    }

    generateUsageHints(candidate) {
        const hints = [];
        
        if (candidate.sensitive) {
            hints.push('🔒 This appears to be sensitive data');
        }
        if (candidate.aiScore > 0.8) {
            hints.push('🤖 AI-recommended with high confidence');
        }
        if (candidate.businessContext) {
            hints.push(`📋 Context: ${candidate.businessContext}`);
        }
        
        return hints;
    }

    generateConfidenceIndicator(confidence) {
        if (confidence >= 0.9) return { level: 'high', color: 'green', text: 'High confidence' };
        if (confidence >= 0.7) return { level: 'medium', color: 'yellow', text: 'Medium confidence' };
        return { level: 'low', color: 'red', text: 'Low confidence' };
    }
}

/**
 * 🧠 CONTEXTUAL ANALYZER
 * Analyzes element context for better variable detection
 */
class ContextualAnalyzer {
    analyzeContext(element, surroundingElements = []) {
        const context = {
            formContext: this.analyzeFormContext(element),
            pageContext: this.analyzePageContext(),
            elementContext: this.analyzeElementContext(element),
            surroundingContext: this.analyzeSurroundingElements(surroundingElements)
        };
        
        return context;
    }

    analyzeFormContext(element) {
        if (!element || !element.form) return null;
        
        return {
            formName: element.form.name || element.form.id || '',
            formAction: element.form.action || '',
            formMethod: element.form.method || 'GET',
            fieldPosition: Array.from(element.form.elements).indexOf(element) + 1,
            totalFields: element.form.elements.length,
            formPurpose: this.inferFormPurpose(element.form)
        };
    }

    analyzePageContext() {
        if (typeof window === 'undefined') return null;
        
        return {
            title: document.title || '',
            url: window.location.href || '',
            domain: window.location.hostname || '',
            pagePurpose: this.inferPagePurpose()
        };
    }

    analyzeElementContext(element) {
        if (!element) return null;
        
        return {
            hasLabel: !!(element.label || element.labels?.length),
            hasPlaceholder: !!element.placeholder,
            isRequired: element.required || false,
            isDisabled: element.disabled || false,
            hasValidation: !!(element.pattern || element.min || element.max),
            inputType: element.type || 'text'
        };
    }

    analyzeSurroundingElements(elements) {
        return elements.map(el => ({
            tagName: el.tagName,
            textContent: el.textContent?.substring(0, 50) || '',
            distance: el.distance || 0
        }));
    }

    inferFormPurpose(form) {
        const formText = (form.name + ' ' + form.id + ' ' + form.action).toLowerCase();
        
        if (/login|signin|auth/.test(formText)) return 'authentication';
        if (/register|signup|create/.test(formText)) return 'registration';
        if (/contact|support/.test(formText)) return 'contact';
        if (/checkout|payment|billing/.test(formText)) return 'ecommerce';
        if (/search/.test(formText)) return 'search';
        
        return 'general';
    }

    inferPagePurpose() {
        if (typeof document === 'undefined') return 'unknown';
        
        const pageText = (document.title + ' ' + window.location.href).toLowerCase();
        
        if (/login|signin|auth/.test(pageText)) return 'authentication';
        if (/register|signup|create/.test(pageText)) return 'registration';
        if (/profile|account|settings/.test(pageText)) return 'user-management';
        if (/checkout|cart|payment/.test(pageText)) return 'ecommerce';
        if (/contact|support|help/.test(pageText)) return 'customer-service';
        
        return 'general';
    }
}

module.exports = VariableAnalyzer;