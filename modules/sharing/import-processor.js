const { Variable, EnhancedAutomation } = require('../storage/models');
const crypto = require('crypto');
const zlib = require('zlib');

/**
 * 📥 IMPORT PROCESSOR
 * 
 * Processes shared automation packages with variable mapping and compatibility checking
 */
class ImportProcessor {
    constructor(variableStore, automationStore) {
        this.variableStore = variableStore;
        this.automationStore = automationStore;
        this.supportedVersions = ['1.0.0', '1.1.0'];
        this.requiredFeatures = ['basic-automation'];
    }

    /**
     * Import a shared automation package
     */
    async importAutomationPackage(packageData, options = {}) {
        try {
            const {
                customName = null,
                customDescription = null,
                variableMapping = {},
                conflictResolution = 'rename', // 'rename', 'skip', 'overwrite'
                validateOnly = false,
                userId = null
            } = options;

            // Step 1: Validate and decompress package
            const decompressedPackage = await this.validateAndDecompressPackage(packageData);
            
            // Step 2: Check compatibility
            const compatibilityCheck = await this.checkCompatibility(decompressedPackage);
            if (!compatibilityCheck.compatible) {
                throw new Error(`Incompatible package: ${compatibilityCheck.issues.join(', ')}`);
            }

            // Step 3: Analyze conflicts
            const conflictAnalysis = await this.analyzeConflicts(decompressedPackage, variableMapping);
            
            // Step 4: If validation only, return analysis
            if (validateOnly) {
                return {
                    valid: true,
                    compatibility: compatibilityCheck,
                    conflicts: conflictAnalysis,
                    preview: this.generateImportPreview(decompressedPackage, variableMapping)
                };
            }

            // Step 5: Process the import
            const importResult = await this.processImport(
                decompressedPackage, 
                variableMapping, 
                conflictResolution,
                { customName, customDescription, userId }
            );

            return {
                success: true,
                automation: importResult.automation,
                variables: importResult.variables,
                conflicts: conflictAnalysis,
                summary: this.generateImportSummary(importResult)
            };

        } catch (error) {
            console.error('Error importing automation package:', error);
            throw error;
        }
    }

    /**
     * Validate and decompress package data
     */
    async validateAndDecompressPackage(packageData) {
        try {
            let decompressed;

            // Check if data is compressed (base64 encoded)
            if (typeof packageData === 'string' && this.isBase64(packageData)) {
                decompressed = await this.decompressPackage(packageData);
            } else if (typeof packageData === 'string') {
                decompressed = JSON.parse(packageData);
            } else {
                decompressed = packageData;
            }

            // Validate package structure
            this.validatePackageStructure(decompressed);

            // Verify checksum if provided
            if (decompressed.checksum) {
                const calculatedChecksum = this.generateChecksum(decompressed);
                if (calculatedChecksum !== decompressed.checksum) {
                    console.warn('Package checksum mismatch - package may be corrupted');
                }
            }

            return decompressed;
        } catch (error) {
            throw new Error(`Invalid package format: ${error.message}`);
        }
    }

    /**
     * Check package compatibility
     */
    async checkCompatibility(packageData) {
        const issues = [];
        let compatible = true;

        // Check version compatibility
        if (packageData.version && !this.supportedVersions.includes(packageData.version)) {
            issues.push(`Unsupported version: ${packageData.version}`);
            compatible = false;
        }

        // Check required features
        if (packageData.metadata && packageData.metadata.compatibility) {
            const requiredFeatures = packageData.metadata.compatibility.features || [];
            const missingFeatures = requiredFeatures.filter(feature => 
                !this.requiredFeatures.includes(feature)
            );
            
            if (missingFeatures.length > 0) {
                issues.push(`Missing features: ${missingFeatures.join(', ')}`);
                compatible = false;
            }
        }

        // Check dependencies
        if (packageData.dependencies && packageData.dependencies.length > 0) {
            const unsupportedDeps = packageData.dependencies.filter(dep => 
                !this.isDependencySupported(dep)
            );
            
            if (unsupportedDeps.length > 0) {
                issues.push(`Unsupported dependencies: ${unsupportedDeps.map(d => d.name).join(', ')}`);
                // Dependencies might be warnings rather than hard failures
            }
        }

        return { compatible, issues };
    }

