// UI Manager - Správa uživatelského rozhraní
// Verze: 2.0 - Pro MyConnectAI v3

class UIManager {
    constructor() {
        this.currentTheme = 'claude';
        this.isWelcomeScreenVisible = true;
        this.lastSystemMessageElement = null;
        this.menuOpen = false;
    }

    // Inicializace UI
    init() {
        console.log('🎨 UI Manager initializing...');
        
        // Načíst uložené téma
        const savedTheme = localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.SELECTED_THEME);
        if (savedTheme && this.isValidTheme(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = CONFIG.UI.DEFAULT_THEME || 'claude';
        }
        
        // Aplikovat téma
        this.applyTheme(this.currentTheme);
        
        // Nastavit příklady dotazů
        this.setupExampleQueries();
        
        // Nastavit event listeners
        this.setupEventListeners();
        
        console.log('🎨 UI Manager ready');
    }

    // === MENU FUNKCE ===
    
    // Toggle hlavní menu
    toggleMenu() {
        const dropdown = document.getElementById('mainMenu');
        if (dropdown) {
            this.menuOpen = !this.menuOpen;
            if (this.menuOpen) {
                dropdown.classList.add('show');
            } else {
                dropdown.classList.remove('show');
            }
        }
    }

    // Zavřít menu
    closeMenu() {
        const dropdown = document.getElementById('mainMenu');
        if (dropdown) {
            dropdown.classList.remove('show');
            this.menuOpen = false;
        }
    }

    // Zobrazit sekci O projektu
    showAbout() {
        const modal = document.getElementById('about-modal');
        if (!modal) {
            this.createAboutModal();
        }
        
        // Aktualizovat informace o systému
        this.updateAboutInfo();
        
        // Zobrazit modal
        document.getElementById('about-modal').style.display = 'flex';
        this.closeMenu();
    }

    // Vytvořit About modal
    createAboutModal() {
        const modal = document.createElement('div');
        modal.id = 'about-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>O projektu</h2>
                    <button class="close-button" onclick="window.uiManager.closeAbout()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="about-content">
                        <h2>${CONFIG.SYSTEM.NAME}</h2>
                        <p>${CONFIG.SYSTEM.DESCRIPTION}</p>
                        
                        <div class="status-indicator">
                            <span class="status-dot" id="system-status-dot"></span>
                            <span id="system-status-text">Načítání...</span>
                        </div>
                        
                        <h3>Dostupné modely</h3>
                        <ul id="available-models-list">
                            <!-- Dynamicky naplněno -->
                        </ul>
                        
                        <h3>Systémové informace</h3>
                        <ul>
                            <li>Verze: ${CONFIG.VERSION}</li>
                            <li>Build: ${CONFIG.SYSTEM.BUILD_DATE}</li>
                            <li>Vývojář: ${CONFIG.SYSTEM.AUTHOR}</li>
                        </ul>
                        
                        <h3>Klávesové zkratky</h3>
                        <ul>
                            <li><kbd>Enter</kbd> - Odeslat zprávu</li>
                            <li><kbd>Shift + Enter</kbd> - Nový řádek</li>
                            <li><kbd>Ctrl + /</kbd> - Otevřít nastavení</li>
                        </ul>
                        
                        <h3>Podpora</h3>
                        <p>Email: <a href="mailto:${CONFIG.SYSTEM.SUPPORT_EMAIL}">${CONFIG.SYSTEM.SUPPORT_EMAIL}</a></p>
                        <p>Dokumentace: <a href="${CONFIG.SYSTEM.DOCUMENTATION}" target="_blank">Online dokumentace</a></p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Aktualizovat informace v About
    updateAboutInfo() {
        // Status systému
        const statusDot = document.getElementById('system-status-dot');
        const statusText = document.getElementById('system-status-text');
        const modelsList = document.getElementById('available-models-list');
        
        if (!window.modelManager) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Model Manager není inicializován';
            return;
        }
        
        // Získat info o modelech
        const availableModels = window.modelManager.getAvailableModels();
        const configuredModels = availableModels.filter(m => m.hasApiKey);
        
        // Status
        if (configuredModels.length === 0) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'Žádný model není nakonfigurován';
        } else {
            statusDot.className = 'status-dot';
            statusText.textContent = `${configuredModels.length} z ${availableModels.length} modelů nakonfigurováno`;
        }
        
