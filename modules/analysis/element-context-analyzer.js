/**
 * 🎯 ELEMENT CONTEXT ANALYZER
 * 
 * Analyzes DOM element context to provide intelligent variable naming
 * and better understanding of form field purposes and relationships
 */
class ElementContextAnalyzer {
    constructor(options = {}) {
        this.options = {
            enableSemanticAnalysis: options.enableSemanticAnalysis !== false,
            enableSiblingAnalysis: options.enableSiblingAnalysis !== false,
            enableFormAnalysis: options.enableFormAnalysis !== false,
            ...options
        };
        
        // Semantic mappings for better variable naming
        this.semanticMappings = this.initializeSemanticMappings();
        
        // Form field relationships
        this.fieldRelationships = this.initializeFieldRelationships();
        
        // Language-specific mappings (supporting Portuguese for Brazilian users)
        this.languageMappings = this.initializeLanguageMappings();
    }

    /**
     * Initialize semantic mappings for field types
     */
    initializeSemanticMappings() {
        return {
            // Identity fields
            identity: {
                keywords: ['name', 'nome', 'first', 'last', 'full', 'given', 'surname', 'apellido'],
                suggestions: ['full_name', 'first_name', 'last_name', 'user_name']
            },
            
            // Contact fields
            contact: {
                keywords: ['email', 'mail', 'e-mail', 'phone', 'tel', 'telefone', 'mobile', 'cell'],
                suggestions: ['email_address', 'phone_number', 'mobile_phone', 'contact_email']
            },
            
            // Address fields
            address: {
                keywords: ['address', 'endereco', 'street', 'rua', 'city', 'cidade', 'state', 'estado', 'zip', 'cep', 'postal'],
                suggestions: ['street_address', 'city_name', 'state_code', 'postal_code', 'zip_code']
            },
            
            // Authentication fields
            auth: {
                keywords: ['password', 'senha', 'pass', 'pwd', 'login', 'user', 'username', 'usuario'],
                suggestions: ['password', 'username', 'login_id', 'user_id']
            },
            
            // Date/Time fields
            datetime: {
                keywords: ['date', 'data', 'time', 'hora', 'birth', 'nascimento', 'created', 'updated'],
                suggestions: ['birth_date', 'start_date', 'end_date', 'created_date']
            },
            
            // Financial fields
            financial: {
                keywords: ['price', 'preco', 'cost', 'custo', 'amount', 'valor', 'money', 'dinheiro', 'salary', 'salario'],
                suggestions: ['price_amount', 'total_cost', 'salary_value', 'payment_amount']
            },
            
            // Document fields (Brazilian specific)
            document: {
                keywords: ['cpf', 'cnpj', 'rg', 'passport', 'passaporte', 'document', 'documento'],
                suggestions: ['cpf_number', 'cnpj_number', 'rg_number', 'passport_number']
            }
        };
    }

    /**
     * Initialize field relationship patterns
     */
    initializeFieldRelationships() {
        return {
            // Name field combinations
            name_combinations: [
                ['first', 'last'],
                ['nome', 'sobrenome'],
                ['given', 'family'],
                ['first_name', 'last_name']
            ],
            
            // Address field combinations
            address_combinations: [
                ['street', 'city', 'state', 'zip'],
                ['rua', 'cidade', 'estado', 'cep'],
                ['address1', 'address2', 'city', 'postal'],
                ['endereco', 'numero', 'cidade', 'cep']
            ],
            
            // Contact field combinations
            contact_combinations: [
                ['email', 'phone'],
                ['email', 'telefone'],
                ['primary_email', 'secondary_email'],
                ['work_phone', 'mobile_phone']
            ],
            
            // Date range combinations
            date_combinations: [
                ['start_date', 'end_date'],
                ['data_inicio', 'data_fim'],
                ['from_date', 'to_date'],
                ['birth_date', 'death_date']
            ]
        };
    }

    /**
     * Initialize language-specific mappings
     */
    initializeLanguageMappings() {
        return {
            portuguese: {
                'nome': 'name',
                'email': 'email',
                'telefone': 'phone',
                'endereco': 'address',
                'cidade': 'city',
                'estado': 'state',
                'cep': 'postal_code',
                'data': 'date',
                'senha': 'password',
                'usuario': 'username',
                'valor': 'amount',
                'preco': 'price',
                'documento': 'document'
            },
            
            spanish: {
                'nombre': 'name',
                'correo': 'email',
                'telefono': 'phone',
                'direccion': 'address',
                'ciudad': 'city',
                'estado': 'state',
                'codigo': 'code',
                'fecha': 'date',
                'contraseña': 'password',
                'usuario': 'username',
                'precio': 'price'
            }
        };
    }