    /**
     * Analyze potential conflicts during import
     */
    async analyzeConflicts(packageData, variableMapping) {
        const conflicts = {
            automation: null,
            variables: [],
            summary: {
                total: 0,
                critical: 0,
                warnings: 0
            }
        };

        // Check for automation name conflicts
        if (packageData.name) {
            const existingAutomation = await this.automationStore.findByName(packageData.name);
            if (existingAutomation) {
                conflicts.automation = {
                    type: 'name_conflict',
                    existing: existingAutomation.name,
                    incoming: packageData.name,
                    severity: 'warning'
                };
                conflicts.summary.warnings++;
            }
        }

        // Check for variable conflicts
        if (packageData.variables && packageData.variables.length > 0) {
            for (const variable of packageData.variables) {
                const mappedName = variableMapping[variable.id] || variable.name;
                const conflict = await this.checkVariableConflict(variable, mappedName);
                
                if (conflict) {
                    conflicts.variables.push(conflict);
                    if (conflict.severity === 'critical') {
                        conflicts.summary.critical++;
                    } else {
                        conflicts.summary.warnings++;
                    }
                }
            }
        }

        conflicts.summary.total = conflicts.summary.critical + conflicts.summary.warnings;
        return conflicts;
    }

    /**
     * Check for individual variable conflicts
     */
    async checkVariableConflict(variable, mappedName) {
        // This would check against existing variables in the target automation
        // For now, we'll implement basic name conflict detection
        
        const conflict = {
            variableId: variable.id,
            originalName: variable.name,
            mappedName: mappedName,
            type: null,
            severity: 'warning',
            description: null
        };

        // Check for reserved names
        const reservedNames = ['id', 'name', 'type', 'value', 'system', 'admin'];
        if (reservedNames.includes(mappedName.toLowerCase())) {
            conflict.type = 'reserved_name';
            conflict.severity = 'critical';
            conflict.description = `"${mappedName}" is a reserved name and cannot be used`;
            return conflict;
        }

        // Check for invalid characters
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(mappedName)) {
            conflict.type = 'invalid_name';
            conflict.severity = 'critical';
            conflict.description = `"${mappedName}" contains invalid characters`;
            return conflict;
        }

        // Check for type compatibility issues
        if (variable.validation && variable.validation.pattern) {
            try {
                new RegExp(variable.validation.pattern);
            } catch (error) {
                conflict.type = 'invalid_validation';
                conflict.severity = 'warning';
                conflict.description = 'Variable has invalid validation pattern';
                return conflict;
            }
        }

