// GitHub Storage Class - Version simplifiée pour localStorage
class GitHubStorage {
    constructor(config = {}) {
        this.config = config;
        this.localCache = window.localCache || new LocalCache();
        console.log('GitHubStorage initialisé (mode localStorage)');
    }

    async readFile(path) {
        console.log(`Lecture: ${path}`);
        
        try {
            // Essayer d'abord le cache local
            const cached = this.localCache.get(path);
            if (cached) {
                return cached;
            }
            
            // Sinon, essayer localStorage
            const key = `github_${path.replace(/\//g, '_')}`;
            const stored = localStorage.getItem(key);
            
            if (stored) {
                const data = JSON.parse(stored);
                this.localCache.set(path, data);
                return data;
            }
            
            return null;
        } catch (error) {
            console.error('Erreur lecture:', error);
            return null;
        }
    }

    async writeFile(path, content, commitMessage = 'Update data') {
        console.log(`Écriture: ${path} - ${commitMessage}`);
        
        try {
            // Sauvegarder dans le cache local
            this.localCache.set(path, content);
            
            // Sauvegarder dans localStorage
            const key = `github_${path.replace(/\//g, '_')}`;
            localStorage.setItem(key, JSON.stringify(content));
            
            // Simuler une sauvegarde réussie
            return {
                success: true,
                path: path,
                message: commitMessage,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erreur écriture:', error);
            throw error;
        }
    }

    async addVideo(videoData) {
        const videoId = `vid_${Date.now()}`;
        const videoPath = `data/videos/${videoId}.json`;
        
        const videoWithMetadata = {
            id: videoId,
            ...videoData,
            created_at: new Date().toISOString(),
            engagement: {
                likes: [],
                shares: 0,
                saves: 0,
                view_count: 0,
                view_duration_avg: 0
            }
        };
        
        await this.writeFile(videoPath, videoWithMetadata, `Ajout vidéo: ${videoData.title}`);
        
        // Mettre à jour l'index
        await this.updateVideoIndex(videoWithMetadata);
        
        return videoId;
    }

    async updateVideoIndex(videoData) {
        const indexPath = 'data/videos/index.json';
        let index = await this.readFile(indexPath);
        
        if (!index) {
            index = {
                last_updated: new Date().toISOString(),
                total_videos: 0,
                videos: []
            };
        }
        
        // Vérifier si la vidéo existe déjà
        const existingIndex = index.videos.findIndex(v => v.id === videoData.id);
        
        if (existingIndex !== -1) {
            // Mettre à jour la vidéo existante
            index.videos[existingIndex] = {
                id: videoData.id,
                filename: `${videoData.id}.json`,
                title: videoData.title,
                user_id: videoData.user_id,
                upload_date: videoData.created_at,
                views: videoData.engagement.view_count,
                likes: videoData.engagement.likes.length,
                comments_count: 0,
                thumbnail_url: videoData.thumbnail_url,
                video_url: videoData.video_url,
                hashtags: videoData.hashtags || [],
                category: videoData.category || 'general'
            };
        } else {
            // Ajouter une nouvelle vidéo
            index.videos.push({
                id: videoData.id,
                filename: `${videoData.id}.json`,
                title: videoData.title,
                user_id: videoData.user_id,
                upload_date: videoData.created_at,
                views: videoData.engagement.view_count,
                likes: videoData.engagement.likes.length,
                comments_count: 0,
                thumbnail_url: videoData.thumbnail_url,
                video_url: videoData.video_url,
                hashtags: videoData.hashtags || [],
                category: videoData.category || 'general'
            });
        }
        
        index.total_videos = index.videos.length;
        index.last_updated = new Date().toISOString();
        
        await this.writeFile(indexPath, index, `Mise à jour index vidéos`);
        
        return index;
    }

    async likeVideo(videoId, userId) {
        const videoPath = `data/videos/${videoId}.json`;
        const videoData = await this.readFile(videoPath);
        
        if (!videoData) return false;
        
        if (!videoData.engagement.likes.includes(userId)) {
            videoData.engagement.likes.push(userId);
            await this.writeFile(videoPath, videoData, `Like vidéo ${videoId}`);
            
            // Mettre à jour l'index
            await this.updateVideoIndex(videoData);
            return true;
        }
        return false;
    }

    async searchVideos(query, filters = {}) {
        const indexPath = 'data/videos/index.json';
        const index = await this.readFile(indexPath);
        
        if (!index || !index.videos) return { results: [], total: 0 };
        
        let results = [...index.videos];
        
        if (query) {
            results = results.filter(video => 
                video.title.toLowerCase().includes(query.toLowerCase()) ||
                (video.hashtags && video.hashtags.some(tag => 
                    tag.toLowerCase().includes(query.toLowerCase())
                ))
            );
        }
        
        if (filters.category) {
            results = results.filter(video => video.category === filters.category);
        }
        
        if (filters.userId) {
            results = results.filter(video => video.user_id === filters.userId);
        }
        
        if (filters.sortBy === 'popular') {
            results.sort((a, b) => b.views - a.views);
        } else if (filters.sortBy === 'latest') {
            results.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
        } else if (filters.sortBy === 'likes') {
            results.sort((a, b) => b.likes - a.likes);
        }
        
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const start = (page - 1) * limit;
        
        return {
            results: results.slice(start, start + limit),
            total: results.length,
            page,
            totalPages: Math.ceil(results.length / limit)
        };
    }

    // Méthodes utilitaires
    async clearAllData() {
        try {
            // Nettoyer localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('github_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Nettoyer le cache local
            this.localCache.clear();
            
            console.log('✅ Toutes les données GitHubStorage ont été effacées');
            return true;
        } catch (error) {
            console.error('Erreur nettoyage:', error);
            return false;
        }
    }

    async getStats() {
        let totalSize = 0;
        let fileCount = 0;
        
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('github_')) {
                    const value = localStorage.getItem(key);
                    totalSize += key.length + value.length;
                    fileCount++;
                }
            }
        } catch (error) {
            console.warn('Erreur calcul stats:', error);
        }
        
        return {
            fileCount,
            totalSizeBytes: totalSize,
            totalSizeKB: (totalSize / 1024).toFixed(2),
            cacheSize: this.localCache.cache.size
        };
    }

    // Sauvegarde/restauration
    async backup() {
        try {
            const backup = {};
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('github_')) {
                    backup[key] = localStorage.getItem(key);
                }
            }
            
            const backupKey = `github_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(backup));
            
            console.log(`✅ Backup créé: ${backupKey}`);
            return backupKey;
        } catch (error) {
            console.error('Erreur backup:', error);
            throw error;
        }
    }

    async restore(backupKey) {
        try {
            const backup = localStorage.getItem(backupKey);
            if (!backup) {
                throw new Error('Backup non trouvé');
            }
            
            const data = JSON.parse(backup);
            
            // Restaurer chaque fichier
            for (const [key, value] of Object.entries(data)) {
                localStorage.setItem(key, value);
            }
            
            console.log('✅ Backup restauré');
            return true;
        } catch (error) {
            console.error('Erreur restauration:', error);
            throw error;
        }
    }
}

// Exporter la classe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubStorage;
}
