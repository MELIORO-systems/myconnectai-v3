# Kompletní průvodce integrace nových providerů

## 📁 **config.js** - VŠECHNY potřebné změny:

### 1. API Key Patterns (validace):
```javascript
API_KEY_PATTERNS: {
    OPENAI: /^(sk-[a-zA-Z0-9_-]{20,}|sess-[a-zA-Z0-9_-]{20,})$/,
    ANTHROPIC: /^sk-ant-[a-zA-Z0-9_-]{20,}$/,
    GOOGLE: /^AIza[a-zA-Z0-9_-]{20,}$/,
    // PŘIDAT:
    PERPLEXITY: /^pplx-[a-zA-Z0-9_-]{20,}$/,
    TOGETHER: /^[a-zA-Z0-9_-]{40,}$/,
    COHERE: /^[a-zA-Z0-9_-]{30,}$/
}
```

### 2. Storage Keys:
```javascript
KEYS: {
    // Existující...
    OPENAI_KEY: "secure_openai_key",
    ANTHROPIC_KEY: "secure_anthropic_key", 
    GOOGLE_KEY: "secure_google_key",
    // PŘIDAT:
    PERPLEXITY_KEY: "secure_perplexity_key",
    TOGETHER_KEY: "secure_together_key",
    COHERE_KEY: "secure_cohere_key",
    // Zbytek...
}
```

## 📁 **model-loader.js** - createModelInstance metoda:

```javascript
async createModelInstance(modelDef) {
    // ... existující kód ...
    
    switch (modelDef.provider) {
        case 'openai':
            // existující...
            
        case 'anthropic':
            // existující...
            
        // PŘIDAT VŠECHNY TŘI:
        case 'perplexity':
            if (window.PerplexityModel) {
                return new PerplexityModel(modelDef.id, modelDef);
            } else {
                console.warn('Perplexity model implementation not found - skipping');
                return null;
            }
            
        case 'together':
            if (window.TogetherModel) {
                return new TogetherModel(modelDef.id, modelDef);
            } else {
                console.warn('Together model implementation not found - skipping');
                return null;
            }
            
        case 'cohere':
            if (window.CohereModel) {
                return new CohereModel(modelDef.id, modelDef);
            } else {
                console.warn('Cohere model implementation not found - skipping');
                return null;
            }
            
        case 'google':
            // existující...
            
        default:
            console.warn(`Unknown provider: ${modelDef.provider}`);
            return null;
    }
}
```

## 📁 **model-manager.js** - VŠECHNY metody:

### 1. checkApiKey (async):
```javascript
async checkApiKey(provider) {
    // ... existující kód ...
    
    switch (provider) {
        case 'openai':
            hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.OPENAI_KEY));
            break;
        case 'anthropic':
            hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY));
            break;
        case 'google':
            hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.GOOGLE_KEY));
            break;
        // PŘIDAT:
        case 'perplexity':
            hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.PERPLEXITY_KEY));
            break;
        case 'together':
            hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.TOGETHER_KEY));
            break;
        case 'cohere':
            hasKey = !!(await security.loadSecure(CONFIG.STORAGE.KEYS.COHERE_KEY));
            break;
    }
    
    // ... zbytek kódu ...
}
```

### 2. hasApiKeyCached:
```javascript
hasApiKeyCached(provider) {
    // ... existující kód ...
    
    switch (provider) {
        case 'openai':
            return security.hasKey(CONFIG.STORAGE.KEYS.OPENAI_KEY);
        case 'anthropic':
            return security.hasKey(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
        case 'google':
            return security.hasKey(CONFIG.STORAGE.KEYS.GOOGLE_KEY);
        // PŘIDAT:
        case 'perplexity':
            return security.hasKey(CONFIG.STORAGE.KEYS.PERPLEXITY_KEY);
        case 'together':
            return security.hasKey(CONFIG.STORAGE.KEYS.TOGETHER_KEY);
        case 'cohere':
            return security.hasKey(CONFIG.STORAGE.KEYS.COHERE_KEY);
        default:
            return false;
    }
}
```

