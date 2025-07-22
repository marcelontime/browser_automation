const crypto = require('crypto');

/**
 * Visual Similarity Matcher for element recovery
 * Implements visual fingerprinting and similarity matching
 */
class VisualSimilarityMatcher {
    constructor(options = {}) {
        this.options = {
            similarityThreshold: options.similarityThreshold || 0.8,
            maxCandidates: options.maxCandidates || 10,
            hashSize: options.hashSize || 8,
            enableCaching: options.enableCaching !== false,
            ...options
        };
        
        this.visualCache = new Map();
        this.hashCache = new Map();
    }

    /**
     * Create visual fingerprint for an element
     */
    async createVisualFingerprint(page, element, context = {}) {
        try {
            // Get element bounding box
            const boundingBox = await element.boundingBox();
            if (!boundingBox) {
                throw new Error('Element has no bounding box');
            }

            // Take screenshot of the element
            const elementScreenshot = await element.screenshot({
                type: 'png'
            });

            // Generate visual hash
            const visualHash = this.generateVisualHash(elementScreenshot);

            // Get surrounding context
            const surroundingContext = await this.getSurroundingContext(page, element, boundingBox);

            // Extract visual features
            const visualFeatures = await this.extractVisualFeatures(elementScreenshot, boundingBox);

            const fingerprint = {
                screenshot: elementScreenshot.toString('base64'),
                boundingBox,
                visualHash,
                surroundingContext,
                visualFeatures,
                timestamp: Date.now(),
                pageUrl: await page.url(),
                viewport: await page.viewportSize()
            };

            // Cache the fingerprint
            if (this.options.enableCaching) {
                this.cacheVisualFingerprint(context.selector, fingerprint);
            }

            return fingerprint;

        } catch (error) {
            throw new Error(`Failed to create visual fingerprint: ${error.message}`);
        }
    }

