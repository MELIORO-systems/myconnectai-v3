// Models Registry - Centrální definice všech AI modelů
// Verze: 2.0 - S přidanými Perplexity, Together AI a Cohere modely
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
        visible: true,
        config: {
            model: "gpt-3.5-turbo",
            contextWindow: 16384,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis"],
            description: "Rychlý a cenově efektivní model pro běžné úlohy",
            endpoint: "https://api.openai.com/v1/chat/completions",
            assistant: true
        }
    },
    {
        id: "gpt-4",
        provider: "openai",
        name: "GPT-4",
        enabled: false,
        visible: false,
        config: {
            model: "gpt-4",
            contextWindow: 8192,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding"],
            description: "Nejvýkonnější model pro komplexní úlohy",
            endpoint: "https://api.openai.com/v1/chat/completions",
            assistant: false
        }
    },
    {
        id: "gpt-4-turbo-preview",
        provider: "openai",
        name: "GPT-4 Turbo",
        enabled: false,
        visible: false,
        config: {
            model: "gpt-4-turbo-preview",
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding", "vision"],
            description: "Rychlejší verze GPT-4 s větším kontextem",
            endpoint: "https://api.openai.com/v1/chat/completions",
            assistant: false
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
            endpoint: "https://api.openai.com/v1/chat/completions",
            assistant: true
        }
    },
    
    // === ANTHROPIC MODELS === (ZAKÁZÁNO - CORS)
    {
        id: "claude-3-opus-20240229",
        provider: "anthropic",
        name: "Claude 3 Opus",
        enabled: false, // CORS blokuje
        visible: false,
        config: {
            model: "claude-3-opus-20240229",
            contextWindow: 200000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding", "vision"],
            description: "Nejvýkonnější model od Anthropic",
            endpoint: "https://api.anthropic.com/v1/messages",
            assistant: false
        }
    },
    {
        id: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        name: "Claude 3.5 Sonnet",
        enabled: false, // CORS blokuje
        visible: false,
        config: {
            model: "claude-3-5-sonnet-20241022",
            contextWindow: 200000,
            maxTokens: 8192,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding", "vision"],
            description: "Nejnovější a nejchytřejší Claude model",
            endpoint: "https://api.anthropic.com/v1/messages",
            assistant: false
        }
    },
    {
        id: "claude-3-haiku-20240307",
        provider: "anthropic",
        name: "Claude 3 Haiku",
        enabled: false, // CORS blokuje
        visible: false,
        config: {
            model: "claude-3-haiku-20240307",
            contextWindow: 200000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis"],
            description: "Rychlý a cenově efektivní model",
            endpoint: "https://api.anthropic.com/v1/messages",
            assistant: false
        }
    },
    
    // === PERPLEXITY MODELS ===
    {
        id: "pplx-7b-online",
        provider: "perplexity",
        name: "Perplexity 7B Online",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "pplx-7b-online",
            contextWindow: 4096,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "search", "analysis"],
            description: "Rychlý model s přístupem k aktuálním informacím z webu",
            endpoint: "https://api.perplexity.ai/chat/completions",
            onlineSearch: true
        }
    },
    {
        id: "pplx-70b-online",
        provider: "perplexity",
        name: "Perplexity 70B Online",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "pplx-70b-online",
            contextWindow: 4096,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "search", "analysis", "reasoning"],
            description: "Výkonný model s přístupem k aktuálním informacím z webu",
            endpoint: "https://api.perplexity.ai/chat/completions",
            onlineSearch: true
        }
    },
    {
        id: "llama-3.1-sonar-small-128k-online",
        provider: "perplexity",
        name: "Llama 3.1 Sonar Small",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "llama-3.1-sonar-small-128k-online",
            contextWindow: 127072,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "search", "analysis"],
            description: "Llama model s velkým kontextem a online search",
            endpoint: "https://api.perplexity.ai/chat/completions",
            onlineSearch: true
        }
    },
    
    // === TOGETHER AI MODELS ===
    {
        id: "mistral-7b-instruct",
        provider: "together",
        name: "Mistral 7B Instruct",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "mistralai/Mistral-7B-Instruct-v0.2",
            contextWindow: 32768,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "coding"],
            description: "Rychlý open-source model s výbornou češtinou",
            endpoint: "https://api.together.xyz/v1/chat/completions",
            modelType: "instruct"
        }
    },
    {
        id: "mixtral-8x7b",
        provider: "together",
        name: "Mixtral 8x7B",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            contextWindow: 32768,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding"],
            description: "Výkonný MoE model s vynikající češtinou",
            endpoint: "https://api.together.xyz/v1/chat/completions",
            modelType: "instruct"
        }
    },
    {
        id: "llama-2-70b-chat",
        provider: "together",
        name: "Llama 2 70B Chat",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "meta-llama/Llama-2-70b-chat-hf",
            contextWindow: 4096,
            maxTokens: 2048,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning"],
            description: "Velký model od Meta s dobrou češtinou",
            endpoint: "https://api.together.xyz/v1/chat/completions",
            modelType: "chat",
            stopSequences: ["[/INST]", "</s>"]
        }
    },
    {
        id: "llama-3-70b-instruct",
        provider: "together",
        name: "Llama 3 70B Instruct",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
            contextWindow: 8192,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning", "coding"],
            description: "Nejnovější Llama model s vylepšenou češtinou",
            endpoint: "https://api.together.xyz/v1/chat/completions",
            modelType: "instruct"
        }
    },
    
    // === COHERE MODELS ===
    {
        id: "command",
        provider: "cohere",
        name: "Command",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "command",
            contextWindow: 4096,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis"],
            description: "Výkonný model pro konverzaci a analýzu",
            endpoint: "https://api.cohere.ai/v1/chat",
            preamble: "Jsi přátelský a nápomocný AI asistent. Odpovídáš v češtině, pokud není požadováno jinak."
        }
    },
    {
        id: "command-light",
        provider: "cohere",
        name: "Command Light",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "command-light",
            contextWindow: 4096,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat"],
            description: "Rychlý a levný model pro jednoduché úlohy",
            endpoint: "https://api.cohere.ai/v1/chat"
        }
    },
    {
        id: "command-r",
        provider: "cohere",
        name: "Command R",
        enabled: false, // Změňte na true až budete mít API klíč
        visible: false,
        config: {
            model: "command-r",
            contextWindow: 128000,
            maxTokens: 4096,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "search"],
            description: "Model s velkým kontextem a RAG schopnostmi",
            endpoint: "https://api.cohere.ai/v1/chat",
            connectors: [] // Může používat web search
        }
    },
    
    // === GOOGLE MODELS === (PŘIPRAVENO PRO BUDOUCNOST)
    {
        id: "gemini-pro",
        provider: "google",
        name: "Gemini Pro",
        enabled: false,
        visible: false,
        config: {
            model: "gemini-pro",
            contextWindow: 32000,
            maxTokens: 8192,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "reasoning"],
            description: "Google Gemini Pro model",
            endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
            assistant: false
        }
    },
    {
        id: "gemini-1.5-pro",
        provider: "google",
        name: "Gemini 1.5 Pro",
        enabled: false,
        visible: false,
        config: {
            model: "gemini-1.5-pro-latest",
            contextWindow: 1000000,
            maxTokens: 8192,
            temperature: 0.7,
            capabilities: ["chat", "analysis", "vision", "long-context"],
            description: "Google Gemini s obrovským kontextovým oknem",
            endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent",
            assistant: false
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