### 3. getApiKey:
```javascript
async getApiKey(provider) {
    // ... existující kód ...
    
    switch (provider) {
        case 'openai':
            return await security.loadSecure(CONFIG.STORAGE.KEYS.OPENAI_KEY);
        case 'anthropic':
            return await security.loadSecure(CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
        case 'google':
            return await security.loadSecure(CONFIG.STORAGE.KEYS.GOOGLE_KEY);
        // PŘIDAT:
        case 'perplexity':
            return await security.loadSecure(CONFIG.STORAGE.KEYS.PERPLEXITY_KEY);
        case 'together':
            return await security.loadSecure(CONFIG.STORAGE.KEYS.TOGETHER_KEY);
        case 'cohere':
            return await security.loadSecure(CONFIG.STORAGE.KEYS.COHERE_KEY);
        default:
            return null;
    }
}
```

## 📁 **settings-manager.js** - VŠECHNY metody:

### 1. getProviderUrl:
```javascript
getProviderUrl(provider) {
    const urls = {
        'openai': 'https://platform.openai.com/api-keys',
        'anthropic': 'https://console.anthropic.com/',
        'google': 'https://aistudio.google.com/app/apikey',
        // PŘIDAT:
        'perplexity': 'https://www.perplexity.ai/settings/api',
        'together': 'https://api.together.xyz/settings/api-keys',
        'cohere': 'https://dashboard.cohere.com/api-keys'
    };
    return urls[provider] || '#';
}
```

### 2. getProviderDomain:
```javascript
getProviderDomain(provider) {
    const domains = {
        'openai': 'platform.openai.com',
        'anthropic': 'console.anthropic.com',
        'google': 'aistudio.google.com',
        // PŘIDAT:
        'perplexity': 'perplexity.ai',
        'together': 'together.xyz',
        'cohere': 'dashboard.cohere.com'
    };
    return domains[provider] || provider;
}
```

### 3. getProviderDisplayName:
```javascript
getProviderDisplayName(provider) {
    const names = {
        'openai': 'OpenAI',
        'anthropic': 'Anthropic (Claude)',
        'google': 'Google (Gemini)',
        // PŘIDAT:
        'perplexity': 'Perplexity AI',
        'together': 'Together AI',
        'cohere': 'Cohere'
    };
    return names[provider] || provider;
}
```

### 4. getApiKeyPlaceholder:
```javascript
getApiKeyPlaceholder(provider) {
    const placeholders = {
        'openai': 'sk-...',
        'anthropic': 'sk-ant-...',
        'google': 'AIza...',
        // PŘIDAT:
        'perplexity': 'pplx-...',
        'together': 'Váš Together AI klíč',
        'cohere': 'Váš Cohere API klíč'
    };
    return placeholders[provider] || 'API Key';
}
```

### 5. validateApiKey (DŮLEŽITÉ!):
```javascript
validateApiKey(provider, apiKey) {
    // Základní validace délky
    if (apiKey.length < 20) {
        return false;
    }
    
    // Použít regex z konfigurace pokud existuje
    if (CONFIG.VALIDATION?.API_KEY_PATTERNS) {
        const pattern = CONFIG.VALIDATION.API_KEY_PATTERNS[provider.toUpperCase()];
        if (pattern && pattern instanceof RegExp) {
            return pattern.test(apiKey);
        }
    }
    
    // Fallback validace pokud není v konfiguraci
    switch (provider) {
        case 'openai':
            return apiKey.startsWith('sk-') || apiKey.startsWith('sess-');
        case 'anthropic':
            return apiKey.startsWith('sk-ant-');
        case 'google':
            return apiKey.startsWith('AIza');
        // PŘIDAT:
        case 'perplexity':
            return apiKey.startsWith('pplx-');
        case 'together':
            return apiKey.length >= 40; // Together má dlouhé klíče
        case 'cohere':
            return apiKey.length >= 30; // Cohere klíče
        default:
            return true;
    }
}
```

