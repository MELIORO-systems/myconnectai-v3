// Cohere Model Implementation
// Verze: 1.0 - Plná implementace s podporou chat a command modelů

class CohereModel {
    constructor(modelId, modelDef) {
        // Základní vlastnosti
        this.id = modelId;
        this.provider = 'cohere';
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
        this.apiEndpoint = this.config.endpoint || 'https://api.cohere.ai/v1/chat';
        
        // Cohere specific
        this.preamble = this.config.preamble || "Jsi přátelský a nápomocný AI asistent. Odpovídáš v češtině, pokud není požadováno jinak.";
        this.connectors = this.config.connectors || []; // Pro web search
        
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
        
        console.log(`🚀 Initializing Cohere model: ${this.id}`);
        
        this.initialized = true;
        console.log(`✅ Cohere model ready: ${this.id}`);
    }

    // Konvertovat zprávy z OpenAI formátu na Cohere formát
    convertToCohereChatHistory(messages) {
        const chatHistory = [];
        let currentMessage = null;
        
        for (const msg of messages) {
            // Přeskočit system zprávy - ty jdou do preamble
            if (msg.role === 'system') {
                continue;
            }
            
            // Cohere používá USER a CHATBOT role
            const cohereRole = msg.role === 'user' ? 'USER' : 'CHATBOT';
            
            chatHistory.push({
                role: cohereRole,
                message: msg.content
            });
            
            // Uložit poslední user zprávu
            if (msg.role === 'user') {
                currentMessage = msg.content;
            }
        }
        
        // Odstranit poslední user zprávu z historie (bude jako message)
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'USER') {
            chatHistory.pop();
        }
        
        return { chatHistory, currentMessage };
    }

    // Poslat zprávu s vylepšeným error handling a timeout
    async sendMessage(messages, options = {}) {
        // Získat API klíč - ošetřit prázdný string
        const apiKey = (options.apiKey && options.apiKey.trim()) || 
                       await window.modelManager?.getApiKey('cohere');
        
        if (!apiKey) {
            throw new window.ConfigurationError(
                'Cohere API klíč není nakonfigurován',
                'NO_API_KEY'
            );
        }

        // Konvertovat zprávy na Cohere formát
        const { chatHistory, currentMessage } = this.convertToCohereChatHistory(messages);
        
        if (!currentMessage) {
            throw new window.ModelError(
                'Žádná zpráva od uživatele',
                'NO_USER_MESSAGE'
            );
        }

        // Extrahovat system prompt pokud existuje
        let preamble = this.preamble;
        const systemMessage = messages.find(msg => msg.role === 'system');
        if (systemMessage) {
            preamble = systemMessage.content;
        }

        // Připravit request payload
        const requestPayload = {
            message: currentMessage,
            model: this.model,
            preamble: preamble,
            chat_history: chatHistory,
            temperature: options.temperature || this.temperature,
            max_tokens: options.maxTokens || this.maxTokens,
            k: options.topK || 0,
            p: options.topP || CONFIG.API.DEFAULT_PARAMS.TOP_P,
            frequency_penalty: options.frequencyPenalty || CONFIG.API.DEFAULT_PARAMS.FREQUENCY_PENALTY,
            presence_penalty: options.presencePenalty || CONFIG.API.DEFAULT_PARAMS.PRESENCE_PENALTY,
            connectors: this.connectors.length > 0 ? this.connectors : undefined
        };

        console.log(`💬 Sending request to Cohere (${this.model})...`);

        // Vytvořit AbortController pro timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, options.timeout || CONFIG.API.TIMEOUT || 30000);

        try {
            // Volat Cohere API s timeout
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            clearTimeout(timeout);

            // Zpracovat odpověď
            const data = await response.json();

            if (!response.ok) {
                console.error('Cohere API error:', data);
                this.stats.errors++;
                
                // Vytvořit specifickou chybu s českými hláškami
                if (response.status === 401) {
                    throw new window.APIError(
                        'Neplatný API klíč',
                        401,
                        'cohere'
                    );
                } else if (response.status === 429) {
                    // Cohere rate limiting
                    const retryAfter = response.headers.get('X-RateLimit-Reset');
                    const limitRemaining = response.headers.get('X-RateLimit-Remaining');
                    throw new window.APIError(
                        `Překročen limit požadavků. Zbývá ${limitRemaining || 0} požadavků${retryAfter ? `. Reset za ${retryAfter} sekund` : ''}`,
                        429,
                        'cohere'
                    );
                } else if (response.status === 503) {
                    throw new window.APIError(
                        'Služba Cohere je dočasně nedostupná',
                        503,
                        'cohere'
                    );
                } else if (response.status === 400) {
                    // Specifické chyby pro 400
                    if (data.message?.includes('too many tokens')) {
                        throw new window.ModelError(
                            'Zpráva je příliš dlouhá pro tento model',
                            'CONTEXT_LENGTH_EXCEEDED'
                        );
                    }
                    if (data.message?.includes('invalid model')) {
                        throw new window.ModelError(
                            `Model ${this.model} není dostupný`,
                            'MODEL_NOT_FOUND'
                        );
                    }
                    throw new window.APIError(
                        data.message || 'Neplatný požadavek',
                        400,
                        'cohere'
                    );
                } else if (data.message) {
                    throw new window.APIError(
                        data.message,
                        response.status,
                        'cohere'
                    );
                } else {
                    throw new window.APIError(
                        `Chyba API: ${response.status}`,
                        response.status,
                        'cohere'
                    );
                }
            }

            // Validovat odpověď
            if (!data.text) {
                throw new window.ModelError(
                    'Neplatný formát odpovědi od Cohere',
                    'INVALID_RESPONSE'
                );
            }

            // Extrahovat odpověď
            let responseContent = data.text;

            // Pokud jsou citace z web search, přidat je
            if (data.citations && data.citations.length > 0 && options.showCitations !== false) {
                responseContent += '\n\n**Zdroje:**\n';
                data.citations.forEach((citation, index) => {
                    responseContent += `${index + 1}. [${citation.document_name || 'Zdroj'}](${citation.url || '#'})\n`;
                });
            }

            // Aktualizovat statistiky
            if (data.meta?.tokens) {
                this.stats.messages++;
                this.stats.tokens += (data.meta.tokens.input_tokens || 0) + (data.meta.tokens.output_tokens || 0);
            }

            // Vrátit odpověď
            return responseContent;

        } catch (error) {
            clearTimeout(timeout);
            console.error('Cohere request failed:', error);
            this.stats.errors++;
            
            // Převést AbortError na timeout error
            if (error.name === 'AbortError') {
                throw new window.ModelError(
                    'Požadavek vypršel - Cohere server neodpovídá',
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
                    'Chyba sítě - nelze se připojit k Cohere',
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
            hasConnectors: this.connectors.length > 0,
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
window.CohereModel = CohereModel;

console.log('📦 Cohere Model implementation loaded (v1.0)');
