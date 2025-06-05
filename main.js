// Hlavní aplikační logika - MyConnectAI v3.1
// Verze: 3.1 - S optimalizovanou inicializací

const APP_VERSION = "3.1";

// Globální proměnné
let messages = [];
let rateLimitCounter = 0;
let rateLimitTimer = null;

// Odeslání zprávy s vylepšeným error handling
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) return;
    
    // Kontrola délky zprávy
    if (messageText.length > CONFIG.VALIDATION.MAX_MESSAGE_LENGTH) {
        if (window.uiManager) {
            window.uiManager.addMessage('error', 
                `Zpráva je příliš dlouhá. Maximum je ${CONFIG.VALIDATION.MAX_MESSAGE_LENGTH} znaků.`
            );
        }
        return;
    }
    
    // Kontrola rate limitingu
    if (CONFIG.RATE_LIMITING.ENABLED && !checkRateLimit()) {
        if (window.uiManager) {
            window.uiManager.addMessage('system', CONFIG.RATE_LIMITING.COOLDOWN_MESSAGE);
        }
        return;
    }
    
    // Kontrola, zda je vybrán model s API klíčem
    const activeModel = window.modelManager?.getActiveModel();
    if (!activeModel) {
        if (window.uiManager) {
            window.uiManager.addMessage('error', 'Není vybrán žádný AI model. Prosím nastavte model v nastavení.');
        }
        return;
    }
    
    const modelInfo = window.modelManager?.getModelInfo();
    if (!modelInfo?.hasApiKey) {
        if (window.uiManager) {
            window.uiManager.addMessage('error', 
                `Pro model ${modelInfo.name} není nastaven API klíč. Prosím nastavte ho v nastavení.`
            );
        }
        return;
    }
    
    // Přidat uživatelovu zprávu
    if (window.uiManager) {
        window.uiManager.addMessage('user', messageText);
    }
    messages.push({ role: 'user', content: messageText });
    
    // Vyčistit input a nastavit loading stav
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.style.overflowY = 'hidden';
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = CONFIG.MESSAGES.LOADING;
    
    // Přidat loading indikátor
    const loadingMessage = `${CONFIG.MESSAGES.LOADING} (${modelInfo?.name || 'AI'})`;
    if (window.uiManager) {
        window.uiManager.addMessage('system', loadingMessage);
    }
    
    try {
        // Použít Model Manager pro odeslání zprávy
        const response = await window.modelManager.sendMessage(messages);
        
        // Přidat odpověď
        if (window.uiManager) {
            window.uiManager.addMessage('assistant', response);
        }
        messages.push({ role: 'assistant', content: response });
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        let errorMessage = CONFIG.MESSAGES.ERROR;
        
        // Specifické chybové hlášky podle typu chyby
        if (error instanceof window.APIError) {
            switch (error.details.statusCode) {
                case 401:
                    errorMessage = 'Neplatný API klíč. Zkontrolujte nastavení.';
                    break;
                case 429:
                    errorMessage = 'Překročen limit požadavků. Zkuste to za chvíli.';
                    break;
                case 503:
                    errorMessage = 'Služba je dočasně nedostupná. Zkuste to později.';
                    break;
                default:
                    errorMessage = error.message;
            }
        } else if (error instanceof window.ConfigurationError) {
            if (error.code === 'NO_API_KEY') {
                errorMessage = CONFIG.MESSAGES.NO_API_KEY;
            } else {
                errorMessage = `Chyba konfigurace: ${error.message}`;
            }
        } else if (error instanceof window.ModelError) {
            switch (error.code) {
                case 'TIMEOUT':
                    errorMessage = 'Požadavek vypršel - AI server neodpovídá.';
                    break;
                case 'NETWORK_ERROR':
                    errorMessage = CONFIG.MESSAGES.CONNECTION_ERROR;
                    break;
                default:
                    errorMessage = error.message;
            }
        } else {
            errorMessage = error.message || CONFIG.MESSAGES.ERROR;
        }
        
        if (window.uiManager) {
            window.uiManager.addMessage('error', errorMessage);
        }
    } finally {
        // Obnovit UI
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = CONFIG.UI.SEND_BUTTON_TEXT || 'Odeslat';
        chatInput.focus();
    }
}

// Rate limiting kontrola
function checkRateLimit() {
    if (!CONFIG.RATE_LIMITING.ENABLED) return true;
    
    rateLimitCounter++;
    
    if (!rateLimitTimer) {
        rateLimitTimer = setTimeout(() => {
            rateLimitCounter = 0;
            rateLimitTimer = null;
        }, 60000); // Reset po minutě
    }
    
    return rateLimitCounter <= CONFIG.RATE_LIMITING.MAX_MESSAGES_PER_MINUTE;
}

// Vyčistit chat a začít znovu
function clearChat() {
    messages = [];
    if (window.uiManager) {
        window.uiManager.clearChat();
        window.uiManager.showWelcomeScreen();
    }
}

