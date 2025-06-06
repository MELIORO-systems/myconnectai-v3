# MyConnectAI v3 - Multi-Model AI Chat Application

## 📋 Přehled

MyConnectAI v3 je webová aplikace pro chat s různými AI modely (OpenAI, Anthropic, Google) přes jednotné rozhraní. Aplikace běží kompletně v prohlížeči bez backend serveru a používá přímá API volání.

### Hlavní vlastnosti:
- 🤖 **Multi-model podpora** - GPT-3.5, GPT-4, Claude, Gemini a další
- 🔐 **Lokální šifrování** - API klíče jsou šifrovány pomocí AES-GCM
- 🎨 **4 barevná témata** - Claude, Google, Replit, Carrd
- 📦 **Export/Import** konfigurace s heslem
- 🔄 **Automatické přepínání** mezi modely
- 📱 **Responzivní design** - funguje na mobilu i desktopu

## 🏗️ Struktura projektu

```
myconnectai-v3/
├── index.html              # Hlavní HTML soubor
├── style.css               # Všechny styly aplikace
├── config.js               # Centrální konfigurace
├── security.js             # Šifrování a bezpečnost (AES-GCM)
├── models-registry.js      # Definice všech AI modelů
├── model-manager.js        # Správa modelů a API volání
├── model-loader.js         # Automatické načítání modelů
├── model-openai.js         # Implementace OpenAI API
├── ui-manager.js           # Správa uživatelského rozhraní
├── settings-manager.js     # Správa nastavení aplikace
└── main.js                 # Hlavní aplikační logika
```

## 🚀 Jak aplikace funguje

### 1. Inicializační proces
1. **config.js** - Načte konfiguraci
2. **security.js** - Inicializuje šifrování
3. **models-registry.js** - Definuje dostupné modely
4. **model-loader.js** - Načte enabled modely
5. **model-manager.js** - Připraví modely k použití
6. **ui-manager.js** - Nastaví UI a téma
7. **main.js** - Spustí aplikaci

### 2. Flow dat
```
Uživatel → UI Manager → Model Manager → Konkrétní Model → API → Odpověď
```

### 3. Bezpečnost
- API klíče jsou šifrovány pomocí AES-GCM
- Každé zařízení má unikátní šifrovací klíč
- Export dat je chráněn heslem (PBKDF2)

## ⚙️ Konfigurace

### Hlavní konfigurační soubor: `config.js`

```javascript
const CONFIG = {
    // Verze aplikace
    VERSION: "3.0",
    
    // Debug režim - vypíše detailní logy
    DEBUG_MODE: false,
    
    // Výchozí model
    MODELS: {
        DEFAULT: 'gpt-4o-mini',
        FALLBACK_CHAIN: ['gpt-4o-mini', 'gpt-3.5-turbo']
    },
    
    // UI nastavení
    UI: {
        DEFAULT_THEME: "claude",
        EXAMPLE_QUERIES: [
            "Vysvětli mi, jak funguje kvantový počítač",
            // ...
        ]
    },
    
    // Storage klíče
    STORAGE: {
        PREFIX: "myconnectai_",
        KEYS: {
            OPENAI_KEY: "secure_openai_key",
            ANTHROPIC_KEY: "secure_anthropic_key",
            GOOGLE_KEY: "secure_google_key",
            // ...
        }
    }
};
```

## 🤖 Přidání nového AI modelu

### Krok 1: Přidat model do `models-registry.js`

```javascript
{
    id: "claude-3-opus-20240229",
    provider: "anthropic",
    name: "Claude 3 Opus",
    enabled: true,        // true = model je dostupný
    visible: false,       // true = model je viditelný ve výběru
    config: {
        model: "claude-3-opus-20240229",
        contextWindow: 200000,
        maxTokens: 4096,
        temperature: 0.7,
        capabilities: ["chat", "analysis", "reasoning", "coding", "vision"],
        description: "Nejvýkonnější model od Anthropic",
        endpoint: "https://api.anthropic.com/v1/messages"
    }
}
```

### Krok 2: Vytvořit implementační soubor `model-anthropic.js`

```javascript
class AnthropicModel {
    constructor(modelId, modelDef) {
        this.id = modelId;
        this.provider = 'anthropic';
        this.name = modelDef.name;
        this.visible = modelDef.visible || false;
        this.config = modelDef.config || {};
        // ... další vlastnosti
    }

    async sendMessage(messages, options = {}) {
        const apiKey = options.apiKey || await window.modelManager?.getApiKey('anthropic');
        
        if (!apiKey) {
            throw new window.ConfigurationError('Anthropic API key not configured', 'NO_API_KEY');
        }

        // Implementace API volání
        const response = await fetch(this.config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.config.model,
                messages: messages,
                max_tokens: options.maxTokens || this.config.maxTokens
            })
        });

        // Zpracování odpovědi
        const data = await response.json();
        return data.content[0].text;
    }
}

window.AnthropicModel = AnthropicModel;
```

