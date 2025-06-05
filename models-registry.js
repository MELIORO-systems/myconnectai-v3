// Models Registry - Centrální definice všech AI modelů
// Verze: 1.0
// 
// Tento soubor obsahuje definice VŠECH dostupných modelů.
// Pro přidání nového modelu stačí přidat nový objekt do pole MODELS_REGISTRY.

const MODELS_REGISTRY = [
    // === OPENAI MODELS ===
    {
        id: "gpt-3.5-turbo",
        provider: "openai",
        name: "GPT-3.5 Turbo",
        enabled: true,
        visible: true, // Výchozí viditelnost
        config: {
            model: "gpt-3.5-turbo",
            contextWindow: 16384,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis"],
            description: "Rychlý a cenově efektivní model pro běžné úlohy",
            endpoint: "https://api.openai.com/v1/chat/completions"
        }
    },
    {
        id: "gpt-4",
        provider: "openai",
        name: "GPT-4",
        enabled: true,
        visible: false,
        config: {
            model: "gpt-4",
            contextWindow: 8192,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding"],
            description: "Nejvýkonnější model pro komplexní úlohy",
            endpoint: "https://api.openai.com/v1/chat/completions"
        }
    },
    {
        id: "gpt-4-turbo-preview",
        provider: "openai",
        name: "GPT-4 Turbo",
        enabled: true,
        visible: false,
        config: {
            model: "gpt-4-turbo-preview",
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding", "vision"],
            description: "Rychlejší verze GPT-4 s větším kontextem",
            endpoint: "https://api.openai.com/v1/chat/completions"
        }
    },
    {
        id: "gpt-4o-mini",
        provider: "openai",
        name: "GPT-4o Mini",
        enabled: true,
        visible: true,
        config: {
            model: "gpt-4o-mini",
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning"],
            description: "Optimalizovaná verze GPT-4 pro rychlé odpovědi",
            endpoint: "https://api.openai.com/v1/chat/completions"
        }
    },
    
    // === ANTHROPIC MODELS ===
    {
        id: "claude-3-opus-20240229",
        provider: "anthropic",
        name: "Claude 3 Opus",
        enabled: true,
        visible: false,
        config: {
            model: "claude-3-opus-20240229",
            contextWindow: 200000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding", "vision"],
            description: "Nejvýkonnější model od Anthropic",
            endpoint: "https://api.anthropic.com/v1/messages"
        }
    },
    {
        id: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        name: "Claude 3.5 Sonnet",
        enabled: true,
        visible: true,
        config: {
            model: "claude-3-5-sonnet-20241022",
            contextWindow: 200000,
            maxTokens: 8192,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding", "vision"],
            description: "Nejnovější a nejchytřejší Claude model",
            endpoint: "https://api.anthropic.com/v1/messages"
        }
    },
    {
        id: "claude-3-haiku-20240307",
        provider: "anthropic",
        name: "Claude 3 Haiku",
        enabled: true,
        visible: false,
        config: {
            model: "claude-3-haiku-20240307",
            contextWindow: 200000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis"],
            description: "Rychlý a cenově efektivní model",
            endpoint: "https://api.anthropic.com/v1/messages"
        }
    },
    
    // === GOOGLE MODELS ===
    {
        id: "gemini-pro",
        provider: "google",
        name: "Gemini Pro",
        enabled: true,
        visible: true,
        config: {
            model: "gemini-pro",
            contextWindow: 32000,
            maxTokens: 8192,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning"],
            description: "Google Gemini Pro model",
            endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
        }
    },
    {
        id: "gemini-1.5-pro",
        provider: "google",
        name: "Gemini 1.5 Pro",
        enabled: true,
        visible: false,
        config: {
            model: "gemini-1.5-pro-latest",
            contextWindow: 1000000,
            maxTokens: 8192,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "vision", "long-context"],
            description: "Google Gemini s obrovským kontextovým oknem",
            endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent"
        }
    }
];

// Helper funkce pro práci s registry
const ModelsRegistryHelper = {
    // Získat všechny modely
    getAllModels() {
        return MODELS_REGISTRY;
    },
    
    // Získat pouze povolené modely
    getEnabledModels() {
        return MODELS_REGISTRY.filter(model => model.enabled);
    },
    
    // Získat modely podle providera
    getModelsByProvider(provider) {
        return MODELS_REGISTRY.filter(model => model.provider === provider);
    },
    
    // Získat model podle ID
    getModelById(modelId) {
        return MODELS_REGISTRY.find(model => model.id === modelId);
    },
    
    // Získat výchozí viditelné modely
    getDefaultVisibleModels() {
        return MODELS_REGISTRY.filter(model => model.enabled && model.visible);
    },
    
    // Validovat model ID
    isValidModelId(modelId) {
        return MODELS_REGISTRY.some(model => model.id === modelId);
    },
    
    // Získat seznam providerů
    getProviders() {
        const providers = new Set(MODELS_REGISTRY.map(model => model.provider));
        return Array.from(providers);
    }
};

// Export pro použití v jiných souborech
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MODELS_REGISTRY, ModelsRegistryHelper };
} else {
    window.MODELS_REGISTRY = MODELS_REGISTRY;
    window.ModelsRegistryHelper = ModelsRegistryHelper;
}

console.log('📋 Models Registry loaded with', MODELS_REGISTRY.length, 'models');