    /**
     * Main method to analyze element context and suggest variable names
     */
    analyzeElementContext(element, value = '') {
        console.log(`🎯 Analyzing element context for variable naming...`);
        
        const context = this.extractDetailedContext(element);
        const suggestions = this.generateVariableNameSuggestions(context, value);
        const relationships = this.analyzeFieldRelationships(context);
        const semantics = this.performSemanticAnalysis(context);
        
        return {
            context,
            suggestions,
            relationships,
            semantics,
            recommendedName: suggestions[0] || 'variable',
            confidence: this.calculateNamingConfidence(context, suggestions)
        };
    }

    /**
     * Extract detailed context from DOM element
     */
    extractDetailedContext(element) {
        if (!element) return {};
        
        const context = {
            // Basic element properties
            tagName: element.tagName || '',
            type: element.type || '',
            name: element.name || '',
            id: element.id || '',
            className: element.className || '',
            
            // Text content and labels
            label: this.extractLabel(element),
            placeholder: element.placeholder || '',
            title: element.title || '',
            ariaLabel: element.ariaLabel || '',
            
            // Form context
            formName: this.extractFormName(element),
            formId: this.extractFormId(element),
            fieldset: this.extractFieldset(element),
            
            // Position and relationships
            siblingElements: this.extractSiblingElements(element),
            parentElements: this.extractParentElements(element),
            childElements: this.extractChildElements(element),
            
            // Validation and constraints
            required: element.required || false,
            pattern: element.pattern || '',
            minLength: element.minLength || null,
            maxLength: element.maxLength || null,
            min: element.min || null,
            max: element.max || null,
            
            // Additional metadata
            dataAttributes: this.extractDataAttributes(element),
            customAttributes: this.extractCustomAttributes(element)
        };
        
        return context;
    }

    /**
     * Extract label text from various sources
     */
    extractLabel(element) {
        // Try different methods to find label
        const labelSources = [
            element.label,
            element.ariaLabel,
            element.title,
            this.findAssociatedLabel(element),
            this.findParentLabel(element),
            this.findSiblingLabel(element)
        ];
        
        for (const source of labelSources) {
            if (source && source.trim()) {
                return source.trim();
            }
        }
        
        return '';
    }

    /**
     * Find associated label element
     */
    findAssociatedLabel(element) {
        if (element.labels && element.labels.length > 0) {
            return element.labels[0].textContent;
        }
        
        // Look for label with 'for' attribute
        if (element.id) {
            const label = document.querySelector(`label[for="${element.id}"]`);
            return label ? label.textContent : '';
        }
        
        return '';
    }

    /**
     * Find parent label element
     */
    findParentLabel(element) {
        let parent = element.parentElement;
        while (parent && parent.tagName !== 'FORM') {
            if (parent.tagName === 'LABEL') {
                return parent.textContent;
            }
            parent = parent.parentElement;
        }
        return '';
    }

    /**
     * Find sibling label element
     */
    findSiblingLabel(element) {
        const siblings = element.parentElement ? element.parentElement.children : [];
        for (const sibling of siblings) {
            if (sibling.tagName === 'LABEL' && sibling !== element) {
                return sibling.textContent;
            }
        }
        return '';
    }

    /**
     * Extract form name/identifier
     */
    extractFormName(element) {
        let form = element.form;
        if (!form) {
            // Walk up to find form
            let parent = element.parentElement;
            while (parent && parent.tagName !== 'FORM') {
                parent = parent.parentElement;
            }
            form = parent;
        }
        
        if (form) {
            return form.name || form.id || form.className || 'form';
        }
        
        return '';
    }

    /**
     * Extract form ID
     */
    extractFormId(element) {
        const form = element.form || element.closest('form');
        return form ? (form.id || '') : '';
    }

    /**
     * Extract fieldset information
     */
    extractFieldset(element) {
        const fieldset = element.closest('fieldset');
        if (fieldset) {
            const legend = fieldset.querySelector('legend');
            return {
                id: fieldset.id || '',
                legend: legend ? legend.textContent : '',
                className: fieldset.className || ''
            };
        }
        return null;
    }

