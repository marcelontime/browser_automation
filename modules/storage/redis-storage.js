const IORedis = require('ioredis');

/**
 * 🗄️ REDIS STORAGE MANAGER
 * 
 * Manages Redis-based storage for automations, variables, and recording sessions
 * Provides structured data storage with proper indexing and relationships
 */
class RedisStorageManager {
    constructor(options = {}) {
        this.options = {
            host: options.host || 'localhost',
            port: options.port || 6379,
            db: options.db || 0,
            keyPrefix: options.keyPrefix || 'browser_automation:',
            ...options
        };
        
        this.redis = null;
        this.connected = false;
        this.fallbackToMemory = options.fallbackToMemory !== false;
        
        // In-memory fallback storage
        this.memoryStorage = {
            automations: new Map(),
            variables: new Map(),
            recordingSessions: new Map(),
            sharedAutomations: new Map(),
            variableUsage: new Map()
        };
    }

    async connect() {
        try {
            this.redis = new IORedis(this.options);
            
            this.redis.on('connect', () => {
                console.log('✅ Redis connected for automation storage');
                this.connected = true;
            });
            
            this.redis.on('error', (error) => {
                console.error('❌ Redis connection error:', error.message);
                this.connected = false;
                if (this.fallbackToMemory) {
                    console.log('⚠️ Falling back to in-memory storage');
                }
            });
            
            this.redis.on('close', () => {
                console.log('🔌 Redis connection closed');
                this.connected = false;
            });
            
            // Test connection
            await this.redis.ping();
            console.log('🏓 Redis ping successful');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to connect to Redis:', error.message);
            if (this.fallbackToMemory) {
                console.log('⚠️ Using in-memory storage as fallback');
                return true;
            }
            throw error;
        }
    }

    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
            this.redis = null;
            this.connected = false;
            console.log('👋 Redis disconnected');
        }
    }

    // Helper method to get storage key
    getKey(type, id = '') {
        return `${this.options.keyPrefix}${type}${id ? ':' + id : ''}`;
    }

    // Generic storage methods
    async set(key, value, ttl = null) {
        const fullKey = this.getKey(key);
        
        if (this.connected && this.redis) {
            const serialized = JSON.stringify(value);
            if (ttl) {
                await this.redis.setex(fullKey, ttl, serialized);
            } else {
                await this.redis.set(fullKey, serialized);
            }
        } else if (this.fallbackToMemory) {
            // Store in appropriate memory collection
            const [type, id] = key.split(':');
            if (this.memoryStorage[type]) {
                this.memoryStorage[type].set(id || key, value);
            }
        }
    }

    async get(key) {
        const fullKey = this.getKey(key);
        
        if (this.connected && this.redis) {
            const result = await this.redis.get(fullKey);
            return result ? JSON.parse(result) : null;
        } else if (this.fallbackToMemory) {
            const [type, id] = key.split(':');
            if (this.memoryStorage[type]) {
                return this.memoryStorage[type].get(id || key) || null;
            }
        }
        
        return null;
    }

    async delete(key) {
        const fullKey = this.getKey(key);
        
        if (this.connected && this.redis) {
            await this.redis.del(fullKey);
        } else if (this.fallbackToMemory) {
            const [type, id] = key.split(':');
            if (this.memoryStorage[type]) {
                this.memoryStorage[type].delete(id || key);
            }
        }
    }

    async exists(key) {
        const fullKey = this.getKey(key);
        
        if (this.connected && this.redis) {
            return await this.redis.exists(fullKey) === 1;
        } else if (this.fallbackToMemory) {
            const [type, id] = key.split(':');
            if (this.memoryStorage[type]) {
                return this.memoryStorage[type].has(id || key);
            }
        }
        
        return false;
    }

    // Automation storage methods
    async saveAutomation(automation) {
        const key = `automations:${automation.id}`;
        await this.set(key, automation);
        
        // Add to automation index
        await this.addToIndex('automation_index', automation.id, {
            name: automation.name,
            created: automation.created || new Date().toISOString(),
            variableCount: automation.variableCount || 0
        });
        
        console.log(`💾 Automation saved: ${automation.name} (${automation.id})`);
    }

    async getAutomation(automationId) {
        return await this.get(`automations:${automationId}`);
    }

    async deleteAutomation(automationId) {
        await this.delete(`automations:${automationId}`);
        await this.removeFromIndex('automation_index', automationId);
        
        // Delete associated variables
        const variables = await this.getVariablesByAutomation(automationId);
        for (const variable of variables) {
            await this.deleteVariable(variable.id);
        }
        
        console.log(`🗑️ Automation deleted: ${automationId}`);
    }

    async getAllAutomations() {
        const index = await this.getIndex('automation_index');
        const automations = [];
        
        for (const automationId of Object.keys(index)) {
            const automation = await this.getAutomation(automationId);
            if (automation) {
                automations.push(automation);
            }
        }
        
        return automations;
    }

    // Variable storage methods
    async saveVariable(variable) {
        const key = `variables:${variable.id}`;
        await this.set(key, variable);
        
        // Add to variable index by automation
        await this.addToIndex(`variables_by_automation:${variable.automationId}`, variable.id, {
            name: variable.name,
            type: variable.type,
            required: variable.required || false
        });
        
        console.log(`💾 Variable saved: ${variable.name} (${variable.id})`);
    }

    async getVariable(variableId) {
        return await this.get(`variables:${variableId}`);
    }

    async deleteVariable(variableId) {
        const variable = await this.getVariable(variableId);
        if (variable) {
            await this.delete(`variables:${variableId}`);
            await this.removeFromIndex(`variables_by_automation:${variable.automationId}`, variableId);
            console.log(`🗑️ Variable deleted: ${variableId}`);
        }
    }

    async getVariablesByAutomation(automationId) {
        const index = await this.getIndex(`variables_by_automation:${automationId}`);
        const variables = [];
        
        for (const variableId of Object.keys(index)) {
            const variable = await this.getVariable(variableId);
            if (variable) {
                variables.push(variable);
            }
        }
        
        return variables;
    }

    // Recording session storage methods
    async saveRecordingSession(session) {
        const key = `recording_sessions:${session.id}`;
        await this.set(key, session);
        console.log(`📹 Recording session saved: ${session.id}`);
    }

    async getRecordingSession(sessionId) {
        return await this.get(`recording_sessions:${sessionId}`);
    }

    async deleteRecordingSession(sessionId) {
        await this.delete(`recording_sessions:${sessionId}`);
        console.log(`🗑️ Recording session deleted: ${sessionId}`);
    }

    // Variable usage tracking
    async trackVariableUsage(usage) {
        const key = `variable_usage:${usage.id}`;
        await this.set(key, usage);
        
        // Add to usage index by variable
        await this.addToIndex(`usage_by_variable:${usage.variableId}`, usage.id, {
            executionTime: usage.executionTime,
            success: usage.success
        });
    }

    async getVariableUsage(variableId) {
        const index = await this.getIndex(`usage_by_variable:${variableId}`);
        const usageRecords = [];
        
        for (const usageId of Object.keys(index)) {
            const usage = await this.get(`variable_usage:${usageId}`);
            if (usage) {
                usageRecords.push(usage);
            }
        }
        
        return usageRecords;
    }

    // Shared automation storage
    async saveSharedAutomation(sharedAutomation) {
        const key = `shared_automations:${sharedAutomation.id}`;
        await this.set(key, sharedAutomation);
        
        await this.addToIndex('shared_automation_index', sharedAutomation.id, {
            name: sharedAutomation.name,
            author: sharedAutomation.author,
            created: sharedAutomation.created,
            downloadCount: sharedAutomation.downloadCount || 0
        });
        
        console.log(`🔗 Shared automation saved: ${sharedAutomation.name}`);
    }

    async getSharedAutomation(sharedId) {
        return await this.get(`shared_automations:${sharedId}`);
    }

    async getAllSharedAutomations() {
        const index = await this.getIndex('shared_automation_index');
        const sharedAutomations = [];
        
        for (const sharedId of Object.keys(index)) {
            const shared = await this.getSharedAutomation(sharedId);
            if (shared) {
                sharedAutomations.push(shared);
            }
        }
        
        return sharedAutomations;
    }

    // Index management methods
    async addToIndex(indexName, id, metadata) {
        const indexKey = this.getKey(`index:${indexName}`);
        
        if (this.connected && this.redis) {
            await this.redis.hset(indexKey, id, JSON.stringify(metadata));
        } else if (this.fallbackToMemory) {
            if (!this.memoryStorage.indexes) {
                this.memoryStorage.indexes = new Map();
            }
            if (!this.memoryStorage.indexes.has(indexName)) {
                this.memoryStorage.indexes.set(indexName, new Map());
            }
            this.memoryStorage.indexes.get(indexName).set(id, metadata);
        }
    }

    async removeFromIndex(indexName, id) {
        const indexKey = this.getKey(`index:${indexName}`);
        
        if (this.connected && this.redis) {
            await this.redis.hdel(indexKey, id);
        } else if (this.fallbackToMemory) {
            if (this.memoryStorage.indexes && this.memoryStorage.indexes.has(indexName)) {
                this.memoryStorage.indexes.get(indexName).delete(id);
            }
        }
    }

    async getIndex(indexName) {
        const indexKey = this.getKey(`index:${indexName}`);
        
        if (this.connected && this.redis) {
            const result = await this.redis.hgetall(indexKey);
            const parsed = {};
            for (const [key, value] of Object.entries(result)) {
                parsed[key] = JSON.parse(value);
            }
            return parsed;
        } else if (this.fallbackToMemory) {
            if (this.memoryStorage.indexes && this.memoryStorage.indexes.has(indexName)) {
                const index = this.memoryStorage.indexes.get(indexName);
                const result = {};
                for (const [key, value] of index.entries()) {
                    result[key] = value;
                }
                return result;
            }
        }
        
        return {};
    }

    // Utility methods
    async getStorageStats() {
        const stats = {
            connected: this.connected,
            storage: this.connected ? 'redis' : 'memory',
            automations: 0,
            variables: 0,
            recordingSessions: 0,
            sharedAutomations: 0
        };

        if (this.connected && this.redis) {
            const keys = await this.redis.keys(this.getKey('*'));
            stats.totalKeys = keys.length;
            
            // Count by type
            for (const key of keys) {
                if (key.includes(':automations:')) stats.automations++;
                else if (key.includes(':variables:')) stats.variables++;
                else if (key.includes(':recording_sessions:')) stats.recordingSessions++;
                else if (key.includes(':shared_automations:')) stats.sharedAutomations++;
            }
        } else if (this.fallbackToMemory) {
            stats.automations = this.memoryStorage.automations.size;
            stats.variables = this.memoryStorage.variables.size;
            stats.recordingSessions = this.memoryStorage.recordingSessions.size;
            stats.sharedAutomations = this.memoryStorage.sharedAutomations.size;
        }

        return stats;
    }

    async clearAll() {
        if (this.connected && this.redis) {
            const keys = await this.redis.keys(this.getKey('*'));
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } else if (this.fallbackToMemory) {
            for (const collection of Object.values(this.memoryStorage)) {
                if (collection instanceof Map) {
                    collection.clear();
                }
            }
        }
        
        console.log('🧹 All storage cleared');
    }
}

module.exports = RedisStorageManager;