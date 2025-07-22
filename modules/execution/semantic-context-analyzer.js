/**
 * Semantic Context Analyzer for intelligent element matching
 * Uses AI analysis to understand element purpose and context
 */
class SemanticContextAnalyzer {
    constructor(options = {}) {
        this.options = {
            confidenceThreshold: options.confidenceThreshold || 0.7,
            maxCandidates: options.maxCandidates || 10,
            enableCaching: options.enableCaching !== false,
            aiProvider: options.aiProvider || 'openai',
            ...options
        };
        
        this.semanticCache = new Map();
        this.contextPatterns = new Map();
        this.elementTypes = new Map();
        
        this.initializePatterns();
    }

    /**
     * Initialize common semantic patterns
     */
    initializePatterns() {
        // Common UI patterns and their semantic meanings
        this.contextPatterns.set('button', {
            indicators: ['click', 'submit', 'button', 'btn', 'action'],
            roles: ['button', 'link'],
            attributes: ['onclick', 'type="button"', 'type="submit"'],
            textPatterns: [/submit/i, /save/i, /continue/i, /next/i, /cancel/i, /ok/i]
        });
        
        this.contextPatterns.set('input', {
            indicators: ['input', 'field', 'text', 'email', 'password'],
            roles: ['textbox', 'searchbox'],
            attributes: ['type="text"', 'type="email"', 'type="password"', 'placeholder'],
            textPatterns: [/enter/i, /type/i, /search/i]
        });
        
        this.contextPatterns.set('link', {
            indicators: ['link', 'href', 'anchor'],
            roles: ['link'],
            attributes: ['href'],
            textPatterns: [/click here/i, /read more/i, /learn more/i]
        });
        
        this.contextPatterns.set('dropdown', {
            indicators: ['select', 'dropdown', 'option', 'choose'],
            roles: ['combobox', 'listbox'],
            attributes: ['select', 'option'],
            textPatterns: [/select/i, /choose/i, /pick/i]
        });
        
        this.contextPatterns.set('checkbox', {
            indicators: ['check', 'checkbox', 'tick'],
            roles: ['checkbox'],
            attributes: ['type="checkbox"'],
            textPatterns: [/check/i, /agree/i, /accept/i]
        });
    }

    /**
     * Analyze semantic context of an element
     */
    async analyzeElement(page, element, context = {}) {
        try {
            // Extract element information
            const elementInfo = await this.extractElementInfo(page, element);
            
            // Analyze semantic context
            const semanticContext = await this.buildSemanticContext(elementInfo, context);
            
            // Determine element purpose
            const purpose = await this.determinePurpose(semanticContext);
            
            // Extract business context
            const businessContext = await this.extractBusinessContext(elementInfo, context);
            
            return {
                elementInfo,
                semanticContext,
                purpose,
                businessContext,
                confidence: this.calculateConfidence(semanticContext, purpose),
                timestamp: Date.now()
            };
            
        } catch (error) {
            throw new Error(`Semantic analysis failed: ${error.message}`);
        }
    }

    /**
     * Find elements by semantic context
     */
    async findBySemanticContext(page, targetContext, options = {}) {
        const threshold = options.threshold || this.options.confidenceThreshold;
        const maxCandidates = options.maxCandidates || this.options.maxCandidates;
        
        try {
            // Get all interactive elements
            const candidates = await this.getInteractiveElements(page);
            
            // Analyze each candidate
            const analyzedCandidates = [];
            
            for (const candidate of candidates) {
                try {
                    const analysis = await this.analyzeElement(page, candidate);
                    const similarity = this.calculateSemanticSimilarity(targetContext, analysis);
                    
                    if (similarity >= threshold) {
                        analyzedCandidates.push({
                            element: candidate,
                            analysis,
                            similarity,
                            confidence: analysis.confidence
                        });
                    }
                } catch (error) {
                    // Skip candidates that can't be analyzed
                    continue;
                }
            }
            
            // Sort by similarity and confidence
            return analyzedCandidates
                .sort((a, b) => {
                    const scoreA = (a.similarity + a.confidence) / 2;
                    const scoreB = (b.similarity + b.confidence) / 2;
                    return scoreB - scoreA;
                })
                .slice(0, maxCandidates);
                
        } catch (error) {
            throw new Error(`Semantic search failed: ${error.message}`);
        }
    }

