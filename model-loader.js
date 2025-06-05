// Model Loader - Automatické načítání a registrace modelů
// Verze: 1.0

class ModelLoader {
    constructor() {
        this.loadedModels = new Map();
        this.initialized = false;
    }

    // Hlavní inicializační funkce
    async initialize() {
        if (this.initialized) return;
        
        console.log('🔄 Model Loader initializing...');
        
        try {
            // 1. Načíst všechny modely z registry
            await this.loadModelsFromRegistry();
            
            // 2. Načíst uživatelské preference
            this.loadUserPreferences();
            
            // 3. Aplikovat debug mode pokud je zapnutý
            if (CONFIG.DEBUG_MODE) {
                this.printDebugInfo();
            }
            
            this.initialized = true;
            console.log('✅ Model Loader ready');
            
        } catch (error) {
            console.error('❌ Model Loader initialization failed:', error);
            throw error;
        }
    }

    // Načíst modely z registry
    async loadModelsFromRegistry() {
        console.log('📦 Loading models from registry...');
        
        const enabledModels = ModelsRegistryHelper.getEnabledModels();
        
        for (const modelDef of enabledModels) {
            try {
                // Vytvoř instanci modelu podle providera
                const modelInstance = await this.createModelInstance(modelDef);
                
                if (modelInstance) {
                    // Registruj model v Model Manageru
                    window.modelManager.registerModel(modelDef.id, modelInstance);
                    this.loadedModels.set(modelDef.id, modelDef);
                    console.log(`✅ Loaded model: ${modelDef.id}`);
                }
            } catch (error) {
                console.error(`❌ Failed to load model ${modelDef.id}:`, error);
            }
        }
    }

    // Vytvořit instanci modelu podle providera
    async createModelInstance(modelDef) {
        switch (modelDef.provider) {
            case 'openai':
                // Dynamicky načíst OpenAI model
                if (window.OpenAIModel) {
                    return new OpenAIModel(modelDef.id, modelDef);
                }
                console.warn('OpenAI model implementation not found');
                break;
                
            case 'anthropic':
                // Pro budoucí implementaci
                if (window.AnthropicModel) {
                    return new AnthropicModel(modelDef.id, modelDef);
                }
                console.warn('Anthropic model implementation not found');
                break;
                
            case 'google':
                // Pro budoucí implementaci
                if (window.GoogleModel) {
                    return new GoogleModel(modelDef.id, modelDef);
                }
                console.warn('Google model implementation not found');
                break;
                
            default:
                console.warn(`Unknown provider: ${modelDef.provider}`);
                return null;
        }
    }

    // Načíst uživatelské preference
    loadUserPreferences() {
        // Načíst viditelnost modelů
        const savedVisibility = localStorage.getItem(
            CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.USER_VISIBLE_MODELS
        );
        
        if (savedVisibility) {
            try {
                const visibleModels = JSON.parse(savedVisibility);
                
                // Aplikovat viditelnost na modely
                for (const [modelId, modelDef] of this.loadedModels) {
                    const model = window.modelManager.models.get(modelId);
                    if (model) {
                        model.visible = visibleModels.includes(modelId);
                    }
                }
                
                console.log('📋 Applied user visibility preferences');
            } catch (error) {
                console.error('Error loading visibility preferences:', error);
            }
        } else {
            // Použít výchozí viditelnost z registry
            console.log('📋 Using default visibility from registry');
        }
    }

    // Debug informace
    printDebugInfo() {
        console.log('📋 Model Registry Debug Info:');
        console.log(`- Total models in registry: ${MODELS_REGISTRY.length}`);
        console.log(`- Enabled models: ${ModelsRegistryHelper.getEnabledModels().length}`);
        console.log(`- Loaded models: ${this.loadedModels.size}`);
        
        // Detailní info o každém modelu
        const allModels = window.modelManager.getAllModels();
        const visibleModels = window.modelManager.getAvailableModels();
        
        console.log(`- Configured models: ${allModels.length}`);
        console.log(`- Visible models: ${visibleModels.length}`);
        
        console.log('\n✅ Ready models:');
        visibleModels.forEach(model => {
            console.log(`  - ${model.name} (${model.id})`);
        });
        
        // Kontrola API klíčů
        console.log('\n🔑 API Keys status:');
        const providers = ModelsRegistryHelper.getProviders();
        providers.forEach(provider => {
            const hasKey = window.modelManager.checkApiKey(provider);
            console.log(`  - ${provider}: ${hasKey ? '✅ configured' : '❌ missing'}`);
        });
    }

    // Získat statistiky o načtených modelech
    getStats() {
        return {
            totalInRegistry: MODELS_REGISTRY.length,
            enabledInRegistry: ModelsRegistryHelper.getEnabledModels().length,
            loadedModels: this.loadedModels.size,
            visibleModels: window.modelManager.getAvailableModels().length
        };
    }

    // Reload modelů (pro případnou aktualizaci)
    async reload() {
        console.log('🔄 Reloading models...');
        
        // Vyčistit existující modely
        this.loadedModels.clear();
        
        // Znovu načíst
        await this.initialize();
    }
}

// Vytvořit globální instanci
window.modelLoader = new ModelLoader();

console.log('📦 Model Loader ready');
