// Model Manager - Centrální správa AI modelů
// Verze: 3.0 - Opravená verze bez duplikací, plně async

// Custom error classes
class ModelError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'ModelError';
        this.code = code;
        this.details = details;
    }
}

class APIError extends ModelError {
    constructor(message, statusCode, provider) {
        super(message, 'API_ERROR', { statusCode, provider });
        this.name = 'APIError';
    }
}

class ConfigurationError extends ModelError {
    constructor(message, missingConfig) {
        super(message, 'CONFIG_ERROR', { missingConfig });
        this.name = 'ConfigurationError';
    }
}

class ModelManager {
    constructor() {
        this.models = new Map();
        this.activeModel = null;
        this.initialized = false;
        this.initPromise = null;
        // Cache pro API klíče
        this.apiKeyCache = new Map();
    }

    // Registrace modelu
    registerModel(modelId, modelInstance) {
        console.log(`📦 Registering model: ${modelId}`);
        this.models.set(modelId, modelInstance);
    }

    // Inicializace - pouze jednou
    async initialize() {
        // Pokud už běží inicializace, vrátit existující promise
        if (this.initPromise) {
            return this.initPromise;
        }
        
        // Pokud už je inicializováno, vrátit resolved promise
        if (this.initialized) {
            return Promise.resolve();
        }
        
        // Spustit inicializaci
        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    // Skutečná inicializace
    async _doInitialize() {
        try {
            console.log('🤖 Initializing Model Manager...');
            
            // Počkat na Security Manager
            if (window.security && !window.security.initialized) {
                await window.security.waitForInit();
            }
            
            // Načíst uložený model nebo použít výchozí
            const savedModel = localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.SELECTED_MODEL);
            const defaultModel = window.CONFIG?.MODELS?.DEFAULT || 'gpt-3.5-turbo';
            const modelToUse = savedModel || defaultModel;
            
            // Ověřit že model je viditelný
            const model = this.models.get(modelToUse);
            if (model && model.visible) {
                await this.setActiveModel(modelToUse);
            } else {
                // Najít první viditelný model
                const visibleModel = this.getFirstVisibleModel();
                if (visibleModel) {
                    console.log(`⚠️ Requested model '${modelToUse}' not visible, using '${visibleModel.id}'`);
                    await this.setActiveModel(visibleModel.id);
                } else {
                    throw new ConfigurationError('No visible models available', 'VISIBLE_MODELS');
                }
            }
            
            this.initialized = true;
            console.log('✅ Model Manager ready');
            
        } catch (error) {
            console.error('❌ Model Manager initialization failed:', error);
            this.initPromise = null; // Reset pro možnost opakování
            throw error;
        }
    }

    // Najít první viditelný model
    getFirstVisibleModel() {
        for (const [id, model] of this.models) {
            if (model.visible) {
                return { id, model };
            }
        }
        return null;
    }

    // Nastavit aktivní model
    async setActiveModel(modelId) {
        if (!this.models.has(modelId)) {
            throw new ConfigurationError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }

        const model = this.models.get(modelId);
        
        // Kontrola viditelnosti
        if (!model.visible) {
            throw new ConfigurationError(`Model not visible: ${modelId}`, 'MODEL_NOT_VISIBLE');
        }

        console.log(`🔄 Switching to model: ${modelId}`);
        
        // Kontrola API klíče
        const hasApiKey = await this.checkApiKey(model.provider);
        if (!hasApiKey) {
            console.warn(`⚠️ No API key for provider: ${model.provider}`);
            // Pokračovat, ale upozornit uživatele
        }
        
        // Inicializovat model pokud je potřeba
        if (model.initialize && !model.initialized) {
            await model.initialize();
        }
        
        this.activeModel = modelId;
        
        // Uložit preference
        localStorage.setItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.SELECTED_MODEL, modelId);
        
        // Informovat UI o změně
        if (window.uiManager) {
            window.uiManager.updateModelIndicator(modelId);
        }
        
