// Settings Manager - Správa nastavení aplikace
// Verze: 2.0 - Opravená s konzistentním async/await a validacemi

class SettingsManager {
    constructor() {
        this.isOpen = false;
        this.hasUnsavedChanges = false;
        this.selectedTheme = null;
        this.selectedModel = null;
        this.eventListeners = new Map();
        this.debounceTimers = new Map();
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

    // Načíst nastavení podle hierarchie
    async loadHierarchicalSettings() {
        // Získat enabled providery z registry
        const enabledProviders = this.getEnabledProviders();
        
        console.log('Loading hierarchical settings for providers:', enabledProviders);
        
        // Vyčistit existující provider sekce
        const providersContainer = document.getElementById('providers-settings');
        if (providersContainer) {
            providersContainer.innerHTML = '';
        }
        
        // Pro každého enabled providera vytvořit sekci
        for (const provider of enabledProviders) {
            await this.createProviderSection(provider);
        }
    }
    
    // Vytvořit sekci pro providera
    async createProviderSection(provider) {
        const container = document.getElementById('providers-settings');
        if (!container) return;
        
        // Získat všechny enabled modely pro tohoto providera
        const providerModels = this.getEnabledModelsForProvider(provider);
        if (providerModels.length === 0) return;
        
        // Vytvořit sekci
        const section = document.createElement('div');
        section.className = 'settings-section provider-section';
        section.id = `${provider}-section`;
        
        // Název providera
        const title = document.createElement('h3');
        title.textContent = this.getProviderDisplayName(provider);
        section.appendChild(title);
        
        // API Key skupina
        const apiKeyGroup = this.createApiKeyGroup(provider);
        section.appendChild(apiKeyGroup);
        
        // Obecná nastavení providera (pokud existují)
        const providerSettings = this.createProviderSettings(provider);
        if (providerSettings) {
            section.appendChild(providerSettings);
        }
        
        // Nastavení pro jednotlivé modely
        for (const model of providerModels) {
            const modelSettings = this.createModelSettings(model);
            if (modelSettings) {
                section.appendChild(modelSettings);
            }
        }
        
        container.appendChild(section);
        
        // Načíst hodnoty - async
        const storageKey = CONFIG.STORAGE.KEYS[`${provider.toUpperCase()}_KEY`];
        if (storageKey) {
            await this.loadApiKey(provider, storageKey);
        }
    }
    
    // Získat enabled modely pro providera
    getEnabledModelsForProvider(provider) {
        if (window.ModelsRegistryHelper) {
            const allModels = window.ModelsRegistryHelper.getEnabledModels();
            return allModels.filter(model => model.provider === provider);
        }
        
        // Fallback - získat z model manageru
        if (window.modelManager) {
            const allModels = window.modelManager.getAllModels();
            return allModels.filter(model => model.provider === provider);
        }
        
        return [];
    }
    
    // Získat display název providera
    getProviderDisplayName(provider) {
        const names = {
            'openai': 'OpenAI',
            'anthropic': 'Anthropic (Claude)',
            'google': 'Google (Gemini)'
        };
        return names[provider] || provider;
    }
    
    // Vytvořit API key skupinu
    createApiKeyGroup(provider) {
        const group = document.createElement('div');
        group.className = 'api-key-group';
        group.style.display = 'block'; // Zajistit viditelnost
        
        // Přidat security info pouze do první API key skupiny
        const isFirstProvider = !document.querySelector('.security-info');
        const securityInfo = isFirstProvider ? `
            <div class="security-info">
                <span class="security-text">
                    🔒 Vaše klíče jsou šifrovány AES-256 a zůstávají pouze ve vašem zařízení. 
                    <a href="#" class="security-link">Více informací</a>
                </span>
            </div>
        ` : '';
        
        group.innerHTML = `
            ${securityInfo}
            <label>API Key</label>
            <div class="input-group">
                <input type="password" id="${provider}-api-key" placeholder="${this.getApiKeyPlaceholder(provider)}" class="api-key-input">
                <button class="toggle-btn" data-provider="${provider}">Zobrazit</button>
                <button class="test-btn" data-provider="${provider}">Test</button>
            </div>
            <small>Získejte na <a href="${this.getProviderUrl(provider)}" target="_blank">${this.getProviderDomain(provider)}</a></small>
        `;
        
        // Přidat event listenery po vytvoření
        setTimeout(() => {
            const toggleBtn = group.querySelector('.toggle-btn');
            const testBtn = group.querySelector('.test-btn');
            const securityLink = group.querySelector('.security-link');
            
            if (toggleBtn) {
                this.addEventListener(toggleBtn, 'click', () => {
                    if (window.uiManager) {
                        window.uiManager.toggleVisibility(`${provider}-api-key`);
                    }
                });
            }
            
            if (testBtn) {
                this.addEventListener(testBtn, 'click', () => {
                    this.testApiKey(provider);
                });
            }
            
            if (securityLink) {
                this.addEventListener(securityLink, 'click', (e) => {
                    e.preventDefault();
                    this.showSecurityInfo();
                });
            }
        }, 0);
        return group;
    }
    
    // Získat URL pro providera
    getProviderUrl(provider) {
        const urls = {
            'openai': 'https://platform.openai.com/api-keys',
            'anthropic': 'https://console.anthropic.com/',
            'google': 'https://aistudio.google.com/app/apikey'
        };
        return urls[provider] || '#';
    }
    
    // Získat doménu pro providera
    getProviderDomain(provider) {
        const domains = {
            'openai': 'platform.openai.com',
            'anthropic': 'console.anthropic.com',
            'google': 'aistudio.google.com'
        };
        return domains[provider] || provider;
    }
    
    // Vytvořit obecná nastavení providera
    createProviderSettings(provider) {
        // Zatím prázdné - pro budoucí rozšíření
        return null;
    }
    
    // Vytvořit nastavení pro konkrétní model
    createModelSettings(modelDef) {
        // Speciální nastavení pro OpenAI modely s podporou Assistant
        if (modelDef.provider === 'openai' && modelDef.config?.assistant === true) {
            const group = document.createElement('div');
            group.className = 'model-settings-group';
            
            // Použít unikátní ID s model ID
            const inputId = `${modelDef.id}-assistant-id`;
            
            // Načíst uloženou hodnotu
            const savedId = localStorage.getItem(CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.OPENAI_ASSISTANT_ID) || '';
            
            group.innerHTML = `
                <h4>${modelDef.name} - Speciální nastavení</h4>
                <div class="setting-item">
                    <label>OpenAI Assistant ID (pro Agent mode)</label>
                    <input type="text" id="${inputId}" placeholder="asst_..." class="settings-input" value="${savedId}">
                    <small>Volitelné - pouze pokud používáte OpenAI Assistants API</small>
                </div>
            `;
            
            // Použít MutationObserver místo setTimeout pro spolehlivé připojení event listeneru
            const setupListener = () => {
                const input = document.getElementById(inputId);
                if (input) {
                    this.addEventListener(input, 'change', () => this.markAsChanged());
                    return true;
                }
                return false;
            };
            
            // Zkusit ihned
            if (!setupListener()) {
                // Pokud element ještě neexistuje, použít MutationObserver
                const observer = new MutationObserver((mutations, obs) => {
                    if (setupListener()) {
                        obs.disconnect();
                    }
                });
                
                // Pozorovat container pro změny
                const container = document.getElementById('providers-settings');
                if (container) {
                    observer.observe(container, { childList: true, subtree: true });
                    
                    // Cleanup observer po 5 sekundách (failsafe)
                    setTimeout(() => observer.disconnect(), 5000);
                }
            }
            
            return group;
        }
        
        return null;
    }
    
    // Upravit loadCurrentSettings
    async loadCurrentSettings() {
        // Model selector
        await this.loadModelSelector();
        
        // Theme selector
        this.loadThemeSelector();
        
        // Hierarchická nastavení
        await this.loadHierarchicalSettings();
        
        // Reset change tracking
        this.hasUnsavedChanges = false;
        this.updateSaveButton();
    }

    // Získat enabled providery z registry
    getEnabledProviders() {
        const enabledProviders = new Set();
        
        // Získat pouze providery, kteří mají skutečně načtené modely
        if (window.modelManager) {
            const allModels = window.modelManager.getAllModels();
            allModels.forEach(model => {
                if (model.provider) {
                    enabledProviders.add(model.provider);
                }
            });
        } else if (window.ModelsRegistryHelper) {
            // Fallback na registry pokud model manager není ready
            const enabledModels = window.ModelsRegistryHelper.getEnabledModels();
            console.log('Enabled models from registry:', enabledModels);
            
            enabledModels.forEach(model => {
                if (model.provider) {
                    enabledProviders.add(model.provider);
                }
            });
        }
        
        const result = Array.from(enabledProviders);
        console.log('Enabled providers:', result);
        return result;
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

        // Získat VIDITELNÉ modely
        const visibleModels = window.modelManager.getAvailableModelsSync();
        const activeModel = window.modelManager.getActiveModel();

        // Vyčistit loading option
        select.innerHTML = '';
        
        if (visibleModels.length === 0) {
            select.innerHTML = '<option value="">Žádné dostupné modely</option>';
            return;
        }
        
        // Seskupit modely podle providera
        const modelsByProvider = {
            openai: [],
            anthropic: [],
            google: []
        };
        
        // Rozdělit viditelné modely podle providera
        visibleModels.forEach(model => {
            if (modelsByProvider[model.provider]) {
                modelsByProvider[model.provider].push(model);
            }
        });

        // Přidat modely do selectu po providerech
        Object.entries(modelsByProvider).forEach(([provider, models]) => {
            if (models.length > 0) {
                // Přidat optgroup pro providera
                const optgroup = document.createElement('optgroup');
                optgroup.label = this.getProviderDisplayName(provider);
                
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

    // Načíst jednotlivý API klíč - async verze
    async loadApiKey(provider, storageKey) {
        const input = document.getElementById(`${provider}-api-key`);
        if (!input) return;

        // Počkat na security manager
        if (window.security && !window.security.initialized) {
            await window.security.waitForInit();
        }

        // Pokud existuje uložený klíč, zobrazit placeholder
        const savedKey = await window.security.loadSecure(storageKey);
        if (savedKey) {
            input.value = '';
            input.placeholder = '••••••••••••••• (uloženo)';
        } else {
            input.value = '';
            input.placeholder = this.getApiKeyPlaceholder(provider);
        }

        // Event listener s debounce
        this.addEventListener(input, 'input', () => {
            this.markAsChangedDebounced();
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

    // Označit jako změněno s debounce
    markAsChangedDebounced() {
        // Clear existing timer
        if (this.debounceTimers.has('markAsChanged')) {
            clearTimeout(this.debounceTimers.get('markAsChanged'));
        }
        
        // Set new timer
        const timer = setTimeout(() => {
            this.markAsChanged();
            this.debounceTimers.delete('markAsChanged');
        }, 300);
        
        this.debounceTimers.set('markAsChanged', timer);
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
            let hasErrors = false;
            const errors = [];

            // 1. Uložit vybraný model
            if (this.selectedModel && window.modelManager) {
                try {
                    await window.modelManager.setActiveModel(this.selectedModel);
                } catch (error) {
                    hasErrors = true;
                    errors.push(`Model: ${error.message}`);
                    console.error('Error setting active model:', error);
                }
            }

            // 2. Uložit téma
            if (this.selectedTheme && window.uiManager) {
                try {
                    window.uiManager.setTheme(this.selectedTheme);
                } catch (error) {
                    hasErrors = true;
                    errors.push(`Téma: ${error.message}`);
                    console.error('Error setting theme:', error);
                }
            }

            // 3. Uložit API klíče
            try {
                await this.saveApiKeys();
            } catch (error) {
                hasErrors = true;
                errors.push(`API klíče: ${error.message}`);
                console.error('Error saving API keys:', error);
            }

            // 4. Uložit specifická nastavení
            try {
                this.saveModelSpecificSettings();
            } catch (error) {
                hasErrors = true;
                errors.push(`Specifická nastavení: ${error.message}`);
                console.error('Error saving specific settings:', error);
            }

            // 5. Invalidovat API key cache v model manageru
            if (window.modelManager) {
                window.modelManager.invalidateApiKeyCache();
            }

            // Pokud byly nějaké chyby, zobrazit je
            if (hasErrors) {
                this.showStatus('error', `Některá nastavení se nepodařilo uložit:\n${errors.join('\n')}`);
                return;
            }

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
            this.showStatus('error', error.message || CONFIG.MESSAGES.SETTINGS_SAVE_ERROR);
        }
    }

    // Uložit API klíče
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

    // Uložit jednotlivý API klíč - vylepšená verze
    async saveApiKey(provider, storageKey) {
        const input = document.getElementById(`${provider}-api-key`);
        if (!input) return;

        const apiKey = input.value.trim();
        
        // Pokud je prázdný a už máme uložený, nechat ho
        if (!apiKey) {
            const existing = await window.security.loadSecure(storageKey);
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
        await window.security.saveSecure(storageKey, apiKey);
        console.log(`✅ ${provider} API key saved`);
    }

    // Validace API klíče - sjednocená s config.js
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
                // OpenAI klíče začínají sk- nebo sess-
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
        // OpenAI Assistant ID - hledat všechny možné assistant ID inputy
        const assistantInputs = document.querySelectorAll('input[id$="-assistant-id"]');
        
        if (assistantInputs.length > 0) {
            // Vzít hodnotu z prvního nalezeného inputu (všechny by měly mít stejnou hodnotu)
            const value = assistantInputs[0].value.trim();
            
            if (value) {
                localStorage.setItem(
                    CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.OPENAI_ASSISTANT_ID,
                    value
                );
            } else {
                // Pokud je prázdný, odstranit z localStorage
                localStorage.removeItem(
                    CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.OPENAI_ASSISTANT_ID
                );
            }
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
            
            apiKey = await window.security.loadSecure(storageKey);
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
            if (error.code === 'TEST_TIMEOUT') {
                this.showStatus('error', 'Test vypršel - zkuste to znovu');
            } else if (error.message?.includes('Network')) {
                this.showStatus('error', 'Chyba sítě - zkontrolujte připojení');
            } else {
                this.showStatus('error', `Test selhal: ${error.message}`);
            }
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
            const passwordValidation = window.security.validatePassword(password);
            if (!passwordValidation.valid) {
                this.showStatus('error', passwordValidation.message);
                return;
            }

            // Přidat API klíče pokud je to povoleno
            if (CONFIG.EXPORT.INCLUDE.API_KEYS) {
                config.apiKeys = await window.security.exportSecureData(password);
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
                    const imported = await window.security.importSecureData(config.apiKeys, password);
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

                // Aplikovat viditelnost modelů
                if (config.settings?.visibleModels && window.modelManager) {
                    try {
                        const visibleModels = JSON.parse(config.settings.visibleModels);
                        window.modelManager.setModelVisibility(visibleModels);
                    } catch (e) {
                        console.error('Error applying model visibility:', e);
                    }
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
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
        }
        
        this.statusTimer = setTimeout(() => {
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
        
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }
    }

    // Zobrazit informace o zabezpečení
    showSecurityInfo() {
        // Vytvořit modal
        const modal = document.createElement('div');
        modal.className = 'modal security-modal';
        modal.innerHTML = `
            <div class="modal-content security-modal-content">
                <div class="modal-header">
                    <h2>🔒 Zabezpečení vašich dat</h2>
                    <button class="close-button" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="security-feature">
                        <h3>✓ Lokální ukládání</h3>
                        <p>Všechny API klíče jsou uloženy pouze ve vašem prohlížeči (localStorage). Nikdy nejsou odesílány na naše nebo jiné servery.</p>
                    </div>
                    
                    <div class="security-feature">
                        <h3>✓ Šifrování AES-256-GCM</h3>
                        <p>Používáme vojenskou úroveň šifrování s unikátním klíčem pro každé zařízení. Vaše data jsou chráněna i v případě, že by někdo získal přístup k vašemu počítači.</p>
                    </div>
                    
                    <div class="security-feature">
                        <h3>✓ Přímá komunikace s AI</h3>
                        <p>Vaše klíče jsou použity pouze pro přímé volání OpenAI, Anthropic nebo Google API. Komunikace probíhá přímo mezi vaším prohlížečem a AI službou.</p>
                    </div>
                    
                    <div class="security-feature">
                        <h3>✓ Export s dodatečnou ochranou</h3>
                        <p>Při exportu konfigurace jsou klíče znovu zašifrovány vaším heslem pomocí PBKDF2 s 100,000 iteracemi. Export je tak bezpečný i pro sdílení nebo zálohu.</p>
                    </div>
                    
                    <div class="security-feature">
                        <h3>✓ Žádné analytiky</h3>
                        <p>Nesbíráme žádná data o vašem používání aplikace. Žádné trackování, žádné cookies, žádná telemetrie. Vaše soukromí je naší prioritou.</p>
                    </div>
                    
                    <div class="security-feature">
                        <h3>ℹ️ Open Source</h3>
                        <p>Celý kód aplikace je otevřený a můžete si ho prohlédnout. Transparentnost je základem důvěry.</p>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="save-button" onclick="this.closest('.modal').remove()">Rozumím</button>
                </div>
            </div>
        `;
        
        // Přidat modal do body
        document.body.appendChild(modal);
        
        // Zavřít při kliknutí mimo
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
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

    // Cleanup event listenerů a timerů
    cleanup() {
        // Odstranit všechny event listenery
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach((handler, event) => {
                element.removeEventListener(event, handler);
            });
        });
        
        this.eventListeners.clear();
        
        // Vyčistit všechny timery
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
        
        if (this.statusTimer) {
            clearTimeout(this.statusTimer);
            this.statusTimer = null;
        }
        
        console.log('🧹 Settings cleanup completed');
    }
}

// Vytvořit globální instanci
window.settingsManager = new SettingsManager();

console.log('⚙️ Settings Manager loaded (v2.0 - Fixed)');
