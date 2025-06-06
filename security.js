// Security Manager - Vylepšená bezpečnost s Web Crypto API
// Používá AES-GCM šifrování místo XOR
// Verze: 2.0 - Opravená bez duplikací metod

class SecurityManager {
    constructor() {
        this.deviceKey = null;
        this.cryptoKey = null;
        this.initialized = false;
        console.log('🔐 Security Manager initializing...');
        this.initialize();
    }
    
    // Asynchronní inicializace
    async initialize() {
        try {
            await this.getOrCreateDeviceKey();
            this.initialized = true;
            console.log('🔐 Security Manager initialized');
        } catch (error) {
            console.error('🔐 Security Manager initialization failed:', error);
        }
    }
    
    // Získat nebo vytvořit unikátní klíč zařízení
    async getOrCreateDeviceKey() {
        const keyName = CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.DEVICE_KEY;
        let keyData = localStorage.getItem(keyName);
        
        // Ověřit že klíč je v správném formátu
        let validKey = false;
        if (keyData) {
            try {
                const keyObj = JSON.parse(keyData);
                // Validovat že je to správný JWK objekt
                validKey = keyObj.kty && keyObj.k && keyObj.alg;
            } catch (e) {
                // Není validní JSON
                validKey = false;
            }
        }
        
        if (!keyData || !validKey) {
            // Vyčistit případná stará data
            if (keyData && !validKey) {
                console.log('🧹 Removing invalid/old device key');
                localStorage.removeItem(keyName);
            }
            
            // Generovat nový klíč
            this.cryptoKey = await crypto.subtle.generateKey(
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            );
            
            // Exportovat klíč pro uložení
            const exportedKey = await crypto.subtle.exportKey('jwk', this.cryptoKey);
            localStorage.setItem(keyName, JSON.stringify(exportedKey));
            console.log('🔑 New device key generated');
        } else {
            // Načíst existující validní klíč
            const keyObj = JSON.parse(keyData);
            this.cryptoKey = await crypto.subtle.importKey(
                'jwk',
                keyObj,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                true,
                ['encrypt', 'decrypt']
            );
            console.log('🔑 Existing device key loaded');
        }
    }
    
    // Čekat na inicializaci
    async waitForInit() {
        if (this.initialized) return;
        
        // Počkat max 5 sekund
        for (let i = 0; i < 50; i++) {
            if (this.initialized) return;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Security Manager initialization timeout');
    }
    
    // Moderní šifrování pomocí AES-GCM
    async encrypt(text) {
        if (!text) return '';
        
        await this.waitForInit();
        
        try {
            // Převést text na ArrayBuffer
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            
            // Generovat náhodné IV (initialization vector)
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Šifrovat data
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.cryptoKey,
                data
            );
            
            // Spojit IV a šifrovaná data
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);
            
            // Převést na base64
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    
    // Dešifrování
    async decrypt(encoded) {
        if (!encoded) return '';
        
        await this.waitForInit();
        
        try {
            // Dekódovat z base64
            const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
            
            // Rozdělit IV a data
            const iv = combined.slice(0, 12);
            const encryptedData = combined.slice(12);
            
            // Dešifrovat
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.cryptoKey,
                encryptedData
            );
            
            // Převést zpět na text
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('Decryption error:', error);
            return '';
        }
    }
    
    // Uložit zabezpečenou hodnotu
    async saveSecure(key, value) {
        if (!value) {
            this.removeSecure(key);
            return;
        }
        
        try {
            const encrypted = await this.encrypt(value);
            const storageKey = CONFIG.STORAGE.PREFIX + key;
            localStorage.setItem(storageKey, encrypted);
        } catch (error) {
            console.error('Save secure error:', error);
            throw error;
        }
    }
    
    // Načíst zabezpečenou hodnotu
    async loadSecure(key) {
        const storageKey = CONFIG.STORAGE.PREFIX + key;
        const encrypted = localStorage.getItem(storageKey);
        
        if (!encrypted) return null;
        
        try {
            return await this.decrypt(encrypted);
        } catch (error) {
            console.error('Load secure error:', error);
            return null;
        }
    }
    
    // Odstranit zabezpečenou hodnotu
    removeSecure(key) {
        const storageKey = CONFIG.STORAGE.PREFIX + key;
        localStorage.removeItem(storageKey);
    }
    
