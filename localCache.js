// Local Cache Class - Version améliorée
class LocalCache {
    constructor() {
        this.cache = new Map();
        this.maxSize = 500; // Augmenté pour plus de vidéos
        this.prefix = 'tiktak_';
    }

    set(key, data, ttl = 24 * 60 * 60 * 1000) { // 24h par défaut
        const storageKey = this.prefix + key;
        
        // Vider le cache si nécessaire
        if (this.cache.size >= this.maxSize) {
            const oldestKey = Array.from(this.cache.keys())[0];
            this.cache.delete(oldestKey);
        }

        const item = {
            data: data,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
        };

        this.cache.set(storageKey, item);
        
        // Sauvegarder aussi dans localStorage pour persistance
        try {
            localStorage.setItem(storageKey, JSON.stringify(item));
        } catch (error) {
            console.warn('LocalStorage plein, utilisation du cache mémoire uniquement');
        }
    }

    get(key) {
        const storageKey = this.prefix + key;
        
        // Vérifier d'abord dans le cache mémoire
        let item = this.cache.get(storageKey);
        
        // Si pas en cache mémoire, chercher dans localStorage
        if (!item) {
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    item = JSON.parse(stored);
                    this.cache.set(storageKey, item);
                }
            } catch (error) {
                console.warn('Erreur lecture localStorage:', error);
            }
        }
        
        if (!item) return null;
        
        // Vérifier l'expiration
        if (Date.now() > item.expiry) {
            this.delete(key);
            return null;
        }
        
        return item.data;
    }

    delete(key) {
        const storageKey = this.prefix + key;
        this.cache.delete(storageKey);
        
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.warn('Erreur suppression localStorage:', error);
        }
    }

    clear() {
        this.cache.clear();
        
        // Nettoyer le localStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
            console.warn('Erreur nettoyage localStorage:', error);
        }
    }

    async getOrFetch(key, fetchFn, ttl = 300000) {
        const cached = this.get(key);
        if (cached) {
            return cached;
        }

        try {
            const data = await fetchFn();
            this.set(key, data, ttl);
            return data;
        } catch (error) {
            console.error('Erreur fetch:', error);
            throw error;
        }
    }

    // Nouvelles méthodes pour la gestion des vidéos
    saveVideos(videos) {
        this.set('videos', videos, 7 * 24 * 60 * 60 * 1000); // 7 jours
    }

    getVideos() {
        return this.get('videos') || [];
    }

    saveUser(user) {
        this.set('current_user', user, 30 * 24 * 60 * 60 * 1000); // 30 jours
    }

    getUser() {
        return this.get('current_user');
    }

    saveUsers(users) {
        this.set('all_users', users, 7 * 24 * 60 * 60 * 1000); // 7 jours
    }

    getUsers() {
        return this.get('all_users') || {};
    }

    // Méthode pour synchroniser avec localStorage
    syncWithLocalStorage() {
        console.log('Synchronisation du cache avec localStorage...');
        
        // Charger les vidéos depuis localStorage si elles existent
        try {
            const savedVideos = localStorage.getItem('tiktak_videos');
            if (savedVideos) {
                const videos = JSON.parse(savedVideos);
                this.saveVideos(videos);
            }
            
            const savedUser = localStorage.getItem('tiktak_user');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                this.saveUser(user);
            }
            
            const savedUsers = localStorage.getItem('tiktak_users');
            if (savedUsers) {
                const users = JSON.parse(savedUsers);
                this.saveUsers(users);
            }
            
            console.log('✅ Synchronisation terminée');
        } catch (error) {
            console.error('Erreur synchronisation:', error);
        }
    }

    // Statistiques du cache
    getStats() {
        return {
            memorySize: this.cache.size,
            localStorageSize: this.getLocalStorageSize(),
            memoryItems: Array.from(this.cache.keys())
        };
    }

    getLocalStorageSize() {
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    const value = localStorage.getItem(key);
                    total += key.length + value.length;
                }
            }
        } catch (error) {
            console.warn('Erreur calcul taille localStorage:', error);
        }
        return total;
    }

    // Optimiser le cache
    optimize() {
        console.log('Optimisation du cache...');
        
        const now = Date.now();
        let removed = 0;
        
        // Nettoyer les éléments expirés du cache mémoire
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
                removed++;
            }
        }
        
        // Nettoyer localStorage
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (now > item.expiry) {
                            localStorage.removeItem(key);
                            removed++;
                        }
                    } catch (e) {
                        // Si erreur de parsing, supprimer l'élément
                        localStorage.removeItem(key);
                        removed++;
                    }
                }
            }
        } catch (error) {
            console.warn('Erreur optimisation localStorage:', error);
        }
        
        console.log(`✅ ${removed} éléments expirés supprimés`);
        return removed;
    }
}

// Initialiser un cache global
window.localCache = new LocalCache();
