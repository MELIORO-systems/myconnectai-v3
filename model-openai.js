// OpenAI Model Implementation
// Verze: 2.0 - Pro MyConnectAI v3 s lokálním ukládáním

class OpenAIModel {
    constructor(modelId, modelDef) {
        // Základní vlastnosti
        this.id = modelId;
        this.provider = 'openai';
        this.name = modelDef.name;
        this.visible = modelDef.visible || false;
        this.initialized = false;
        
        // Model konfigurace z registry
        this.config = modelDef.config || {};
        this.model = this.config.model || modelId;
        this.contextWindow = this.config.contextWindow || 4096;
        this.maxTokens = this.config.maxTokens || 2048;
        this.temperature = this.config.temperature || 0.7;
        this.capabilities = this.config.capabilities || ['chat'];
        this.description = this.config.description || '';
        
        // API endpoint
        this.apiEndpoint = this.config.endpoint || 'https://api.openai.com/v1/chat/completions';
        
        // Usage stats
        this.stats = {
            messages: 0,
            tokens: 0,
            errors: 0
        };
    }

    // Inicializace modelu
    async initialize() {
        if (this.initialized) return;
        
        console.log(`🚀 Initializing OpenAI model: ${this.id}`);
        
        this.initialized = true;
        console.log(`✅ OpenAI model ready: ${this.id}`);
    }

    // Poslat zprávu
    async sendMessage(messages, options = {}) {
        // Získat API klíč
        const apiKey = options.apiKey || window.modelManager?.getApiKey('openai');
        
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        // Připravit zprávy
        const systemPrompt = {
            role: "system",
            content: CONFIG.API.DEFAULT_PARAMS.SYSTEM_PROMPT || "You are a helpful assistant."
        };

        const allMessages = [systemPrompt, ...messages];

        // Připravit request payload
        const requestPayload = {
            model: this.model,
            messages: allMessages,
            temperature: options.temperature || this.temperature,
            max_tokens: options.maxTokens || this.maxTokens,
            top_p: options.topP || CONFIG.API.DEFAULT_PARAMS.TOP_P,
            frequency_penalty: options.frequencyPenalty || CONFIG.API.DEFAULT_PARAMS.FREQUENCY_PENALTY,
            presence_penalty: options.presencePenalty || CONFIG.API.DEFAULT_PARAMS.PRESENCE_PENALTY
        };

        console.log(`💬 Sending request to OpenAI (${this.model})...`);

        try {
            // Volat OpenAI API
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestPayload)
            });

            // Zpracovat odpověď
            const data = await response.json();

            if (!response.ok) {
                console.error('OpenAI API error:', data);
                this.stats.errors++;
                
                // Specifické chybové hlášky
                if (response.status === 401) {
                    throw new Error('Neplatný API klíč');
                } else if (response.status === 429) {
                    throw new Error('Překročen limit požadavků');
                } else if (data.error?.message) {
                    throw new Error(data.error.message);
                } else {
                    throw new Error(`API error: ${response.status}`);
                }
            }

            // Aktualizovat statistiky
            if (data.usage) {
                this.stats.messages++;
                this.stats.tokens += data.usage.total_tokens || 0;
            }

            // Vrátit odpověď
            return data.choices[0].message.content;

        } catch (error) {
            console.error('OpenAI request failed:', error);
            this.stats.errors++;
            throw error;
        }
    }

    // Získat statistiky
    getStats() {
        return { ...this.stats };
    }

    // Reset statistik
    resetStats() {
        this.stats = {
            messages: 0,
            tokens: 0,
            errors: 0
        };
    }

    // Získat informace o modelu
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            provider: this.provider,
            description: this.description,
            capabilities: this.capabilities,
            contextWindow: this.contextWindow,
            maxTokens: this.maxTokens,
            stats: this.getStats()
        };
    }
}

// Export pro globální použití
window.OpenAIModel = OpenAIModel;

console.log('📦 OpenAI Model implementation loaded');