    /**
     * Find elements by visual similarity
     */
    async findBySimilarity(page, targetFingerprint, options = {}) {
        const threshold = options.threshold || this.options.similarityThreshold;
        const maxCandidates = options.maxCandidates || this.options.maxCandidates;

        try {
            // Get all visible elements on the page
            const candidates = await this.getAllVisibleElements(page);

            // Score candidates by visual similarity
            const scoredCandidates = [];

            for (const candidate of candidates) {
                try {
                    const candidateFingerprint = await this.createVisualFingerprint(page, candidate);
                    const similarity = this.calculateSimilarity(targetFingerprint, candidateFingerprint);

                    if (similarity >= threshold) {
                        scoredCandidates.push({
                            element: candidate,
                            similarity,
                            fingerprint: candidateFingerprint
                        });
                    }
                } catch (error) {
                    // Skip candidates that can't be processed
                    continue;
                }
            }

            // Sort by similarity score and return top candidates
            return scoredCandidates
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, maxCandidates);

        } catch (error) {
            throw new Error(`Visual similarity search failed: ${error.message}`);
        }
    }

    /**
     * Calculate similarity between two visual fingerprints
     */
    calculateSimilarity(fingerprint1, fingerprint2) {
        let totalScore = 0;
        let weightSum = 0;

        // Visual hash similarity (weight: 0.4)
        const hashSimilarity = this.calculateHashSimilarity(
            fingerprint1.visualHash,
            fingerprint2.visualHash
        );
        totalScore += hashSimilarity * 0.4;
        weightSum += 0.4;

        // Bounding box similarity (weight: 0.2)
        const boxSimilarity = this.calculateBoundingBoxSimilarity(
            fingerprint1.boundingBox,
            fingerprint2.boundingBox
        );
        totalScore += boxSimilarity * 0.2;
        weightSum += 0.2;

        // Visual features similarity (weight: 0.3)
        const featuresSimilarity = this.calculateFeaturesSimilarity(
            fingerprint1.visualFeatures,
            fingerprint2.visualFeatures
        );
        totalScore += featuresSimilarity * 0.3;
        weightSum += 0.3;

        // Context similarity (weight: 0.1)
        const contextSimilarity = this.calculateContextSimilarity(
            fingerprint1.surroundingContext,
            fingerprint2.surroundingContext
        );
        totalScore += contextSimilarity * 0.1;
        weightSum += 0.1;

        return weightSum > 0 ? totalScore / weightSum : 0;
    }

    /**
     * Generate visual hash for image data
     */
    generateVisualHash(imageBuffer) {
        // Simple perceptual hash implementation
        // In production, use a more sophisticated algorithm like pHash
        const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
        return hash.substring(0, 16); // Use first 16 characters
    }

    /**
     * Calculate hash similarity using Hamming distance
     */
    calculateHashSimilarity(hash1, hash2) {
        if (!hash1 || !hash2 || hash1.length !== hash2.length) {
            return 0;
        }

        let differences = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] !== hash2[i]) {
                differences++;
            }
        }

        return 1 - (differences / hash1.length);
    }

    /**
     * Calculate bounding box similarity
     */
    calculateBoundingBoxSimilarity(box1, box2) {
        if (!box1 || !box2) {
            return 0;
        }

        // Calculate area overlap
        const overlap = this.calculateOverlap(box1, box2);
        const union = (box1.width * box1.height) + (box2.width * box2.height) - overlap;
        
        if (union === 0) {
            return 1;
        }

        const iou = overlap / union; // Intersection over Union

        // Also consider size similarity
        const sizeSimilarity = Math.min(
            (box1.width * box1.height) / (box2.width * box2.height),
            (box2.width * box2.height) / (box1.width * box1.height)
        );

        return (iou + sizeSimilarity) / 2;
    }

    /**
     * Calculate overlap between two bounding boxes
     */
    calculateOverlap(box1, box2) {
        const x1 = Math.max(box1.x, box2.x);
        const y1 = Math.max(box1.y, box2.y);
        const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
        const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

        if (x2 <= x1 || y2 <= y1) {
            return 0;
        }

        return (x2 - x1) * (y2 - y1);
    }

    /**
     * Extract visual features from element screenshot
     */
    async extractVisualFeatures(imageBuffer, boundingBox) {
        // Placeholder for visual feature extraction
        // In production, implement actual feature extraction (edges, corners, colors, etc.)
        
        const features = {
            width: boundingBox.width,
            height: boundingBox.height,
            aspectRatio: boundingBox.width / boundingBox.height,
            area: boundingBox.width * boundingBox.height,
            // Add more sophisticated features like:
            // - Color histogram
            // - Edge density
            // - Corner points
            // - Texture features
            timestamp: Date.now()
        };

        return features;
    }

    /**
     * Calculate features similarity
     */
    calculateFeaturesSimilarity(features1, features2) {
        if (!features1 || !features2) {
            return 0;
        }

        let similarity = 0;
        let count = 0;

        // Compare aspect ratio
        if (features1.aspectRatio && features2.aspectRatio) {
            const aspectSimilarity = 1 - Math.abs(features1.aspectRatio - features2.aspectRatio) / 
                Math.max(features1.aspectRatio, features2.aspectRatio);
            similarity += aspectSimilarity;
            count++;
        }

        // Compare area (normalized)
        if (features1.area && features2.area) {
            const areaSimilarity = Math.min(features1.area, features2.area) / 
                Math.max(features1.area, features2.area);
            similarity += areaSimilarity;
            count++;
        }

        return count > 0 ? similarity / count : 0;
    }

    /**
     * Get surrounding context for an element
     */
    async getSurroundingContext(page, element, boundingBox) {
        try {
            // Get parent element info
            const parent = await element.evaluateHandle(el => el.parentElement);
            const parentInfo = parent ? await this.getElementInfo(parent) : null;

            // Get sibling elements
            const siblings = await element.evaluateHandle(el => 
                Array.from(el.parentElement?.children || [])
                    .filter(child => child !== el)
                    .slice(0, 5) // Limit to 5 siblings
            );
            const siblingInfo = siblings ? await this.getElementsInfo(siblings) : [];

            // Get nearby elements by position
            const nearbyElements = await this.getNearbyElements(page, boundingBox);

            return {
                parent: parentInfo,
                siblings: siblingInfo,
                nearby: nearbyElements,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                parent: null,
                siblings: [],
                nearby: [],
                error: error.message
            };
        }
    }

    /**
     * Calculate context similarity
     */
    calculateContextSimilarity(context1, context2) {
        if (!context1 || !context2) {
            return 0;
        }

        let similarity = 0;
        let count = 0;

        // Compare parent similarity
        if (context1.parent && context2.parent) {
            const parentSimilarity = this.compareElementInfo(context1.parent, context2.parent);
            similarity += parentSimilarity;
            count++;
        }

        // Compare siblings similarity
        if (context1.siblings && context2.siblings) {
            const siblingsSimilarity = this.compareSiblings(context1.siblings, context2.siblings);
            similarity += siblingsSimilarity;
            count++;
        }

        return count > 0 ? similarity / count : 0;
    }

    /**
     * Get all visible elements on the page
     */
    async getAllVisibleElements(page) {
        return await page.$$('*:visible');
    }

    /**
     * Get element information
     */
    async getElementInfo(elementHandle) {
        try {
            return await elementHandle.evaluate(el => ({
                tagName: el.tagName.toLowerCase(),
                className: el.className,
                id: el.id,
                textContent: el.textContent?.trim().substring(0, 100),
                attributes: Array.from(el.attributes).reduce((acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                }, {})
            }));
        } catch (error) {
            return null;
        }
    }

    /**
     * Get information for multiple elements
     */
    async getElementsInfo(elementsHandle) {
        try {
            return await elementsHandle.evaluate(elements => 
                elements.map(el => ({
                    tagName: el.tagName.toLowerCase(),
                    className: el.className,
                    id: el.id,
                    textContent: el.textContent?.trim().substring(0, 50)
                }))
            );
        } catch (error) {
            return [];
        }
    }

    /**
     * Get nearby elements by position
     */
    async getNearbyElements(page, boundingBox, radius = 50) {
        try {
            const centerX = boundingBox.x + boundingBox.width / 2;
            const centerY = boundingBox.y + boundingBox.height / 2;

            return await page.evaluate((cx, cy, r) => {
                const elements = Array.from(document.querySelectorAll('*'));
                const nearby = [];

                for (const el of elements) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) continue;

                    const elCenterX = rect.left + rect.width / 2;
                    const elCenterY = rect.top + rect.height / 2;
                    const distance = Math.sqrt(
                        Math.pow(elCenterX - cx, 2) + Math.pow(elCenterY - cy, 2)
                    );

                    if (distance <= r && distance > 0) {
                        nearby.push({
                            tagName: el.tagName.toLowerCase(),
                            className: el.className,
                            distance: Math.round(distance)
                        });
                    }
                }

                return nearby.slice(0, 10); // Limit to 10 nearby elements
            }, centerX, centerY, radius);

        } catch (error) {
            return [];
        }
    }

    /**
     * Compare element information
     */
    compareElementInfo(info1, info2) {
        if (!info1 || !info2) {
            return 0;
        }

        let similarity = 0;
        let count = 0;

        // Compare tag names
        if (info1.tagName === info2.tagName) {
            similarity += 1;
        }
        count++;

        // Compare class names
        if (info1.className && info2.className) {
            const classes1 = info1.className.split(' ').filter(c => c);
            const classes2 = info2.className.split(' ').filter(c => c);
            const commonClasses = classes1.filter(c => classes2.includes(c));
            const classSimilarity = commonClasses.length / Math.max(classes1.length, classes2.length);
            similarity += classSimilarity;
            count++;
        }

        // Compare IDs
        if (info1.id && info2.id) {
            similarity += info1.id === info2.id ? 1 : 0;
            count++;
        }

        return count > 0 ? similarity / count : 0;
    }

    /**
     * Compare siblings arrays
     */
    compareSiblings(siblings1, siblings2) {
        if (!siblings1 || !siblings2) {
            return 0;
        }

        const maxLength = Math.max(siblings1.length, siblings2.length);
        if (maxLength === 0) {
            return 1;
        }

        let matches = 0;
        for (let i = 0; i < Math.min(siblings1.length, siblings2.length); i++) {
            if (this.compareElementInfo(siblings1[i], siblings2[i]) > 0.5) {
                matches++;
            }
        }

        return matches / maxLength;
    }

    /**
     * Cache visual fingerprint
     */
    cacheVisualFingerprint(selector, fingerprint) {
        if (!this.options.enableCaching) {
            return;
        }

        const cacheKey = this.generateCacheKey(selector, fingerprint.pageUrl);
        this.visualCache.set(cacheKey, {
            fingerprint,
            timestamp: Date.now()
        });

        // Clean old cache entries (keep last 100)
        if (this.visualCache.size > 100) {
            const entries = Array.from(this.visualCache.entries())
                .sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            this.visualCache.clear();
            entries.slice(0, 100).forEach(([key, value]) => {
                this.visualCache.set(key, value);
            });
        }
    }

    /**
     * Get cached visual fingerprint
     */
    getCachedFingerprint(selector, pageUrl) {
        if (!this.options.enableCaching) {
            return null;
        }

        const cacheKey = this.generateCacheKey(selector, pageUrl);
        const cached = this.visualCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
            return cached.fingerprint;
        }

        return null;
    }

    /**
     * Generate cache key
     */
    generateCacheKey(selector, pageUrl) {
        return crypto.createHash('md5')
            .update(`${selector}:${pageUrl}`)
            .digest('hex');
    }

    /**
     * Clear visual cache
     */
    clearCache() {
        this.visualCache.clear();
        this.hashCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            visualCacheSize: this.visualCache.size,
            hashCacheSize: this.hashCache.size,
            cacheEnabled: this.options.enableCaching
        };
    }
}

module.exports = VisualSimilarityMatcher;