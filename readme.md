# MyConnectAI v3 - Multi-Model AI Chat Application

## 📋 Přehled

MyConnectAI v3 je webová aplikace pro chat s různými AI modely přes jednotné rozhraní. Aplikace běží kompletně v prohlížeči bez backend serveru a používá přímá API volání. Aktuálně podporuje OpenAI modely s připravenou architekturou pro budoucí rozšíření o Anthropic a Google modely.

### Hlavní vlastnosti:
- 🤖 **Multi-model architektura** - Aktuálně GPT-3.5 Turbo a GPT-4o Mini
- 🔐 **Lokální šifrování** - API klíče jsou šifrovány pomocí AES-256-GCM
- 🎨 **4 barevná témata** - Claude, Google, Replit, Carrd
- 📦 **Export/Import** konfigurace s heslem (PBKDF2)
- 🔄 **Automatické přepínání** mezi modely
- 📱 **Responzivní design** - funguje na mobilu i desktopu
- 🔒 **Bezpečný** - žádná data neopouštějí prohlížeč

## 🏗️ Struktura projektu

```
myconnectai-v3/
├── index.html              # Hlavní HTML soubor
├── style.css               # Všechny styly aplikace
├── config.js               # Centrální konfigurace (v3.1)
├── security.js             # Šifrování a bezpečnost (AES-GCM)
├── models-registry.js      # Definice všech AI modelů
├── model-manager.js        # Správa modelů a API volání (v3.0)
├── model-loader.js         # Automatické načítání modelů (v2.0)
├── model-openai.js         # Implementace OpenAI API (v3.0)
├── ui-manager.js           # Správa uživatelského rozhraní (v3.0)
├── settings-manager.js     # Správa nastavení aplikace (v2.0)
└── main.js                 # Hlavní aplikační logika (v3.2)
```

## 🚀 Jak aplikace funguje

### 1. Inicializační proces
1. **config.js** - Načte konfiguraci
2. **security.js** - Inicializuje šifrování (kontroluje localStorage a Web Crypto API)
3. **models-registry.js** - Definuje dostupné modely
4. **ui-manager.js** - Inicializuje UI při DOMContentLoaded
5. **main.js** - Při window.load spustí hlavní inicializaci:
   - Security Manager (čeká na dokončení)
   - Model Loader (načte enabled modely)
   - Model Manager (inicializuje s načtenými modely)

### 2. Flow dat
```
Uživatel → UI Manager → Model Manager → OpenAI Model → API → Odpověď
```

### 3. Bezpečnost
- API klíče jsou šifrovány pomocí AES-256-GCM
- Každé zařízení má unikátní šifrovací klíč
- Export dat je chráněn heslem (PBKDF2 s 100,000 iteracemi)
- Validace síly hesla při exportu

## ⚙️ Konfigurace

### Hlavní konfigurační soubor: `config.js`

```javascript
const CONFIG = {
    // Verze aplikace
    VERSION: "3.1",
    
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
    }
};
```

## 🤖 Aktuálně podporované modely

### OpenAI (funkční)
- **GPT-3.5 Turbo** - Rychlý model pro běžné úlohy
- **GPT-4o Mini** - Optimalizovaná verze GPT-4 (výchozí)

### Připraveno pro budoucí rozšíření
- **Anthropic** (Claude modely) - struktura připravena, chybí implementace
- **Google** (Gemini modely) - struktura připravena, chybí implementace

## 🔧 Přidání nového AI modelu

### Krok 1: Přidat model do `models-registry.js`

```javascript
{
    id: "gpt-4",
    provider: "openai",
    name: "GPT-4",
    enabled: true,        // true = model má implementaci a bude se načítat
    visible: true,        // true = model je viditelný ve výběru
    config: {
        model: "gpt-4",
        contextWindow: 8192,
        maxTokens: 4096,
        temperature: 0.7,
        capabilities: ["chat", "analysis", "reasoning", "coding"],
        description: "Nejvýkonnější model pro komplexní úlohy",
        endpoint: "https://api.openai.com/v1/chat/completions",
        assistant: false   // true = zobrazí Assistant ID nastavení (pouze některé OpenAI modely)
    }
}
```

### Krok 2: Pro nového providera vytvořit implementační soubor

Například `model-anthropic.js`:
```javascript
class AnthropicModel {
    constructor(modelId, modelDef) {
        this.id = modelId;
        this.provider = 'anthropic';
        this.name = modelDef.name;
        // ...
    }

    async sendMessage(messages, options = {}) {
        // Implementace API volání
    }
}

window.AnthropicModel = AnthropicModel;
```

### Krok 3: Přidat do `index.html` a `model-loader.js`

## 🎨 Témata

Aplikace má 4 barevná témata:

1. **Claude** (výchozí) - světlé béžové téma
2. **Google** - čistě bílé s modrými akcenty
3. **Replit** - tmavé téma s červenými akcenty
4. **Carrd** - tmavé s cyan akcenty

## 💾 Použití aplikace

### První spuštění
1. Otevřete `index.html` v prohlížeči
2. Klikněte na Menu → Nastavení
3. Zadejte váš OpenAI API klíč
4. Klikněte Uložit

### Posílání zpráv
1. Napište zprávu do textového pole
2. Stiskněte Enter nebo klikněte Odeslat
3. Počkejte na odpověď AI

### Export/Import konfigurace
1. V nastavení klikněte na "Export nastavení"
2. Zadejte heslo (min. 8 znaků, 3 typy znaků)
3. Soubor se automaticky stáhne
4. Pro import použijte "Import nastavení" a stejné heslo

## 🔒 Bezpečnost

### Šifrování dat
- **Algoritmus**: AES-GCM 256-bit
- **Klíč**: Unikátní pro každé zařízení (generován při prvním spuštění)
- **IV**: Náhodný pro každé šifrování (12 bytů)

### API klíče
- Nikdy nejsou poslány nikam jinam než přímo na API endpoint
- Jsou šifrovány v localStorage
- Při exportu jsou dodatečně šifrovány heslem uživatele

### Validace
- API klíče jsou validovány pomocí regex (podporují `-` a `_`)
- Hesla pro export musí splňovat bezpečnostní požadavky
- Všechny vstupy jsou escapovány proti XSS

## 🛠️ Řešení problémů

### "No visible models available"
- Aplikace nenašla žádné modely k načtení
- Zkontrolujte, zda jsou v `models-registry.js` modely s `enabled: true`

### "Neplatný formát API klíče"
- OpenAI klíče musí začínat `sk-` nebo `sess-`
- Mohou obsahovat písmena, číslice, pomlčky a podtržítka

### Aplikace se nenačte
1. Zkontrolujte konzoli prohlížeče (F12)
2. Ověřte, že prohlížeč podporuje localStorage a Web Crypto API
3. Vyčistěte cache a zkuste znovu

## 📊 Známé limitace

- Pouze OpenAI modely jsou aktuálně implementovány
- Maximum 20 zpráv za minutu (rate limiting)
- Maximální délka zprávy 4000 znaků
- Timeout pro API volání 30 sekund

## 🔧 Debug režim

Pro detailní logování v `config.js` nastavte:
```javascript
DEBUG_MODE: true
```

V konzoli pak můžete použít:
```javascript
window.debugInfo.testApiKeys()  // Test všech API klíčů
window.debugInfo.getState()     // Stav aplikace
```

## 📞 Podpora

- **Email**: support@melioro.cz
- **Web**: http://melioro.cz
- **Verze**: 3.2

---

**Vytvořeno s ❤️ by MELIORO Systems**
