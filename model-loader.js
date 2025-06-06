// Model Loader - Automatické načítání a registrace modelů
// Verze: 2.1 - S podporou všech providerů

class ModelLoader {
    constructor() {
        this.loadedModels = new Map();
        this.initialized = false;
        this.failedModels = new Map(); // Pro tracking selhání
    }

    // Hlavní inicializační funkce
    async initialize() {
        if (this.initialized) return;
        
        console.log('🔄 Model Loader initializing...');
        
        try {
            // 1. Načíst všechny modely z registry - MUSÍ být první
            await this.loadModelsFromRegistry();
            
            // 2. Načíst uživatelské preference - až po načtení modelů
            this.loadUserPreferences();
            
            // 3. Aplikovat debug mode pokud je zapnutý
            if (CONFIG.DEBUG_MODE) {
                this.printDebugInfo();
            }
            
            this.initialized = true;
            console.log('✅ Model Loader ready');
            
        } catch (error) {
            console.error('❌ Model Loader initialization failed:', error);
            // Cleanup při selhání
            this.loadedModels.clear();
            this.failedModels.clear();
            this.initialized = false;
            throw error;
        }
    }

    // Načíst modely z registry
    async loadModelsFromRegistry() {
        console.log('📦 Loading models from registry...');
        
        // Ověřit dostupnost závislostí
        if (!window.ModelsRegistryHelper) {
            throw new Error('ModelsRegistryHelper not available');
        }
        
        if (!window.modelManager) {
            throw new Error('Model Manager not available - must be initialized first');
        }
        
        const enabledModels = ModelsRegistryHelper.getEnabledModels();
        console.log(`📋 Found ${enabledModels.length} enabled models`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const modelDef of enabledModels) {
            try {
                // Vytvoř instanci modelu podle providera
                const modelInstance = await this.createModelInstance(modelDef);
                
                if (modelInstance) {
                    // Registruj model v Model Manageru
                    window.modelManager.registerModel(modelDef.id, modelInstance);
                    this.loadedModels.set(modelDef.id, modelDef);
                    successCount++;
                    console.log(`✅ Loaded model: ${modelDef.id}`);
                } else {
                    throw new Error(`Failed to create instance for model: ${modelDef.id}`);
                }
            } catch (error) {
                failCount++;
                this.failedModels.set(modelDef.id, error.message);
                console.error(`❌ Failed to load model ${modelDef.id}:`, error);
                
                // Pokračovat s dalšími modely i při selhání
                continue;
            }
        }
        
        console.log(`📊 Model loading complete: ${successCount} success, ${failCount} failed`);
        
        // Pokud se nepodařilo načíst žádný model, je to kritická chyba
        if (successCount === 0 && enabledModels.length > 0) {
            throw new Error('Failed to load any models');
        }
    }

    // Vytvořit instanci modelu podle providera
    async createModelInstance(modelDef) {
        if (!modelDef || !modelDef.provider) {
            throw new Error('Invalid model definition');
        }
        
        try {
            switch (modelDef.provider) {
                case 'openai':
                    // Dynamicky načíst OpenAI model
                    if (window.OpenAIModel) {
                        return new OpenAIModel(modelDef.id, modelDef);
                    } else {
                        throw new Error('OpenAI model implementation not found');
                    }
                    
                case 'anthropic':
                    // Anthropic (Claude) modely
                    if (window.AnthropicModel) {
                        return new AnthropicModel(modelDef.id, modelDef);
                    } else {
                        console.warn('Anthropic model implementation not found - skipping');
                        return null;
                    }
                    
                case 'perplexity':
                    // Perplexity modely
                    if (window.PerplexityModel) {
                        return new PerplexityModel(modelDef.id, modelDef);
                    } else {
                        console.warn('Perplexity model implementation not found - skipping');
                        return null;
                    }
                    
                case 'together':
                    // Together AI modely
                    if (window.TogetherModel) {
                        return new TogetherModel(modelDef.id, modelDef);
                    } else {
                        console.warn('Together model implementation not found - skipping');
                        return null;
                    }
                    
                case 'cohere':
                    // Cohere modely
                    if (window.CohereModel) {
                        return new CohereModel(modelDef.id, modelDef);
                    } else {
                        console.warn('Cohere model implementation not found - skipping');
                        return null;
                    }
                    
                case 'google':
                    // Google (Gemini) modely - pro budoucí implementaci
                    if (window.GoogleModel) {
                        return new GoogleModel(modelDef.id, modelDef);
                    } else {
                        console.warn('Google model implementation not found - skipping');
                        return null;
                    }
                    
                default:
                    console.warn(`Unknown provider: ${modelDef.provider}`);
                    return null;
            }
        } catch (error) {
            // Přidat kontext k chybě
            error.message = `Error creating ${modelDef.provider} model instance: ${error.message}`;
            throw error;
        }
    }