    // Vymazat všechny zabezpečené hodnoty
    clearAllSecure() {
        const prefix = CONFIG.STORAGE.PREFIX;
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith(prefix) && key !== prefix + CONFIG.STORAGE.KEYS.DEVICE_KEY) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('🗑️ All secure data cleared');
    }
    
    // Export všech zabezpečených dat
    async exportSecureData(password) {
        const data = {};
        const prefix = CONFIG.STORAGE.PREFIX;
        
        // Získat všechny zabezpečené klíče
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix) && key !== prefix + CONFIG.STORAGE.KEYS.DEVICE_KEY) {
                const cleanKey = key.replace(prefix, '');
                const value = await this.loadSecure(cleanKey);
                if (value) {
                    data[cleanKey] = value;
                }
            }
        }
        
        // Vytvořit dočasný klíč z hesla
        const passwordKey = await this.deriveKeyFromPassword(password);
        
        // Zašifrovat data pomocí password-based klíče
        const jsonData = JSON.stringify(data);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(jsonData);
        
        // IV pro password-based šifrování
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Salt pro odvození klíče
        const salt = crypto.getRandomValues(new Uint8Array(16));
        
        // Šifrovat
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            passwordKey.key,
            dataBuffer
        );
        
        // Kombinovat salt, IV a data
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);
        
        return btoa(String.fromCharCode(...combined));
    }
    
    // Import zabezpečených dat
    async importSecureData(encryptedData, password) {
        try {
            // Dekódovat
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            // Rozdělit salt, IV a data
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);
            
            // Odvodit klíč z hesla
            const passwordKey = await this.deriveKeyFromPassword(password, salt);
            
            // Dešifrovat
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                passwordKey.key,
                encrypted
            );
            
            // Parsovat JSON
            const decoder = new TextDecoder();
            const jsonData = decoder.decode(decrypted);
            const data = JSON.parse(jsonData);
            
            // Uložit všechna data
            for (const [key, value] of Object.entries(data)) {
                await this.saveSecure(key, value);
            }
            
            return true;
        } catch (error) {
            console.error('Import error:', error);
            return false;
        }
    }
    
    // Odvodit klíč z hesla
    async deriveKeyFromPassword(password, salt = null) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        // Použít poskytnutý salt nebo vygenerovat nový
        const saltBuffer = salt || crypto.getRandomValues(new Uint8Array(16));
        
        // Import hesla jako klíč
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        // Odvodit AES klíč
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
        
        return { key, salt: saltBuffer };
    }
    
    // Validace síly hesla
    validatePassword(password) {
        if (!password || password.length < 8) {
            return {
                valid: false,
                message: 'Heslo musí mít alespoň 8 znaků'
            };
        }
        
        // Kontrola složitosti
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        
        const complexity = [hasLower, hasUpper, hasNumber, hasSpecial].filter(x => x).length;
        
        if (complexity < 3) {
            return {
                valid: false,
                message: 'Heslo musí obsahovat alespoň 3 z následujících: malá písmena, velká písmena, čísla, speciální znaky'
            };
        }
        
        return {
            valid: true,
            strength: complexity === 4 ? 'strong' : 'medium'
        };
    }
    
    // Hash hesla pro porovnání (jednosměrný)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Ověřit, zda jsou nějaká data zašifrována
    hasSecureData() {
        const prefix = CONFIG.STORAGE.PREFIX;
        return Object.keys(localStorage).some(key => 
            key.startsWith(prefix) && key !== prefix + CONFIG.STORAGE.KEYS.DEVICE_KEY
        );
    }
    
    // Získat seznam všech zabezpečených klíčů
    getSecureKeys() {
        const prefix = CONFIG.STORAGE.PREFIX;
        const keys = [];
        
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix) && key !== prefix + CONFIG.STORAGE.KEYS.DEVICE_KEY) {
                keys.push(key.replace(prefix, ''));
            }
        });
        
        return keys;
    }
    
    // Helper metoda pro rychlou kontrolu existence klíče (bez dešifrování)
    hasKey(key) {
        const storageKey = CONFIG.STORAGE.PREFIX + key;
        return localStorage.getItem(storageKey) !== null;
    }
}

// Vytvořit globální instanci
const security = new SecurityManager();

// Export pro ostatní moduly
window.security = security;

console.log('🔐 Security Manager loaded (v2.0 - Fixed)');