    /**
     * Extract comprehensive element information
     */
    async extractElementInfo(page, element) {
        return await element.evaluate(el => {
            const rect = el.getBoundingClientRect();
            
            return {
                tagName: el.tagName.toLowerCase(),
                id: el.id,
                className: el.className,
                textContent: el.textContent?.trim(),
                innerText: el.innerText?.trim(),
                value: el.value,
                placeholder: el.placeholder,
                title: el.title,
                alt: el.alt,
                href: el.href,
                src: el.src,
                type: el.type,
                role: el.getAttribute('role'),
                ariaLabel: el.getAttribute('aria-label'),
                ariaLabelledBy: el.getAttribute('aria-labelledby'),
                ariaDescribedBy: el.getAttribute('aria-describedby'),
                dataAttributes: Array.from(el.attributes)
                    .filter(attr => attr.name.startsWith('data-'))
                    .reduce((acc, attr) => {
                        acc[attr.name] = attr.value;
                        return acc;
                    }, {}),
                position: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                visible: rect.width > 0 && rect.height > 0,
                enabled: !el.disabled,
                focused: document.activeElement === el,
                parent: {
                    tagName: el.parentElement?.tagName.toLowerCase(),
                    className: el.parentElement?.className,
                    id: el.parentElement?.id
                },
                siblings: Array.from(el.parentElement?.children || [])
                    .filter(child => child !== el)
                    .map(sibling => ({
                        tagName: sibling.tagName.toLowerCase(),
                        className: sibling.className,
                        textContent: sibling.textContent?.trim().substring(0, 50)
                    }))
                    .slice(0, 5)
            };
        });
    }

    /**
     * Build semantic context from element information
     */
    async buildSemanticContext(elementInfo, context) {
        const semanticContext = {
            elementType: this.classifyElementType(elementInfo),
            interactionType: this.determineInteractionType(elementInfo),
            contentAnalysis: this.analyzeContent(elementInfo),
            structuralContext: this.analyzeStructuralContext(elementInfo),
            accessibilityContext: this.analyzeAccessibilityContext(elementInfo),
            visualContext: this.analyzeVisualContext(elementInfo),
            businessDomain: context.businessDomain || 'general'
        };
        
        return semanticContext;
    }

    /**
     * Classify element type based on characteristics
     */
    classifyElementType(elementInfo) {
        const { tagName, type, role, className, textContent } = elementInfo;
        
        // Direct tag-based classification
        if (tagName === 'button') return 'button';
        if (tagName === 'input') {
            switch (type) {
                case 'button':
                case 'submit':
                case 'reset':
                    return 'button';
                case 'checkbox':
                    return 'checkbox';
                case 'radio':
                    return 'radio';
                case 'file':
                    return 'file-input';
                default:
                    return 'text-input';
            }
        }
        if (tagName === 'select') return 'dropdown';
        if (tagName === 'textarea') return 'text-area';
        if (tagName === 'a') return 'link';
        
        // Role-based classification
        if (role) {
            switch (role) {
                case 'button':
                    return 'button';
                case 'textbox':
                case 'searchbox':
                    return 'text-input';
                case 'combobox':
                case 'listbox':
                    return 'dropdown';
                case 'checkbox':
                    return 'checkbox';
                case 'radio':
                    return 'radio';
                case 'link':
                    return 'link';
            }
        }
        
        // Class-based classification
        if (className) {
            const lowerClass = className.toLowerCase();
            if (lowerClass.includes('btn') || lowerClass.includes('button')) return 'button';
            if (lowerClass.includes('input') || lowerClass.includes('field')) return 'text-input';
            if (lowerClass.includes('select') || lowerClass.includes('dropdown')) return 'dropdown';
            if (lowerClass.includes('checkbox')) return 'checkbox';
            if (lowerClass.includes('radio')) return 'radio';
            if (lowerClass.includes('link')) return 'link';
        }
        
        // Content-based classification
        if (textContent) {
            const lowerText = textContent.toLowerCase();
            if (this.matchesPattern(lowerText, this.contextPatterns.get('button')?.textPatterns)) {
                return 'button';
            }
        }
        
        return 'unknown';
    }

    /**
     * Determine interaction type
     */
    determineInteractionType(elementInfo) {
        const elementType = this.classifyElementType(elementInfo);
        
        switch (elementType) {
            case 'button':
                return 'click';
            case 'text-input':
            case 'text-area':
                return 'type';
            case 'dropdown':
                return 'select';
            case 'checkbox':
            case 'radio':
                return 'check';
            case 'link':
                return 'navigate';
            case 'file-input':
                return 'upload';
            default:
                return 'click';
        }
    }

