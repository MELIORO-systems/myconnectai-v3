// Perplexity Model Implementation
// Verze: 1.0 - Plná implementace s podporou online search

class PerplexityModel {
    constructor(modelId, modelDef) {
        // Základní vlastnosti
        this.id = modelId;
        this.provider = 'perplexity';
        this.name = modelDef.name;
        this.visible = modelDef.visible || false;
        this.initialized = false;
        
        // Model konfigurace z registry
        this.config = modelDef.config || {};
        this.model = this.config.model || modelId;
        this.contextWindow = this.config.contextWindow || 4096;
        this.maxTokens = this.config.maxTokens || 4096;
        this.temperature = this.config.temperature || 0.7;
        this.capabilities = this.config.capabilities || ['chat'];
        this.description = this.config.description || '';
        
        // API endpoint
        this.apiEndpoint = this.config.endpoint || 'https://api.perplexity.ai/chat/completions';
        
        // Perplexity specific
        this.supportsOnlineSearch = this.config.onlineSearch || false;
        
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
        
        console.log(`🚀 Initializing Perplexity model: ${this.id}`);
        
        this.initialized = true;
        console.log(`✅ Perplexity model ready: ${this.id}`);
    }

    // Poslat zprávu s vylepšeným error handling a timeout
    async sendMessage(messages, options = {}) {
        // Získat API klíč - ošetřit prázdný string
        const apiKey = (options.apiKey && options.apiKey.trim()) || 
                       await window.modelManager?.getApiKey('perplexity');
        
        if (!apiKey) {
            throw new window.ConfigurationError(
                'Perplexity API klíč není nakonfigurován',
                'NO_API_KEY'
            );
        }

        // Připravit zprávy ve formátu kompatibilním s OpenAI/Perplexity
        const systemPrompt = {
            role: "system",
            content: CONFIG.API.DEFAULT_PARAMS.SYSTEM_PROMPT || "You are a helpful assistant. Odpovídej v češtině, pokud není požadováno jinak."
        };

        // Filtrovat existující system zprávy a přidat naši
        const filteredMessages = messages.filter(msg => msg.role !== 'system');
        const allMessages = [systemPrompt, ...filteredMessages];

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

        // Přidat online search parametry pokud model podporuje
        if (this.supportsOnlineSearch && options.enableSearch !== false) {
            requestPayload.search_domain_filter = options.searchDomains || [];
            requestPayload.return_citations = options.returnCitations !== false;
            requestPayload.search_recency_filter = options.searchRecency || null;
        }

        console.log(`💬 Sending request to Perplexity (${this.model})...`);

        // Vytvořit AbortController pro timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, options.timeout || CONFIG.API.TIMEOUT || 30000);

        try {
            // Volat Perplexity API s timeout
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
                console.error('Perplexity API error:', data);
                this.stats.errors++;
                
                // Vytvořit specifickou chybu s českými hláškami
                if (response.status === 401) {
                    throw new window.APIError(
                        'Neplatný API klíč',
                        401,
                        'perplexity'
                    );
                } else if (response.status === 429) {
                    // Extrahovat informace o rate limitu
                    const retryAfter = response.headers.get('X-RateLimit-Reset');
                    const resetTime = retryAfter ? new Date(parseInt(retryAfter) * 1000).toLocaleTimeString('cs-CZ') : null;
                    throw new window.APIError(
                        `Překročen limit požadavků${resetTime ? `. Limit se resetuje v ${resetTime}` : ''}`,
                        429,
                        'perplexity'
                    );
                } else if (response.status === 503) {
                    throw new window.APIError(
                        'Služba Perplexity je dočasně nedostupná',
                        503,
                        'perplexity'
                    );
                } else if (response.status === 400) {
                    // Specifické chyby pro 400
                    if (data.error?.message?.includes('context_length_exceeded')) {
                        throw new window.ModelError(
                            'Zpráva je příliš dlouhá pro tento model',
                            'CONTEXT_LENGTH_EXCEEDED'
                        );
                    }
                    throw new window.APIError(
                        data.error?.message || 'Neplatný požadavek',
                        400,
                        'perplexity'
                    );
                } else if (data.error?.message) {
                    throw new window.APIError(
                        data.error.message,
                        response.status,
                        'perplexity'
                    );
                } else {
                    throw new window.APIError(
                        `Chyba API: ${response.status}`,
                        response.status,
                        'perplexity'
                    );
                }
            }

            // Validovat odpověď - Perplexity používá OpenAI formát
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new window.ModelError(
                    'Neplatný formát odpovědi od Perplexity',
                    'INVALID_RESPONSE'
                );
            }

            // Extrahovat odpověď
            let responseContent = data.choices[0].message.content;

            // Pokud model vrátil citace, přidat je na konec odpovědi
            if (data.citations && data.citations.length > 0 && options.showCitations !== false) {
                responseContent += '\n\n**Zdroje:**\n';
                data.citations.forEach((citation, index) => {
                    responseContent += `${index + 1}. [${citation.title || citation.url}](${citation.url})\n`;
                });
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
            console.error('Perplexity request failed:', error);
            this.stats.errors++;
            
            // Převést AbortError na timeout error
            if (error.name === 'AbortError') {
                throw new window.ModelError(
                    'Požadavek vypršel - Perplexity server neodpovídá',
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
                    'Chyba sítě - nelze se připojit k Perplexity',
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
            supportsOnlineSearch: this.supportsOnlineSearch,
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
window.PerplexityModel = PerplexityModel;

console.log('📦 Perplexity Model implementation loaded (v1.0)');
