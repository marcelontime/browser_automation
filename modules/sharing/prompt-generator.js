/**
 * 📝 PROMPT GENERATOR
 * 
 * Converts recorded actions into human-readable prompts and descriptions
 */
class PromptGenerator {
    constructor() {
        this.actionTemplates = this.initializeActionTemplates();
        this.contextualPhrases = this.initializeContextualPhrases();
        this.variableDescriptions = this.initializeVariableDescriptions();
    }

    /**
     * Initialize action templates for different types of interactions
     */
    initializeActionTemplates() {
        return {
            click: {
                simple: 'Click on {target}',
                withContext: 'Click the {context} {target}',
                withVariable: 'Click on {target} (using {variable})'
            },
            type: {
                simple: 'Enter text into {target}',
                withContext: 'Type into the {context} field',
                withVariable: 'Enter your {variable} into {target}'
            },
            select: {
                simple: 'Select an option from {target}',
                withContext: 'Choose from the {context} dropdown',
                withVariable: 'Select {variable} from {target}'
            },
            navigate: {
                simple: 'Navigate to {target}',
                withContext: 'Go to the {context} page',
                withVariable: 'Visit {variable}'
            },
            wait: {
                simple: 'Wait for {target} to appear',
                withContext: 'Wait for the {context} to load',
                withVariable: 'Wait for {variable} to be ready'
            },
            scroll: {
                simple: 'Scroll to {target}',
                withContext: 'Scroll to the {context} section',
                withVariable: 'Scroll to {variable}'
            },
            hover: {
                simple: 'Hover over {target}',
                withContext: 'Move cursor over the {context}',
                withVariable: 'Hover over {variable}'
            },
            upload: {
                simple: 'Upload a file to {target}',
                withContext: 'Upload file using the {context} button',
                withVariable: 'Upload {variable} file'
            },
            check: {
                simple: 'Check the {target} checkbox',
                withContext: 'Enable the {context} option',
                withVariable: 'Check {variable} if needed'
            },
            uncheck: {
                simple: 'Uncheck the {target} checkbox',
                withContext: 'Disable the {context} option',
                withVariable: 'Uncheck {variable} if needed'
            }
        };
    }

    /**
     * Initialize contextual phrases for better descriptions
     */
    initializeContextualPhrases() {
        return {
            form: ['form', 'input form', 'registration form', 'contact form'],
            button: ['button', 'submit button', 'action button', 'navigation button'],
            field: ['field', 'input field', 'text field', 'data field'],
            dropdown: ['dropdown', 'select menu', 'option list', 'choice selector'],
            link: ['link', 'navigation link', 'action link', 'reference link'],
            menu: ['menu', 'navigation menu', 'context menu', 'dropdown menu'],
            dialog: ['dialog', 'popup', 'modal window', 'confirmation dialog'],
            section: ['section', 'content area', 'page section', 'information panel']
        };
    }

    /**
     * Initialize variable type descriptions
     */
    initializeVariableDescriptions() {
        return {
            email: {
                description: 'email address',
                examples: ['your email', 'contact email', 'login email'],
                tips: 'Make sure the email format is valid (e.g., user@domain.com)'
            },
            name: {
                description: 'name',
                examples: ['your full name', 'first name', 'last name'],
                tips: 'Enter your name as you want it to appear'
            },
            phone: {
                description: 'phone number',
                examples: ['your phone number', 'contact number', 'mobile number'],
                tips: 'Include country code if required (e.g., +1 for US)'
            },
            date: {
                description: 'date',
                examples: ['birth date', 'appointment date', 'deadline'],
                tips: 'Use the format shown on the website (MM/DD/YYYY or DD/MM/YYYY)'
            },
            url: {
                description: 'website URL',
                examples: ['website address', 'profile URL', 'reference link'],
                tips: 'Include http:// or https:// at the beginning'
            },
            number: {
                description: 'number',
                examples: ['quantity', 'amount', 'count'],
                tips: 'Enter numbers only, without commas or special characters'
            },
            currency: {
                description: 'amount',
                examples: ['price', 'budget', 'payment amount'],
                tips: 'Enter the amount in the correct currency format'
            },
            text: {
                description: 'text',
                examples: ['description', 'comment', 'message'],
                tips: 'Enter the text as needed for your specific use case'
            },
            password: {
                description: 'password',
                examples: ['your password', 'login password', 'account password'],
                tips: 'Use a secure password and keep it confidential'
            },
            sensitive: {
                description: 'sensitive information',
                examples: ['confidential data', 'private information', 'secure details'],
                tips: 'This information will be handled securely and not stored'
            }
        };
    }