    /**
     * Analyze content for semantic meaning
     */
    analyzeContent(elementInfo) {
        const { textContent, placeholder, ariaLabel, title, alt } = elementInfo;
        
        const allText = [textContent, placeholder, ariaLabel, title, alt]
            .filter(text => text && text.trim())
            .join(' ')
            .toLowerCase();
        
        return {
            hasText: !!allText,
            textLength: allText.length,
            keywords: this.extractKeywords(allText),
            sentiment: this.analyzeSentiment(allText),
            actionWords: this.extractActionWords(allText),
            domainTerms: this.extractDomainTerms(allText)
        };
    }

    /**
     * Analyze structural context
     */
    analyzeStructuralContext(elementInfo) {
        const { parent, siblings, position } = elementInfo;
        
        return {
            parentType: parent?.tagName,
            parentClass: parent?.className,
            siblingCount: siblings?.length || 0,
            siblingTypes: siblings?.map(s => s.tagName) || [],
            position: {
                isTopLevel: position.y < 200,
                isLeftAligned: position.x < 100,
                isRightAligned: position.x > 800,
                isCentered: position.x > 300 && position.x < 700
            }
        };
    }

    /**
     * Analyze accessibility context
     */
    analyzeAccessibilityContext(elementInfo) {
        const { role, ariaLabel, ariaLabelledBy, ariaDescribedBy } = elementInfo;
        
        return {
            hasRole: !!role,
            hasAriaLabel: !!ariaLabel,
            hasAriaLabelledBy: !!ariaLabelledBy,
            hasAriaDescribedBy: !!ariaDescribedBy,
            accessibilityScore: this.calculateAccessibilityScore(elementInfo)
        };
    }

    /**
     * Analyze visual context
     */
    analyzeVisualContext(elementInfo) {
        const { position, visible, enabled } = elementInfo;
        
        return {
            visible,
            enabled,
            size: position.width * position.height,
            aspectRatio: position.width / position.height,
            isLarge: position.width > 200 || position.height > 50,
            isSmall: position.width < 50 && position.height < 30
        };
    }

    /**
     * Determine element purpose using AI analysis
     */
    async determinePurpose(semanticContext) {
        // This would integrate with AI service for advanced purpose detection
        // For now, use rule-based approach
        
        const { elementType, contentAnalysis, structuralContext } = semanticContext;
        
        let purpose = {
            primary: elementType,
            secondary: [],
            confidence: 0.5
        };
        
        // Enhance purpose based on content analysis
        if (contentAnalysis.actionWords.length > 0) {
            purpose.secondary.push('action-trigger');
            purpose.confidence += 0.2;
        }
        
        if (contentAnalysis.keywords.some(k => ['search', 'find', 'query'].includes(k))) {
            purpose.secondary.push('search');
            purpose.confidence += 0.1;
        }
        
        if (contentAnalysis.keywords.some(k => ['save', 'submit', 'send'].includes(k))) {
            purpose.secondary.push('form-submission');
            purpose.confidence += 0.1;
        }
        
        // Enhance based on structural context
        if (structuralContext.parentType === 'form') {
            purpose.secondary.push('form-element');
            purpose.confidence += 0.1;
        }
        
        return purpose;
    }

    /**
     * Extract business context
     */
    async extractBusinessContext(elementInfo, context) {
        const { textContent, className, dataAttributes } = elementInfo;
        
        return {
            domain: context.businessDomain || 'general',
            workflow: context.workflow || 'unknown',
            step: context.step || 'unknown',
            businessTerms: this.extractBusinessTerms(textContent, context.businessDomain),
            customAttributes: dataAttributes
        };
    }

    /**
     * Calculate semantic similarity between contexts
     */
    calculateSemanticSimilarity(targetContext, candidateAnalysis) {
        let similarity = 0;
        let weightSum = 0;
        
        // Compare element types
        if (targetContext.elementType && candidateAnalysis.semanticContext.elementType) {
            const typeMatch = targetContext.elementType === candidateAnalysis.semanticContext.elementType ? 1 : 0;
            similarity += typeMatch * 0.3;
            weightSum += 0.3;
        }
        
        // Compare purposes
        if (targetContext.purpose && candidateAnalysis.purpose) {
            const purposeMatch = this.comparePurposes(targetContext.purpose, candidateAnalysis.purpose);
            similarity += purposeMatch * 0.3;
            weightSum += 0.3;
        }
        
        // Compare content
        if (targetContext.content && candidateAnalysis.semanticContext.contentAnalysis) {
            const contentMatch = this.compareContent(targetContext.content, candidateAnalysis.semanticContext.contentAnalysis);
            similarity += contentMatch * 0.2;
            weightSum += 0.2;
        }
        
        // Compare business context
        if (targetContext.businessContext && candidateAnalysis.businessContext) {
            const businessMatch = this.compareBusinessContext(targetContext.businessContext, candidateAnalysis.businessContext);
            similarity += businessMatch * 0.2;
            weightSum += 0.2;
        }
        
        return weightSum > 0 ? similarity / weightSum : 0;
    }

