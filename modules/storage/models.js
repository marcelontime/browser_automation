const { v4: uuidv4 } = require('uuid');

/**
 * 🏗️ DATA MODELS
 * 
 * Defines data structures for variables, automations, and recording sessions
 */

/**
 * Variable Types
 */
const VariableTypes = {
    EMAIL: 'email',
    NAME: 'name', 
    PHONE: 'phone',
    DATE: 'date',
    URL: 'url',
    NUMBER: 'number',
    CURRENCY: 'currency',
    TEXT: 'text',
    SELECT: 'select',
    CHECKBOX: 'checkbox',
    FILE: 'file',
    SENSITIVE: 'sensitive'
};

/**
 * Variable Class
 */
class Variable {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.automationId = data.automationId;
        this.name = data.name || '';
        this.type = data.type || VariableTypes.TEXT;
        this.value = data.value || '';
        this.defaultValue = data.defaultValue || '';
        this.description = data.description || '';
        this.examples = data.examples || [];
        this.validation = data.validation || {};
        this.sensitive = data.sensitive || false;
        this.required = data.required || false;
        this.category = data.category || 'general';
        this.confidenceScore = data.confidenceScore || 0.0;
        this.created = data.created || new Date().toISOString();
        this.updated = data.updated || new Date().toISOString();
        this.elementInfo = data.elementInfo || {};
    }

    // Validation methods
    validate(value = null) {
        const testValue = value !== null ? value : this.value;
        const errors = [];
        const warnings = [];

        // Required validation
        if (this.required && (!testValue || testValue.trim() === '')) {
            errors.push({
                field: 'value',
                message: `${this.name} is required`,
                code: 'REQUIRED'
            });
        }

        // Type-specific validation
        if (testValue && testValue.trim() !== '') {
            const typeValidation = this.validateType(testValue);
            errors.push(...typeValidation.errors);
            warnings.push(...typeValidation.warnings);
        }

        // Custom validation rules
        if (this.validation && testValue) {
            const customValidation = this.validateCustomRules(testValue);
            errors.push(...customValidation.errors);
            warnings.push(...customValidation.warnings);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    validateType(value) {
        const errors = [];
        const warnings = [];

        switch (this.type) {
            case VariableTypes.EMAIL:
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid email format',
                        code: 'INVALID_EMAIL'
                    });
                }
                break;

            case VariableTypes.PHONE:
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
                if (!phoneRegex.test(cleanPhone)) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid phone number format',
                        code: 'INVALID_PHONE'
                    });
                }
                break;

            case VariableTypes.DATE:
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid date format',
                        code: 'INVALID_DATE'
                    });
                }
                break;

            case VariableTypes.URL:
                try {
                    new URL(value);
                } catch {
                    errors.push({
                        field: 'value',
                        message: 'Invalid URL format',
                        code: 'INVALID_URL'
                    });
                }
                break;

            case VariableTypes.NUMBER:
                if (isNaN(Number(value))) {
                    errors.push({
                        field: 'value',
                        message: 'Invalid number format',
                        code: 'INVALID_NUMBER'
                    });
                }
                break;

            case VariableTypes.CURRENCY:
                const currencyRegex = /^[\$\€\£\¥]?[\d,]+\.?\d{0,2}$/;
                if (!currencyRegex.test(value.replace(/\s/g, ''))) {
                    warnings.push({
                        field: 'value',
                        message: 'Currency format may not be recognized',
                        code: 'CURRENCY_FORMAT_WARNING'
                    });
                }
                break;
        }

        return { errors, warnings };
    }

    validateCustomRules(value) {
        const errors = [];
        const warnings = [];

        if (this.validation.pattern) {
            try {
                const regex = new RegExp(this.validation.pattern);
                if (!regex.test(value)) {
                    errors.push({
                        field: 'value',
                        message: this.validation.customMessage || 'Value does not match required pattern',
                        code: 'PATTERN_MISMATCH'
                    });
                }
            } catch (e) {
                warnings.push({
                    field: 'validation',
                    message: 'Invalid regex pattern in validation rules',
                    code: 'INVALID_REGEX'
                });
            }
        }

        if (this.validation.minLength && value.length < this.validation.minLength) {
            errors.push({
                field: 'value',
                message: `Minimum length is ${this.validation.minLength} characters`,
                code: 'MIN_LENGTH'
            });
        }

        if (this.validation.maxLength && value.length > this.validation.maxLength) {
            errors.push({
                field: 'value',
                message: `Maximum length is ${this.validation.maxLength} characters`,
                code: 'MAX_LENGTH'
            });
        }

        if (this.validation.min !== undefined && Number(value) < this.validation.min) {
            errors.push({
                field: 'value',
                message: `Minimum value is ${this.validation.min}`,
                code: 'MIN_VALUE'
            });
        }

        if (this.validation.max !== undefined && Number(value) > this.validation.max) {
            errors.push({
                field: 'value',
                message: `Maximum value is ${this.validation.max}`,
                code: 'MAX_VALUE'
            });
        }

        if (this.validation.options && this.validation.options.length > 0) {
            if (!this.validation.options.includes(value)) {
                errors.push({
                    field: 'value',
                    message: `Value must be one of: ${this.validation.options.join(', ')}`,
                    code: 'INVALID_OPTION'
                });
            }
        }

        return { errors, warnings };
    }

    // Update methods
    updateValue(newValue) {
        this.value = newValue;
        this.updated = new Date().toISOString();
    }

    updateValidation(newValidation) {
        this.validation = { ...this.validation, ...newValidation };
        this.updated = new Date().toISOString();
    }

    // Serialization
    toJSON() {
        return {
            id: this.id,
            automationId: this.automationId,
            name: this.name,
            type: this.type,
            value: this.sensitive ? '***MASKED***' : this.value,
            defaultValue: this.defaultValue,
            description: this.description,
            examples: this.examples,
            validation: this.validation,
            sensitive: this.sensitive,
            required: this.required,
            category: this.category,
            confidenceScore: this.confidenceScore,
            created: this.created,
            updated: this.updated,
            elementInfo: this.elementInfo
        };
    }

    toJSONWithValue() {
        return {
            ...this.toJSON(),
            value: this.value // Include actual value even if sensitive
        };
    }
}