### Krok 3: Přidat do `index.html`

```html
<!-- Model implementace -->
<script src="model-openai.js"></script>
<script src="model-anthropic.js"></script>  <!-- Nový model -->
```

### Krok 4: Upravit `model-loader.js` (pokud je potřeba)

```javascript
case 'anthropic':
    if (window.AnthropicModel) {
        return new AnthropicModel(modelDef.id, modelDef);
    }
    break;
```

## 🎨 Témata

Aplikace má 4 barevná témata definovaná v `style.css`:

1. **Claude** (výchozí) - světlé oranžové téma
2. **Google** - modro-bílé téma
3. **Replit** - tmavé červené téma
4. **Carrd** - tmavé cyan téma

### Přidání nového tématu:

1. Přidat CSS variables do `style.css`:
```css
.theme-mynew {
    --primary-color: #your-color;
    --background: #your-background;
    /* ... další barvy ... */
}
```

2. Přidat tlačítko do `index.html`:
```html
<button class="theme-btn theme-mynew" data-theme="mynew" title="Moje téma"></button>
```

## 📁 Hierarchická nastavení

Nastavení jsou organizována hierarchicky:

```
Nastavení
├── AI Model (výběr aktivního modelu)
├── Vzhled (výběr tématu)
├── OpenAI (zobrazí se pouze pokud jsou enabled OpenAI modely)
│   ├── API Key
│   └── GPT-4 nastavení
│       └── Assistant ID (pouze pro modely s capability "assistant")
├── Anthropic (pouze pro enabled Anthropic modely)
│   └── API Key
└── Google (pouze pro enabled Google modely)
    └── API Key
```

### Přidání nového nastavení pro model:

V `settings-manager.js` metodě `createModelSettings()`:

```javascript
if (modelDef.config?.capabilities?.includes('vision')) {
    // Přidat UI pro vision nastavení
    group.innerHTML += `
        <div class="setting-item">
            <label>
                <input type="checkbox" id="${modelDef.id}-vision-enabled">
                Povolit Vision mode
            </label>
        </div>
    `;
}
```

## 🔒 Bezpečnost

### Šifrování dat
- **Algoritmus**: AES-GCM 256-bit
- **Klíč**: Unikátní pro každé zařízení
- **IV**: Náhodný pro každé šifrování

### API klíče
- Nikdy nejsou poslány nikam jinam než přímo na API endpoint
- Jsou šifrovány v localStorage
- Při exportu jsou dodatečně šifrovány heslem

### Export/Import
- Používá PBKDF2 pro odvození klíče z hesla
- 100,000 iterací
- Salt je součástí exportu

## 🛠️ Údržba a debugging

### Debug mode
V `config.js` nastavit:
```javascript
DEBUG_MODE: true
```

Vypíše do konzole:
- Všechny načtené modely
- API volání
- Inicializační proces
- Chyby s detaily

### Časté problémy

1. **"No API key configured"**
   - Řešení: Nastavit API klíč v nastavení

2. **"Model not visible"**
   - Řešení: V models-registry.js nastavit `visible: true`

3. **"Initialization timeout"**
   - Řešení: Vyčistit localStorage a obnovit stránku

### Vyčištění dat
```javascript
// V konzoli prohlížeče:
localStorage.clear();
location.reload();
```

## 📝 Důležité soubory pro úpravy

### Změna vzhledu
- `style.css` - všechny styly
- `index.html` - struktura UI

### Přidání modelů
- `models-registry.js` - definice modelů
- `model-*.js` - implementace API

### Změna chování
- `config.js` - základní nastavení
- `main.js` - hlavní logika
- `ui-manager.js` - UI interakce

### Nastavení
- `settings-manager.js` - logika nastavení
- `security.js` - šifrování

## 🔄 Verzování

Aplikace má 3 úrovně verzí:
1. **APP_VERSION** v `main.js` - verze aplikace
2. **CONFIG.VERSION** - verze konfigurace
3. **CONFIG.EXPORT.FORMAT_VERSION** - verze export formátu

## 📞 Podpora

- **Email**: support@melioro.cz
- **Web**: http://melioro.cz
- **Dokumentace**: https://docs.melioro.cz/myconnectai

## 🚧 Budoucí rozšíření

1. **Další modely**: Claude, Gemini implementace
2. **Statistiky**: Počet zpráv, tokenů, cena
3. **Historie**: Ukládání a načítání konverzací
4. **Pokročilé features**: Streaming, voice input, image upload
5. **Plugins**: Rozšiřitelnost třetími stranami

---

**Vytvořeno s ❤️ by MELIORO Systems**