    /**
     * Get interactive elements from page
     */
    async getInteractiveElements(page) {
        return await page.$$('button, input, select, textarea, a[href], [role="button"], [onclick], [tabindex]');
    }

    /**
     * Extract keywords from text
     */
    extractKeywords(text) {
        if (!text) return [];
        
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        // Remove common stop words
        const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        return words.filter(word => !stopWords.includes(word));
    }

    /**
     * Extract action words
     */
    extractActionWords(text) {
        if (!text) return [];
        
        const actionWords = ['click', 'submit', 'save', 'send', 'search', 'find', 'create', 'delete', 'edit', 'update', 'cancel', 'continue', 'next', 'previous', 'back'];
        const words = text.toLowerCase().split(/\s+/);
        
        return words.filter(word => actionWords.includes(word));
    }

    /**
     * Extract domain-specific terms
     */
    extractDomainTerms(text) {
        // This would be enhanced with domain-specific dictionaries
        return [];
    }

    /**
     * Extract business terms based on domain
     */
    extractBusinessTerms(text, domain) {
        if (!text || !domain) return [];
        
        // Domain-specific term extraction would go here
        return [];
    }

    /**
     * Analyze sentiment of text
     */
    analyzeSentiment(text) {
        if (!text) return 'neutral';
        
        const positiveWords = ['save', 'submit', 'continue', 'next', 'ok', 'yes', 'accept', 'agree'];
        const negativeWords = ['cancel', 'delete', 'remove', 'no', 'reject', 'decline'];
        
        const words = text.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    /**
     * Calculate accessibility score
     */
    calculateAccessibilityScore(elementInfo) {
        let score = 0;
        
        if (elementInfo.role) score += 0.25;
        if (elementInfo.ariaLabel) score += 0.25;
        if (elementInfo.ariaLabelledBy) score += 0.25;
        if (elementInfo.title || elementInfo.alt) score += 0.25;
        
        return score;
    }

    /**
     * Calculate confidence score
     */
    calculateConfidence(semanticContext, purpose) {
        let confidence = 0.5; // Base confidence
        
        if (semanticContext.elementType !== 'unknown') confidence += 0.2;
        if (semanticContext.contentAnalysis.hasText) confidence += 0.1;
        if (semanticContext.accessibilityContext.accessibilityScore > 0.5) confidence += 0.1;
        if (purpose.confidence > 0.7) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Compare purposes
     */
    comparePurposes(purpose1, purpose2) {
        if (purpose1.primary === purpose2.primary) {
            return 1.0;
        }
        
        // Check for secondary purpose matches
        const commonSecondary = purpose1.secondary.filter(s => purpose2.secondary.includes(s));
        return commonSecondary.length / Math.max(purpose1.secondary.length, purpose2.secondary.length, 1);
    }

    /**
     * Compare content analysis
     */
    compareContent(content1, content2) {
        let similarity = 0;
        let count = 0;
        
        // Compare keywords
        if (content1.keywords && content2.keywords) {
            const commonKeywords = content1.keywords.filter(k => content2.keywords.includes(k));
            similarity += commonKeywords.length / Math.max(content1.keywords.length, content2.keywords.length, 1);
            count++;
        }
        
        // Compare action words
        if (content1.actionWords && content2.actionWords) {
            const commonActions = content1.actionWords.filter(a => content2.actionWords.includes(a));
            similarity += commonActions.length / Math.max(content1.actionWords.length, content2.actionWords.length, 1);
            count++;
        }
        
        return count > 0 ? similarity / count : 0;
    }

    /**
     * Compare business contexts
     */
    compareBusinessContext(context1, context2) {
        let similarity = 0;
        let count = 0;
        
        if (context1.domain === context2.domain) {
            similarity += 1;
        }
        count++;
        
        if (context1.workflow === context2.workflow) {
            similarity += 1;
        }
        count++;
        
        return count > 0 ? similarity / count : 0;
    }

    /**
     * Check if text matches patterns
     */
    matchesPattern(text, patterns) {
        if (!patterns || !text) return false;
        return patterns.some(pattern => pattern.test(text));
    }

    /**
     * Clear semantic cache
     */
    clearCache() {
        this.semanticCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cacheSize: this.semanticCache.size,
            cacheEnabled: this.options.enableCaching
        };
    }
}

module.exports = SemanticContextAnalyzer;