// Inicializace aplikace s lepší kontrolou závislostí
async function initApp() {
    console.log('🚀 Starting MyConnectAI v3.1...');
    console.log('📌 App Version:', APP_VERSION);
    console.log('📌 Config Version:', CONFIG.VERSION);
    
    try {
        // 1. Počkat na Security Manager
        if (window.security && !window.security.initialized) {
            console.log('⏳ Waiting for Security Manager...');
            await window.security.waitForInit();
        }
        
        // 2. Inicializovat Model Loader
        if (window.modelLoader) {
            console.log('⏳ Initializing Model Loader...');
            await window.modelLoader.initialize();
        }
        
        // 3. Inicializovat Model Manager
        if (window.modelManager) {
            console.log('⏳ Initializing Model Manager...');
            await window.modelManager.initialize();
            
            // Validovat konfiguraci
            const issues = window.modelManager.validateConfiguration();
            if (issues.length > 0) {
                console.warn('⚠️ Configuration issues:');
                issues.forEach(issue => {
                    if (typeof issue === 'string') {
                        console.warn(`  - ${issue}`);
                    } else {
                        console.warn(`  - [${issue.type}] ${issue.message}`);
                    }
                });
            }
            
            // Zobrazit dostupné modely
            const models = window.modelManager.getAvailableModels();
            console.log('🤖 Available models:', models.length);
            models.forEach(m => {
                console.log(`  - ${m.name} (${m.id}) ${m.hasApiKey ? '✅' : '❌'}`);
            });
            
            // Zobrazit aktivní model
            const activeModel = window.modelManager.getModelInfo();
            if (activeModel) {
                console.log('✅ Active model:', activeModel.name);
            } else {
                console.warn('⚠️ No active model');
            }
        }
        
        // 4. Debug mode
        if (CONFIG.DEBUG_MODE) {
            console.log('🐛 Debug mode is ON');
            window.debugInfo = {
                app: window.chatSystem,
                security: window.security,
                modelManager: window.modelManager,
                uiManager: window.uiManager,
                settingsManager: window.settingsManager
            };
        }
        
        console.log('✅ MyConnectAI v3.1 ready');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        
        // Zobrazit user-friendly chybu
        if (window.uiManager) {
            window.uiManager.addMessage('error', 
                'Chyba při inicializaci aplikace. Zkuste obnovit stránku.'
            );
        } else {
            // Fallback alert pokud UI není dostupné
            alert('Kritická chyba při načítání aplikace. Prosím obnovte stránku.');
        }
    }
}

// Promise-based čekání na komponenty
function waitForComponents() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 10 sekund max
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            const requiredComponents = {
                'CONFIG': window.CONFIG,
                'Security': window.security,
                'Models Registry': window.MODELS_REGISTRY,
                'OpenAI Model': window.OpenAIModel,
                'Model Manager': window.modelManager,
                'Model Loader': window.modelLoader,
                'UI Manager': window.uiManager,
                'Settings Manager': window.settingsManager
            };
            
            const missingComponents = Object.entries(requiredComponents)
                .filter(([name, component]) => !component)
                .map(([name]) => name);
            
            if (missingComponents.length === 0) {
                clearInterval(checkInterval);
                console.log('✅ All components loaded');
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.error('❌ Failed to load components:', missingComponents);
                reject(new Error(`Missing components: ${missingComponents.join(', ')}`));
            } else if (attempts % 10 === 0) {
                console.log(`⏳ Waiting for: ${missingComponents.join(', ')} (${attempts}/${maxAttempts})`);
            }
        }, 200);
    });
}

// Spuštění aplikace
window.addEventListener('load', async function() {
    console.log('🌟 Window loaded, starting initialization...');
    
    try {
        // Počkat na načtení všech komponent
        await waitForComponents();
        
        // Malé zpoždění pro jistotu
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Spustit inicializaci
        await initApp();
        
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        alert(`Chyba při načítání aplikace: ${error.message}\n\nProsím obnovte stránku.`);
    }
});

// Globální error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Nezobrazovat chyby z external skriptů
    if (event.filename && !event.filename.includes(window.location.host)) {
        return;
    }
    
    // Log do konzole pro debugging
    if (CONFIG.DEBUG_MODE) {
        console.error('Error details:', {
            message: event.message,
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error
        });
    }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // V debug modu zobrazit více informací
    if (CONFIG.DEBUG_MODE) {
        console.error('Promise rejection details:', event);
    }
});

// Export pro globální přístup
window.chatSystem = {
    messages: messages,
    sendMessage: sendMessage,
    clearChat: clearChat,
    version: APP_VERSION,
    // Debug funkce
    getState: () => ({
        messages: messages.length,
        rateLimitCounter: rateLimitCounter,
        initialized: window.modelManager?.initialized
    })
};

// Zachování kompatibility
window.sendMessage = sendMessage;

console.log('📦 Main.js loaded (MyConnectAI v3.1)');