    /**
     * Extract sibling elements for context
     */
    extractSiblingElements(element) {
        if (!element.parentElement) return [];
        
        const siblings = Array.from(element.parentElement.children)
            .filter(el => el !== element && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'))
            .map(el => ({
                tagName: el.tagName,
                type: el.type,
                name: el.name,
                id: el.id,
                label: this.extractLabel(el)
            }));
        
        return siblings.slice(0, 5); // Limit to 5 siblings
    }

    /**
     * Extract parent elements for context
     */
    extractParentElements(element) {
        const parents = [];
        let parent = element.parentElement;
        let depth = 0;
        
        while (parent && depth < 3) {
            parents.push({
                tagName: parent.tagName,
                className: parent.className,
                id: parent.id
            });
            parent = parent.parentElement;
            depth++;
        }
        
        return parents;
    }

    /**
     * Extract child elements (for complex inputs)
     */
    extractChildElements(element) {
        if (!element.children || element.children.length === 0) return [];
        
        return Array.from(element.children)
            .slice(0, 3)
            .map(child => ({
                tagName: child.tagName,
                className: child.className,
                textContent: child.textContent ? child.textContent.substring(0, 50) : ''
            }));
    }

    /**
     * Extract data attributes
     */
    extractDataAttributes(element) {
        const dataAttrs = {};
        if (element.dataset) {
            for (const [key, value] of Object.entries(element.dataset)) {
                dataAttrs[key] = value;
            }
        }
        return dataAttrs;
    }

    /**
     * Extract custom attributes
     */
    extractCustomAttributes(element) {
        const customAttrs = {};
        if (element.attributes) {
            for (const attr of element.attributes) {
                if (attr.name.startsWith('data-') || 
                    attr.name.startsWith('aria-') ||
                    ['role', 'autocomplete', 'inputmode'].includes(attr.name)) {
                    customAttrs[attr.name] = attr.value;
                }
            }
        }
        return customAttrs;
    }

    /**
     * Generate variable name suggestions based on context
     */
    generateVariableNameSuggestions(context, value = '') {
        const suggestions = new Set();
        
        // Primary suggestions from labels and names
        if (context.label) {
            suggestions.add(this.sanitizeVariableName(context.label));
        }
        
        if (context.name) {
            suggestions.add(this.sanitizeVariableName(context.name));
        }
        
        if (context.id) {
            suggestions.add(this.sanitizeVariableName(context.id));
        }
        
        if (context.placeholder) {
            suggestions.add(this.sanitizeVariableName(context.placeholder));
        }
        
        // Semantic suggestions
        const semanticSuggestions = this.getSemanticSuggestions(context);
        semanticSuggestions.forEach(s => suggestions.add(s));
        
        // Language-specific suggestions
        const langSuggestions = this.getLanguageSpecificSuggestions(context);
        langSuggestions.forEach(s => suggestions.add(s));
        
        // Form context suggestions
        if (context.formName && context.formName !== 'form') {
            const formPrefix = this.sanitizeVariableName(context.formName);
            if (context.label) {
                suggestions.add(`${formPrefix}_${this.sanitizeVariableName(context.label)}`);
            }
        }
        
        // Type-based suggestions
        if (context.type) {
            const typeSuggestion = this.getTypeSuggestion(context.type, context);
            if (typeSuggestion) {
                suggestions.add(typeSuggestion);
            }
        }
        
        // Convert Set to Array and filter out empty/invalid names
        return Array.from(suggestions)
            .filter(name => name && name.length > 0 && name !== 'variable')
            .slice(0, 5); // Limit to top 5 suggestions
    }

    /**
     * Get semantic suggestions based on field purpose
     */
    getSemanticSuggestions(context) {
        const suggestions = [];
        const contextText = [
            context.label,
            context.name,
            context.id,
            context.placeholder
        ].join(' ').toLowerCase();
        
        for (const [category, mapping] of Object.entries(this.semanticMappings)) {
            const hasKeyword = mapping.keywords.some(keyword => 
                contextText.includes(keyword.toLowerCase())
            );
            
            if (hasKeyword) {
                suggestions.push(...mapping.suggestions);
            }
        }
        
        return suggestions;
    }

    /**
     * Get language-specific suggestions
     */
    getLanguageSpecificSuggestions(context) {
        const suggestions = [];
        const contextText = [
            context.label,
            context.name,
            context.placeholder
        ].join(' ').toLowerCase();
        
        for (const [language, mappings] of Object.entries(this.languageMappings)) {
            for (const [foreignWord, englishWord] of Object.entries(mappings)) {
                if (contextText.includes(foreignWord)) {
                    suggestions.push(englishWord);
                    suggestions.push(`${englishWord}_field`);
                }
            }
        }
        
        return suggestions;
    }

    /**
     * Get suggestion based on input type
     */
    getTypeSuggestion(type, context) {
        const typeMappings = {
            'email': 'email_address',
            'password': 'password',
            'tel': 'phone_number',
            'url': 'website_url',
            'date': 'date_value',
            'time': 'time_value',
            'number': 'number_value',
            'search': 'search_term',
            'file': 'file_upload'
        };
        
        return typeMappings[type] || null;
    }

    /**
     * Analyze field relationships with siblings
     */
    analyzeFieldRelationships(context) {
        const relationships = {
            relatedFields: [],
            fieldGroup: null,
            sequence: null
        };
        
        if (!context.siblingElements || context.siblingElements.length === 0) {
            return relationships;
        }
        
        // Check for known field combinations
        const siblingNames = context.siblingElements.map(el => 
            (el.label || el.name || el.id || '').toLowerCase()
        );
        
        for (const [groupType, combinations] of Object.entries(this.fieldRelationships)) {
            for (const combination of combinations) {
                const matches = combination.filter(field => 
                    siblingNames.some(name => name.includes(field))
                );
                
                if (matches.length >= 2) {
                    relationships.fieldGroup = groupType;
                    relationships.relatedFields = matches;
                    break;
                }
            }
            
            if (relationships.fieldGroup) break;
        }
        
        return relationships;
    }

    /**
     * Perform semantic analysis of the field
     */
    performSemanticAnalysis(context) {
        const analysis = {
            purpose: 'unknown',
            category: 'general',
            importance: 'medium',
            dataType: 'text'
        };
        
        const contextText = [
            context.label,
            context.name,
            context.id,
            context.placeholder
        ].join(' ').toLowerCase();
        
        // Determine purpose
        if (contextText.includes('email') || contextText.includes('mail')) {
            analysis.purpose = 'contact';
            analysis.category = 'identity';
            analysis.importance = 'high';
            analysis.dataType = 'email';
        } else if (contextText.includes('password') || contextText.includes('senha')) {
            analysis.purpose = 'authentication';
            analysis.category = 'security';
            analysis.importance = 'critical';
            analysis.dataType = 'password';
        } else if (contextText.includes('name') || contextText.includes('nome')) {
            analysis.purpose = 'identification';
            analysis.category = 'identity';
            analysis.importance = 'high';
            analysis.dataType = 'name';
        } else if (contextText.includes('phone') || contextText.includes('telefone')) {
            analysis.purpose = 'contact';
            analysis.category = 'identity';
            analysis.importance = 'medium';
            analysis.dataType = 'phone';
        }
        
        return analysis;
    }

    /**
     * Calculate confidence score for variable naming
     */
    calculateNamingConfidence(context, suggestions) {
        let confidence = 0.5; // Base confidence
        
        // Boost confidence based on available context
        if (context.label && context.label.trim()) confidence += 0.3;
        if (context.name && context.name.trim()) confidence += 0.2;
        if (context.id && context.id.trim()) confidence += 0.1;
        if (context.placeholder && context.placeholder.trim()) confidence += 0.1;
        
        // Boost if we have semantic understanding
        if (suggestions.length > 1) confidence += 0.1;
        
        // Boost if field has validation attributes
        if (context.required) confidence += 0.05;
        if (context.pattern) confidence += 0.05;
        
        return Math.min(0.95, confidence);
    }

    /**
     * Sanitize variable name to be code-friendly
     */
    sanitizeVariableName(name) {
        if (!name) return '';
        
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .trim()
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 50) || '';
    }

    /**
     * Get context analysis statistics
     */
    getAnalysisStats() {
        return {
            semanticMappingsCount: Object.keys(this.semanticMappings).length,
            fieldRelationshipsCount: Object.keys(this.fieldRelationships).length,
            languageMappingsCount: Object.keys(this.languageMappings).length,
            supportedLanguages: Object.keys(this.languageMappings)
        };
    }
}

module.exports = ElementContextAnalyzer;