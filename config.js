// Konfigurace aplikace - MyConnectAI v3
// Verze: 3.1 - S méně striktní validací API klíčů

const CONFIG = {
    // === ZÁKLADNÍ NASTAVENÍ ===
    VERSION: "3.1",
    LAST_UPDATE: new Date().toISOString(),
    
    // === DEBUG MODE ===
    DEBUG_MODE: false, // true = vypíše detailní informace o modelech do konzole
    
    // === MODELY - VÝCHOZÍ NASTAVENÍ ===
    MODELS: {
        // Výchozí model - použije se pokud uživatel nemá nic uloženého
        DEFAULT: 'gpt-4o-mini',
        
        // Fallback chain - záložní modely při selhání
        FALLBACK_CHAIN: ['gpt-4o-mini', 'gpt-3.5-turbo']
    },
    
    // === PROXY NASTAVENÍ ===
    // Pro budoucí použití - nyní používáme přímé API volání
    PROXY: {
        ENABLED: false,
        URL: "", // Případná Cloudflare Worker URL
    },
    
    // === UI NASTAVENÍ ===
    UI: {
        PAGE_TITLE: "MyConnectAI v3 - Multi-Model Chat",
        APP_TITLE: "MyConnectAI v3",
        APP_SUBTITLE: "Multi-Model AI Assistant",
        
        // Tlačítka a vstupy
        SEND_BUTTON_TEXT: "Odeslat",
        INPUT_PLACEHOLDER: "Napište svůj dotaz...",
        RELOAD_BUTTON_TEXT: "Reload",
        RELOAD_BUTTON_TOOLTIP: "Znovu načíst chat",
        
        // Témata
        DEFAULT_THEME: "claude",
        THEMES: {
            claude: {
                name: "Claude",
                tooltip: "Claude téma - výchozí světlé",
                description: "Inspirováno Claude.ai designem"
            },
            google: {
                name: "Google",
                tooltip: "Google téma - čisté a moderní",
                description: "Minimalistický Google styl"
            },
            replit: {
                name: "Replit",
                tooltip: "Tmavé téma pro noční práci",
                description: "Příjemné pro oči při dlouhé práci"
            },
            carrd: {
                name: "Carrd",
                tooltip: "Carrd téma - futuristické",
                description: "Moderní a výrazný design"
            }
        },
        
        // Příklady dotazů
        EXAMPLE_QUERIES: [
            "Vysvětli mi, jak funguje kvantový počítač",
            "Napiš krátkou pohádku o drakovi",
            "Jaký je rozdíl mezi var, let a const v JavaScriptu?",
            "Navrhni zdravý jídelníček na týden",
            "Jak se připravit na pracovní pohovor?",
            "Co je to umělá inteligence?"
        ],
        
        // Patička
        FOOTER: {
            POWERED_BY_TEXT: "Powered by",
            COMPANY_NAME: "MELIORO Systems",
            COMPANY_URL: "http://melioro.cz"
        }
    },
    
    // === ZPRÁVY ===
    MESSAGES: {
        LOADING: "Přemýšlím...",
        ERROR: "Omlouvám se, došlo k chybě. Zkuste to prosím znovu.",
        WELCOME: "Vítejte v MyConnectAI v3",
        CONNECTION_ERROR: "Chyba připojení. Zkontrolujte internetové připojení.",
        MODEL_CHANGED: "Model byl úspěšně změněn.",
        NO_API_KEY: "Pro tento model není nastaven API klíč. Prosím nastavte ho v nastavení.",
        SETTINGS_SAVED: "Nastavení bylo úspěšně uloženo.",
        SETTINGS_SAVE_ERROR: "Chyba při ukládání nastavení.",
        API_KEY_VALID: "API klíč je platný ✓",
        API_KEY_INVALID: "API klíč je neplatný ✗",
        EXPORT_SUCCESS: "Konfigurace byla úspěšně exportována.",
        IMPORT_SUCCESS: "Konfigurace byla úspěšně importována.",
        IMPORT_ERROR: "Chyba při importu konfigurace."
    },
    
    // === RATE LIMITING ===
    RATE_LIMITING: {
        ENABLED: true,
        MAX_MESSAGES_PER_MINUTE: 20,
        COOLDOWN_MESSAGE: "Příliš mnoho zpráv. Počkejte chvíli před dalším dotazem."
    },
    
    // === SYSTEM INFO ===
    SYSTEM: {
        NAME: "MyConnectAI v3",
        DESCRIPTION: "Multi-Model AI Chat aplikace s podporou různých jazykových modelů",
        VERSION: "3.1.0",
        BUILD_DATE: "2024-12-06",
        AUTHOR: "MELIORO Systems",
        LICENSE: "Proprietary",
        REPOSITORY: "https://github.com/melioro-systems/myconnectai-v3",
        DOCUMENTATION: "https://docs.melioro.cz/myconnectai",
        SUPPORT_EMAIL: "support@melioro.cz"
    },
    
    // === STORAGE KEYS ===
    STORAGE: {
        // Prefix pro všechny klíče v localStorage
        PREFIX: "myconnectai_",
        
        // Jednotlivé klíče
        KEYS: {
            // Uživatelské preference
            SELECTED_MODEL: "selected_model",
            SELECTED_THEME: "selected_theme",
            
            // API klíče (šifrované)
            OPENAI_KEY: "secure_openai_key",
            ANTHROPIC_KEY: "secure_anthropic_key", 
            GOOGLE_KEY: "secure_google_key",
            
            // Model specific
            OPENAI_ASSISTANT_ID: "openai_assistant_id",
            
            // Systémové
            DEVICE_KEY: "device_key", // Pro šifrování
            USER_VISIBLE_MODELS: "user_visible_models",
            LAST_EXPORT: "last_export_date",
            SETTINGS_VERSION: "settings_version"
        }
    },
    
    // === API KONFIGURACE ===
    API: {
        // Timeout pro API volání (ms)
        TIMEOUT: 30000,
        
        // Výchozí parametry pro modely
        DEFAULT_PARAMS: {
            TEMPERATURE: 0.7,
            MAX_TOKENS: 2048,
            TOP_P: 1,
            FREQUENCY_PENALTY: 0,
            PRESENCE_PENALTY: 0,
            SYSTEM_PROMPT: "Jsi přátelský a nápomocný AI asistent. Odpovídáš v češtině, pokud není požadováno jinak."
        }
    },
    
    // === VALIDACE ===
    VALIDATION: {
        // Minimální délka zprávy
        MIN_MESSAGE_LENGTH: 1,
        
        // Maximální délka zprávy
        MAX_MESSAGE_LENGTH: 4000,
        
        // Vzory pro validaci API klíčů - MÉNĚ STRIKTNÍ
        API_KEY_PATTERNS: {
            // OpenAI klíče mohou mít různé formáty a délky
            OPENAI: /^(sk-[a-zA-Z0-9]{20,}|sess-[a-zA-Z0-9]{20,})$/,
            
            // Anthropic klíče
            ANTHROPIC: /^sk-ant-[a-zA-Z0-9-]{20,}$/,
            
            // Google klíče
            GOOGLE: /^AIza[a-zA-Z0-9-_]{20,}$/
        }
    },
    
    // === EXPORT/IMPORT ===
    EXPORT: {
        // Název souboru pro export
        FILENAME_PREFIX: "myconnectai-config",
        
        // Verze formátu exportu
        FORMAT_VERSION: "1.0",
        
        // Co vše exportovat
        INCLUDE: {
            API_KEYS: true,
            PREFERENCES: true,
            MODEL_SETTINGS: true,
            THEME: true
        }
    }
};

// Zmrazit konfiguraci proti změnám
Object.freeze(CONFIG);

// Export do window objektu
window.CONFIG = CONFIG;

console.log('📋 Config loaded - MyConnectAI v' + CONFIG.VERSION);