/**
 * Variable Usage Tracking
 */
class VariableUsage {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.variableId = data.variableId;
        this.executionId = data.executionId;
        this.valueUsed = data.valueUsed;
        this.success = data.success || false;
        this.errorMessage = data.errorMessage || null;
        this.executionTime = data.executionTime || new Date().toISOString();
        this.duration = data.duration || 0;
    }
}

/**
 * Recording Session
 */
class RecordingSession {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.automationId = data.automationId;
        this.sessionId = data.sessionId;
        this.startedAt = data.startedAt || new Date().toISOString();
        this.completedAt = data.completedAt || null;
        this.actionsCaptured = data.actionsCaptured || 0;
        this.variablesDetected = data.variablesDetected || 0;
        this.status = data.status || 'active'; // active, completed, failed
        this.metadata = data.metadata || {};
        this.actions = data.actions || [];
        this.detectedVariables = data.detectedVariables || [];
    }

    addAction(action) {
        this.actions.push({
            ...action,
            timestamp: Date.now(),
            index: this.actions.length
        });
        this.actionsCaptured = this.actions.length;
    }

    addDetectedVariable(variable) {
        this.detectedVariables.push(variable);
        this.variablesDetected = this.detectedVariables.length;
    }

    complete() {
        this.status = 'completed';
        this.completedAt = new Date().toISOString();
    }

    fail(error) {
        this.status = 'failed';
        this.completedAt = new Date().toISOString();
        this.metadata.error = error;
    }
}

/**
 * Enhanced Automation
 */
class EnhancedAutomation {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.name = data.name || '';
        this.description = data.description || '';
        this.created = data.created || new Date().toISOString();
        this.updated = data.updated || new Date().toISOString();
        this.variableCount = data.variableCount || 0;
        this.stepCount = data.stepCount || 0;
        this.recordingMetadata = data.recordingMetadata || {};
        this.shareSettings = data.shareSettings || {};
        this.actions = data.actions || [];
        this.variables = data.variables || [];
        this.status = data.status || 'ready'; // ready, recording, running, error
        this.lastRun = data.lastRun || null;
        this.executionCount = data.executionCount || 0;
        this.successRate = data.successRate || 0;
    }

    addVariable(variable) {
        this.variables.push(variable);
        this.variableCount = this.variables.length;
        this.updated = new Date().toISOString();
    }

    removeVariable(variableId) {
        this.variables = this.variables.filter(v => v.id !== variableId);
        this.variableCount = this.variables.length;
        this.updated = new Date().toISOString();
    }

    updateExecutionStats(success) {
        this.executionCount++;
        this.lastRun = new Date().toISOString();
        
        if (success) {
            const successCount = Math.floor(this.successRate * (this.executionCount - 1)) + 1;
            this.successRate = successCount / this.executionCount;
        } else {
            const successCount = Math.floor(this.successRate * (this.executionCount - 1));
            this.successRate = successCount / this.executionCount;
        }
        
        this.updated = new Date().toISOString();
    }
}

/**
 * Shared Automation Package
 */
class SharedAutomationPackage {
    constructor(data = {}) {
        this.id = data.id || uuidv4();
        this.name = data.name || '';
        this.description = data.description || '';
        this.version = data.version || '1.0.0';
        this.author = data.author || '';
        this.created = data.created || new Date().toISOString();
        this.originalAutomationId = data.originalAutomationId;
        this.variables = data.variables || [];
        this.prompts = data.prompts || [];
        this.metadata = data.metadata || {};
        this.dependencies = data.dependencies || [];
        this.downloadCount = data.downloadCount || 0;
        this.rating = data.rating || 0;
        this.tags = data.tags || [];
    }

    incrementDownloadCount() {
        this.downloadCount++;
    }

    updateRating(newRating) {
        // Simple average rating calculation
        const totalRatings = this.metadata.ratingCount || 0;
        const currentTotal = this.rating * totalRatings;
        this.rating = (currentTotal + newRating) / (totalRatings + 1);
        this.metadata.ratingCount = totalRatings + 1;
    }
}

module.exports = {
    Variable,
    VariableUsage,
    RecordingSession,
    EnhancedAutomation,
    SharedAutomationPackage,
    VariableTypes
};