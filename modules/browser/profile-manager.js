const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * 🌐 BROWSER PROFILE MANAGER
 * 
 * Manages persistent browser profiles with enhanced configuration options
 * Based on the sophisticated browser setup from Brazilian insurance automation
 */
class BrowserProfileManager {
    constructor() {
        this.profilesDir = path.join(__dirname, '../../profiles');
        this.tempProfilesDir = path.join(os.tmpdir(), 'browser-automation-profiles');
        this.activeProfiles = new Map();
        this.profileCleanupHandlers = new Map();
        
        this.defaultBrowserOptions = {
            headless: false,
            devtools: true,
            args: [
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-extensions',
                '--disable-popup-blocking',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--disable-background-mode',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-features=VizDisplayCompositor',
                '--start-maximized'
            ],
            ignoreDefaultArgs: ['--disable-extensions']
        };
        
        this.enhancedBrowserOptions = {
            // Enhanced options for Brazilian insurance automation
            timeout: 30000,
            slowMo: 100,
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            javaScriptEnabled: true,
            acceptDownloads: true,
            permissions: ['geolocation', 'notifications'],
            locale: 'pt-BR',
            timezoneId: 'America/Sao_Paulo'
        };
        
        this.initializeDirectories();
    }

    async initializeDirectories() {
        try {
            await fs.mkdir(this.profilesDir, { recursive: true });
            await fs.mkdir(this.tempProfilesDir, { recursive: true });
            console.log('📁 Browser profile directories initialized');
        } catch (error) {
            console.error('❌ Error initializing profile directories:', error.message);
        }
    }

    /**
     * Create a persistent browser profile
     * @param {string} profileName - Name of the profile
     * @param {Object} options - Profile configuration options
     * @returns {Promise<string>} Profile directory path
     */
    async createPersistentProfile(profileName = 'default', options = {}) {
        const profilePath = path.join(this.profilesDir, profileName);
        
        try {
            // Create profile directory
            await fs.mkdir(profilePath, { recursive: true });
            
            // Create profile configuration
            const profileConfig = {
                name: profileName,
                created: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
                options: {
                    ...this.defaultBrowserOptions,
                    ...options
                },
                userDataDir: profilePath,
                sessions: []
            };
            
            // Save profile configuration
            await fs.writeFile(
                path.join(profilePath, 'profile.json'),
                JSON.stringify(profileConfig, null, 2)
            );
            
            console.log(`✅ Created persistent profile: ${profileName}`);
            return profilePath;
            
        } catch (error) {
            console.error(`❌ Error creating persistent profile ${profileName}:`, error.message);
            throw error;
        }
    }