### 6. saveApiKeys (v metodě saveApiKey):
```javascript
async saveApiKeys() {
    const enabledProviders = this.getEnabledProviders();
    
    // Uložit pouze API klíče pro enabled providery
    for (const provider of enabledProviders) {
        const storageKey = CONFIG.STORAGE.KEYS[`${provider.toUpperCase()}_KEY`];
        if (storageKey) {
            await this.saveApiKey(provider, storageKey);
        }
    }
}
```

### 7. clearData (v metodě confirmClearData):
```javascript
// Vymazat API klíče
if (clearApiKeys && window.security) {
    const apiKeys = [
        CONFIG.STORAGE.KEYS.OPENAI_KEY,
        CONFIG.STORAGE.KEYS.ANTHROPIC_KEY,
        CONFIG.STORAGE.KEYS.GOOGLE_KEY,
        // PŘIDAT:
        CONFIG.STORAGE.KEYS.PERPLEXITY_KEY,
        CONFIG.STORAGE.KEYS.TOGETHER_KEY,
        CONFIG.STORAGE.KEYS.COHERE_KEY
    ];
    
    for (const key of apiKeys) {
        window.security.removeSecure(key);
    }
}
```

## 📁 **index.html** - Script tagy:

```html
<!-- 4. Model implementace -->
<script src="model-openai.js"></script>
<script src="model-claude.js"></script>
<!-- PŘIDAT VŠECHNY TŘI: -->
<script src="model-perplexity.js"></script>
<script src="model-together.js"></script>
<script src="model-cohere.js"></script>
<!-- Budoucí modely:
<script src="model-gemini.js"></script>
-->
```

## 📁 **main.js** (Debug mode):

Pokud máte debug funkce, přidat do `testApiKeys`:
```javascript
testApiKeys: async () => {
    const providers = ['openai', 'anthropic', 'google', 'perplexity', 'together', 'cohere'];
    for (const provider of providers) {
        const hasKey = await window.modelManager?.checkApiKey(provider);
        console.log(`${provider}: ${hasKey ? '✅ configured' : '❌ missing'}`);
    }
}
```

## 🔍 **Kontrolní seznam:**

- [ ] **config.js** - API_KEY_PATTERNS pro všechny providery
- [ ] **config.js** - STORAGE.KEYS pro všechny providery  
- [ ] **model-loader.js** - createModelInstance cases
- [ ] **model-manager.js** - checkApiKey cases
- [ ] **model-manager.js** - hasApiKeyCached cases
- [ ] **model-manager.js** - getApiKey cases
- [ ] **settings-manager.js** - getProviderUrl
- [ ] **settings-manager.js** - getProviderDomain
- [ ] **settings-manager.js** - getProviderDisplayName
- [ ] **settings-manager.js** - getApiKeyPlaceholder
- [ ] **settings-manager.js** - validateApiKey cases
- [ ] **settings-manager.js** - clearData API keys array
- [ ] **index.html** - script tagy pro všechny modely
- [ ] **models-registry.js** - enabled: true pro modely které chcete používat

## ⚠️ **Důležité poznámky:**

1. **Testování API klíčů** - metoda `testApiKey` v model-manager.js by měla fungovat pro všechny providery automaticky (používá první nalezený model daného providera)

2. **Export/Import** - díky použití dynamického `CONFIG.STORAGE.KEYS[${provider.toUpperCase()}_KEY]` by měl fungovat automaticky

3. **Rate limiting** - každý provider má své vlastní limity, implementace je v jednotlivých model souborech

4. **CORS** - pouze Anthropic má problém s CORS, ostatní by měly fungovat

Teď byste měl mít opravdu KOMPLETNÍ integraci! 🚀