        console.log(`✅ Active model: ${modelId}`);
        return true;
    }

    // Kontrola API klíče pro providera - async verze
    async checkApiKey(provider) {
        if (!window.security || !window.security.initialized) {
            return false;
        }
        
        // Zkontrolovat cache
        if (this.apiKeyCache.has(provider)) {
            return this.apiKeyCache.get(provider);
        }
        
        let hasKey = false;
        switch (provider) {
            case 'openai':
                hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.OPENAI_KEY));
                break;
            case 'anthropic':
                hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY));
                break;
            case 'google':
                hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.GOOGLE_KEY));
                break;
        }
        
        // Uložit do cache
        this.apiKeyCache.set(provider, hasKey);
        return hasKey;
    }

    // Rychlá kontrola existence klíče (bez dešifrování)
    hasApiKeyCached(provider) {
        if (!window.security || !window.security.initialized) {
            return false;
        }
        
        switch (provider) {
            case 'openai':
                return security.hasKey(CONFIG.STORAGE.KEYS.OPENAI_KEY);
            case 'anthropic':
                return security.hasKey(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
            case 'google':
                return security.hasKey(CONFIG.STORAGE.KEYS.GOOGLE_KEY);
            default:
                return false;
        }
    }

    // Získat API klíč pro providera
    async getApiKey(provider) {
        if (!window.security || !window.security.initialized) {
            return null;
        }
        
        switch (provider) {
            case 'openai':
                return await security.loadSecure(CONFIG.STORAGE.KEYS.OPENAI_KEY);
            case 'anthropic':
                return await security.loadSecure(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
            case 'google':
                return await security.loadSecure(CONFIG.STORAGE.KEYS.GOOGLE_KEY);
            default:
                return null;
        }
    }

    // Invalidovat cache při změně klíčů
    invalidateApiKeyCache(provider = null) {
        if (provider) {
            this.apiKeyCache.delete(provider);
        } else {
            this.apiKeyCache.clear();
        }
    }

    // Získat aktivní model
    getActiveModel() {
        if (!this.activeModel || !this.models.has(this.activeModel)) {
            return null;
        }
        return this.models.get(this.activeModel);
    }

    // Poslat zprávu s vylepšeným error handling
    async sendMessage(messages, options = {}) {
        // Ujistit se, že jsme inicializováni
        if (!this.initialized) {
            await this.initialize();
        }
        
        const model = this.getActiveModel();
        if (!model) {
            throw new ConfigurationError('No active model selected', 'NO_ACTIVE_MODEL');
        }

        // Kontrola API klíče
        const apiKey = await this.getApiKey(model.provider);
        if (!apiKey) {
            throw new ConfigurationError(
                `No API key configured for ${model.provider}`,
                'NO_API_KEY'
            );
        }

        console.log(`💬 Sending message via ${this.activeModel}`);
        
        try {
            const response = await model.sendMessage(messages, {
                ...options,
                apiKey: apiKey,
                timeout: CONFIG.API.TIMEOUT || 30000
            });
            
            return response;
            
        } catch (error) {
            console.error(`❌ Model error (${this.activeModel}):`, error);
            
            // Pokud je povolený fallback a není to už fallback pokus
            if (options.allowFallback !== false && CONFIG.MODELS.FALLBACK_CHAIN?.length > 0) {
                return await this.tryFallbackModel(messages, options, error);
            }
            
            // Jinak vyhodit chybu
            throw error;
        }
    }

    // Fallback strategie
    async tryFallbackModel(messages, options, originalError) {
        const fallbackChain = CONFIG.MODELS.FALLBACK_CHAIN || [];
        
        for (const fallbackId of fallbackChain) {
            if (fallbackId === this.activeModel) continue; // Skip failed model
            
            if (this.models.has(fallbackId)) {
                const fallbackModel = this.models.get(fallbackId);
                
                // Kontrola že fallback model je viditelný a má API klíč
                if (!fallbackModel.visible) {
                    console.log(`⏭️ Fallback model '${fallbackId}' not visible, skipping`);
                    continue;
                }
                
                const apiKey = await this.getApiKey(fallbackModel.provider);
                if (!apiKey) {
                    console.log(`⏭️ Fallback model '${fallbackId}' has no API key, skipping`);
                    continue;
                }
                
                console.log(`🔄 Trying fallback model: ${fallbackId}`);
                
                try {
                    const response = await fallbackModel.sendMessage(messages, {
                        ...options,
                        apiKey: apiKey,
                        allowFallback: false // Prevent infinite loop
                    });
                    
                    // Přidat informaci o fallbacku
                    return `[Použit záložní model: ${fallbackId}]\n\n${response}`;
                } catch (fallbackError) {
                    console.error(`❌ Fallback failed: ${fallbackId}`, fallbackError);
                    continue;
                }
            }
        }
        
        // Všechny modely selhaly
        throw originalError;
    }

    // Získat informace o modelu
    async getModelInfo(modelId = null) {
        const id = modelId || this.activeModel;
        const model = this.models.get(id);
        
        if (!model) return null;
        
        return {
            id: id,
            name: model.name || id,
            provider: model.provider || 'unknown',
            description: model.description || '',
            capabilities: model.capabilities || [],
            contextWindow: model.contextWindow || null,
            isActive: id === this.activeModel,
            visible: model.visible || false,
            hasApiKey: await this.checkApiKey(model.provider)
        };
    }

    // Synchronní verze pro UI (používá cache)
    getModelInfoSync(modelId = null) {
        const id = modelId || this.activeModel;
        const model = this.models.get(id);
        
        if (!model) return null;
        
        return {
            id: id,
            name: model.name || id,
            provider: model.provider || 'unknown',
            description: model.description || '',
            capabilities: model.capabilities || [],
            contextWindow: model.contextWindow || null,
            isActive: id === this.activeModel,
            visible: model.visible || false,
            hasApiKey: this.hasApiKeyCached(model.provider)
        };
    }

    // Získat seznam dostupných modelů
    async getAvailableModels() {
        const models = [];
        
        for (const [id, model] of this.models) {
            // Vrátit pouze viditelné modely
            if (model.visible) {
                models.push(await this.getModelInfo(id));
            }
        }
        
        return models;
    }

    // Synchronní verze pro UI
    getAvailableModelsSync() {
        const models = [];
        
        for (const [id, model] of this.models) {
            // Vrátit pouze viditelné modely
            if (model.visible) {
                models.push(this.getModelInfoSync(id));
            }
        }
        
        return models;
    }

    // Získat seznam všech modelů (včetně neviditelných)
    getAllModels() {
        const models = [];
        
        for (const [id] of this.models) {
            models.push(this.getModelInfoSync(id));
        }
        
        return models;
    }

    // Nastavit viditelnost modelů
    setModelVisibility(modelIds) {
        // Nejdřív všechny modely nastavit jako neviditelné
        for (const [id, model] of this.models) {
            model.visible = false;
        }
        
        // Nastavit vybrané modely jako viditelné
        for (const modelId of modelIds) {
            if (this.models.has(modelId)) {
                this.models.get(modelId).visible = true;
            }
        }
        
        // Uložit do localStorage
        localStorage.setItem(
            CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.USER_VISIBLE_MODELS,
            JSON.stringify(modelIds)
        );
        
        // Zkontrolovat, zda je aktivní model stále viditelný
        const activeModel = this.getActiveModel();
        if (activeModel && !activeModel.visible) {
            // Přepnout na první viditelný model
            const firstVisible = this.getFirstVisibleModel();
            if (firstVisible) {
                this.setActiveModel(firstVisible.id).catch(console.error);
            }
        }
    }

    // Načíst viditelnost modelů z localStorage
    loadModelVisibility() {
        const saved = localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.USER_VISIBLE_MODELS);
        if (saved) {
            try {
                const modelIds = JSON.parse(saved);
                this.setModelVisibility(modelIds);
                return true;
            } catch (e) {
                console.error('Error loading model visibility:', e);
            }
        }
        return false;
    }

    // Test API klíče
    async testApiKey(provider, apiKey) {
        // Najít první model s daným providerem
        let testModel = null;
        for (const [id, model] of this.models) {
            if (model.provider === provider) {
                testModel = model;
                break;
            }
        }
        
        if (!testModel) {
            throw new ConfigurationError(
                `No model found for provider: ${provider}`,
                'PROVIDER_NOT_FOUND'
            );
        }
        
        try {
            // Zkusit jednoduchý test
            const response = await testModel.sendMessage([
                { role: 'user', content: 'Hi' }
            ], {
                apiKey: apiKey,
                maxTokens: 10,
                timeout: 10000 // 10s timeout pro test
            });
            
            return response && response.length > 0;
            
        } catch (error) {
            console.error(`API key test failed for ${provider}:`, error);
            
            // Specifické chyby indikující neplatný klíč
            if (error instanceof APIError && error.details.statusCode === 401) {
                return false;
            }
            
            // Pro ostatní chyby (network, timeout) vyhodit chybu
            throw error;
        }
    }

    // Validovat konfiguraci
    async validateConfiguration() {
        const issues = [];
        
        // Kontrola modelů
        if (this.models.size === 0) {
            issues.push({
                type: 'error',
                message: 'No models registered'
            });
        }
        
        // Kontrola viditelných modelů
        const visibleModels = await this.getAvailableModels();
        if (visibleModels.length === 0) {
            issues.push({
                type: 'error',
                message: 'No visible models available'
            });
        }
        
        // Kontrola API klíčů pro viditelné modely
        for (const model of visibleModels) {
            if (!model.hasApiKey) {
                issues.push({
                    type: 'warning',
                    message: `Model ${model.name} has no API key`,
                    model: model.id
                });
            }
        }
        
        return issues;
    }

    // Cleanup metoda
    destroy() {
        this.models.clear();
        this.activeModel = null;
        this.initialized = false;
        this.initPromise = null;
        this.apiKeyCache.clear();
        console.log('🧹 Model Manager destroyed');
    }
}

// Vytvořit globální instanci
window.modelManager = new ModelManager();

// Export error classes
window.ModelError = ModelError;
window.APIError = APIError;
window.ConfigurationError = ConfigurationError;

console.log('📦 Model Manager loaded (v3.0 - Fixed)');
