// OpenAI Model Implementation
// Verze: 2.1 - S timeout a vylepšeným error handling

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

    // Poslat zprávu s vylepšeným error handling a timeout
    async sendMessage(messages, options = {}) {
        // Získat API klíč
        const apiKey = options.apiKey || await window.modelManager?.getApiKey('openai');
        
        if (!apiKey) {
            throw new window.ConfigurationError(
                'OpenAI API key not configured',
                'NO_API_KEY'
            );
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

        // Vytvořit AbortController pro timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, options.timeout || CONFIG.API.TIMEOUT || 30000);

        try {
            // Volat OpenAI API s timeout
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            clearTimeout(timeout);

            // Zpracovat odpověď
            const data = await response.json();

            if (!response.ok) {
                console.error('OpenAI API error:', data);
                this.stats.errors++;
                
                // Vytvořit specifickou chybu
                if (response.status === 401) {
                    throw new window.APIError(
                        'Invalid API key',
                        401,
                        'openai'
                    );
                } else if (response.status === 429) {
                    // Extrahovat informace o rate limitu
                    const retryAfter = response.headers.get('Retry-After');
                    throw new window.APIError(
                        `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
                        429,
                        'openai'
                    );
                } else if (response.status === 503) {
                    throw new window.APIError(
                        'OpenAI service temporarily unavailable',
                        503,
                        'openai'
                    );
                } else if (data.error?.message) {
                    throw new window.APIError(
                        data.error.message,
                        response.status,
                        'openai'
                    );
                } else {
                    throw new window.APIError(
                        `API error: ${response.status}`,
                        response.status,
                        'openai'
                    );
                }
            }

            // Validovat odpověď
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new window.ModelError(
                    'Invalid response format from OpenAI',
                    'INVALID_RESPONSE'
                );
            }

            // Aktualizovat statistiky
            if (data.usage) {
                this.stats.messages++;
                this.stats.tokens += data.usage.total_tokens || 0;
            }

            // Vrátit odpověď
            return data.choices[0].message.content;

        } catch (error) {
            clearTimeout(timeout);
            console.error('OpenAI request failed:', error);
            this.stats.errors++;
            
            // Převést AbortError na timeout error
            if (error.name === 'AbortError') {
                throw new window.ModelError(
                    'Request timeout - OpenAI is taking too long to respond',
                    'TIMEOUT',
                    { timeout: CONFIG.API.TIMEOUT }
                );
            }
            
            // Pokud je to už naše chyba, prostě ji předat dál
            if (error instanceof window.ModelError || error instanceof window.APIError) {
                throw error;
            }
            
            // Network errors
            if (error.message?.includes('Failed to fetch')) {
                throw new window.ModelError(
                    'Network error - unable to connect to OpenAI',
                    'NETWORK_ERROR'
                );
            }
            
            // Ostatní chyby
            throw new window.ModelError(
                error.message || 'Unknown error',
                'UNKNOWN_ERROR',
                { originalError: error.toString() }
            );
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
    
    // Cleanup
    destroy() {
        this.resetStats();
        this.initialized = false;
    }
}

// Export pro globální použití
window.OpenAIModel = OpenAIModel;

console.log('📦 OpenAI Model implementation loaded');
