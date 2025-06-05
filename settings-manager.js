// Settings Manager - Správa nastavení aplikace
// Verze: 1.0 - Jednodušší verze pro MyConnectAI v3

class SettingsManager {
    constructor() {
        this.isOpen = false;
        this.hasUnsavedChanges = false;
        this.selectedTheme = null;
        this.selectedModel = null;
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
    loadCurrentSettings() {
        // Model selector
        this.loadModelSelector();
        
        // Theme selector
        this.loadThemeSelector();
        
        // API klíče
        this.loadApiKeys();
        
        // Specifická nastavení modelů
        this.loadModelSpecificSettings();
        
        // Reset change tracking
        this.hasUnsavedChanges = false;
        this.updateSaveButton();
    }

    // Načíst model selector
    loadModelSelector() {
        const select = document.getElementById('model-select');
        if (!select || !window.modelManager) return;

        // Vyčistit existující options
        select.innerHTML = '';

        // Získat dostupné modely
        const models = window.modelManager.getAvailableModels();
        const activeModel = window.modelManager.getActiveModel();

        // Přidat modely do selectu
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} ${model.hasApiKey ? '✅' : '❌'}`;
            option.disabled = !model.hasApiKey;
            
            if (activeModel && activeModel.id === model.id) {
                option.selected = true;
                this.selectedModel = model.id;
            }
            
            select.appendChild(option);
        });

        // Event listener
        select.onchange = () => {
            this.selectedModel = select.value;
            this.markAsChanged();
            this.updateModelSpecificSettings();
        };
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
            btn.onclick = () => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTheme = theme;
                this.markAsChanged();
            };
        });
    }

    // Načíst API klíče
    loadApiKeys() {
        // OpenAI
        this.loadApiKey('openai', CONFIG.STORAGE.KEYS.OPENAI_KEY);
        
        // Anthropic
        this.loadApiKey('anthropic', CONFIG.STORAGE.KEYS.ANTHROPIC_KEY);
        
        // Google
        this.loadApiKey('google', CONFIG.STORAGE.KEYS.GOOGLE_KEY);
    }

    // Načíst jednotlivý API klíč
    loadApiKey(provider, storageKey) {
        const input = document.getElementById(`${provider}-api-key`);
        if (!input) return;

        // Pokud existuje uložený klíč, zobrazit placeholder
        const savedKey = security.loadSecure(storageKey);
        if (savedKey) {
            input.value = '';
            input.placeholder = '••••••••••••••• (uloženo)';
        } else {
            input.value = '';
            input.placeholder = this.getApiKeyPlaceholder(provider);
        }

        // Event listener
        input.onchange = () => this.markAsChanged();
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
            assistantIdInput.onchange = () => this.markAsChanged();
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

    // Uložit jednotlivý API klíč
    async saveApiKey(provider, storageKey) {
        const input = document.getElementById(`${provider}-api-key`);
        if (!input || !input.value.trim()) return;

        const apiKey = input.value.trim();
        
        // Validace formátu
        if (!this.validateApiKey(provider, apiKey)) {
            throw new Error(`Neplatný formát API klíče pro ${provider}`);
        }

        // Uložit
        security.saveSecure(storageKey, apiKey);
        console.log(`✅ ${provider} API key saved`);
    }

    // Validace API klíče
    validateApiKey(provider, apiKey) {
        const patterns = CONFIG.VALIDATION.API_KEY_PATTERNS;
        
        switch (provider) {
            case 'openai':
                return patterns.OPENAI.test(apiKey);
            case 'anthropic':
                return patterns.ANTHROPIC.test(apiKey);
            case 'google':
                return patterns.GOOGLE.test(apiKey);
            default:
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
            
            apiKey = security.loadSecure(storageKey);
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

            // Přidat API klíče pokud je to povoleno
            if (CONFIG.EXPORT.INCLUDE.API_KEYS) {
                config.apiKeys = security.exportSecureData(password);
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
                    const imported = security.importSecureData(config.apiKeys, password);
                    if (!imported) {
                        throw new Error('Nesprávné heslo');
                    }
                }

                // Import nastavení
                if (config.settings) {
                    Object.entries(config.settings).forEach(([key, value]) => {
                        if (value !== null && value !== undefined) {
                            localStorage.setItem(CONFIG.STORAGE.PREFIX + key, value);
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
}

// Vytvořit globální instanci
window.settingsManager = new SettingsManager();

console.log('⚙️ Settings Manager loaded');
