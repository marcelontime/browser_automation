/**
 * Workflow parser and validator
 */
class WorkflowParser {
    constructor() {
        this.supportedStepTypes = [
            'navigation',
            'interaction',
            'extraction',
            'validation',
            'control',
            'variable',
            'wait'
        ];
        
        this.supportedActions = {
            navigation: ['goto', 'back', 'forward', 'refresh', 'close'],
            interaction: ['click', 'type', 'select', 'scroll', 'hover', 'drag'],
            extraction: ['getText', 'getAttribute', 'getMultiple', 'screenshot'],
            validation: ['checkExists', 'checkText', 'checkAttribute', 'checkUrl'],
            control: ['if', 'loop', 'parallel', 'delay', 'checkpoint'],
            variable: ['set', 'get', 'calculate', 'transform'],
            wait: ['element', 'time', 'condition', 'pageLoad', 'network']
        };
    }

    /**
     * Parse workflow definition from various formats
     */
    parseWorkflow(input, format = 'json') {
        let workflowData;
        
        try {
            switch (format.toLowerCase()) {
                case 'json':
                    workflowData = typeof input === 'string' ? JSON.parse(input) : input;
                    break;
                case 'yaml':
                    workflowData = this.parseYaml(input);
                    break;
                case 'automation':
                    workflowData = this.parseAutomationFormat(input);
                    break;
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }
            
            return this.normalizeWorkflow(workflowData);
        } catch (error) {
            throw new Error(`Failed to parse workflow: ${error.message}`);
        }
    }

    /**
     * Normalize workflow to standard format
     */
    normalizeWorkflow(workflowData) {
        const workflow = {
            id: workflowData.id || this.generateWorkflowId(),
            name: workflowData.name || 'Untitled Workflow',
            description: workflowData.description || '',
            version: workflowData.version || '1.0.0',
            steps: [],
            variables: workflowData.variables || [],
            settings: {
                timeout: workflowData.timeout || 30000,
                retryAttempts: workflowData.retryAttempts || 3,
                continueOnError: workflowData.continueOnError || false,
                ...workflowData.settings
            },
            metadata: {
                created: new Date().toISOString(),
                engine: 'WorkflowEngine',
                ...workflowData.metadata
            }
        };

        // Normalize steps
        if (workflowData.steps && Array.isArray(workflowData.steps)) {
            workflow.steps = workflowData.steps.map((step, index) => 
                this.normalizeStep(step, index)
            );
        }

        return workflow;
    }

    /**
     * Normalize individual step
     */
    normalizeStep(stepData, index) {
        const step = {
            id: stepData.id || `step_${index + 1}`,
            type: stepData.type || 'interaction',
            name: stepData.name || `Step ${index + 1}`,
            action: stepData.action || 'click',
            target: stepData.target || stepData.selector,
            value: stepData.value || stepData.text || stepData.data,
            timeout: stepData.timeout,
            retryOptions: {
                maxRetries: stepData.maxRetries || 3,
                retryDelay: stepData.retryDelay || 1000,
                ...stepData.retryOptions
            },
            conditions: stepData.conditions || [],
            continueOnError: stepData.continueOnError || false,
            metadata: stepData.metadata || {}
        };

        // Add step-specific properties
        if (stepData.waitFor) {
            step.waitFor = stepData.waitFor;
        }
        
        if (stepData.variables) {
            step.variables = stepData.variables;
        }
        
        if (stepData.validation) {
            step.validation = stepData.validation;
        }

        return step;
    }

    /**
     * Parse automation format (existing format)
     */
    parseAutomationFormat(automation) {
        const workflow = {
            id: automation.id,
            name: automation.name,
            description: automation.description || '',
            version: '1.0.0',
            steps: [],
            variables: automation.variables || [],
            settings: {
                timeout: 30000,
                retryAttempts: 3
            }
        };

        // Convert automation steps to workflow steps
        if (automation.steps && Array.isArray(automation.steps)) {
            workflow.steps = automation.steps.map((step, index) => ({
                id: step.id || `step_${index + 1}`,
                type: this.mapAutomationStepType(step.type),
                name: step.description || `Step ${index + 1}`,
                action: step.action || step.type,
                target: step.selector || step.target,
                value: step.value || step.text,
                timeout: step.timeout,
                retryOptions: {
                    maxRetries: 3,
                    retryDelay: 1000
                },
                conditions: [],
                continueOnError: false,
                metadata: {
                    originalType: step.type,
                    confidence: step.confidence
                }
            }));
        }

        return workflow;
    }

    /**
     * Map automation step types to workflow step types
     */
    mapAutomationStepType(automationType) {
        const typeMapping = {
            'navigate': 'navigation',
            'click': 'interaction',
            'type': 'interaction',
            'select': 'interaction',
            'extract': 'extraction',
            'wait': 'wait',
            'validate': 'validation'
        };

        return typeMapping[automationType] || 'interaction';
    }