        return null; // No conflicts found
    }

    /**
     * Process the actual import
     */
    async processImport(packageData, variableMapping, conflictResolution, options) {
        const { customName, customDescription, userId } = options;

        // Create the automation
        const automationData = {
            name: customName || this.resolveNameConflict(packageData.name, conflictResolution),
            description: customDescription || packageData.description,
            actions: packageData.actions || [],
            metadata: {
                imported: true,
                importedAt: new Date().toISOString(),
                originalPackage: {
                    id: packageData.id,
                    name: packageData.name,
                    version: packageData.version,
                    author: packageData.author
                },
                userId
            }
        };

        const automation = await this.automationStore.createAutomation(automationData);

        // Import variables
        const importedVariables = [];
        if (packageData.variables && packageData.variables.length > 0) {
            for (const variableData of packageData.variables) {
                try {
                    const mappedName = variableMapping[variableData.id] || variableData.name;
                    const resolvedName = this.resolveNameConflict(mappedName, conflictResolution);

                    const variable = await this.variableStore.createVariable(automation.id, {
                        ...variableData,
                        name: resolvedName,
                        value: '', // Don't import actual values for security
                        automationId: automation.id,
                        metadata: {
                            imported: true,
                            originalId: variableData.id,
                            originalName: variableData.name
                        }
                    });

                    importedVariables.push(variable);
                } catch (error) {
                    console.error(`Error importing variable ${variableData.name}:`, error);
                    // Continue with other variables
                }
            }
        }

        // Update automation with variable count
        automation.variableCount = importedVariables.length;
        await this.automationStore.updateAutomation(automation.id, { 
            variableCount: importedVariables.length 
        });

        return {
            automation,
            variables: importedVariables
        };
    }

    /**
     * Generate import preview
     */
    generateImportPreview(packageData, variableMapping) {
        return {
            automation: {
                name: packageData.name,
                description: packageData.description,
                stepCount: packageData.actions ? packageData.actions.length : 0,
                version: packageData.version,
                author: packageData.author
            },
            variables: packageData.variables ? packageData.variables.map(variable => ({
                originalName: variable.name,
                mappedName: variableMapping[variable.id] || variable.name,
                type: variable.type,
                required: variable.required,
                sensitive: variable.sensitive,
                description: variable.description
            })) : [],
            metadata: packageData.metadata,
            dependencies: packageData.dependencies || []
        };
    }

    /**
     * Generate import summary
     */
    generateImportSummary(importResult) {
        return {
            automation: {
                id: importResult.automation.id,
                name: importResult.automation.name,
                created: importResult.automation.created
            },
            variables: {
                imported: importResult.variables.length,
                successful: importResult.variables.filter(v => v.id).length,
                failed: importResult.variables.length - importResult.variables.filter(v => v.id).length
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Helper methods
     */
    async decompressPackage(compressedData) {
        return new Promise((resolve, reject) => {
            const buffer = Buffer.from(compressedData, 'base64');
            zlib.gunzip(buffer, (err, decompressed) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        resolve(JSON.parse(decompressed.toString()));
                    } catch (parseError) {
                        reject(parseError);
                    }
                }
            });
        });
    }

    validatePackageStructure(packageData) {
        const requiredFields = ['name', 'version'];
        const missingFields = requiredFields.filter(field => !packageData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate variables structure if present
        if (packageData.variables) {
            if (!Array.isArray(packageData.variables)) {
                throw new Error('Variables must be an array');
            }

            packageData.variables.forEach((variable, index) => {
                if (!variable.name || !variable.type) {
                    throw new Error(`Variable at index ${index} is missing required fields (name, type)`);
                }
            });
        }
    }

    isDependencySupported(dependency) {
        // Basic dependency support check
        const supportedDependencies = [
            'advanced-variables',
            'validation-engine',
            'file-upload',
            'date-picker'
        ];

        return supportedDependencies.includes(dependency.name);
    }

    resolveNameConflict(name, resolution) {
        switch (resolution) {
            case 'rename':
                return this.generateUniqueName(name);
            case 'skip':
                return null; // Indicates to skip this item
            case 'overwrite':
                return name; // Use original name, will overwrite existing
            default:
                return this.generateUniqueName(name);
        }
    }

    generateUniqueName(baseName) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${baseName}_imported_${timestamp}_${random}`;
    }

    generateChecksum(packageData) {
        const jsonString = JSON.stringify(packageData);
        return crypto.createHash('sha256').update(jsonString).digest('hex');
    }

    isBase64(str) {
        try {
            return btoa(atob(str)) === str;
        } catch (err) {
            return false;
        }
    }

    /**
     * Validate variable mapping
     */
    validateVariableMapping(packageData, variableMapping) {
        const errors = [];
        
        if (packageData.variables) {
            packageData.variables.forEach(variable => {
                const mappedName = variableMapping[variable.id];
                if (mappedName) {
                    // Validate mapped name
                    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(mappedName)) {
                        errors.push(`Invalid mapped name for ${variable.name}: ${mappedName}`);
                    }
                }
            });
        }

        return errors;
    }

    /**
     * Get import statistics
     */
    async getImportStatistics(timeRange = '30d') {
        // This would track import statistics over time
        // Implementation would depend on how statistics are stored
        return {
            totalImports: 0,
            successfulImports: 0,
            failedImports: 0,
            popularPackages: [],
            timeRange
        };
    }
}

module.exports = ImportProcessor;