    // Načíst uživatelské preference
    loadUserPreferences() {
        try {
            // Načíst viditelnost modelů
            const savedVisibility = localStorage.getItem(
                CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.USER_VISIBLE_MODELS
            );
            
            if (savedVisibility) {
                try {
                    const visibleModels = JSON.parse(savedVisibility);
                    
                    if (!Array.isArray(visibleModels)) {
                        throw new Error('Invalid visibility data format');
                    }
                    
                    // Aplikovat viditelnost na modely
                    for (const [modelId, modelDef] of this.loadedModels) {
                        const model = window.modelManager?.models.get(modelId);
                        if (model) {
                            model.visible = visibleModels.includes(modelId);
                        }
                    }
                    
                    console.log('📋 Applied user visibility preferences');
                } catch (error) {
                    console.error('Error loading visibility preferences:', error);
                    // Pokračovat s výchozím nastavením
                }
            } else {
                // Použít výchozí viditelnost z registry
                console.log('📋 Using default visibility from registry');
            }
        } catch (error) {
            console.error('Error in loadUserPreferences:', error);
            // Není kritická chyba, pokračovat
        }
    }

    // Debug informace
    printDebugInfo() {
        console.log('📋 Model Registry Debug Info:');
        console.log(`- Total models in registry: ${MODELS_REGISTRY.length}`);
        console.log(`- Enabled models: ${ModelsRegistryHelper.getEnabledModels().length}`);
        console.log(`- Successfully loaded models: ${this.loadedModels.size}`);
        console.log(`- Failed models: ${this.failedModels.size}`);
        
        if (this.failedModels.size > 0) {
            console.log('\n❌ Failed models:');
            this.failedModels.forEach((error, modelId) => {
                console.log(`  - ${modelId}: ${error}`);
            });
        }
        
        // Detailní info o každém modelu
        if (window.modelManager) {
            const allModels = window.modelManager.getAllModels();
            const visibleModels = window.modelManager.getAvailableModelsSync();
            
            console.log(`\n- Configured models: ${allModels.length}`);
            console.log(`- Visible models: ${visibleModels.length}`);
            
            console.log('\n✅ Ready models:');
            visibleModels.forEach(model => {
                console.log(`  - ${model.name} (${model.id})`);
            });
            
            // Kontrola API klíčů - používat sync verzi pro debug
            console.log('\n🔑 API Keys status:');
            const providers = ModelsRegistryHelper.getProviders();
            providers.forEach(provider => {
                const hasKey = window.modelManager.hasApiKeyCached(provider);
                console.log(`  - ${provider}: ${hasKey ? '✅ configured' : '❌ missing'}`);
            });
        }
    }

    // Získat statistiky o načtených modelech
    getStats() {
        return {
            totalInRegistry: MODELS_REGISTRY.length,
            enabledInRegistry: ModelsRegistryHelper.getEnabledModels().length,
            loadedModels: this.loadedModels.size,
            failedModels: this.failedModels.size,
            visibleModels: window.modelManager?.getAvailableModelsSync().length || 0
        };
    }

    // Získat seznam selhání
    getFailedModels() {
        return Array.from(this.failedModels.entries()).map(([id, error]) => ({
            id,
            error
        }));
    }

    // Reload modelů (pro případnou aktualizaci)
    async reload() {
        console.log('🔄 Reloading models...');
        
        // Vyčistit existující modely
        this.cleanup();
        
        // Znovu načíst
        await this.initialize();
    }
    
    // Cleanup metoda
    cleanup() {
        this.loadedModels.clear();
        this.failedModels.clear();
        this.initialized = false;
        console.log('🧹 Model Loader cleaned up');
    }
}

// Vytvořit globální instanci
window.modelLoader = new ModelLoader();

console.log('📦 Model Loader ready (v2.1 - All providers)');
