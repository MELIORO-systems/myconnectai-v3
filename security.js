// Security Manager - Jednoduchá obousměrná šifrovací funkce
// Používá XOR šifrování s unikátním klíčem pro každé zařízení

class SecurityManager {
    constructor() {
        // Generovat nebo načíst unikátní klíč pro tento prohlížeč
        this.deviceKey = this.getOrCreateDeviceKey();
        console.log('🔐 Security Manager initialized');
    }
    
    // Získat nebo vytvořit unikátní klíč zařízení
    getOrCreateDeviceKey() {
        const keyName = CONFIG.STORAGE.PREFIX + CONFIG.STORAGE.KEYS.DEVICE_KEY;
        let key = localStorage.getItem(keyName);
        
        if (!key) {
            // Generovat náhodný klíč
            key = this.generateKey();
            localStorage.setItem(keyName, key);
            console.log('🔑 New device key generated');
        }
        
        return key;
    }
    
    // Generovat náhodný klíč
    generateKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Jednoduchá XOR šifra s klíčem
    encrypt(text, key = null) {
        if (!text) return '';
        
        const encryptionKey = key || this.deviceKey;
        let result = '';
        
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length)
            );
        }
        
        // Base64 encode pro bezpečné uložení
        return btoa(result);
    }
    
    // Dešifrování
    decrypt(encoded, key = null) {
        if (!encoded) return '';
        
        try {
            const encryptionKey = key || this.deviceKey;
            const text = atob(encoded); // Base64 decode
            let result = '';
            
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(
                    text.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length)
                );
            }
            
            return result;
        } catch (e) {
            console.error('Decryption error:', e);
            return '';
        }
    }
    
    // Uložit zabezpečenou hodnotu
    saveSecure(key, value) {
        if (!value) {
            this.removeSecure(key);
            return;
        }
        
        const encrypted = this.encrypt(value);
        const storageKey = CONFIG.STORAGE.PREFIX + key;
        localStorage.setItem(storageKey, encrypted);
    }
    
    // Načíst zabezpečenou hodnotu
    loadSecure(key) {
        const storageKey = CONFIG.STORAGE.PREFIX + key;
        const encrypted = localStorage.getItem(storageKey);
        return this.decrypt(encrypted);
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
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });
        
        console.log('🗑️ All secure data cleared');
    }
    
    // Export všech zabezpečených dat
    exportSecureData(password) {
        const data = {};
        const prefix = CONFIG.STORAGE.PREFIX;
        
        // Získat všechny zabezpečené klíče
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix) && key !== prefix + CONFIG.STORAGE.KEYS.DEVICE_KEY) {
                const cleanKey = key.replace(prefix, '');
                const value = this.loadSecure(cleanKey);
                if (value) {
                    data[cleanKey] = value;
                }
            }
        });
        
        // Zašifrovat celý export heslem
        const jsonData = JSON.stringify(data);
        return this.encrypt(jsonData, password);
    }
    
    // Import zabezpečených dat
    importSecureData(encryptedData, password) {
        try {
            // Dešifrovat pomocí hesla
            const jsonData = this.decrypt(encryptedData, password);
            const data = JSON.parse(jsonData);
            
            // Uložit všechna data
            Object.keys(data).forEach(key => {
                this.saveSecure(key, data[key]);
            });
            
            return true;
        } catch (e) {
            console.error('Import error:', e);
            return false;
        }
    }
    
    // Validace síly hesla
    validatePassword(password) {
        if (!password || password.length < 6) {
            return {
                valid: false,
                message: 'Heslo musí mít alespoň 6 znaků'
            };
        }
        
        // Kontrola složitosti
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        
        const complexity = [hasLower, hasUpper, hasNumber, hasSpecial].filter(x => x).length;
        
        if (complexity < 2) {
            return {
                valid: false,
                message: 'Heslo je příliš jednoduché. Použijte kombinaci písmen, číslic a znaků.'
            };
        }
        
        return {
            valid: true,
            strength: complexity >= 4 ? 'strong' : complexity >= 3 ? 'medium' : 'weak'
        };
    }
    
    // Hash hesla pro porovnání (jednosměrný)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + this.deviceKey);
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
}

// Vytvořit globální instanci
const security = new SecurityManager();

// Export pro ostatní moduly
window.security = security;

console.log('🔐 Security Manager loaded');
