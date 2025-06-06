// Settings Manager - Správa nastavení aplikace
// Verze: 1.1 - Vylepšená verze s async operacemi a lepší validací

class SettingsManager {
    constructor() {
        this.isOpen = false;
        this.hasUnsavedChanges = false;
        this.selectedTheme = null;
        this.selectedModel = null;
        this.eventListeners = new Map();
    }

    // Otevřít nastavení
    open() {
        const modal = document.getElementById('settings-modal');
        if (!modal) {
            console.error('Settings modal not found');
            return;
        }

        // Načíst aktuální hodnoty
        this.loadCurrentSettings();
        
        // Zobrazit modal
        modal.style.display = 'flex';
        this.isOpen = true;
        
        // Zavřít menu pokud je otevřené
        if (window.uiManager) {
            window.uiManager.closeMenu();
        }
        
        console.log('⚙️ Settings opened');
    }

    // Zavřít nastavení
    close() {
        if (this.hasUnsavedChanges) {
            if (!confirm('Máte neuložené změny. Opravdu chcete zavřít nastavení?')) {
                return;
            }
        }

        // Cleanup před zavřením
        this.cleanup();

        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        this.isOpen = false;
        this.hasUnsavedChanges = false;
        this.clearStatus();
        
        console.log('⚙️ Settings closed');
    }

    // Načíst aktuální nastavení
    async loadCurrentSettings() {
        // Model selector
        await this.loadModelSelector();
        
        // Theme selector
        this.loadThemeSelector();
        
        // API klíče
        await this.loadApiKeys();
        
        // Specifická nastavení modelů
        this.loadModelSpecificSettings();
        
        // Reset change tracking
        this.hasUnsavedChanges = false;
        this.updateSaveButton();
    }

