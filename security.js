// Security Manager - Vylepšená bezpečnost s Web Crypto API
// Používá AES-GCM šifrování místo XOR
// Verze: 2.2 - Opravený export pro správné zpracování API klíčů

class SecurityManager {
   constructor() {
       this.deviceKey = null;
       this.cryptoKey = null;
       this.initialized = false;
       this.initFailed = false;  // Přidáno pro tracking selhání
       console.log('🔐 Security Manager initializing...');
       this.initialize();
   }
   
   // Asynchronní inicializace
   async initialize() {
       try {
           // Kontrola dostupnosti localStorage
           if (!this.isLocalStorageAvailable()) {
               throw new Error('localStorage is not available');
           }
           
           // Kontrola Web Crypto API
           if (!window.crypto || !window.crypto.subtle) {
               throw new Error('Web Crypto API is not available');
           }
           
           await this.getOrCreateDeviceKey();
           this.initialized = true;
           console.log('🔐 Security Manager initialized');
       } catch (error) {
           console.error('🔐 Security Manager initialization failed:', error);
           this.initialized = false;
           this.initFailed = true;  // Označit selhání
           throw error;
       }
   }
   
   // Kontrola dostupnosti localStorage
   isLocalStorageAvailable() {
       try {
           const test = '__localStorage_test__';
           localStorage.setItem(test, test);
           localStorage.removeItem(test);
           return true;
       } catch (e) {
           return false;
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
       
       // Pokud už inicializace selhala, vyhodit chybu okamžitě
       if (this.initFailed) {
           throw new Error('Security initialization failed');
       }
       
       // Počkat max 5 sekund
       for (let i = 0; i < 50; i++) {
           if (this.initialized) return;
           
           // Kontrola selhání během čekání
           if (this.initFailed) {
               throw new Error('Security initialization failed');
           }
           
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
   
   // Dešifrování s lepším error handling
   async decrypt(encoded) {
       if (!encoded) return '';
       
       await this.waitForInit();
       
       try {
           // Základní validace
           if (typeof encoded !== 'string' || encoded.length < 20) {
               console.warn('Invalid encrypted data format');
               return '';
           }
           
           // Dekódovat z base64
           let combined;
           try {
               combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
           } catch (e) {
               console.warn('Invalid base64 encoding');
               return '';
           }
           
           // Kontrola minimální délky (12 bytes IV + nějaká data)
           if (combined.length < 13) {
               console.warn('Encrypted data too short');
               return '';
           }
           
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
           console.warn('Decryption failed for this item:', error.message);
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
   
   // Načíst zabezpečenou hodnotu s lepším error handling
   async loadSecure(key) {
       const storageKey = CONFIG.STORAGE.PREFIX + key;
       const encrypted = localStorage.getItem(storageKey);
       
       if (!encrypted) return null;
       
       try {
           const decrypted = await this.decrypt(encrypted);
           return decrypted || null;
       } catch (error) {
           console.warn(`Failed to decrypt ${key}, removing corrupted data`);
           // Odstranit poškozená data
           localStorage.removeItem(storageKey);
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
   
   // OPRAVENÁ VERZE - Export všech zabezpečených dat
   async exportSecureData(password) {
       console.log('📦 Starting secure data export...');
       
       const secureData = {};
       const errors = [];
       
       // Definovat které klíče jsou šifrované (pouze API klíče)
       const encryptedKeys = [
           CONFIG.STORAGE.KEYS.OPENAI_KEY,
           CONFIG.STORAGE.KEYS.ANTHROPIC_KEY,
           CONFIG.STORAGE.KEYS.GOOGLE_KEY,
           CONFIG.STORAGE.KEYS.PERPLEXITY_KEY,
           CONFIG.STORAGE.KEYS.TOGETHER_KEY,
           CONFIG.STORAGE.KEYS.COHERE_KEY
       ];
       
       // Načíst pouze šifrované API klíče
       for (const key of encryptedKeys) {
           try {
               // Zkontrolovat, zda klíč existuje v localStorage
               const storageKey = CONFIG.STORAGE.PREFIX + key;
               if (localStorage.getItem(storageKey)) {
                   const value = await this.loadSecure(key);
                   if (value) {
                       secureData[key] = value;
                       console.log(`✅ Exported ${key}`);
                   }
               }
           } catch (error) {
               console.warn(`Failed to export ${key}:`, error);
               errors.push(key);
           }
       }
       
       // Pokud nejsou žádná data k exportu
       if (Object.keys(secureData).length === 0) {
           console.log('No secure data to export');
           return null;
       }
       
       // Pokud byly nějaké chyby, informovat uživatele
       if (errors.length > 0) {
           console.warn('Some items could not be exported:', errors);
       }
       
       try {
           // Vytvořit dočasný klíč z hesla
           const passwordKey = await this.deriveKeyFromPassword(password);
           
           // Zašifrovat data pomocí password-based klíče
           const jsonData = JSON.stringify(secureData);
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
       } catch (error) {
           console.error('Export encryption error:', error);
           throw error;
       }
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
        
        console.log('Import debug:');
        console.log('Salt length:', salt.length);
        console.log('IV length:', iv.length);
        console.log('Encrypted length:', encrypted.length);
        console.log('Password length:', password.length);
        
        // Odvodit klíč z hesla
        const passwordKey = await this.deriveKeyFromPassword(password, salt);
        console.log('Key derived successfully');
        
        // Dešifrovat
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            passwordKey.key,
            encrypted
        );
        console.log('Decryption successful!');
        
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
        console.error('Error stack:', error.stack);
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
   
   // Vyčistit poškozená data
   async cleanupCorruptedData() {
       const prefix = CONFIG.STORAGE.PREFIX;
       const corruptedKeys = [];
       
       for (const key of Object.keys(localStorage)) {
           if (key.startsWith(prefix) && key !== prefix + CONFIG.STORAGE.KEYS.DEVICE_KEY) {
               const value = localStorage.getItem(key);
               // Základní kontrola validity
               if (value && value.length > 0) {
                   try {
                       // Zkusit dekódovat base64
                       atob(value);
                       // Kontrola minimální délky
                       if (value.length < 20) {
                           corruptedKeys.push(key);
                       }
                   } catch (e) {
                       corruptedKeys.push(key);
                   }
               }
           }
       }
       
       if (corruptedKeys.length > 0) {
           console.log(`🧹 Found ${corruptedKeys.length} corrupted entries, cleaning up...`);
           corruptedKeys.forEach(key => {
               localStorage.removeItem(key);
               console.log(`  - Removed corrupted: ${key}`);
           });
       }
       
       return corruptedKeys.length;
   }
}

// Vytvořit globální instanci
const security = new SecurityManager();

// Export pro ostatní moduly
window.security = security;

console.log('🔐 Security Manager loaded (v2.2 - Fixed export)');