        // Seznam modelů
        modelsList.innerHTML = availableModels.map(model => `
            <li>
                ${model.name} 
                ${model.hasApiKey ? '✅' : '❌'} 
                ${model.isActive ? '(aktivní)' : ''}
            </li>
        `).join('');
    }

    // Zavřít About modal
    closeAbout() {
        const modal = document.getElementById('about-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // === THEME FUNKCE ===
    
    // Nastavit téma
    setTheme(themeKey) {
        if (!this.isValidTheme(themeKey)) {
            console.warn(`Invalid theme: ${themeKey}`);
            return;
        }
        
        this.currentTheme = themeKey;
        this.applyTheme(themeKey);
        
        // Uložit preferenci
        localStorage.setItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.SELECTED_THEME, themeKey);
        
        console.log(`🎨 Theme changed to: ${themeKey}`);
    }

    // Aplikovat téma
    applyTheme(themeKey) {
        // Odstranit všechny theme třídy
        document.body.classList.remove('theme-claude', 'theme-google', 'theme-replit', 'theme-carrd');
        
        // Přidat novou theme třídu
        if (themeKey !== 'claude') {
            document.body.classList.add(`theme-${themeKey}`);
        }
    }

    // Validace tématu
    isValidTheme(themeKey) {
        return ['claude', 'google', 'replit', 'carrd'].includes(themeKey);
    }

    // === WELCOME SCREEN ===
    
    // Zobrazit welcome screen
    showWelcomeScreen() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        chatMessages.innerHTML = `
            <div class="welcome-container">
                <div class="welcome-content">
                    <h2 class="welcome-title">${CONFIG.MESSAGES.WELCOME}</h2>
                    <p class="welcome-subtitle">${CONFIG.UI.APP_SUBTITLE}</p>
                </div>
                <div class="example-queries" id="example-queries">
                    <!-- Příklady budou načteny dynamicky -->
                </div>
            </div>
        `;
        
        this.setupExampleQueries();
        this.isWelcomeScreenVisible = true;
        
        // Vyčistit input
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = '';
        }
    }

    // Skrýt welcome screen
    hideWelcomeScreen() {
        const welcomeContainer = document.querySelector('.welcome-container');
        if (welcomeContainer) {
            welcomeContainer.style.display = 'none';
        }
        this.isWelcomeScreenVisible = false;
    }

    // Nastavit příklady dotazů
    setupExampleQueries() {
        const container = document.getElementById('example-queries');
        if (!container) return;
        
        const queries = CONFIG.UI.EXAMPLE_QUERIES || [];
        
        container.innerHTML = queries.map(query => `
            <div class="example-query" onclick="window.uiManager.useExampleQuery('${query.replace(/'/g, "\\'")}')">
                ${query}
            </div>
        `).join('');
    }

    // Použít příklad dotazu
    useExampleQuery(query) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = query;
            chatInput.focus();
            
            // Automaticky odeslat
            if (window.sendMessage) {
                window.sendMessage();
            }
        }
    }

    // === CHAT FUNKCE ===
    
    // Přidat zprávu do chatu
    addMessage(type, content) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Skrýt welcome screen při první zprávě
        if (this.isWelcomeScreenVisible) {
            this.hideWelcomeScreen();
        }
        
        // Odstranit loading zprávu pokud přidáváme odpověď
        if ((type === 'assistant' || type === 'error') && this.lastSystemMessageElement) {
            this.lastSystemMessageElement.remove();
            this.lastSystemMessageElement = null;
        }
        
        // Vytvořit element zprávy
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = content;
        
        // Uložit referenci na system zprávy (loading)
        if (type === 'system' && content.includes(CONFIG.MESSAGES.LOADING)) {
            this.lastSystemMessageElement = messageDiv;
        }
        
        // Přidat zprávu
        chatMessages.appendChild(messageDiv);
        
        // Scrollovat dolů
        this.scrollToBottom();
    }

    // Vyčistit chat
    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Odstranit všechny zprávy kromě welcome containeru
        const messages = chatMessages.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        this.lastSystemMessageElement = null;
    }

    // Scrollovat dolů
    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // === UTILITY FUNKCE ===
    
    // Toggle viditelnost inputu (pro API klíče)
    toggleVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        const button = input.parentNode.querySelector('.toggle-btn');
        if (input.type === 'password') {
            input.type = 'text';
            if (button) button.textContent = 'Skrýt';
        } else {
            input.type = 'password';
            if (button) button.textContent = 'Zobrazit';
        }
    }

    // === EVENT LISTENERS ===
    
    setupEventListeners() {
        // Zavřít menu při kliknutí mimo
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown') && this.menuOpen) {
                this.closeMenu();
            }
        });
        
        // Zavřít modaly při kliknutí na pozadí
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'about-modal') {
                    this.closeAbout();
                }
            }
        });
        
        // Klávesové zkratky
        document.addEventListener('keydown', (e) => {
            // Ctrl + / pro otevření nastavení
            if (e.ctrlKey && e.key === '/') {
                e.preventDefault();
                if (window.settingsManager) {
                    window.settingsManager.open();
                }
            }
        });
        
        // Auto-resize pro textarea
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('input', function() {
                this.style.height = 'auto';
                const scrollHeight = this.scrollHeight;
                const lineHeight = parseInt(window.getComputedStyle(this).lineHeight);
                const maxHeight = lineHeight * 8;
                
                if (scrollHeight <= maxHeight) {
                    this.style.height = scrollHeight + 'px';
                    this.style.overflowY = 'hidden';
                } else {
                    this.style.height = maxHeight + 'px';
                    this.style.overflowY = 'auto';
                }
            });
            
            // Enter key handling
            chatInput.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (window.sendMessage) {
                        window.sendMessage();
                    }
                }
            });
        }
    }
}

// Vytvořit globální instanci
window.uiManager = new UIManager();

// Inicializovat po načtení DOM
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager.init();
});

console.log('📦 UI Manager loaded');