    // Načíst model selector - async verze
    async loadModelSelector() {
        const select = document.getElementById('model-select');
        if (!select || !window.modelManager) return;

        // Vyčistit existující options
        select.innerHTML = '<option value="">Načítání modelů...</option>';

        // Počkat na inicializaci model manageru
        if (!window.modelManager.initialized) {
            await window.modelManager.initialize();
        }

        // Získat VŠECHNY modely (včetně neviditelných)
        const allModels = window.modelManager.getAllModels();
        const activeModel = window.modelManager.getActiveModel();

        // Vyčistit loading option
        select.innerHTML = '';
        
        // Seskupit modely podle providera
        const modelsByProvider = {
            openai: [],
            anthropic: [],
            google: []
        };
        
        // Filtrovat pouze ENABLED modely z registry
        allModels.forEach(model => {
            // Získat model definition z registry
            const modelDef = window.ModelsRegistryHelper?.getModelById(model.id);
            if (modelDef && modelDef.enabled) {
                if (modelsByProvider[model.provider]) {
                    modelsByProvider[model.provider].push(model);
                }
            }
        });

        // Přidat modely do selectu po providerech
        Object.entries(modelsByProvider).forEach(([provider, models]) => {
            if (models.length > 0) {
                // Přidat optgroup pro providera
                const optgroup = document.createElement('optgroup');
                optgroup.label = provider.charAt(0).toUpperCase() + provider.slice(1);
                
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.name} ${model.hasApiKey ? '✅' : '❌'}`;
                    
                    // Povolit pouze pokud má API klíč NEBO je aktivní
                    const isActive = activeModel && activeModel.id === model.id;
                    option.disabled = !model.hasApiKey && !isActive;
                    
                    if (isActive) {
                        option.selected = true;
                        this.selectedModel = model.id;
                    }
                    
                    optgroup.appendChild(option);
                });
                
                select.appendChild(optgroup);
            }
        });

        // Event listener
        this.addEventListener(select, 'change', () => {
            this.selectedModel = select.value;
            this.markAsChanged();
            this.updateModelSpecificSettings();
        });
    }

    // Načíst theme selector
    loadThemeSelector() {
        const currentTheme = localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.SELECTED_THEME) || CONFIG.UI.DEFAULT_THEME;
        this.selectedTheme = currentTheme;

        // Aktivovat správné tlačítko
        document.querySelectorAll('.theme-btn').forEach(btn => {
            const theme = btn.dataset.theme;
            if (theme === currentTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            // Event listener
            this.addEventListener(btn, 'click', () => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTheme = theme;
                this.markAsChanged();
            });
        });
    }

    // Načíst API klíče - async verze
    async loadApiKeys() {
        // OpenAI
        await this.loadApiKey('openai', CONFIG.STORAGE.KEYS.OPENAI_KEY);
        
        // Anthropic
        await this.loadApiKey('anthropic', CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
        
        // Google
        await this.loadApiKey('google', CONFIG.STORAGE.KEYS.GOOGLE_KEY);
    }

    // Načíst jednotlivý API klíč - async verze
    async loadApiKey(provider, storageKey) {
        const input = document.getElementById(`${provider}-api-key`);
        if (!input) return;

        // Počkat na security manager
        if (window.security && !window.security.initialized) {
            await window.security.waitForInit();
        }

        // Pokud existuje uložený klíč, zobrazit placeholder
        const savedKey = await security.loadSecure(storageKey);
        if (savedKey) {
            input.value = '';
            input.placeholder = '••••••••••••••• (uloženo)';
        } else {
            input.value = '';
            input.placeholder = this.getApiKeyPlaceholder(provider);
        }

        // Event listener s debounce
        let timeout;
        this.addEventListener(input, 'input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.markAsChanged(), 300);
        });
    }

    // Získat placeholder pro API klíč
    getApiKeyPlaceholder(provider) {
        const placeholders = {
            'openai': 'sk-...',
            'anthropic': 'sk-ant-...',
            'google': 'AIza...'
        };
        return placeholders[provider] || 'API Key';
    }

    // Načíst specifická nastavení modelů
    loadModelSpecificSettings() {
        // OpenAI Assistant ID
        const assistantIdInput = document.getElementById('openai-assistant-id');
        if (assistantIdInput) {
            const savedId = localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.OPENAI_ASSISTANT_ID);
            assistantIdInput.value = savedId || '';
            this.addEventListener(assistantIdInput, 'change', () => this.markAsChanged());
        }

        // Zobrazit/skrýt podle vybraného modelu
        this.updateModelSpecificSettings();
    }

    // Aktualizovat zobrazení specifických nastavení
    updateModelSpecificSettings() {
        const openaiSettings = document.getElementById('openai-settings');
        
        if (this.selectedModel && this.selectedModel.startsWith('gpt-')) {
            openaiSettings.style.display = 'block';
        } else {
            openaiSettings.style.display = 'none';
        }
    }

    // Označit jako změněno
    markAsChanged() {
        this.hasUnsavedChanges = true;
        this.updateSaveButton();
    }

    // Aktualizovat save button
    updateSaveButton() {
        const saveButton = document.querySelector('.save-button');
        if (!saveButton) return;

        if (this.hasUnsavedChanges) {
            saveButton.classList.add('has-changes');
            saveButton.textContent = 'Uložit nastavení *';
        } else {
            saveButton.classList.remove('has-changes');
            saveButton.textContent = 'Uložit nastavení';
        }
    }

    // Uložit nastavení
    async save() {
        try {
            console.log('💾 Saving settings...');

            // 1. Uložit vybraný model
            if (this.selectedModel && window.modelManager) {
                await window.modelManager.setActiveModel(this.selectedModel);
            }

            // 2. Uložit téma
            if (this.selectedTheme && window.uiManager) {
                window.uiManager.setTheme(this.selectedTheme);
            }

            // 3. Uložit API klíče
            await this.saveApiKeys();

            // 4. Uložit specifická nastavení
            this.saveModelSpecificSettings();

            // Reset změn
            this.hasUnsavedChanges = false;
            this.updateSaveButton();

            // Zobrazit úspěch
            this.showStatus('success', CONFIG.MESSAGES.SETTINGS_SAVED);

            // Zavřít po 2 sekundách
            setTimeout(() => {
                this.close();
            }, 2000);

        } catch (error) {
            console.error('❌ Error saving settings:', error);
            this.showStatus('error', CONFIG.MESSAGES.SETTINGS_SAVE_ERROR);
        }
    }

    // Uložit API klíče
    async saveApiKeys() {
        // OpenAI
        await this.saveApiKey('openai', CONFIG.STORAGE.KEYS.OPENAI_KEY);
        
        // Anthropic
        await this.saveApiKey('anthropic', CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
        
        // Google
        await this.saveApiKey('google', CONFIG.STORAGE.KEYS.GOOGLE_KEY);
    }

    // Uložit jednotlivý API klíč - vylepšená verze
    async saveApiKey(provider, storageKey) {
        const input = document.getElementById(`${provider}-api-key`);
        if (!input) return;

        const apiKey = input.value.trim();
        
        // Pokud je prázdný a už máme uložený, nechat ho
        if (!apiKey) {
            const existing = await security.loadSecure(storageKey);
            if (existing) {
                console.log(`✅ Keeping existing ${provider} API key`);
                return;
            }
            return;
        }
        
        // Validace formátu
        if (!this.validateApiKey(provider, apiKey)) {
            throw new Error(`Neplatný formát API klíče pro ${provider}`);
        }

        // Uložit
        await security.saveSecure(storageKey, apiKey);
        console.log(`✅ ${provider} API key saved`);
    }

    // Validace API klíče - méně striktní verze
    validateApiKey(provider, apiKey) {
        // Základní validace délky
        if (apiKey.length < 20) {
            return false;
        }
        
        // Provider-specific validace
        switch (provider) {
            case 'openai':
                // OpenAI klíče začínají sk- nebo jsou session klíče
                return apiKey.startsWith('sk-') || apiKey.startsWith('sess-');
                
            case 'anthropic':
                // Anthropic klíče začínají sk-ant-
                return apiKey.startsWith('sk-ant-');
                
            case 'google':
                // Google klíče začínají AIza
                return apiKey.startsWith('AIza');
                
            default:
                // Pro neznámé providery akceptovat jakýkoliv klíč
                return true;
        }
    }

    // Uložit specifická nastavení modelů
    saveModelSpecificSettings() {
        // OpenAI Assistant ID
        const assistantIdInput = document.getElementById('openai-assistant-id');
        if (assistantIdInput && assistantIdInput.value.trim()) {
            localStorage.setItem(
                CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.OPENAI_ASSISTANT_ID,
                assistantIdInput.value.trim()
            );
        }
    }

    // Test API klíče
    async testApiKey(provider) {
        const input = document.getElementById(`${provider}-api-key`);
        if (!input) return;

        // Získat klíč (buď nový nebo uložený)
        let apiKey = input.value.trim();
        if (!apiKey) {
            const storageKey = {
                'openai': CONFIG.STORAGE.KEYS.OPENAI_KEY,
                'anthropic': CONFIG.STORAGE.KEYS.ANTHROPIC_KEY,
                'google': CONFIG.STORAGE.KEYS.GOOGLE_KEY
            }[provider];
            
            apiKey = await security.loadSecure(storageKey);
        }

        if (!apiKey) {
            this.showStatus('error', 'Nejprve zadejte API klíč');
            return;
        }

        // Zobrazit loading
        this.showStatus('info', 'Testování API klíče...');

        try {
            const isValid = await window.modelManager.testApiKey(provider, apiKey);
            
            if (isValid) {
                this.showStatus('success', CONFIG.MESSAGES.API_KEY_VALID);
            } else {
                this.showStatus('error', CONFIG.MESSAGES.API_KEY_INVALID);
            }
        } catch (error) {
            this.showStatus('error', `Test selhal: ${error.message}`);
        }
    }

    // Export konfigurace
    async exportConfig() {
        try {
            const config = {
                version: CONFIG.EXPORT.FORMAT_VERSION,
                timestamp: new Date().toISOString(),
                settings: {
                    theme: localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.SELECTED_THEME),
                    selectedModel: localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.SELECTED_MODEL),
                    visibleModels: localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.USER_VISIBLE_MODELS),
                    assistantId: localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.OPENAI_ASSISTANT_ID)
                }
            };

            // Zeptat se na heslo
            const password = prompt('Zadejte heslo pro zabezpečení exportu:');
            if (!password) return;

            // Validace hesla
            const passwordValidation = security.validatePassword(password);
            if (!passwordValidation.valid) {
                this.showStatus('error', passwordValidation.message);
                return;
            }

            // Přidat API klíče pokud je to povoleno
            if (CONFIG.EXPORT.INCLUDE.API_KEYS) {
                config.apiKeys = await security.exportSecureData(password);
            }

            // Vytvořit blob a stáhnout
            const dataStr = JSON.stringify(config, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${CONFIG.EXPORT.FILENAME_PREFIX}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showStatus('success', CONFIG.MESSAGES.EXPORT_SUCCESS);
        } catch (error) {
            console.error('Export error:', error);
            this.showStatus('error', 'Export selhal');
        }
    }

    // Import konfigurace
    async importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const config = JSON.parse(text);

                // Ověřit verzi
                if (config.version !== CONFIG.EXPORT.FORMAT_VERSION) {
                    throw new Error('Nepodporovaná verze konfigurace');
                }

                // Zeptat se na heslo pokud obsahuje API klíče
                if (config.apiKeys) {
                    const password = prompt('Zadejte heslo pro import:');
                    if (!password) return;

                    // Import API klíčů
                    const imported = await security.importSecureData(config.apiKeys, password);
                    if (!imported) {
                        throw new Error('Nesprávné heslo');
                    }
                }

                // Import nastavení
                if (config.settings) {
                    Object.entries(config.settings).forEach(([key, value]) => {
                        if (value !== null && value !== undefined) {
                            const storageKey = {
                                'theme': CONFIG.STORAGE.KEYS.SELECTED_THEME,
                                'selectedModel': CONFIG.STORAGE.KEYS.SELECTED_MODEL,
                                'visibleModels': CONFIG.STORAGE.KEYS.USER_VISIBLE_MODELS,
                                'assistantId': CONFIG.STORAGE.KEYS.OPENAI_ASSISTANT_ID
                            }[key];
                            
                            if (storageKey) {
                                localStorage.setItem(CONFIG.STORAGE.PREFIX + storageKey, value);
                            }
                        }
                    });
                }

                this.showStatus('success', CONFIG.MESSAGES.IMPORT_SUCCESS);

                // Reload po 2 sekundách
                setTimeout(() => {
                    location.reload();
                }, 2000);

            } catch (error) {
                console.error('Import error:', error);
                this.showStatus('error', CONFIG.MESSAGES.IMPORT_ERROR);
            }
        };

        input.click();
    }

    // Zobrazit status
    showStatus(type, message) {
        const statusDiv = document.getElementById('settings-status');
        if (!statusDiv) return;

        statusDiv.className = `settings-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';

        // Automaticky skrýt po 5 sekundách
        setTimeout(() => {
            this.clearStatus();
        }, 5000);
    }

    // Vyčistit status
    clearStatus() {
        const statusDiv = document.getElementById('settings-status');
        if (statusDiv) {
            statusDiv.style.display = 'none';
            statusDiv.className = 'settings-status';
            statusDiv.textContent = '';
        }
    }

    // Helper pro správu event listenerů
    addEventListener(element, event, handler) {
        if (!element) return;
        
        // Uložit referenci pro pozdější cleanup
        if (!this.eventListeners.has(element)) {
            this.eventListeners.set(element, new Map());
        }
        
        const elementListeners = this.eventListeners.get(element);
        
        // Odstranit předchozí listener pokud existuje
        if (elementListeners.has(event)) {
            element.removeEventListener(event, elementListeners.get(event));
        }
        
        // Přidat nový listener
        element.addEventListener(event, handler);
        elementListeners.set(event, handler);
    }

    // Cleanup event listenerů
    cleanup() {
        // Odstranit všechny event listenery
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach((handler, event) => {
                element.removeEventListener(event, handler);
            });
        });
        
        this.eventListeners.clear();
        
        console.log('🧹 Settings cleanup completed');
    }
}

// Vytvořit globální instanci
window.settingsManager = new SettingsManager();

console.log('⚙️ Settings Manager loaded');
