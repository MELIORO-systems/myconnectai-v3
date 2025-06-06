// Anthropic Model Implementation
// Verze: 1.0 - Plná implementace s konzistentními českými error messages

class AnthropicModel {
    constructor(modelId, modelDef) {
        // Základní vlastnosti
        this.id = modelId;
        this.provider = 'anthropic';
        this.name = modelDef.name;
        this.visible = modelDef.visible || false;
        this.initialized = false;
        
        // Model konfigurace z registry
        this.config = modelDef.config || {};
        this.model = this.config.model || modelId;
        this.contextWindow = this.config.contextWindow || 200000;
        this.maxTokens = this.config.maxTokens || 4096;
        this.temperature = this.config.temperature || 0.7;
        this.capabilities = this.config.capabilities || ['chat'];
        this.description = this.config.description || '';
        
        // API endpoint
        this.apiEndpoint = this.config.endpoint || 'https://api.anthropic.com/v1/messages';
        
        // Anthropic specific
        this.apiVersion = '2023-06-01'; // Anthropic vyžaduje version header
        this.maxRetries = 3; // Pro rate limit handling
        
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
        
        console.log(`🚀 Initializing Anthropic model: ${this.id}`);
        
        this.initialized = true;
        console.log(`✅ Anthropic model ready: ${this.id}`);
    }

    // Poslat zprávu s vylepšeným error handling a timeout
    async sendMessage(messages, options = {}) {
        // Získat API klíč - ošetřit prázdný string
        const apiKey = (options.apiKey && options.apiKey.trim()) || 
                       await window.modelManager?.getApiKey('anthropic');
        
        if (!apiKey) {
            throw new window.ConfigurationError(
                'Anthropic API klíč není nakonfigurován',
                'NO_API_KEY'
            );
        }

        // Konvertovat zprávy z OpenAI formátu na Anthropic formát
        const anthropicMessages = this.convertMessages(messages);
        
        // Extrahovat system prompt pokud existuje
        let systemPrompt = CONFIG.API.DEFAULT_PARAMS.SYSTEM_PROMPT || "You are a helpful assistant.";
        
        // Pokud první zpráva je system, použít ji
        const firstMessage = messages[0];
        if (firstMessage && firstMessage.role === 'system') {
            systemPrompt = firstMessage.content;
        }

        // Připravit request payload
        const requestPayload = {
            model: this.model,
            messages: anthropicMessages,
            system: systemPrompt,
            max_tokens: options.maxTokens || this.maxTokens,
            temperature: options.temperature || this.temperature,
            top_p: options.topP || CONFIG.API.DEFAULT_PARAMS.TOP_P
        };

        console.log(`💬 Sending request to Anthropic (${this.model})...`);

        // Vytvořit AbortController pro timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, options.timeout || CONFIG.API.TIMEOUT || 30000);

        try {
            // Volat Anthropic API s timeout
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': this.apiVersion
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            clearTimeout(timeout);

            // Zpracovat odpověď
            const data = await response.json();

            if (!response.ok) {
                console.error('Anthropic API error:', data);
                this.stats.errors++;
                
                // Vytvořit specifickou chybu s českými hláškami
                if (response.status === 401) {
                    throw new window.APIError(
                        'Neplatný API klíč',
                        401,
                        'anthropic'
                    );
                } else if (response.status === 429) {
                    // Extrahovat informace o rate limitu
                    const retryAfter = response.headers.get('Retry-After');
                    throw new window.APIError(
                        `Překročen limit požadavků${retryAfter ? `. Zkuste to za ${retryAfter} sekund` : ''}`,
                        429,
                        'anthropic'
                    );
                } else if (response.status === 503) {
                    throw new window.APIError(
                        'Služba Anthropic je dočasně nedostupná',
                        503,
                        'anthropic'
                    );
                } else if (response.status === 400) {
                    // Specifické chyby pro 400
                    if (data.error?.message?.includes('credit')) {
                        throw new window.APIError(
                            'Nedostatečný kredit na Anthropic účtu',
                            400,
                            'anthropic'
                        );
                    }
                    if (data.error?.message?.includes('context_length')) {
                        throw new window.ModelError(
                            'Zpráva je příliš dlouhá pro tento model',
                            'CONTEXT_LENGTH_EXCEEDED'
                        );
                    }
                    throw new window.APIError(
                        data.error?.message || 'Neplatný požadavek',
                        400,
                        'anthropic'
                    );
                } else if (data.error?.message) {
                    throw new window.APIError(
                        data.error.message,
                        response.status,
                        'anthropic'
                    );
                } else {
                    throw new window.APIError(
                        `Chyba API: ${response.status}`,
                        response.status,
                        'anthropic'
                    );
                }
            }

            // Validovat odpověď
            if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
                throw new window.ModelError(
                    'Neplatný formát odpovědi od Anthropic',
                    'INVALID_RESPONSE'
                );
            }

            // Extrahovat text z odpovědi
            const responseText = data.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('\n');

            if (!responseText) {
                throw new window.ModelError(
                    'Prázdná odpověď od Anthropic',
                    'EMPTY_RESPONSE'
                );
            }

            // Aktualizovat statistiky
            if (data.usage) {
                this.stats.messages++;
                this.stats.tokens += (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
            }

            // Vrátit odpověď
            return responseText;

        } catch (error) {
            clearTimeout(timeout);
            console.error('Anthropic request failed:', error);
            this.stats.errors++;
            
            // Převést AbortError na timeout error
            if (error.name === 'AbortError') {
                throw new window.ModelError(
                    'Požadavek vypršel - Anthropic server neodpovídá',
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
                    'Chyba sítě - nelze se připojit k Anthropic',
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

    // Konvertovat zprávy z OpenAI formátu na Anthropic formát
    convertMessages(messages) {
        const anthropicMessages = [];
        
        for (const message of messages) {
            // Přeskočit system zprávy (ty jdou do system parametru)
            if (message.role === 'system') {
                continue;
            }
            
            // Konvertovat assistant na assistant, user na user
            if (message.role === 'user' || message.role === 'assistant') {
                anthropicMessages.push({
                    role: message.role,
                    content: message.content
                });
            }
        }
        
        // Anthropic vyžaduje, aby první zpráva byla od uživatele
        // a střídaly se user/assistant
        return this.ensureAlternatingRoles(anthropicMessages);
    }

    // Zajistit střídání rolí (Anthropic requirement)
    ensureAlternatingRoles(messages) {
        if (messages.length === 0) return messages;
        
        const fixed = [];
        let lastRole = null;
        
        for (const message of messages) {
            // Pokud se role opakuje, přidáme prázdnou zprávu opačné role
            if (lastRole === message.role) {
                fixed.push({
                    role: lastRole === 'user' ? 'assistant' : 'user',
                    content: '...' // Minimální placeholder
                });
            }
            
            fixed.push(message);
            lastRole = message.role;
        }
        
        // Zajistit, že první zpráva je od uživatele
        if (fixed.length > 0 && fixed[0].role !== 'user') {
            fixed.unshift({
                role: 'user',
                content: 'Začněme konverzaci.'
            });
        }
        
        // Zajistit, že poslední zpráva je od uživatele (pro generování odpovědi)
        if (fixed.length > 0 && fixed[fixed.length - 1].role !== 'user') {
            fixed.push({
                role: 'user',
                content: 'Pokračuj prosím.'
            });
        }
        
        return fixed;
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
window.AnthropicModel = AnthropicModel;

console.log('📦 Anthropic Model implementation loaded (v1.0)');
