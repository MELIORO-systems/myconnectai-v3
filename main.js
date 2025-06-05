// Hlavní aplikační logika - MyConnectAI v3
// Verze: 3.0

const APP_VERSION = "3.0";

// Globální proměnné
let messages = [];
let rateLimitCounter = 0;
let rateLimitTimer = null;

// Odeslání zprávy
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
        
        // Specifické chybové hlášky
        if (error.message.includes('Neplatný API klíč')) {
            errorMessage = 'Neplatný API klíč. Zkontrolujte nastavení.';
        } else if (error.message.includes('Překročen limit')) {
            errorMessage = 'Překročen limit požadavků. Zkuste to později.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = CONFIG.MESSAGES.CONNECTION_ERROR;
        } else if (error.message.includes('not configured')) {
            errorMessage = CONFIG.MESSAGES.NO_API_KEY;
        } else if (error.message) {
            errorMessage = error.message;
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

// Inicializace aplikace
async function initApp() {
    console.log('🚀 Starting MyConnectAI v3...');
    console.log('📌 App Version:', APP_VERSION);
    console.log('📌 Config Version:', CONFIG.VERSION);
    
    try {
        // 1. Inicializovat Model Loader
        if (window.modelLoader) {
            await window.modelLoader.initialize();
        }
        
        // 2. Inicializovat Model Manager
        if (window.modelManager) {
            await window.modelManager.initialize();
            
            // Validovat konfiguraci
            const issues = window.modelManager.validateConfiguration();
            if (issues.length > 0) {
                console.warn('⚠️ Configuration issues:', issues);
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
        
        // 3. Debug mode
        if (CONFIG.DEBUG_MODE) {
            console.log('🐛 Debug mode is ON');
        }
        
        console.log('✅ MyConnectAI v3 ready');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        if (window.uiManager) {
            window.uiManager.addMessage('error', 
                'Chyba při inicializaci aplikace. Zkuste obnovit stránku.'
            );
        }
    }
}

// Spuštění aplikace
window.addEventListener('load', function() {
    console.log('🌟 Window loaded, starting initialization...');
    
    // Počkat na načtení všech závislostí
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkDependencies = () => {
        attempts++;
        
        const requiredDeps = [
            window.security,
            window.modelLoader,
            window.modelManager,
            window.uiManager,
            window.settingsManager
        ];
        
        const allLoaded = requiredDeps.every(dep => dep !== undefined);
        
        if (allLoaded) {
            console.log('✅ All dependencies loaded');
            setTimeout(initApp, 100);
        } else {
            if (attempts < maxAttempts) {
                console.log(`⏳ Waiting for dependencies... (${attempts}/${maxAttempts})`);
                setTimeout(checkDependencies, 200);
            } else {
                console.error('❌ Failed to load dependencies');
                alert('Chyba při načítání aplikace. Některé komponenty se nepodařilo načíst.');
            }
        }
    };
    
    checkDependencies();
});

// Export pro globální přístup
window.chatSystem = {
    messages: messages,
    sendMessage: sendMessage,
    clearChat: clearChat,
    version: APP_VERSION
};

// Zachování kompatibility
window.sendMessage = sendMessage;

console.log('📦 Main.js loaded (MyConnectAI v3)');