    /**
     * Validate workflow definition
     */
    validateWorkflow(workflow) {
        const errors = [];
        const warnings = [];

        // Basic structure validation
        if (!workflow || typeof workflow !== 'object') {
            errors.push('Workflow must be an object');
            return { valid: false, errors, warnings };
        }

        // Required fields
        if (!workflow.id || typeof workflow.id !== 'string') {
            errors.push('Workflow must have a valid id');
        }

        if (!workflow.name || typeof workflow.name !== 'string') {
            warnings.push('Workflow should have a name');
        }

        if (!workflow.steps || !Array.isArray(workflow.steps)) {
            errors.push('Workflow must have a steps array');
        } else if (workflow.steps.length === 0) {
            errors.push('Workflow must have at least one step');
        }

        // Validate steps
        if (workflow.steps && Array.isArray(workflow.steps)) {
            workflow.steps.forEach((step, index) => {
                const stepErrors = this.validateStep(step, index);
                errors.push(...stepErrors.errors);
                warnings.push(...stepErrors.warnings);
            });
        }

        // Validate variables
        if (workflow.variables && Array.isArray(workflow.variables)) {
            workflow.variables.forEach((variable, index) => {
                const varErrors = this.validateVariable(variable, index);
                errors.push(...varErrors.errors);
                warnings.push(...varErrors.warnings);
            });
        }

        // Check for circular dependencies
        const circularDeps = this.checkCircularDependencies(workflow);
        if (circularDeps.length > 0) {
            errors.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate individual step
     */
    validateStep(step, index) {
        const errors = [];
        const warnings = [];

        if (!step || typeof step !== 'object') {
            errors.push(`Step ${index} must be an object`);
            return { errors, warnings };
        }

        // Required fields
        if (!step.id || typeof step.id !== 'string') {
            errors.push(`Step ${index} must have a valid id`);
        }

        if (!step.type || typeof step.type !== 'string') {
            errors.push(`Step ${index} must have a valid type`);
        } else if (!this.supportedStepTypes.includes(step.type)) {
            errors.push(`Step ${index} has unsupported type: ${step.type}`);
        }

        if (!step.action || typeof step.action !== 'string') {
            errors.push(`Step ${index} must have a valid action`);
        } else if (step.type && this.supportedActions[step.type] && 
                   !this.supportedActions[step.type].includes(step.action)) {
            warnings.push(`Step ${index} action '${step.action}' may not be supported for type '${step.type}'`);
        }

        // Type-specific validation
        switch (step.type) {
            case 'navigation':
                if (step.action === 'goto' && !step.target) {
                    errors.push(`Step ${index} navigation goto requires target URL`);
                }
                break;
                
            case 'interaction':
                if (['click', 'hover'].includes(step.action) && !step.target) {
                    errors.push(`Step ${index} ${step.action} requires target selector`);
                }
                if (['type', 'select'].includes(step.action) && (!step.target || !step.value)) {
                    errors.push(`Step ${index} ${step.action} requires target and value`);
                }
                break;
                
            case 'extraction':
                if (!step.target) {
                    errors.push(`Step ${index} extraction requires target selector`);
                }
                break;
                
            case 'validation':
                if (!step.target && !step.conditions) {
                    errors.push(`Step ${index} validation requires target or conditions`);
                }
                break;
        }

        // Timeout validation
        if (step.timeout && (typeof step.timeout !== 'number' || step.timeout < 0)) {
            errors.push(`Step ${index} timeout must be a positive number`);
        }

        return { errors, warnings };
    }

    /**
     * Validate variable definition
     */
    validateVariable(variable, index) {
        const errors = [];
        const warnings = [];

        if (!variable || typeof variable !== 'object') {
            errors.push(`Variable ${index} must be an object`);
            return { errors, warnings };
        }

        if (!variable.name || typeof variable.name !== 'string') {
            errors.push(`Variable ${index} must have a valid name`);
        }

        if (!variable.type || typeof variable.type !== 'string') {
            warnings.push(`Variable ${index} should have a type`);
        }

        return { errors, warnings };
    }

    /**
     * Check for circular dependencies in workflow
     */
    checkCircularDependencies(workflow) {
        // This is a simplified check - can be expanded for more complex dependency analysis
        const stepIds = new Set();
        const duplicates = [];

        workflow.steps.forEach(step => {
            if (stepIds.has(step.id)) {
                duplicates.push(step.id);
            } else {
                stepIds.add(step.id);
            }
        });

        return duplicates;
    }

    /**
     * Generate unique workflow ID
     */
    generateWorkflowId() {
        return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Convert workflow to different formats
     */
    exportWorkflow(workflow, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(workflow, null, 2);
            case 'yaml':
                return this.toYaml(workflow);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Simple YAML conversion (basic implementation)
     */
    toYaml(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        let yaml = '';

        for (const [key, value] of Object.entries(obj)) {
            if (value === null || value === undefined) {
                yaml += `${spaces}${key}: null\n`;
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                yaml += `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
            } else if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                value.forEach(item => {
                    if (typeof item === 'object') {
                        yaml += `${spaces}  -\n${this.toYaml(item, indent + 2)}`;
                    } else {
                        yaml += `${spaces}  - ${item}\n`;
                    }
                });
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }

        return yaml;
    }
}

module.exports = WorkflowParser;