    /**
     * Create a temporary browser profile
     * @param {string} sessionId - Unique session identifier
     * @param {Object} options - Profile configuration options
     * @returns {Promise<string>} Temporary profile directory path
     */
    async createTemporaryProfile(sessionId = Date.now().toString(), options = {}) {
        const tempProfilePath = path.join(this.tempProfilesDir, `temp_${sessionId}`);
        
        try {
            // Create temporary profile directory
            await fs.mkdir(tempProfilePath, { recursive: true });
            
            // Create temporary profile configuration
            const tempProfileConfig = {
                sessionId,
                type: 'temporary',
                created: new Date().toISOString(),
                options: {
                    ...this.defaultBrowserOptions,
                    ...options
                },
                userDataDir: tempProfilePath,
                cleanup: true
            };
            
            // Save temporary profile configuration
            await fs.writeFile(
                path.join(tempProfilePath, 'temp_profile.json'),
                JSON.stringify(tempProfileConfig, null, 2)
            );
            
            // Register for cleanup
            this.activeProfiles.set(sessionId, tempProfilePath);
            
            // Set up cleanup handler
            const cleanupHandler = async () => {
                await this.cleanupTemporaryProfile(sessionId);
            };
            this.profileCleanupHandlers.set(sessionId, cleanupHandler);
            
            console.log(`✅ Created temporary profile: ${sessionId}`);
            return tempProfilePath;
            
        } catch (error) {
            console.error(`❌ Error creating temporary profile ${sessionId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get enhanced browser configuration for complex automation
     * @param {string} profilePath - Path to the profile directory
     * @param {Object} customOptions - Custom browser options
     * @returns {Object} Enhanced browser configuration
     */
    getEnhancedBrowserConfig(profilePath, customOptions = {}) {
        const config = {
            ...this.enhancedBrowserOptions,
            ...customOptions,
            userDataDir: profilePath,
            args: [
                ...this.defaultBrowserOptions.args,
                ...(customOptions.args || [])
            ]
        };
        
        // Add Brazilian localization for insurance automation
        if (customOptions.brazilianLocalization) {
            config.locale = 'pt-BR';
            config.timezoneId = 'America/Sao_Paulo';
            config.args.push('--lang=pt-BR');
        }
        
        // Add performance optimizations
        if (customOptions.performance) {
            config.args.push(
                '--disable-features=VizDisplayCompositor',
                '--disable-background-mode',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--max_old_space_size=4096'
            );
        }
        
        // Add debugging options
        if (customOptions.debug) {
            config.devtools = true;
            config.slowMo = 500;
            config.args.push('--auto-open-devtools-for-tabs');
        }
        
        return config;
    }

    /**
     * Get Stagehand-compatible configuration
     * @param {string} profilePath - Path to the profile directory
     * @param {Object} customOptions - Custom configuration options
     * @returns {Object} Stagehand-compatible configuration
     */
    getStagehandConfig(profilePath, customOptions = {}) {
        const baseConfig = this.getEnhancedBrowserConfig(profilePath, customOptions);
        
        return {
            env: 'LOCAL',
            headless: baseConfig.headless,
            modelName: 'gpt-4o',
            modelClientOptions: {
                apiKey: customOptions.openaiApiKey || process.env.OPENAI_API_KEY
            },
            verbose: customOptions.verbose || 1,
            domSettleTimeoutMs: customOptions.domSettleTimeoutMs || 1000,
            browserOptions: {
                userDataDir: profilePath,
                args: baseConfig.args,
                viewport: baseConfig.viewport,
                locale: baseConfig.locale,
                timezoneId: baseConfig.timezoneId
            }
        };
    }

    /**
     * Update profile last used timestamp
     * @param {string} profileName - Name of the profile
     */
    async updateProfileLastUsed(profileName) {
        try {
            const profilePath = path.join(this.profilesDir, profileName);
            const configPath = path.join(profilePath, 'profile.json');
            
            const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
            config.lastUsed = new Date().toISOString();
            
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error(`❌ Error updating profile last used: ${error.message}`);
        }
    }

    /**
     * Clean up temporary profile
     * @param {string} sessionId - Session identifier
     */
    async cleanupTemporaryProfile(sessionId) {
        try {
            const profilePath = this.activeProfiles.get(sessionId);
            if (!profilePath) return;
            
            // Remove from active profiles
            this.activeProfiles.delete(sessionId);
            this.profileCleanupHandlers.delete(sessionId);
            
            // Remove directory
            await fs.rm(profilePath, { recursive: true, force: true });
            
            console.log(`🧹 Cleaned up temporary profile: ${sessionId}`);
        } catch (error) {
            console.error(`❌ Error cleaning up temporary profile ${sessionId}:`, error.message);
        }
    }

    /**
     * Clean up all temporary profiles
     */
    async cleanupAllTemporaryProfiles() {
        try {
            const sessionIds = Array.from(this.activeProfiles.keys());
            
            for (const sessionId of sessionIds) {
                await this.cleanupTemporaryProfile(sessionId);
            }
            
            console.log('🧹 All temporary profiles cleaned up');
        } catch (error) {
            console.error('❌ Error cleaning up all temporary profiles:', error.message);
        }
    }

    /**
     * List all available profiles
     * @returns {Promise<Array>} Array of profile information
     */
    async listProfiles() {
        try {
            const profiles = [];
            const profileDirs = await fs.readdir(this.profilesDir);
            
            for (const dir of profileDirs) {
                const configPath = path.join(this.profilesDir, dir, 'profile.json');
                
                try {
                    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
                    profiles.push({
                        name: config.name,
                        created: config.created,
                        lastUsed: config.lastUsed,
                        path: path.join(this.profilesDir, dir)
                    });
                } catch (error) {
                    console.error(`❌ Error reading profile config for ${dir}:`, error.message);
                }
            }
            
            return profiles;
        } catch (error) {
            console.error('❌ Error listing profiles:', error.message);
            return [];
        }
    }

    /**
     * Delete a persistent profile
     * @param {string} profileName - Name of the profile to delete
     */
    async deleteProfile(profileName) {
        try {
            const profilePath = path.join(this.profilesDir, profileName);
            await fs.rm(profilePath, { recursive: true, force: true });
            
            console.log(`🗑️ Deleted profile: ${profileName}`);
        } catch (error) {
            console.error(`❌ Error deleting profile ${profileName}:`, error.message);
            throw error;
        }
    }

    async cleanupProfile(profilePath) {
        try {
            if (!profilePath) {
                return;
            }

            console.log(`🧹 Cleaning up browser profile: ${profilePath}`);
            
            // Check if profile directory exists
            if (await fs.access(profilePath).then(() => true).catch(() => false)) {
                // Remove the profile directory
                await fs.rmdir(profilePath, { recursive: true });
                console.log(`✅ Browser profile cleaned up: ${profilePath}`);
            } else {
                console.log(`⚠️ Profile directory not found: ${profilePath}`);
            }
            
        } catch (error) {
            console.error(`❌ Error cleaning up browser profile ${profilePath}:`, error.message);
        }
    }

    /**
     * Set up cleanup handlers for process termination
     */
    setupCleanupHandlers() {
        const cleanup = async () => {
            console.log('🧹 Starting profile cleanup...');
            await this.cleanupAllTemporaryProfiles();
            process.exit(0);
        };
        
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('uncaughtException', cleanup);
    }

    /**
     * Get profile statistics
     * @returns {Object} Profile statistics
     */
    async getProfileStats() {
        const profiles = await this.listProfiles();
        const activeProfiles = this.activeProfiles.size;
        
        return {
            totalProfiles: profiles.length,
            activeTemporaryProfiles: activeProfiles,
            profilesDirectory: this.profilesDir,
            tempProfilesDirectory: this.tempProfilesDir,
            profiles: profiles.map(p => ({
                name: p.name,
                created: p.created,
                lastUsed: p.lastUsed
            }))
        };
    }
}

module.exports = BrowserProfileManager; 