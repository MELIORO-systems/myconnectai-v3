// Together AI Model Implementation
// Verze: 1.0 - Podpora pro open-source modely (Llama, Mistral, Mixtral atd.)

class TogetherModel {
    constructor(modelId, modelDef) {
        // Základní vlastnosti
        this.id = modelId;
        this.provider = 'together';
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
        this.apiEndpoint = this.config.endpoint || 'https://api.together.xyz/v1/chat/completions';
        
        // Together specific
        this.modelType = this.config.modelType || 'chat'; // chat, instruct, base
        this.stopSequences = this.config.stopSequences || [];
        
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
        
        console.log(`🚀 Initializing Together AI model: ${this.id}`);
        
        this.initialized = true;
        console.log(`✅ Together AI model ready: ${this.id}`);
    }

    // Poslat zprávu s vylepšeným error handling a timeout
    async sendMessage(messages, options = {}) {
        // Získat API klíč - ošetřit prázdný string
        const apiKey = (options.apiKey && options.apiKey.trim()) || 
                       await window.modelManager?.getApiKey('together');
        
        if (!apiKey) {
            throw new window.ConfigurationError(
                'Together AI API klíč není nakonfigurován',
                'NO_API_KEY'
            );
        }

        // Připravit zprávy - Together AI používá OpenAI-compatible formát
        const systemPrompt = {
            role: "system",
            content: CONFIG.API.DEFAULT_PARAMS.SYSTEM_PROMPT || "Jsi přátelský a nápomocný AI asistent. Odpovídáš v češtině, pokud není požadováno jinak."
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
            presence_penalty: options.presencePenalty || CONFIG.API.DEFAULT_PARAMS.PRESENCE_PENALTY,
            stop: this.stopSequences.length > 0 ? this.stopSequences : undefined
        };

        // Together AI specific parameters
        if (options.repetitionPenalty !== undefined) {
            requestPayload.repetition_penalty = options.repetitionPenalty;
        }

        console.log(`💬 Sending request to Together AI (${this.model})...`);

        // Vytvořit AbortController pro timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, options.timeout || CONFIG.API.TIMEOUT || 30000);

        try {
            // Volat Together AI API s timeout
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
                console.error('Together AI API error:', data);
                this.stats.errors++;
                
                // Vytvořit specifickou chybu s českými hláškami
                if (response.status === 401) {
                    throw new window.APIError(
                        'Neplatný API klíč',
                        401,
                        'together'
                    );
                } else if (response.status === 429) {
                    // Together AI rate limiting
                    const retryAfter = response.headers.get('Retry-After');
                    throw new window.APIError(
                        `Překročen limit požadavků${retryAfter ? `. Zkuste to za ${retryAfter} sekund` : ''}`,
                        429,
                        'together'
                    );
                } else if (response.status === 503) {
                    throw new window.APIError(
                        'Služba Together AI je dočasně nedostupná',
                        503,
                        'together'
                    );
                } else if (response.status === 400) {
                    // Specifické chyby pro 400
                    if (data.error?.message?.includes('context_length_exceeded')) {
                        throw new window.ModelError(
                            'Zpráva je příliš dlouhá pro tento model',
                            'CONTEXT_LENGTH_EXCEEDED'
                        );
                    }
                    if (data.error?.message?.includes('model_not_found')) {
                        throw new window.ModelError(
                            `Model ${this.model} není dostupný na Together AI`,
                            'MODEL_NOT_FOUND'
                        );
                    }
                    throw new window.APIError(
                        data.error?.message || 'Neplatný požadavek',
                        400,
                        'together'
                    );
                } else if (data.error?.message) {
                    throw new window.APIError(
                        data.error.message,
                        response.status,
                        'together'
                    );
                } else {
                    throw new window.APIError(
                        `Chyba API: ${response.status}`,
                        response.status,
                        'together'
                    );
                }
            }

            // Validovat odpověď - Together AI používá OpenAI formát
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new window.ModelError(
                    'Neplatný formát odpovědi od Together AI',
                    'INVALID_RESPONSE'
                );
            }

            // Extrahovat odpověď
            const responseContent = data.choices[0].message.content;

            // Některé modely mohou vracet prázdnou odpověď
            if (!responseContent || responseContent.trim() === '') {
                throw new window.ModelError(
                    'Model vrátil prázdnou odpověď',
                    'EMPTY_RESPONSE'
                );
            }

            // Aktualizovat statistiky
            if (data.usage) {
                this.stats.messages++;
                this.stats.tokens += data.usage.total_tokens || 0;
            }

            // Vrátit odpověď
            return responseContent;

        } catch (error) {
            clearTimeout(timeout);
            console.error('Together AI request failed:', error);
            this.stats.errors++;
            
            // Převést AbortError na timeout error
            if (error.name === 'AbortError') {
                throw new window.ModelError(
                    'Požadavek vypršel - Together AI server neodpovídá',
                    'TIMEOUT',
                    { timeout: options.timeout || CONFIG.API.TIMEOUT }
                );
            }
            
            // Pokud je to už naše chyba, prostě ji předat dál
            if (error instanceof window.ModelError || error instanceof window.APIError) {
                throw error;
            }
            
            // Network errors
            if (error.message?.includes('Failed to fetch')) {
                throw new window.ModelError(
                    'Chyba sítě - nelze se připojit k Together AI',
                    'NETWORK_ERROR'
                );
            }
            
            // Ostatní chyby
            throw new window.ModelError(
                error.message || 'Neznámá chyba',
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
            modelType: this.modelType,
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
window.TogetherModel = TogetherModel;

console.log('📦 Together AI Model implementation loaded (v1.0)');
