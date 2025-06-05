// Model Manager - Centrální správa AI modelů
// Verze: 1.1 - S podporou lokálního ukládání API klíčů

class ModelManager {
    constructor() {
        this.models = new Map();
        this.activeModel = null;
        this.initialized = false;
    }

    // Registrace modelu
    registerModel(modelId, modelInstance) {
        console.log(`📦 Registering model: ${modelId}`);
        this.models.set(modelId, modelInstance);
    }

    // Inicializace
    async initialize() {
        if (this.initialized) return;
        
        console.log('🤖 Initializing Model Manager...');
        
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
                console.error('❌ No visible models available!');
            }
        }
        
        this.initialized = true;
        console.log('✅ Model Manager ready');
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
            console.error(`❌ Model not found: ${modelId}`);
            return false;
        }

        const model = this.models.get(modelId);
        
        // Kontrola viditelnosti
        if (!model.visible) {
            console.error(`❌ Model not visible: ${modelId}`);
            return false;
        }

        console.log(`🔄 Switching to model: ${modelId}`);
        
        // Kontrola API klíče
        const hasApiKey = this.checkApiKey(model.provider);
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

    // Kontrola API klíče pro providera
    checkApiKey(provider) {
        switch (provider) {
            case 'openai':
                return !!security.loadSecure(CONFIG.STORAGE.KEYS.OPENAI_KEY);
            case 'anthropic':
                return !!security.loadSecure(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
            case 'google':
                return !!security.loadSecure(CONFIG.STORAGE.KEYS.GOOGLE_KEY);
            default:
                return false;
        }
    }

    // Získat API klíč pro providera
    getApiKey(provider) {
        switch (provider) {
            case 'openai':
                return security.loadSecure(CONFIG.STORAGE.KEYS.OPENAI_KEY);
            case 'anthropic':
                return security.loadSecure(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
            case 'google':
                return security.loadSecure(CONFIG.STORAGE.KEYS.GOOGLE_KEY);
            default:
                return null;
        }
    }

    // Získat aktivní model
    getActiveModel() {
        if (!this.activeModel || !this.models.has(this.activeModel)) {
            return null;
        }
        return this.models.get(this.activeModel);
    }

    // Poslat zprávu
    async sendMessage(messages, options = {}) {
        const model = this.getActiveModel();
        if (!model) {
            throw new Error('No active model selected');
        }

        // Kontrola API klíče
        const apiKey = this.getApiKey(model.provider);
        if (!apiKey) {
            throw new Error(CONFIG.MESSAGES.NO_API_KEY);
        }

        console.log(`💬 Sending message via ${this.activeModel}`);
        
        try {
            // Předat API klíč modelu
            const response = await model.sendMessage(messages, {
                ...options,
                apiKey: apiKey
            });
            return response;
        } catch (error) {
            console.error(`❌ Model error (${this.activeModel}):`, error);
            
            // Zkusit fallback model
            if (options.allowFallback !== false) {
                return await this.tryFallbackModel(messages, options, error);
            }
            
            throw error;
        }
    }

    // Fallback strategie
    async tryFallbackModel(messages, options, originalError) {
        const fallbackChain = window.CONFIG?.MODELS?.FALLBACK_CHAIN || [];
        
        for (const fallbackId of fallbackChain) {
            if (fallbackId === this.activeModel) continue; // Skip failed model
            
            if (this.models.has(fallbackId)) {
                const fallbackModel = this.models.get(fallbackId);
                
                // Kontrola že fallback model je viditelný a má API klíč
                if (!fallbackModel.visible) {
                    console.log(`⏭️ Fallback model '${fallbackId}' not visible, skipping`);
                    continue;
                }
                
                const apiKey = this.getApiKey(fallbackModel.provider);
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
                    console.error(`❌ Fallback failed: ${fallbackId}`);
                    continue;
                }
            }
        }
        
        // Všechny modely selhaly
        throw originalError;
    }

    // Získat informace o modelu
    getModelInfo(modelId = null) {
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
            hasApiKey: this.checkApiKey(model.provider)
        };
    }

    // Získat seznam všech modelů
    getAvailableModels() {
        const models = [];
        
        for (const [id, model] of this.models) {
            // Vrátit pouze viditelné modely
            if (model.visible) {
                models.push(this.getModelInfo(id));
            }
        }
        
        return models;
    }

    // Získat seznam všech modelů (včetně neviditelných)
    getAllModels() {
        const models = [];
        
        for (const [id, model] of this.models) {
            models.push(this.getModelInfo(id));
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
                this.setActiveModel(firstVisible.id);
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
            throw new Error(`No model found for provider: ${provider}`);
        }
        
        try {
            // Zkusit jednoduchý test
            const response = await testModel.sendMessage([
                { role: 'user', content: 'Hi' }
            ], {
                apiKey: apiKey,
                maxTokens: 10
            });
            
            return response && response.length > 0;
        } catch (error) {
            console.error(`API key test failed for ${provider}:`, error);
            return false;
        }
    }

    // Validovat konfiguraci
    validateConfiguration() {
        const issues = [];
        
        // Kontrola modelů
        if (this.models.size === 0) {
            issues.push('No models registered');
        }
        
        // Kontrola viditelných modelů
        const visibleModels = this.getAvailableModels();
        if (visibleModels.length === 0) {
            issues.push('No visible models available');
        }
        
        // Kontrola API klíčů pro viditelné modely
        for (const model of visibleModels) {
            if (!model.hasApiKey) {
                issues.push(`Model ${model.name} has no API key`);
            }
        }
        
        return issues;
    }
}

// Vytvořit globální instanci
window.modelManager = new ModelManager();

console.log('📦 Model Manager loaded (with local API key storage)');