    /**
     * Generate comprehensive prompts for an automation
     */
    generateAutomationPrompts(automation, variables = []) {
        const prompts = {
            title: this.generateTitle(automation),
            description: this.generateDescription(automation, variables),
            overview: this.generateOverview(automation, variables),
            prerequisites: this.generatePrerequisites(automation, variables),
            steps: this.generateStepByStep(automation, variables),
            variables: this.generateVariableGuide(variables),
            troubleshooting: this.generateTroubleshooting(automation, variables),
            tips: this.generateTips(automation, variables)
        };

        return prompts;
    }

    /**
     * Generate automation title
     */
    generateTitle(automation) {
        if (automation.name && automation.name.trim()) {
            return automation.name;
        }

        // Generate title based on actions
        const actionCount = automation.actions ? automation.actions.length : 0;
        const firstAction = automation.actions && automation.actions[0];
        
        if (firstAction) {
            const actionType = firstAction.action;
            const target = this.extractTargetDescription(firstAction.target);
            return `${this.capitalizeFirst(actionType)} ${target} Automation`;
        }

        return `${actionCount}-Step Web Automation`;
    }

    /**
     * Generate automation description
     */
    generateDescription(automation, variables) {
        let description = '';

        if (automation.description && automation.description.trim()) {
            description = automation.description;
        } else {
            // Generate description based on content
            const actionCount = automation.actions ? automation.actions.length : 0;
            const variableCount = variables.length;

            description = `This automation performs ${actionCount} step${actionCount !== 1 ? 's' : ''}`;
            
            if (variableCount > 0) {
                description += ` and uses ${variableCount} customizable variable${variableCount !== 1 ? 's' : ''}`;
            }
            
            description += ' to automate a web-based workflow.';
        }

        // Add context about complexity
        const complexity = this.assessComplexity(automation, variables);
        description += ` This is a ${complexity.level} automation that should take approximately ${complexity.estimatedTime} to set up and run.`;

        return description;
    }

    /**
     * Generate overview section
     */
    generateOverview(automation, variables) {
        const overview = {
            summary: this.generateDescription(automation, variables),
            stats: {
                steps: automation.actions ? automation.actions.length : 0,
                variables: variables.length,
                estimatedTime: this.estimateExecutionTime(automation),
                complexity: this.assessComplexity(automation, variables).level
            },
            features: this.extractFeatures(automation, variables)
        };

        return overview;
    }

    /**
     * Generate prerequisites
     */
    generatePrerequisites(automation, variables) {
        const prerequisites = [
            'A web browser (Chrome, Firefox, Safari, or Edge)',
            'Internet connection',
            'Access to the target website'
        ];

        // Add variable-specific prerequisites
        if (variables.some(v => v.type === 'file')) {
            prerequisites.push('Files ready for upload');
        }

        if (variables.some(v => v.sensitive)) {
            prerequisites.push('Secure environment for handling sensitive data');
        }

        if (variables.some(v => v.type === 'email')) {
            prerequisites.push('Valid email address');
        }

        // Add account requirements if login actions detected
        const hasLoginActions = automation.actions && automation.actions.some(action => 
            action.target && (
                action.target.includes('login') || 
                action.target.includes('password') || 
                action.target.includes('signin')
            )
        );

        if (hasLoginActions) {
            prerequisites.push('Account credentials for the target website');
        }

        return prerequisites;
    }

