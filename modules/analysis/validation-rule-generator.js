const { VariableTypes } = require('../storage/models');

/**
 * ✅ VALIDATION RULE GENERATOR
 * 
 * Automatically generates appropriate validation rules based on variable types,
 * detected patterns, and element context to ensure data quality and user guidance
 */
class ValidationRuleGenerator {
    constructor(options = {}) {
        this.options = {
            strictValidation: options.strictValidation !== false,
            enableCustomPatterns: options.enableCustomPatterns !== false,
            supportMultipleLanguages: options.supportMultipleLanguages !== false,
            ...options
        };
        
        // Predefined validation templates
        this.validationTemplates = this.initializeValidationTemplates();
        
        // Pattern libraries for different data types
        this.patternLibrary = this.initializePatternLibrary();
        
        // Localized error messages
        this.errorMessages = this.initializeErrorMessages();
    }

    /**
     * Initialize validation templates for different variable types
     */
    initializeValidationTemplates() {
        return {
            [VariableTypes.EMAIL]: {
                required: true,
                pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                minLength: 5,
                maxLength: 254,
                customMessage: 'Please enter a valid email address'
            },
            
            [VariableTypes.PHONE]: {
                required: false,
                pattern: '^[\\+]?[1-9][\\d\\s\\-\\(\\)]{7,15}$',
                minLength: 8,
                maxLength: 20,
                customMessage: 'Please enter a valid phone number'
            },
            
            [VariableTypes.DATE]: {
                required: false,
                pattern: '^(\\d{1,2}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{2,4})|(\\d{4}[\\/\\-\\.]\\d{1,2}[\\/\\-\\.]\\d{1,2})$',
                customMessage: 'Please enter a valid date (MM/DD/YYYY or YYYY-MM-DD)'
            },
            
            [VariableTypes.URL]: {
                required: false,
                pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$',
                minLength: 8,
                maxLength: 2048,
                customMessage: 'Please enter a valid URL starting with http:// or https://'
            },
            
            [VariableTypes.NUMBER]: {
                required: false,
                pattern: '^-?\\d+(\\.\\d+)?$',
                customMessage: 'Please enter a valid number'
            },
            
            [VariableTypes.CURRENCY]: {
                required: false,
                pattern: '^[\\$\\€\\£\\¥]?\\s*\\d{1,3}(,\\d{3})*(\\.\\d{2})?$',
                min: 0,
                customMessage: 'Please enter a valid currency amount'
            },
            
            [VariableTypes.NAME]: {
                required: false,
                minLength: 2,
                maxLength: 100,
                pattern: '^[a-zA-ZÀ-ÿ\\s\\-\\.\']+$',
                customMessage: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)'
            },
            
            [VariableTypes.TEXT]: {
                required: false,
                minLength: 1,
                maxLength: 500,
                customMessage: 'Please enter valid text'
            },
            
            [VariableTypes.SENSITIVE]: {
                required: true,
                minLength: 8,
                maxLength: 128,
                pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$',
                customMessage: 'Password must be at least 8 characters with uppercase, lowercase, and number'
            }
        };
    }

    /**
     * Initialize pattern library for advanced validation
     */
    initializePatternLibrary() {
        return {
            // Brazilian-specific patterns
            cpf: {
                pattern: '^\\d{3}\\.\\d{3}\\.\\d{3}\\-\\d{2}$|^\\d{11}$',
                message: 'Please enter a valid CPF (000.000.000-00)'
            },
            
            cnpj: {
                pattern: '^\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}\\-\\d{2}$|^\\d{14}$',
                message: 'Please enter a valid CNPJ (00.000.000/0000-00)'
            },
            
            cep: {
                pattern: '^\\d{5}\\-\\d{3}$|^\\d{8}$',
                message: 'Please enter a valid CEP (00000-000)'
            },
            
            // International patterns
            usPhone: {
                pattern: '^\\+?1?[\\s\\-\\.]?\\(?[0-9]{3}\\)?[\\s\\-\\.]?[0-9]{3}[\\s\\-\\.]?[0-9]{4}$',
                message: 'Please enter a valid US phone number'
            },
            
            ukPhone: {
                pattern: '^\\+?44[\\s\\-]?\\d{4}[\\s\\-]?\\d{6}$|^0\\d{4}[\\s\\-]?\\d{6}$',
                message: 'Please enter a valid UK phone number'
            },
            
            // Credit card patterns
            creditCard: {
                pattern: '^\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4}$',
                message: 'Please enter a valid credit card number'
            },
            
            // Social security patterns
            ssn: {
                pattern: '^\\d{3}\\-\\d{2}\\-\\d{4}$|^\\d{9}$',
                message: 'Please enter a valid Social Security Number (000-00-0000)'
            }
        };
    }

    /**
     * Initialize localized error messages
     */
    initializeErrorMessages() {
        return {
            en: {
                required: 'This field is required',
                minLength: 'Must be at least {min} characters long',
                maxLength: 'Must be no more than {max} characters long',
                min: 'Must be at least {min}',
                max: 'Must be no more than {max}',
                pattern: 'Invalid format',
                email: 'Please enter a valid email address',
                phone: 'Please enter a valid phone number',
                date: 'Please enter a valid date',
                url: 'Please enter a valid URL',
                number: 'Please enter a valid number'
            },
            
            pt: {
                required: 'Este campo é obrigatório',
                minLength: 'Deve ter pelo menos {min} caracteres',
                maxLength: 'Deve ter no máximo {max} caracteres',
                min: 'Deve ser pelo menos {min}',
                max: 'Deve ser no máximo {max}',
                pattern: 'Formato inválido',
                email: 'Por favor, insira um endereço de email válido',
                phone: 'Por favor, insira um número de telefone válido',
                date: 'Por favor, insira uma data válida',
                url: 'Por favor, insira uma URL válida',
                number: 'Por favor, insira um número válido'
            },
            
            es: {
                required: 'Este campo es obligatorio',
                minLength: 'Debe tener al menos {min} caracteres',
                maxLength: 'Debe tener como máximo {max} caracteres',
                min: 'Debe ser al menos {min}',
                max: 'Debe ser como máximo {max}',
                pattern: 'Formato inválido',
                email: 'Por favor, ingrese una dirección de correo válida',
                phone: 'Por favor, ingrese un número de teléfono válido',
                date: 'Por favor, ingrese una fecha válida',
                url: 'Por favor, ingrese una URL válida',
                number: 'Por favor, ingrese un número válido'
            }
        };
    }

    /**
     * Main method to generate validation rules for a variable
     */
    generateValidationRules(variableType, value, context = {}, options = {}) {
        console.log(`✅ Generating validation rules for ${variableType} variable...`);
        
        // Start with base template
        const baseRules = this.getBaseValidationRules(variableType);
        
        // Enhance with value analysis
        const valueBasedRules = this.analyzeValueForValidation(value, variableType);
        
        // Enhance with context analysis
        const contextBasedRules = this.analyzeContextForValidation(context, variableType);
        
        // Apply custom options
        const customRules = this.applyCustomOptions(options);
        
        // Merge all rules
        const mergedRules = this.mergeValidationRules([
            baseRules,
            valueBasedRules,
            contextBasedRules,
            customRules
        ]);
        
        // Optimize and finalize
        const finalRules = this.optimizeValidationRules(mergedRules, variableType);
        
        console.log(`✅ Generated validation rules:`, finalRules);
        return finalRules;
    }

    /**
     * Get base validation rules for a variable type
     */
    getBaseValidationRules(variableType) {
        const template = this.validationTemplates[variableType];
        if (!template) {
            return this.validationTemplates[VariableTypes.TEXT];
        }
        
        return { ...template };
    }

    /**
     * Analyze the actual value to enhance validation rules
     */
    analyzeValueForValidation(value, variableType) {
        const rules = {};
        
        if (!value || typeof value !== 'string') {
            return rules;
        }
        
        // Length-based rules
        const length = value.length;
        if (length > 0) {
            // Set reasonable min/max based on actual value
            rules.minLength = Math.max(1, Math.floor(length * 0.5));
            rules.maxLength = Math.min(1000, Math.ceil(length * 2));
        }
        
        // Pattern detection for specific formats
        const detectedPattern = this.detectSpecificPattern(value);
        if (detectedPattern) {
            rules.pattern = detectedPattern.pattern;
            rules.customMessage = detectedPattern.message;
        }
        
        // Numeric value analysis
        if (variableType === VariableTypes.NUMBER || variableType === VariableTypes.CURRENCY) {
            const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
            if (!isNaN(numValue)) {
                rules.min = Math.floor(numValue * 0.1);
                rules.max = Math.ceil(numValue * 10);
            }
        }
        
        // Date value analysis
        if (variableType === VariableTypes.DATE) {
            const dateRules = this.analyzeDateValue(value);
            Object.assign(rules, dateRules);
        }
        
        return rules;
    }

    /**
     * Detect specific patterns in the value
     */
    detectSpecificPattern(value) {
        // Test against pattern library
        for (const [patternName, patternInfo] of Object.entries(this.patternLibrary)) {
            const regex = new RegExp(patternInfo.pattern);
            if (regex.test(value)) {
                return {
                    pattern: patternInfo.pattern,
                    message: patternInfo.message,
                    type: patternName
                };
            }
        }
        
        return null;
    }

    /**
     * Analyze date value for specific validation rules
     */
    analyzeDateValue(value) {
        const rules = {};
        
        try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                const now = new Date();
                const yearDiff = now.getFullYear() - date.getFullYear();
                
                // If it looks like a birth date (reasonable age range)
                if (yearDiff >= 0 && yearDiff <= 120) {
                    rules.min = '1900-01-01';
                    rules.max = now.toISOString().split('T')[0];
                    rules.customMessage = 'Please enter a valid birth date';
                }
                
                // If it's a future date
                if (date > now) {
                    rules.min = now.toISOString().split('T')[0];
                    rules.customMessage = 'Date must be in the future';
                }
            }
        } catch (error) {
            // Invalid date, keep default rules
        }
        
        return rules;
    }

    /**
     * Analyze element context for validation enhancement
     */
    analyzeContextForValidation(context, variableType) {
        const rules = {};
        
        if (!context) return rules;
        
        // Required field detection
        if (context.required || this.isRequiredByContext(context)) {
            rules.required = true;
        }
        
        // Extract validation from HTML attributes
        if (context.pattern) {
            rules.pattern = context.pattern;
        }
        
        if (context.minLength) {
            rules.minLength = context.minLength;
        }
        
        if (context.maxLength) {
            rules.maxLength = context.maxLength;
        }
        
        if (context.min !== null && context.min !== undefined) {
            rules.min = context.min;
        }
        
        if (context.max !== null && context.max !== undefined) {
            rules.max = context.max;
        }
        
        // Context-based pattern enhancement
        const contextPattern = this.getPatternFromContext(context, variableType);
        if (contextPattern) {
            rules.pattern = contextPattern.pattern;
            rules.customMessage = contextPattern.message;
        }
        
        return rules;
    }

    /**
     * Determine if field should be required based on context
     */
    isRequiredByContext(context) {
        const requiredKeywords = ['required', 'mandatory', 'obrigatório', 'obligatorio'];
        const contextText = [
            context.label,
            context.placeholder,
            context.ariaLabel,
            context.title
        ].join(' ').toLowerCase();
        
        return requiredKeywords.some(keyword => contextText.includes(keyword));
    }

    /**
     * Get specific pattern based on context clues
     */
    getPatternFromContext(context, variableType) {
        const contextText = [
            context.label,
            context.name,
            context.id,
            context.placeholder
        ].join(' ').toLowerCase();
        
        // Brazilian document patterns
        if (contextText.includes('cpf')) {
            return this.patternLibrary.cpf;
        }
        
        if (contextText.includes('cnpj')) {
            return this.patternLibrary.cnpj;
        }
        
        if (contextText.includes('cep')) {
            return this.patternLibrary.cep;
        }
        
        // Phone number patterns by region
        if (variableType === VariableTypes.PHONE) {
            if (contextText.includes('us') || contextText.includes('american')) {
                return this.patternLibrary.usPhone;
            }
            
            if (contextText.includes('uk') || contextText.includes('british')) {
                return this.patternLibrary.ukPhone;
            }
        }
        
        // Credit card detection
        if (contextText.includes('card') || contextText.includes('credit')) {
            return this.patternLibrary.creditCard;
        }
        
        // SSN detection
        if (contextText.includes('ssn') || contextText.includes('social security')) {
            return this.patternLibrary.ssn;
        }
        
        return null;
    }

    /**
     * Apply custom validation options
     */
    applyCustomOptions(options) {
        const rules = {};
        
        if (options.required !== undefined) {
            rules.required = options.required;
        }
        
        if (options.minLength !== undefined) {
            rules.minLength = options.minLength;
        }
        
        if (options.maxLength !== undefined) {
            rules.maxLength = options.maxLength;
        }
        
        if (options.min !== undefined) {
            rules.min = options.min;
        }
        
        if (options.max !== undefined) {
            rules.max = options.max;
        }
        
        if (options.pattern) {
            rules.pattern = options.pattern;
        }
        
        if (options.customMessage) {
            rules.customMessage = options.customMessage;
        }
        
        if (options.options && Array.isArray(options.options)) {
            rules.options = options.options;
        }
        
        return rules;
    }

    /**
     * Merge multiple validation rule objects
     */
    mergeValidationRules(ruleArrays) {
        const merged = {};
        
        for (const rules of ruleArrays) {
            for (const [key, value] of Object.entries(rules)) {
                if (value !== undefined && value !== null) {
                    // For numeric values, take the most restrictive
                    if (key === 'minLength' || key === 'min') {
                        merged[key] = Math.max(merged[key] || 0, value);
                    } else if (key === 'maxLength' || key === 'max') {
                        merged[key] = Math.min(merged[key] || Infinity, value);
                    } else {
                        // For other values, later rules override earlier ones
                        merged[key] = value;
                    }
                }
            }
        }
        
        return merged;
    }

    /**
     * Optimize and finalize validation rules
     */
    optimizeValidationRules(rules, variableType) {
        const optimized = { ...rules };
        
        // Remove contradictory rules
        if (optimized.minLength && optimized.maxLength && optimized.minLength > optimized.maxLength) {
            optimized.maxLength = optimized.minLength + 50;
        }
        
        if (optimized.min && optimized.max && optimized.min > optimized.max) {
            optimized.max = optimized.min + 100;
        }
        
        // Set reasonable defaults for missing critical rules
        if (variableType === VariableTypes.EMAIL && !optimized.pattern) {
            optimized.pattern = this.validationTemplates[VariableTypes.EMAIL].pattern;
        }
        
        if (variableType === VariableTypes.SENSITIVE && !optimized.minLength) {
            optimized.minLength = 8;
        }
        
        // Generate localized error message if not provided
        if (!optimized.customMessage) {
            optimized.customMessage = this.generateLocalizedMessage(variableType, optimized);
        }
        
        return optimized;
    }

    /**
     * Generate localized error message
     */
    generateLocalizedMessage(variableType, rules, language = 'en') {
        const messages = this.errorMessages[language] || this.errorMessages.en;
        
        // Type-specific messages
        if (messages[variableType]) {
            return messages[variableType];
        }
        
        // Rule-specific messages
        if (rules.required) {
            return messages.required;
        }
        
        if (rules.pattern) {
            return messages.pattern;
        }
        
        if (rules.minLength) {
            return messages.minLength.replace('{min}', rules.minLength);
        }
        
        return messages.pattern;
    }

    /**
     * Validate a value against generated rules
     */
    validateValue(value, rules) {
        const errors = [];
        const warnings = [];
        
        // Required validation
        if (rules.required && (!value || value.trim() === '')) {
            errors.push({
                rule: 'required',
                message: rules.customMessage || 'This field is required'
            });
            return { valid: false, errors, warnings };
        }
        
        // Skip other validations if value is empty and not required
        if (!value || value.trim() === '') {
            return { valid: true, errors, warnings };
        }
        
        // Pattern validation
        if (rules.pattern) {
            try {
                const regex = new RegExp(rules.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        rule: 'pattern',
                        message: rules.customMessage || 'Invalid format'
                    });
                }
            } catch (error) {
                warnings.push({
                    rule: 'pattern',
                    message: 'Invalid validation pattern'
                });
            }
        }
        
        // Length validations
        if (rules.minLength && value.length < rules.minLength) {
            errors.push({
                rule: 'minLength',
                message: `Must be at least ${rules.minLength} characters long`
            });
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push({
                rule: 'maxLength',
                message: `Must be no more than ${rules.maxLength} characters long`
            });
        }
        
        // Numeric validations
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            if (rules.min !== undefined && numValue < rules.min) {
                errors.push({
                    rule: 'min',
                    message: `Must be at least ${rules.min}`
                });
            }
            
            if (rules.max !== undefined && numValue > rules.max) {
                errors.push({
                    rule: 'max',
                    message: `Must be no more than ${rules.max}`
                });
            }
        }
        
        // Options validation
        if (rules.options && rules.options.length > 0) {
            if (!rules.options.includes(value)) {
                errors.push({
                    rule: 'options',
                    message: `Must be one of: ${rules.options.join(', ')}`
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        return {
            supportedTypes: Object.keys(this.validationTemplates).length,
            patternLibrarySize: Object.keys(this.patternLibrary).length,
            supportedLanguages: Object.keys(this.errorMessages),
            features: {
                strictValidation: this.options.strictValidation,
                customPatterns: this.options.enableCustomPatterns,
                multiLanguage: this.options.supportMultipleLanguages
            }
        };
    }
}

module.exports = ValidationRuleGenerator;