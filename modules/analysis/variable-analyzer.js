const { Variable, VariableTypes } = require('../storage/models');
const { v4: uuidv4 } = require('uuid');

/**
 * 🔍 VARIABLE ANALYZER
 * 
 * Intelligent analysis engine that processes recorded browser actions
 * to automatically detect and extract variables with pattern recognition
 */
class VariableAnalyzer {
    constructor(options = {}) {
        this.options = {
            confidenceThreshold: options.confidenceThreshold || 0.7,
            enableAdvancedPatterns: options.enableAdvancedPatterns !== false,
            sensitiveDataDetection: options.sensitiveDataDetection !== false,
            ...options
        };
        
        // Pattern definitions for different variable types
        this.patterns = this.initializePatterns();
        
        // Context keywords for better variable naming
        this.contextKeywords = this.initializeContextKeywords();
        
        // Statistics for pattern learning
        this.patternStats = new Map();
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
}

module.exports = VariableAnalyzer;