    /**
     * Generate step-by-step instructions
     */
    generateStepByStep(automation, variables) {
        if (!automation.actions || automation.actions.length === 0) {
            return ['No steps recorded for this automation.'];
        }

        const variableMap = this.createVariableMap(variables);
        const steps = automation.actions.map((action, index) => {
            return this.generateStepDescription(action, index + 1, variableMap);
        });

        return steps;
    }

    /**
     * Generate individual step description
     */
    generateStepDescription(action, stepNumber, variableMap) {
        const variable = action.variableId ? variableMap[action.variableId] : null;
        const actionType = action.action.toLowerCase();
        const target = this.extractTargetDescription(action.target);
        const context = this.inferContext(action.target);

        let template;
        if (variable) {
            template = this.actionTemplates[actionType]?.withVariable || this.actionTemplates[actionType]?.simple;
        } else if (context) {
            template = this.actionTemplates[actionType]?.withContext || this.actionTemplates[actionType]?.simple;
        } else {
            template = this.actionTemplates[actionType]?.simple || `${this.capitalizeFirst(actionType)} {target}`;
        }

        let description = template
            .replace('{target}', target)
            .replace('{context}', context)
            .replace('{variable}', variable ? variable.name : '');

        // Add additional context for complex actions
        if (action.value && !variable) {
            description += ` with "${action.value}"`;
        }

        return `${stepNumber}. ${description}`;
    }

    /**
     * Generate variable guide
     */
    generateVariableGuide(variables) {
        if (variables.length === 0) {
            return {
                summary: 'This automation does not use any variables.',
                variables: []
            };
        }

        const guide = {
            summary: `This automation uses ${variables.length} variable${variables.length !== 1 ? 's' : ''} that you can customize:`,
            variables: variables.map(variable => this.generateVariableDescription(variable))
        };

        return guide;
    }

    /**
     * Generate individual variable description
     */
    generateVariableDescription(variable) {
        const typeInfo = this.variableDescriptions[variable.type] || this.variableDescriptions.text;
        
        const description = {
            name: variable.name,
            type: variable.type,
            description: variable.description || `Your ${typeInfo.description}`,
            required: variable.required || false,
            examples: variable.examples && variable.examples.length > 0 ? 
                variable.examples : typeInfo.examples,
            tips: typeInfo.tips,
            validation: this.describeValidation(variable.validation)
        };

        return description;
    }

    /**
     * Describe validation rules in human-readable format
     */
    describeValidation(validation) {
        if (!validation) return null;

        const rules = [];

        if (validation.required) {
            rules.push('This field is required');
        }

        if (validation.minLength) {
            rules.push(`Must be at least ${validation.minLength} characters long`);
        }

        if (validation.maxLength) {
            rules.push(`Must be no more than ${validation.maxLength} characters long`);
        }

        if (validation.min !== undefined) {
            rules.push(`Must be at least ${validation.min}`);
        }

        if (validation.max !== undefined) {
            rules.push(`Must be no more than ${validation.max}`);
        }

        if (validation.pattern) {
            rules.push('Must match a specific format');
        }

        if (validation.options && validation.options.length > 0) {
            rules.push(`Must be one of: ${validation.options.join(', ')}`);
        }

        return rules.length > 0 ? rules : null;
    }

    /**
     * Generate troubleshooting guide
     */
    generateTroubleshooting(automation, variables) {
        const troubleshooting = [
            {
                problem: 'Automation fails to start',
                solutions: [
                    'Make sure you\'re on the correct website',
                    'Check that all required variables have values',
                    'Refresh the page and try again'
                ]
            },
            {
                problem: 'Element not found errors',
                solutions: [
                    'The website may have changed - try updating the automation',
                    'Make sure the page has fully loaded before running',
                    'Check if you need to be logged in first'
                ]
            },
            {
                problem: 'Variable validation errors',
                solutions: [
                    'Double-check the format of your input values',
                    'Make sure required fields are not empty',
                    'Check examples for the correct format'
                ]
            }
        ];

        // Add variable-specific troubleshooting
        if (variables.some(v => v.type === 'email')) {
            troubleshooting.push({
                problem: 'Email format errors',
                solutions: [
                    'Make sure the email includes @ and a domain',
                    'Check for typos in the email address',
                    'Avoid spaces at the beginning or end'
                ]
            });
        }

        if (variables.some(v => v.sensitive)) {
            troubleshooting.push({
                problem: 'Sensitive data handling',
                solutions: [
                    'Make sure you\'re in a secure, private environment',
                    'Clear browser data after use if on a shared computer',
                    'Never share automation files containing sensitive data'
                ]
            });
        }

        return troubleshooting;
    }

