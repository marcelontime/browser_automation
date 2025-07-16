const { Variable, VariableTypes } = require('./models');

/**
 * 🔍 VARIABLE VALIDATION SERVICE
 * 
 * Server-side validation engine with rule compilation and caching
 */
class VariableValidationService {
    constructor() {
        this.compiledRules = new Map();
        this.validationCache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
        this.maxCacheSize = 1000;
    }

    /**
     * Validate a single variable value
     */
    async validateValue(variable, value) {
        try {
            // Check cache first
            const cacheKey = this.getCacheKey(variable.id, value);
            const cached = this.validationCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.result;
            }

            // Perform validation
            const result = this.performValidation(variable, value);
            
            // Cache result
            this.cacheResult(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Error validating variable value:', error);
            return {
                valid: false,
                errors: [{ 
                    field: 'value', 
                    message: 'Validation error occurred', 
                    code: 'VALIDATION_ERROR' 
                }],
                warnings: []
            };
        }
    }

    /**
     * Batch validate multiple variables
     */
    async validateBatch(validationRequests) {
        try {
            const results = await Promise.all(
                validationRequests.map(async ({ variable, value }) => {
                    const result = await this.validateValue(variable, value);
                    return {
                        variableId: variable.id,
                        value,
                        ...result
                    };
                })
            );

            return {
                valid: results.every(r => r.valid),
                results,
                summary: {
                    total: results.length,
                    valid: results.filter(r => r.valid).length,
                    invalid: results.filter(r => !r.valid).length,
                    warnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
                }
            };
        } catch (error) {
            console.error('Error batch validating variables:', error);
            throw error;
        }
    }

    /**
     * Perform the actual validation
     */
    performValidation(variable, value) {
        const errors = [];
        const warnings = [];

        // Required validation
        if (variable.required && this.isEmpty(value)) {
            errors.push({
                field: 'value',
                message: `${variable.name} is required`,
                code: 'REQUIRED'
            });
            // If required and empty, skip other validations
            return { valid: false, errors, warnings };
        }

        // Skip other validations if value is empty and not required
        if (this.isEmpty(value)) {
            return { valid: true, errors, warnings };
        }

        // Type-specific validation
        const typeValidation = this.validateType(variable, value);
        errors.push(...typeValidation.errors);
        warnings.push(...typeValidation.warnings);

        // Custom validation rules
        const customValidation = this.validateCustomRules(variable, value);
        errors.push(...customValidation.errors);
        warnings.push(...customValidation.warnings);

        // Length validation
        const lengthValidation = this.validateLength(variable, value);
        errors.push(...lengthValidation.errors);
        warnings.push(...lengthValidation.warnings);

        // Range validation (for numbers)
        const rangeValidation = this.validateRange(variable, value);
        errors.push(...rangeValidation.errors);
        warnings.push(...rangeValidation.warnings);

        // Options validation
        const optionsValidation = this.validateOptions(variable, value);
        errors.push(...optionsValidation.errors);
        warnings.push(...optionsValidation.warnings);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate variable type
     */
    validateType(variable, value) {
        const errors = [];
        const warnings = [];

        switch (variable.type) {
            case VariableTypes.EMAIL:
                if (!this.isValidEmail(value)) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid email format',
                        code: 'INVALID_EMAIL'
                    });
                }
                break;