    /**
     * Generate tips for better results
     */
    generateTips(automation, variables) {
        const tips = [
            'Test the automation with sample data first',
            'Make sure you\'re on the correct website before starting',
            'Keep the browser window active during automation execution'
        ];

        // Add variable-specific tips
        if (variables.length > 0) {
            tips.push('Double-check all variable values before running');
        }

        if (variables.some(v => v.required)) {
            tips.push('All required variables must have values');
        }

        if (variables.some(v => v.type === 'date')) {
            tips.push('Use the date format expected by the website');
        }

        if (variables.some(v => v.type === 'file')) {
            tips.push('Have your files ready and easily accessible');
        }

        // Add complexity-based tips
        const complexity = this.assessComplexity(automation, variables);
        if (complexity.level === 'advanced') {
            tips.push('This is a complex automation - consider running it step by step first');
        }

        return tips;
    }

    /**
     * Helper methods
     */
    createVariableMap(variables) {
        return variables.reduce((map, variable) => {
            map[variable.id] = variable;
            return map;
        }, {});
    }

    extractTargetDescription(target) {
        if (!target) return 'element';
        
        // Clean up selector to make it more readable
        return target
            .replace(/^#/, '')
            .replace(/^\[/, '')
            .replace(/\]$/, '')
            .replace(/['"]/g, '')
            .replace(/[-_]/g, ' ')
            .toLowerCase();
    }

    inferContext(target) {
        if (!target) return null;

        const contextMap = {
            button: 'button',
            input: 'field',
            select: 'dropdown',
            form: 'form',
            link: 'link',
            menu: 'menu',
            dialog: 'dialog',
            modal: 'dialog'
        };

        for (const [key, context] of Object.entries(contextMap)) {
            if (target.toLowerCase().includes(key)) {
                return context;
            }
        }

        return null;
    }

    assessComplexity(automation, variables) {
        const actionCount = automation.actions ? automation.actions.length : 0;
        const variableCount = variables.length;
        const sensitiveCount = variables.filter(v => v.sensitive).length;
        const complexValidation = variables.filter(v => 
            v.validation && (v.validation.pattern || v.validation.options)
        ).length;

        let score = 0;
        score += actionCount * 1;
        score += variableCount * 2;
        score += sensitiveCount * 3;
        score += complexValidation * 2;

        if (score <= 10) {
            return { level: 'simple', estimatedTime: '2-5 minutes' };
        } else if (score <= 25) {
            return { level: 'intermediate', estimatedTime: '5-10 minutes' };
        } else {
            return { level: 'advanced', estimatedTime: '10+ minutes' };
        }
    }

    estimateExecutionTime(automation) {
        const actionCount = automation.actions ? automation.actions.length : 0;
        const baseTime = actionCount * 2; // 2 seconds per action
        const bufferTime = Math.max(5, actionCount * 0.5); // Buffer for loading
        
        return `${Math.ceil((baseTime + bufferTime) / 60)} minute${Math.ceil((baseTime + bufferTime) / 60) !== 1 ? 's' : ''}`;
    }

    extractFeatures(automation, variables) {
        const features = [];

        if (variables.length > 0) {
            features.push('Customizable variables');
        }

        if (variables.some(v => v.validation)) {
            features.push('Input validation');
        }

        if (variables.some(v => v.sensitive)) {
            features.push('Secure data handling');
        }

        const actionTypes = [...new Set(automation.actions?.map(a => a.action) || [])];
        if (actionTypes.includes('upload')) {
            features.push('File upload support');
        }

        if (actionTypes.includes('select')) {
            features.push('Dropdown selection');
        }

        return features;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = PromptGenerator;