            case VariableTypes.PHONE:
                if (!this.isValidPhone(value)) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid phone number format',
                        code: 'INVALID_PHONE'
                    });
                }
                break;

            case VariableTypes.DATE:
                if (!this.isValidDate(value)) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid date format',
                        code: 'INVALID_DATE'
                    });
                }
                break;

            case VariableTypes.URL:
                if (!this.isValidUrl(value)) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid URL format',
                        code: 'INVALID_URL'
                    });
                }
                break;

            case VariableTypes.NUMBER:
                if (!this.isValidNumber(value)) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid number format',
                        code: 'INVALID_NUMBER'
                    });
                }
                break;

            case VariableTypes.CURRENCY:
                const currencyValidation = this.validateCurrency(value);
                if (!currencyValidation.valid) {
                    if (currencyValidation.severity === 'error') {
                        errors.push({
                            field: 'value',
                            message: 'Invalid currency format',
                            code: 'INVALID_CURRENCY'
                        });
                    } else {
                        warnings.push({
                            field: 'value',
                            message: 'Currency format may not be recognized',
                            code: 'CURRENCY_FORMAT_WARNING'
                        });
                    }
                }
                break;

            case VariableTypes.TEXT:
            case VariableTypes.NAME:
                // Basic text validation - check for potentially harmful content
                if (this.containsSuspiciousContent(value)) {
                    warnings.push({
                        field: 'value',
                        message: 'Value contains potentially suspicious content',
                        code: 'SUSPICIOUS_CONTENT'
                    });
                }
                break;
        }

        return { errors, warnings };
    }

    /**
     * Validate custom rules
     */
    validateCustomRules(variable, value) {
        const errors = [];
        const warnings = [];

        if (variable.validation && variable.validation.pattern) {
            try {
                const regex = this.getCompiledRegex(variable.validation.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        field: 'value',
                        message: variable.validation.customMessage || 'Value does not match required pattern',
                        code: 'PATTERN_MISMATCH'
                    });
                }
            } catch (error) {
                warnings.push({
                    field: 'validation',
                    message: 'Invalid regex pattern in validation rules',
                    code: 'INVALID_REGEX'
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Validate length constraints
     */
    validateLength(variable, value) {
        const errors = [];
        const warnings = [];

        if (variable.validation) {
            const length = value.toString().length;

            if (variable.validation.minLength !== undefined && length < variable.validation.minLength) {
                errors.push({
                    field: 'value',
                    message: `Minimum length is ${variable.validation.minLength} characters`,
                    code: 'MIN_LENGTH'
                });
            }

            if (variable.validation.maxLength !== undefined && length > variable.validation.maxLength) {
                errors.push({
                    field: 'value',
                    message: `Maximum length is ${variable.validation.maxLength} characters`,
                    code: 'MAX_LENGTH'
                });
            }

            // Warning for very long values
            if (length > 1000) {
                warnings.push({
                    field: 'value',
                    message: 'Value is very long and may cause performance issues',
                    code: 'LONG_VALUE_WARNING'
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Validate range constraints (for numbers)
     */
    validateRange(variable, value) {
        const errors = [];
        const warnings = [];

        if (variable.validation && (variable.type === VariableTypes.NUMBER || variable.type === VariableTypes.CURRENCY)) {
            const numValue = this.parseNumber(value);
            
            if (numValue !== null) {
                if (variable.validation.min !== undefined && numValue < variable.validation.min) {
                    errors.push({
                        field: 'value',
                        message: `Minimum value is ${variable.validation.min}`,
                        code: 'MIN_VALUE'
                    });
                }

                if (variable.validation.max !== undefined && numValue > variable.validation.max) {
                    errors.push({
                        field: 'value',
                        message: `Maximum value is ${variable.validation.max}`,
                        code: 'MAX_VALUE'
                    });
                }
            }
        }

        return { errors, warnings };
    }

    /**
     * Validate options constraints
     */
    validateOptions(variable, value) {
        const errors = [];
        const warnings = [];

        if (variable.validation && variable.validation.options && variable.validation.options.length > 0) {
            if (!variable.validation.options.includes(value)) {
                errors.push({
                    field: 'value',
                    message: `Value must be one of: ${variable.validation.options.join(', ')}`,
                    code: 'INVALID_OPTION'
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Helper validation methods
     */
    isEmpty(value) {
        return value === null || value === undefined || value.toString().trim() === '';
    }

    isValidEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        // Remove common formatting characters
        const cleanPhone = phone.replace(/[\s\-\(\)\+\.]/g, '');
        // Check if it's a valid phone number (basic check)
        return /^[0-9]{7,15}$/.test(cleanPhone);
    }

    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
    }

    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    isValidNumber(value) {
        const num = Number(value);
        return !isNaN(num) && isFinite(num);
    }

    validateCurrency(value) {
        // Remove common currency symbols and formatting
        const cleanValue = value.replace(/[\$\€\£\¥\,\s]/g, '');
        
        // Check if it's a valid number
        if (!this.isValidNumber(cleanValue)) {
            return { valid: false, severity: 'error' };
        }

        // Check for reasonable currency format
        const currencyRegex = /^[\$\€\£\¥]?[\d,]+\.?\d{0,2}$/;
        if (!currencyRegex.test(value.replace(/\s/g, ''))) {
            return { valid: false, severity: 'warning' };
        }

        return { valid: true };
    }

    containsSuspiciousContent(value) {
        // Basic check for potentially harmful content
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /document\./i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(value));
    }

    parseNumber(value) {
        // Handle currency symbols and formatting
        const cleanValue = value.toString().replace(/[\$\€\£\¥\,\s]/g, '');
        const num = Number(cleanValue);
        return isNaN(num) ? null : num;
    }

    /**
     * Get compiled regex (with caching)
     */
    getCompiledRegex(pattern) {
        if (!this.compiledRules.has(pattern)) {
            try {
                this.compiledRules.set(pattern, new RegExp(pattern));
            } catch (error) {
                throw new Error(`Invalid regex pattern: ${pattern}`);
            }
        }
        return this.compiledRules.get(pattern);
    }

    /**
     * Cache management
     */
    getCacheKey(variableId, value) {
        return `${variableId}:${this.hashValue(value)}`;
    }

    hashValue(value) {
        // Simple hash function for caching
        let hash = 0;
        const str = value.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    cacheResult(key, result) {
        // Implement LRU-like cache eviction
        if (this.validationCache.size >= this.maxCacheSize) {
            const firstKey = this.validationCache.keys().next().value;
            this.validationCache.delete(firstKey);
        }

        this.validationCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Clear caches
     */
    clearCache() {
        this.validationCache.clear();
        this.compiledRules.clear();
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        return {
            cacheSize: this.validationCache.size,
            compiledRulesCount: this.compiledRules.size,
            cacheHitRate: this.calculateCacheHitRate()
        };
    }

    calculateCacheHitRate() {
        // This would need to be tracked during validation calls
        // For now, return a placeholder
        return 0;
    }
}

module.exports = VariableValidationService;