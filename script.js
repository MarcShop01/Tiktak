// ==================== GESTION DU STOCKAGE LOCAL ====================

const StorageManager = {
    // Clés de stockage
    KEYS: {
        VIDEOS: 'tiktak_videos',
        USER: 'tiktak_user',
        LIKES: 'tiktak_likes',
        DRAFTS: 'tiktak_drafts',
        COMMENTS: 'tiktak_comments',
        SETTINGS: 'tiktak_settings',
        UPLOADED_VIDEOS: 'tiktak_uploaded_videos',
        GIFTS: 'tiktak_gifts',
        TRANSACTIONS: 'tiktak_transactions'
    },

    // Sauvegarder les vidéos
    saveVideos(videos) {
        try {
            localStorage.setItem(this.KEYS.VIDEOS, JSON.stringify(videos));
            console.log('📁 Vidéos sauvegardées:', videos.length);
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde vidéos:', error);
            return false;
        }
    },

    // Charger les vidéos
    loadVideos() {
        try {
            const videos = localStorage.getItem(this.KEYS.VIDEOS);
            if (videos) {
                return JSON.parse(videos);
            }
            return [];
        } catch (error) {
            console.error('Erreur chargement vidéos:', error);
            return [];
        }
    },

    // Sauvegarder l'utilisateur
    saveUser(user) {
        try {
            localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde utilisateur:', error);
            return false;
        }
    },

    // Charger l'utilisateur
    loadUser() {
        try {
            const user = localStorage.getItem(this.KEYS.USER);
            if (user) {
                return JSON.parse(user);
            }
            return this.createDefaultUser();
        } catch (error) {
            console.error('Erreur chargement utilisateur:', error);
            return this.createDefaultUser();
        }
    },

    // Créer utilisateur par défaut
    createDefaultUser() {
        return {
            id: 'user_' + Date.now(),
            username: 'Utilisateur TIKTAK',
            avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
            coins: 1000, // Plus de coins pour tester
            email: 'user@tiktak.demo',
            createdAt: new Date().toISOString(),
            stats: {
                videos: 0,
                likes: 0,
                comments: 0,
                giftsSent: 0,
                giftsReceived: 0,
                earnings: 0,
                followers: 0,
                following: 0
            }
        };
    },

    // Gestion des likes
    saveLike(videoId, userId) {
        try {
            let likes = this.loadLikes();
            likes.push({ videoId, userId, timestamp: Date.now() });
            localStorage.setItem(this.KEYS.LIKES, JSON.stringify(likes));
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde like:', error);
            return false;
        }
    },

    removeLike(videoId, userId) {
        try {
            let likes = this.loadLikes();
            likes = likes.filter(like => !(like.videoId === videoId && like.userId === userId));
            localStorage.setItem(this.KEYS.LIKES, JSON.stringify(likes));
            return true;
        } catch (error) {
            console.error('Erreur suppression like:', error);
            return false;
        }
    },

    loadLikes() {
        try {
            const likes = localStorage.getItem(this.KEYS.LIKES);
            return likes ? JSON.parse(likes) : [];
        } catch (error) {
            console.error('Erreur chargement likes:', error);
            return [];
        }
    },

    // Gestion des commentaires
    saveComment(videoId, comment) {
        try {
            let comments = this.loadComments();
            if (!comments[videoId]) {
                comments[videoId] = [];
            }
            comments[videoId].push(comment);
            localStorage.setItem(this.KEYS.COMMENTS, JSON.stringify(comments));
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde commentaire:', error);
            return false;
        }
    },

    loadComments(videoId = null) {
        try {
            const comments = localStorage.getItem(this.KEYS.COMMENTS);
            const allComments = comments ? JSON.parse(comments) : {};
            
            if (videoId) {
                return allComments[videoId] || [];
            }
            return allComments;
        } catch (error) {
            console.error('Erreur chargement commentaires:', error);
            return videoId ? [] : {};
        }
    },

    deleteComment(videoId, commentId) {
        try {
            let comments = this.loadComments();
            if (comments[videoId]) {
                comments[videoId] = comments[videoId].filter(c => c.id !== commentId);
                localStorage.setItem(this.KEYS.COMMENTS, JSON.stringify(comments));
            }
            return true;
        } catch (error) {
            console.error('Erreur suppression commentaire:', error);
            return false;
        }
    },

    // Gestion des cadeaux
    saveGiftTransaction(transaction) {
        try {
            let transactions = this.loadGiftTransactions();
            transactions.push(transaction);
            localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde transaction cadeau:', error);
            return false;
        }
    },

    loadGiftTransactions() {
        try {
            const transactions = localStorage.getItem(this.KEYS.TRANSACTIONS);
            return transactions ? JSON.parse(transactions) : [];
        } catch (error) {
            console.error('Erreur chargement transactions cadeaux:', error);
            return [];
        }
    },

    getUserGiftTransactions(userId) {
        try {
            const transactions = this.loadGiftTransactions();
            return transactions.filter(t => 
                t.senderId === userId || t.receiverId === userId
            );
        } catch (error) {
            console.error('Erreur chargement transactions utilisateur:', error);
            return [];
        }
    },

    // Gestion des brouillons
    saveDraft(draft) {
        try {
            let drafts = this.loadDrafts();
            drafts.push({ ...draft, id: 'draft_' + Date.now() });
            localStorage.setItem(this.KEYS.DRAFTS, JSON.stringify(drafts));
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde brouillon:', error);
            return false;
        }
    },

    loadDrafts() {
        try {
            const drafts = localStorage.getItem(this.KEYS.DRAFTS);
            return drafts ? JSON.parse(drafts) : [];
        } catch (error) {
            console.error('Erreur chargement brouillons:', error);
            return [];
        }
    },

    deleteDraft(draftId) {
        try {
            let drafts = this.loadDrafts();
            drafts = drafts.filter(draft => draft.id !== draftId);
            localStorage.setItem(this.KEYS.DRAFTS, JSON.stringify(drafts));
            return true;
        } catch (error) {
            console.error('Erreur suppression brouillon:', error);
            return false;
        }
    },

    // Sauvegarder une vidéo uploadée
    saveUploadedVideo(videoId, videoData) {
        try {
            const videos = this.loadUploadedVideos();
            videos[videoId] = videoData;
            localStorage.setItem(this.KEYS.UPLOADED_VIDEOS, JSON.stringify(videos));
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde vidéo uploadée:', error);
            return false;
        }
    },

    // Charger une vidéo uploadée
    loadUploadedVideo(videoId) {
        try {
            const videos = this.loadUploadedVideos();
            return videos[videoId] || null;
        } catch (error) {
            console.error('Erreur chargement vidéo uploadée:', error);
            return null;
        }
    },

    // Charger toutes les vidéos uploadées
    loadUploadedVideos() {
        try {
            const videos = localStorage.getItem(this.KEYS.UPLOADED_VIDEOS);
            return videos ? JSON.parse(videos) : {};
        } catch (error) {
            console.error('Erreur chargement vidéos uploadées:', error);
            return {};
        }
    },

    // Effacer toutes les données
    clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Erreur effacement données:', error);
            return false;
        }
    },

    // Générer ID unique
    generateId(prefix = 'item') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// ==================== BOUTIQUE DE CADEAUX ====================

const GiftShop = {
    // 20 cadeaux avec prix de $0.50 à $50
    gifts: [
        { id: 1, name: "Émoji ❤️", icon: "❤️", price: 0.5, coins: 5, description: "Un coeur simple" },
        { id: 2, name: "Étoile ⭐", icon: "⭐", price: 1, coins: 10, description: "Une étoile brillante" },
        { id: 3, name: "Pouce 👍", icon: "👍", price: 1.5, coins: 15, description: "Pouce levé" },
        { id: 4, name: "Fleur 🌸", icon: "🌸", price: 2, coins: 20, description: "Fleur délicate" },
        { id: 5, name: "Couronne 👑", icon: "👑", price: 3, coins: 30, description: "Couronne royale" },
        { id: 6, name: "Diamant 💎", icon: "💎", price: 5, coins: 50, description: "Diamant précieux" },
        { id: 7, name: "Rocket 🚀", icon: "🚀", price: 7.5, coins: 75, description: "Fusée spatiale" },
        { id: 8, name: "Voiture 🚗", icon: "🚗", price: 10, coins: 100, description: "Voiture de sport" },
        { id: 9, name: "Avion ✈️", icon: "✈️", price: 12.5, coins: 125, description: "Avion de ligne" },
        { id: 10, name: "Yacht 🛥️", icon: "🛥️", price: 15, coins: 150, description: "Yacht de luxe" },
        { id: 11, name: "Château 🏰", icon: "🏰", price: 20, coins: 200, description: "Château fort" },
        { id: 12, name: "Trophée 🏆", icon: "🏆", price: 25, coins: 250, description: "Trophée d'or" },
        { id: 13, name: "Hélicoptère 🚁", icon: "🚁", price: 30, coins: 300, description: "Hélicoptère" },
        { id: 14, name: "Bague 💍", icon: "💍", price: 35, coins: 350, description: "Bague en diamant" },
        { id: 15, name: "Montre ⌚", icon: "⌚", price: 40, coins: 400, description: "Montre de luxe" },
        { id: 16, name: "Ferrari 🏎️", icon: "🏎️", price: 45, coins: 450, description: "Voiture de course" },
        { id: 17, name: "Île 🏝️", icon: "🏝️", price: 48, coins: 480, description: "Île paradisiaque" },
        { id: 18, name: "Jet Privé 🛩️", icon: "🛩️", price: 49, coins: 490, description: "Jet privé" },
        { id: 19, name: "Mona Lisa 🖼️", icon: "🖼️", price: 49.5, coins: 495, description: "Tableau célèbre" },
        { id: 20, name: "Couronne Impériale 👑🌟", icon: "👑🌟", price: 50, coins: 500, description: "Couronne impériale avec étoiles" }
    ],

    // Prix minimum et maximum
    minPrice: 0.5,
    maxPrice: 50,

    // Acheter un cadeau
    async buyGift(userId, giftId, videoId, receiverId) {
        try {
            const gift = this.gifts.find(g => g.id === giftId);
            if (!gift) {
                throw new Error('Cadeau non trouvé');
            }

            // Trouver l'utilisateur
            const user = AppState.currentUser;
            if (user.id !== userId) {
                throw new Error('Utilisateur non autorisé');
            }

            // Vérifier le solde
            if (user.coins < gift.coins) {
                throw new Error('Coins insuffisants');
            }

            // Déduire les coins
            user.coins -= gift.coins;
            user.stats.giftsSent += gift.coins;

            // Trouver le créateur de la vidéo
            const video = AppState.getVideoById(videoId);
            if (!video) {
                throw new Error('Vidéo non trouvée');
            }

            // Calculer la répartition
            const creatorShare = gift.coins * 0.65; // 65% pour le créateur
            const ownerShare = gift.coins * 0.35;   // 35% pour le propriétaire

            // Mettre à jour les stats du créateur (simulation)
            // En réalité, nous aurions besoin de charger le profil du créateur
            console.log(`🎁 Cadeau envoyé: ${gift.name}`);
            console.log(`💰 Répartition: Créateur ${creatorShare.toFixed(2)} coins, Propriétaire ${ownerShare.toFixed(2)} coins`);

            // Enregistrer la transaction
            const transaction = {
                id: StorageManager.generateId('gift'),
                giftId: gift.id,
                giftName: gift.name,
                giftIcon: gift.icon,
                giftPrice: gift.price,
                giftCoins: gift.coins,
                senderId: userId,
                senderName: user.username,
                receiverId: receiverId,
                receiverName: video.username,
                videoId: videoId,
                videoTitle: video.title,
                creatorShare: creatorShare,
                ownerShare: ownerShare,
                timestamp: new Date().toISOString()
            };

            StorageManager.saveGiftTransaction(transaction);

            // Mettre à jour l'utilisateur
            StorageManager.saveUser(user);
            AppState.currentUser = user;
            UI.updateUserUI();

            return {
                success: true,
                gift: gift,
                transaction: transaction,
                remainingCoins: user.coins
            };

        } catch (error) {
            console.error('Erreur achat cadeau:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Obtenir les cadeaux par prix
    getGiftsByPrice(min = 0, max = 50) {
        return this.gifts.filter(gift => gift.price >= min && gift.price <= max);
    },

    // Obtenir les cadeaux les plus populaires
    getPopularGifts(limit = 5) {
        // Pour l'instant, retourner les plus chers
        return [...this.gifts]
            .sort((a, b) => b.price - a.price)
            .slice(0, limit);
    },

    // Obtenir les statistiques des cadeaux
    getGiftStats() {
        const transactions = StorageManager.loadGiftTransactions();
        
        const stats = {
            totalTransactions: transactions.length,
            totalCoinsSpent: 0,
            totalCreatorEarnings: 0,
            totalOwnerEarnings: 0,
            mostPopularGift: null,
            topSenders: [],
            topReceivers: []
        };

        if (transactions.length > 0) {
            // Calculer les totaux
            transactions.forEach(t => {
                stats.totalCoinsSpent += t.giftCoins;
                stats.totalCreatorEarnings += t.creatorShare;
                stats.totalOwnerEarnings += t.ownerShare;
            });

            // Trouver le cadeau le plus populaire
            const giftCounts = {};
            transactions.forEach(t => {
                giftCounts[t.giftId] = (giftCounts[t.giftId] || 0) + 1;
            });

            let maxCount = 0;
            let popularGiftId = null;
            Object.entries(giftCounts).forEach(([giftId, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    popularGiftId = parseInt(giftId);
                }
            });

            if (popularGiftId) {
                stats.mostPopularGift = this.gifts.find(g => g.id === popularGiftId);
            }

            // Calculer les top expéditeurs et destinataires
            const senderStats = {};
            const receiverStats = {};

            transactions.forEach(t => {
                senderStats[t.senderId] = (senderStats[t.senderId] || 0) + t.giftCoins;
                receiverStats[t.receiverId] = (receiverStats[t.receiverId] || 0) + t.creatorShare;
            });

            stats.topSenders = Object.entries(senderStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id, coins]) => ({ id, coins }));

            stats.topReceivers = Object.entries(receiverStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id, earnings]) => ({ id, earnings }));
        }

        return stats;
    }
};

// ==================== ÉTAT DE L'APPLICATION ====================

const AppState = {
    currentUser: null,
    videos: [],
    filteredVideos: [],
    currentVideo: null,
    viewMode: 'home',
    uploadedFiles: {},
    
    init() {
        // Charger l'utilisateur
        this.currentUser = StorageManager.loadUser();
        
        // Charger les vidéos
        this.videos = StorageManager.loadVideos();
        
        // Si pas de vidéos, créer des démos
        if (this.videos.length === 0) {
            this.createDemoVideos();
        }
        
        // Charger les vidéos uploadées
        this.loadUploadedVideos();
        
        this.filteredVideos = [...this.videos];
        
        console.log('✅ AppState initialisé:', {
            user: this.currentUser,
            videos: this.videos.length,
            uploaded: Object.keys(this.uploadedFiles).length,
            likes: StorageManager.loadLikes().length,
            comments: Object.keys(StorageManager.loadComments()).length,
            gifts: GiftShop.getGiftStats().totalTransactions
        });
    },
    
    createDemoVideos() {
        const demoVideos = [
            {
                id: StorageManager.generateId('video'),
                title: "Danse sous les lumières néon",
                description: "Apprends cette choré avec moi ! #danse #fun #tiktak",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-under-neon-lights-1230-large.mp4",
                thumbnailUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=600&fit=crop",
                userId: "demo_user_1",
                username: "dancequeen",
                userAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
                likes: 12400,
                comments: 1200,
                shares: 543,
                gifts: 25,
                views: 54000,
                duration: 45,
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                isMonetized: true,
                tags: ["danse", "fun", "musique"]
            },
            {
                id: StorageManager.generateId('video'),
                title: "Skatepark tricks",
                description: "Nouveau trick au skatepark ! #skate #trick #sport",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-doing-tricks-with-skateboard-in-a-parking-lot-34553-large.mp4",
                thumbnailUrl: "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=400&h=600&fit=crop",
                userId: "demo_user_2",
                username: "skatepro",
                userAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
                likes: 8900,
                comments: 450,
                shares: 210,
                gifts: 12,
                views: 32000,
                duration: 28,
                createdAt: new Date(Date.now() - 43200000).toISOString(),
                isMonetized: true,
                tags: ["skate", "sport", "extreme"]
            },
            {
                id: StorageManager.generateId('video'),
                title: "Beauté de la nature",
                description: "Beauté de la nature au printemps 🌸 #nature #printemps #paysage",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4",
                thumbnailUrl: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&h=600&fit=crop",
                userId: "demo_user_3",
                username: "naturelover",
                userAvatar: "https://randomuser.me/api/portraits/women/67.jpg",
                likes: 15600,
                comments: 890,
                shares: 430,
                gifts: 42,
                views: 78000,
                duration: 32,
                createdAt: new Date(Date.now() - 21600000).toISOString(),
                isMonetized: true,
                tags: ["nature", "printemps", "paysage"]
            }
        ];
        
        // Ajouter des commentaires de démo
        demoVideos.forEach(video => {
            const comments = [
                {
                    id: StorageManager.generateId('comment'),
                    userId: "commenter_1",
                    username: "Fan123",
                    userAvatar: "https://randomuser.me/api/portraits/men/22.jpg",
                    text: "Super vidéo ! J'adore 😍",
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    likes: 24
                },
                {
                    id: StorageManager.generateId('comment'),
                    userId: "commenter_2",
                    username: "DanceLover",
                    userAvatar: "https://randomuser.me/api/portraits/women/33.jpg",
                    text: "Tu danses trop bien ! 👏",
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    likes: 15
                },
                {
                    id: StorageManager.generateId('comment'),
                    userId: "commenter_3",
                    username: "MusicFan",
                    userAvatar: "https://randomuser.me/api/portraits/men/44.jpg",
                    text: "Quelle est cette musique ? 🎵",
                    timestamp: new Date(Date.now() - 1800000).toISOString(),
                    likes: 8
                }
            ];
            
            comments.forEach(comment => {
                StorageManager.saveComment(video.id, comment);
            });
        });
        
        this.videos = demoVideos;
        StorageManager.saveVideos(this.videos);
    },
    
    loadUploadedVideos() {
        const uploadedVideos = StorageManager.loadUploadedVideos();
        this.uploadedFiles = uploadedVideos;
    },
    
    addVideo(videoData) {
        const newVideo = {
            id: StorageManager.generateId('video'),
            ...videoData,
            userId: this.currentUser.id,
            username: this.currentUser.username,
            userAvatar: this.currentUser.avatar,
            likes: 0,
            comments: 0,
            shares: 0,
            gifts: 0,
            views: 0,
            createdAt: new Date().toISOString()
        };
        
        // Si c'est une vidéo uploadée (avec blob), sauvegarder les données
        if (videoData.isUploaded && videoData.videoBlob) {
            // Stocker la vidéo dans le stockage local
            StorageManager.saveUploadedVideo(newVideo.id, {
                videoBlob: videoData.videoBlob,
                thumbnailBlob: videoData.thumbnailBlob,
                filename: videoData.filename
            });
            
            // Créer une URL blob pour l'affichage
            const videoBlob = this.base64ToBlob(videoData.videoBlob, 'video/mp4');
            newVideo.videoUrl = URL.createObjectURL(videoBlob);
            
            if (videoData.thumbnailBlob) {
                const thumbnailBlob = this.base64ToBlob(videoData.thumbnailBlob, 'image/jpeg');
                newVideo.thumbnailUrl = URL.createObjectURL(thumbnailBlob);
            }
        }
        
        this.videos.unshift(newVideo);
        this.filteredVideos = [...this.videos];
        StorageManager.saveVideos(this.videos);
        
        // Mettre à jour les stats utilisateur
        this.currentUser.stats.videos++;
        StorageManager.saveUser(this.currentUser);
        
        return newVideo;
    },
    
    // Convertir base64 en blob
    base64ToBlob(base64, contentType) {
        try {
            const byteCharacters = atob(base64.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: contentType });
        } catch (error) {
            console.error('Erreur conversion base64 vers blob:', error);
            return null;
        }
    },
    
    // Charger une vidéo uploadée depuis le stockage
    loadVideoBlob(videoId) {
        const videoData = StorageManager.loadUploadedVideo(videoId);
        if (videoData && videoData.videoBlob) {
            const blob = this.base64ToBlob(videoData.videoBlob, 'video/mp4');
            return blob ? URL.createObjectURL(blob) : null;
        }
        return null;
    },
    
    // Charger une miniature uploadée depuis le stockage
    loadThumbnailBlob(videoId) {
        const videoData = StorageManager.loadUploadedVideo(videoId);
        if (videoData && videoData.thumbnailBlob) {
            const blob = this.base64ToBlob(videoData.thumbnailBlob, 'image/jpeg');
            return blob ? URL.createObjectURL(blob) : null;
        }
        return null;
    },
    
    getVideoById(id) {
        return this.videos.find(video => video.id === id);
    },
    
    getUserVideos(userId) {
        return this.videos.filter(video => video.userId === userId);
    },
    
    getLikedVideos() {
        const likes = StorageManager.loadLikes();
        const userLikes = likes.filter(like => like.userId === this.currentUser.id);
        return this.videos.filter(video => 
            userLikes.some(like => like.videoId === video.id)
        );
    },
    
    filterByTag(tag) {
        this.filteredVideos = this.videos.filter(video => 
            video.tags?.includes(tag) || 
            video.description?.toLowerCase().includes(tag.toLowerCase())
        );
        this.viewMode = 'search';
        renderVideos();
    },
    
    setViewMode(mode) {
        this.viewMode = mode;
        switch(mode) {
            case 'home':
                this.filteredVideos = [...this.videos];
                break;
            case 'myvideos':
                this.filteredVideos = this.getUserVideos(this.currentUser.id);
                break;
            case 'favorites':
                this.filteredVideos = this.getLikedVideos();
                break;
            case 'trending':
                this.filteredVideos = [...this.videos].sort((a, b) => b.likes - a.likes);
                break;
        }
        renderVideos();
    },
    
    // Mettre à jour le nombre de commentaires d'une vidéo
    updateVideoCommentCount(videoId) {
        const video = this.getVideoById(videoId);
        if (video) {
            const comments = StorageManager.loadComments(videoId);
            video.comments = comments.length;
            StorageManager.saveVideos(this.videos);
            renderVideos();
        }
    },
    
    // Mettre à jour le nombre de cadeaux d'une vidéo
    updateVideoGiftCount(videoId, giftCoins) {
        const video = this.getVideoById(videoId);
        if (video) {
            video.gifts = (video.gifts || 0) + giftCoins;
            StorageManager.saveVideos(this.videos);
            renderVideos();
        }
    }
};

// ==================== GESTION DE L'INTERFACE ====================

const UI = {
    init() {
        this.bindEvents();
        this.updateUserUI();
        AppState.setViewMode('home');
    },
    
    bindEvents() {
        // Recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (e.target.value.length > 2) {
                    AppState.filterByTag(e.target.value);
                } else {
                    AppState.setViewMode('home');
                }
            });
        }
        
        // Gestion des modales
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeAllModals();
            }
        });
        
        // Touche Échap pour fermer les modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    },
    
    updateUserUI() {
        const user = AppState.currentUser;
        if (!user) return;
        
        // Avatar
        const avatar = document.getElementById('userAvatar');
        if (avatar) avatar.src = user.avatar;
        
        // Coins
        const coinCount = document.getElementById('coinCount');
        if (coinCount) coinCount.textContent = user.coins;
        
        // Mettre à jour les coins dans le profil si ouvert
        const profileCoins = document.getElementById('profileCoins');
        if (profileCoins) profileCoins.textContent = user.coins;
    },
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;
        
        const icon = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle'
        }[type] || 'info-circle';
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icon}"></i>
                <span>${message}</span>
            </div>
            <button class="close-notification" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove après 5 secondes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    },
    
    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
        });
    },
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },
    
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'À l\'instant';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} j`;
        return date.toLocaleDateString('fr-FR');
    },
    
    // Convertir blob en base64
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },
    
    // Générer une miniature depuis une vidéo
    generateThumbnail(videoFile) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            video.src = URL.createObjectURL(videoFile);
            video.addEventListener('loadeddata', () => {
                // Prendre une frame au milieu de la vidéo
                video.currentTime = Math.min(video.duration / 2, 3);
            });
            
            video.addEventListener('seeked', () => {
                canvas.width = video.videoWidth || 400;
                canvas.height = video.videoHeight || 600;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(blob => {
                    URL.revokeObjectURL(video.src);
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            });
            
            video.addEventListener('error', reject);
        });
    }
};

// ==================== GESTION DES VIDÉOS ====================

let currentVideoFile = null;
let currentThumbnailBlob = null;

function renderVideos() {
    const videoFeed = document.getElementById('videoFeed');
    if (!videoFeed) return;
    
    videoFeed.innerHTML = '';
    
    if (AppState.filteredVideos.length === 0) {
        videoFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <h3>Aucune vidéo trouvée</h3>
                <p>Soyez le premier à publier une vidéo !</p>
                <button class="btn btn-primary" onclick="openCreateModal()">
                    <i class="fas fa-plus"></i> Créer une vidéo
                </button>
            </div>
        `;
        return;
    }
    
    AppState.filteredVideos.forEach(video => {
        const videoElement = createVideoElement(video);
        videoFeed.appendChild(videoElement);
    });
    
    initVideoPlayback();
}

function createVideoElement(video) {
    const div = document.createElement('div');
    div.className = 'video-container';
    div.setAttribute('data-video-id', video.id);
    
    const timeAgo = UI.formatTimeAgo(video.createdAt);
    const likes = StorageManager.loadLikes();
    const isLiked = likes.some(like => 
        like.videoId === video.id && like.userId === AppState.currentUser.id
    );
    
    // Utiliser l'URL de la vidéo (soit URL externe, soit blob local)
    let videoUrl = video.videoUrl;
    let thumbnailUrl = video.thumbnailUrl;
    
    // Si c'est une vidéo uploadée, charger depuis le stockage
    if (video.isUploaded) {
        const loadedVideoUrl = AppState.loadVideoBlob(video.id);
        if (loadedVideoUrl) {
            videoUrl = loadedVideoUrl;
        }
        
        const loadedThumbnailUrl = AppState.loadThumbnailBlob(video.id);
        if (loadedThumbnailUrl) {
            thumbnailUrl = loadedThumbnailUrl;
        }
    }
    
    div.innerHTML = `
        <video loop muted playsinline poster="${thumbnailUrl}" preload="metadata">
            <source src="${videoUrl}" type="video/mp4">
            Votre navigateur ne supporte pas la vidéo.
        </video>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${video.userAvatar}" alt="${video.username}" onclick="showUserProfile('${video.userId}')">
                <div>
                    <h4>@${video.username}</h4>
                    <p>${video.description || video.title}</p>
                    <small class="time-ago">${timeAgo}</small>
                </div>
            </div>
            
            <div class="video-actions">
                <div class="action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${video.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${UI.formatNumber(video.likes)}</span>
                </div>
                
                <div class="action" onclick="openComments('${video.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${UI.formatNumber(video.comments)}</span>
                </div>
                
                <div class="action" onclick="shareVideo('${video.id}')">
                    <i class="fas fa-share"></i>
                    <span>${UI.formatNumber(video.shares)}</span>
                </div>
                
                <div class="action" onclick="openGiftShopForVideo('${video.id}', '${video.userId}')">
                    <i class="fas fa-gift"></i>
                    <span>${UI.formatNumber(video.gifts || 0)}</span>
                </div>
            </div>
            
            <div class="video-stats">
                <span class="view-count"><i class="fas fa-eye"></i> ${UI.formatNumber(video.views)}</span>
                <span class="duration">${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}</span>
            </div>
            
            ${video.isMonetized ? `
            <div class="monetization-badge">
                <i class="fas fa-coins"></i> Monétisé
            </div>
            ` : ''}
        </div>
    `;
    
    return div;
}

function initVideoPlayback() {
    const videos = document.querySelectorAll('.video-container video');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            
            // Ne jouer que si la vidéo est visible à plus de 50%
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                // Vérifier si la vidéo n'est pas déjà en train de jouer
                if (video.paused) {
                    const playPromise = video.play();
                    
                    // Gérer la promesse de lecture
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                // Lecture réussie
                                console.log('🎬 Vidéo en lecture:', video.src);
                            })
                            .catch(error => {
                                // Gérer les erreurs spécifiques
                                if (error.name === 'AbortError') {
                                    console.log('⏸️ Lecture interrompue volontairement');
                                } else if (error.name === 'NotAllowedError') {
                                    console.log('🔒 Lecture non autorisée (autoplay policy)');
                                    // Ajouter un bouton de lecture manuelle
                                    addManualPlayButton(video.parentElement);
                                } else {
                                    console.error('❌ Erreur lecture:', error);
                                }
                            });
                    }
                }
            } else {
                // Mettre en pause seulement si la vidéo est en train de jouer
                if (!video.paused) {
                    video.pause();
                }
            }
        });
    }, { 
        threshold: [0.1, 0.5, 0.9], // Plusieurs seuils pour plus de précision
        rootMargin: '0px'
    });
    
    videos.forEach(video => {
        // Précharger les métadonnées
        video.load();
        observer.observe(video);
        
        // Gérer les erreurs de chargement
        video.addEventListener('error', (e) => {
            console.error('❌ Erreur chargement vidéo:', e);
            replaceWithFallback(video.parentElement, video.id);
        });
        
        // Ajouter un événement de clic pour lecture manuelle
        video.addEventListener('click', () => {
            if (video.paused) {
                video.play().catch(e => {
                    console.log('❌ Lecture manuelle échouée:', e);
                });
            } else {
                video.pause();
            }
        });
    });
}

// ==================== FONCTIONS DE COMMENTAIRES ====================

function openComments(videoId) {
    const video = AppState.getVideoById(videoId);
    if (!video) return;
    
    // Créer la modale de commentaires
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.id = 'commentsModal';
    
    const comments = StorageManager.loadComments(videoId);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close-btn" onclick="closeComments()">&times;</span>
            <h2>Commentaires (${comments.length})</h2>
            
            <div class="comments-container" id="commentsList" style="max-height: 400px; overflow-y: auto; margin: 20px 0;">
                ${comments.length > 0 ? 
                    comments.map(comment => `
                        <div class="comment-item" id="comment-${comment.id}">
                            <div class="comment-header">
                                <img src="${comment.userAvatar}" alt="${comment.username}" style="width: 30px; height: 30px; border-radius: 50%;">
                                <div>
                                    <strong>${comment.username}</strong>
                                    <small>${UI.formatTimeAgo(comment.timestamp)}</small>
                                </div>
                                <div class="comment-actions">
                                    <button class="comment-like-btn" onclick="likeComment('${videoId}', '${comment.id}')">
                                        <i class="fas fa-heart"></i> ${comment.likes || 0}
                                    </button>
                                    ${comment.userId === AppState.currentUser.id ? `
                                    <button class="comment-delete-btn" onclick="deleteComment('${videoId}', '${comment.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="comment-text">${comment.text}</div>
                        </div>
                    `).join('') 
                    : 
                    '<div class="empty-comments"><p>Soyez le premier à commenter !</p></div>'
                }
            </div>
            
            <div class="comment-form">
                <div class="form-group">
                    <textarea id="newCommentText" placeholder="Ajouter un commentaire..." rows="3" style="width: 100%;"></textarea>
                </div>
                <div class="form-group" style="text-align: right;">
                    <button class="btn btn-secondary" onclick="closeComments()">Annuler</button>
                    <button class="btn btn-primary" onclick="postComment('${videoId}')">Commenter</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeComments() {
    const modal = document.getElementById('commentsModal');
    if (modal) {
        modal.remove();
    }
}

function postComment(videoId) {
    const textarea = document.getElementById('newCommentText');
    const text = textarea.value.trim();
    
    if (!text) {
        UI.showNotification('Veuillez écrire un commentaire', 'warning');
        return;
    }
    
    const comment = {
        id: StorageManager.generateId('comment'),
        userId: AppState.currentUser.id,
        username: AppState.currentUser.username,
        userAvatar: AppState.currentUser.avatar,
        text: text,
        timestamp: new Date().toISOString(),
        likes: 0
    };
    
    // Sauvegarder le commentaire
    StorageManager.saveComment(videoId, comment);
    
    // Mettre à jour le compteur de commentaires
    AppState.updateVideoCommentCount(videoId);
    
    // Mettre à jour les stats utilisateur
    AppState.currentUser.stats.comments++;
    StorageManager.saveUser(AppState.currentUser);
    
    UI.showNotification('Commentaire publié !', 'success');
    closeComments();
    
    // Rouvrir les commentaires pour voir le nouveau
    setTimeout(() => openComments(videoId), 300);
}

function likeComment(videoId, commentId) {
    const comments = StorageManager.loadComments(videoId);
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex !== -1) {
        comments[commentIndex].likes = (comments[commentIndex].likes || 0) + 1;
        
        // Sauvegarder les commentaires mis à jour
        let allComments = StorageManager.loadComments();
        allComments[videoId] = comments;
        localStorage.setItem(StorageManager.KEYS.COMMENTS, JSON.stringify(allComments));
        
        // Mettre à jour l'affichage
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            const likeBtn = commentElement.querySelector('.comment-like-btn');
            if (likeBtn) {
                likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${comments[commentIndex].likes}`;
            }
        }
        
        UI.showNotification('Commentaire aimé !', 'success');
    }
}

function deleteComment(videoId, commentId) {
    if (confirm('Supprimer ce commentaire ?')) {
        StorageManager.deleteComment(videoId, commentId);
        
        // Mettre à jour le compteur de commentaires
        AppState.updateVideoCommentCount(videoId);
        
        // Mettre à jour l'affichage
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            commentElement.remove();
        }
        
        UI.showNotification('Commentaire supprimé', 'success');
    }
}

// ==================== FONCTIONS DE CADEAUX ====================

let selectedVideoForGift = null;
let selectedReceiverForGift = null;

function openGiftShopForVideo(videoId, receiverId) {
    selectedVideoForGift = videoId;
    selectedReceiverForGift = receiverId;
    openGiftShop();
}

function openGiftShop() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.id = 'giftShopModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <span class="close-btn" onclick="closeGiftShop()">&times;</span>
            <h2>🎁 Boutique de Cadeaux</h2>
            <p style="color: #aaa; margin-bottom: 20px;">Votre solde: <strong>${AppState.currentUser.coins} coins</strong></p>
            
            <div class="gift-categories">
                <button class="gift-category-btn active" onclick="filterGiftsByPrice(0, 50)">Tous</button>
                <button class="gift-category-btn" onclick="filterGiftsByPrice(0, 5)">Économique ($0-5)</button>
                <button class="gift-category-btn" onclick="filterGiftsByPrice(5, 20)">Standard ($5-20)</button>
                <button class="gift-category-btn" onclick="filterGiftsByPrice(20, 50)">Luxe ($20-50)</button>
            </div>
            
            <div class="gifts-grid" id="giftsGrid">
                ${renderGiftsGrid(GiftShop.gifts)}
            </div>
            
            <div class="gift-stats" style="margin-top: 20px; padding: 15px; background: #111; border-radius: 10px;">
                <h4>📊 Statistiques des cadeaux</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                    <div class="stat-item">
                        <div class="stat-value">${GiftShop.getGiftStats().totalTransactions}</div>
                        <div class="stat-label">Cadeaux envoyés</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${GiftShop.getGiftStats().totalCoinsSpent}</div>
                        <div class="stat-label">Coins dépensés</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${GiftShop.getGiftStats().mostPopularGift ? GiftShop.getGiftStats().mostPopularGift.icon : '❓'}</div>
                        <div class="stat-label">Cadeau populaire</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function renderGiftsGrid(gifts) {
    return gifts.map(gift => `
        <div class="gift-item" data-gift-id="${gift.id}">
            <div class="gift-icon">${gift.icon}</div>
            <div class="gift-name">${gift.name}</div>
            <div class="gift-description">${gift.description}</div>
            <div class="gift-price">
                <span class="gift-coins">${gift.coins} coins</span>
                <span class="gift-usd">($${gift.price.toFixed(2)})</span>
            </div>
            <div class="gift-actions">
                <button class="btn btn-small btn-primary" onclick="selectGift(${gift.id})">
                    <i class="fas fa-gift"></i> Offrir
                </button>
            </div>
        </div>
    `).join('');
}

function filterGiftsByPrice(min, max) {
    const filteredGifts = GiftShop.getGiftsByPrice(min, max);
    const giftsGrid = document.getElementById('giftsGrid');
    if (giftsGrid) {
        giftsGrid.innerHTML = renderGiftsGrid(filteredGifts);
    }
    
    // Mettre à jour les boutons de catégorie actifs
    document.querySelectorAll('.gift-category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function selectGift(giftId) {
    if (!selectedVideoForGift || !selectedReceiverForGift) {
        UI.showNotification('Veuillez sélectionner une vidéo d\'abord', 'warning');
        return;
    }
    
    const gift = GiftShop.gifts.find(g => g.id === giftId);
    if (!gift) return;
    
    // Vérifier le solde
    if (AppState.currentUser.coins < gift.coins) {
        UI.showNotification('Coins insuffisants ! Achetez plus de coins.', 'error');
        return;
    }
    
    // Demander confirmation
    if (confirm(`Offrir ${gift.name} (${gift.coins} coins) pour ${gift.price.toFixed(2)}$ ?\n\nRépartition:\n• 65% pour le créateur (${(gift.coins * 0.65).toFixed(1)} coins)\n• 35% pour le site (${(gift.coins * 0.35).toFixed(1)} coins)`)) {
        sendGift(giftId);
    }
}

async function sendGift(giftId) {
    try {
        const result = await GiftShop.buyGift(
            AppState.currentUser.id,
            giftId,
            selectedVideoForGift,
            selectedReceiverForGift
        );
        
        if (result.success) {
            UI.showNotification(`🎁 Cadeau envoyé ! ${result.gift.name} offert avec succès.`, 'success');
            
            // Mettre à jour le compteur de cadeaux de la vidéo
            AppState.updateVideoGiftCount(selectedVideoForGift, result.gift.coins);
            
            // Mettre à jour l'affichage
            closeGiftShop();
            
            // Afficher une animation de cadeau
            showGiftAnimation(result.gift.icon, result.gift.name);
            
        } else {
            UI.showNotification(`Erreur: ${result.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Erreur envoi cadeau:', error);
        UI.showNotification('Erreur lors de l\'envoi du cadeau', 'error');
    }
}

function closeGiftShop() {
    const modal = document.getElementById('giftShopModal');
    if (modal) {
        modal.remove();
    }
    selectedVideoForGift = null;
    selectedReceiverForGift = null;
}

function showGiftAnimation(icon, name) {
    const animation = document.createElement('div');
    animation.className = 'gift-animation';
    animation.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 80px;
        z-index: 9999;
        animation: giftFly 2s ease-out forwards;
    `;
    
    animation.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 100px;">${icon}</div>
            <div style="font-size: 20px; margin-top: 10px; color: #00f2fe;">${name} envoyé !</div>
        </div>
    `;
    
    document.body.appendChild(animation);
    
    // Supprimer l'animation après 2 secondes
    setTimeout(() => {
        animation.remove();
    }, 2000);
}

// ==================== FONCTIONS RESTANTES (inchangées) ====================

// [Les fonctions restantes restent les mêmes que dans le code précédent...
// publishVideo(), toggleLike(), initApp(), openCreateModal(), etc.
// Je les raccourcis pour garder la réponse concise]

async function publishVideo() {
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!caption) {
        UI.showNotification('Veuillez ajouter une légende', 'warning');
        return;
    }
    
    // Désactiver le bouton pendant la publication
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    }
    
    try {
        let videoData = {
            title: caption.substring(0, 50),
            description: caption,
            isMonetized: isMonetized,
            privacy: privacy,
            duration: 30,
            tags: caption.match(/#[a-zA-Z0-9_]+/g) || []
        };
        
        // Si un fichier vidéo a été sélectionné
        if (currentVideoFile) {
            UI.showNotification('Conversion de la vidéo en cours...', 'info');
            
            // Convertir la vidéo en base64
            const videoBase64 = await UI.blobToBase64(currentVideoFile);
            
            // Générer une miniature
            let thumbnailBase64 = null;
            try {
                const thumbnailBlob = await UI.generateThumbnail(currentVideoFile);
                thumbnailBase64 = await UI.blobToBase64(thumbnailBlob);
            } catch (error) {
                console.log('Erreur génération miniature:', error);
                // Utiliser une image par défaut
                thumbnailBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
            }
            
            // Ajouter les données de la vidéo uploadée
            videoData = {
                ...videoData,
                videoBlob: videoBase64,
                thumbnailBlob: thumbnailBase64,
                filename: currentVideoFile.name,
                isUploaded: true,
                videoUrl: '', // Rempli automatiquement par addVideo
                thumbnailUrl: '' // Rempli automatiquement par addVideo
            };
            
            UI.showNotification('Vidéo convertie avec succès!', 'success');
        } else {
            // Utiliser une vidéo de démo
            videoData = {
                ...videoData,
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-under-neon-lights-1230-large.mp4",
                thumbnailUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=600&fit=crop"
            };
        }
        
        // Publier la vidéo
        const newVideo = AppState.addVideo(videoData);
        
        if (newVideo) {
            UI.showNotification('Vidéo publiée avec succès!', 'success');
            renderVideos();
            
            // Réinitialiser les variables de fichier
            currentVideoFile = null;
            currentThumbnailBlob = null;
        } else {
            UI.showNotification('Erreur lors de la publication', 'error');
        }
        
    } catch (error) {
        console.error('❌ Erreur publication:', error);
        UI.showNotification('Erreur lors de la publication: ' + error.message, 'error');
    } finally {
        // Réactiver le bouton
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        }
        
        // Fermer la modale
        closeCreateModal();
    }
}

function toggleLike(videoId) {
    const video = AppState.getVideoById(videoId);
    if (!video) return;
    
    const likes = StorageManager.loadLikes();
    const isLiked = likes.some(like => 
        like.videoId === videoId && like.userId === AppState.currentUser.id
    );
    
    if (isLiked) {
        // Retirer le like
        video.likes = Math.max(0, video.likes - 1);
        StorageManager.removeLike(videoId, AppState.currentUser.id);
        UI.showNotification('Like retiré', 'info');
    } else {
        // Ajouter le like
        video.likes++;
        StorageManager.saveLike(videoId, AppState.currentUser.id);
        UI.showNotification('Vidéo aimée!', 'success');
    }
    
    // Sauvegarder les modifications
    StorageManager.saveVideos(AppState.videos);
    
    // Re-rendre les vidéos
    renderVideos();
}

// Initialisation
function initApp() {
    console.log('🚀 Initialisation de TIKTAK...');
    
    // Cacher l'écran de chargement
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
        }, 1000);
    }
    
    // Initialiser l'état
    AppState.init();
    
    // Initialiser l'UI
    UI.init();
    
    // Rendre les vidéos
    renderVideos();
    
    console.log('✅ TIKTAK initialisé avec succès!');
    console.log('🎁 Boutique de cadeaux:', GiftShop.gifts.length, 'cadeaux disponibles');
}

// [Les autres fonctions restent les mêmes...]
// openCreateModal(), closeCreateModal(), openProfile(), etc.

// ==================== DÉMARRAGE DE L'APPLICATION ====================

// Exposer toutes les fonctions globales
window.initApp = initApp;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleUserMenu = toggleUserMenu;
window.logout = logout;
window.clearLocalStorage = clearLocalStorage;
window.saveSettings = saveSettings;
window.showProfileTab = showProfileTab;
window.showHome = showHome;
window.showTrending = showTrending;
window.showFollowing = showFollowing;
window.showFavorites = showFavorites;
window.showMyVideos = showMyVideos;
window.openFilePicker = openFilePicker;
window.simulateRecording = simulateRecording;
window.publishVideo = publishVideo;
window.saveAsDraft = saveAsDraft;
window.toggleLike = toggleLike;
window.editDraft = editDraft;
window.deleteDraft = deleteDraft;
window.openSearch = openSearch;
window.openNotifications = openNotifications;
window.showUserProfile = showUserProfile;
window.openComments = openComments;
window.closeComments = closeComments;
window.postComment = postComment;
window.likeComment = likeComment;
window.deleteComment = deleteComment;
window.shareVideo = shareVideo;
window.openGiftShop = openGiftShop;
window.openGiftShopForVideo = openGiftShopForVideo;
window.closeGiftShop = closeGiftShop;
window.selectGift = selectGift;
window.sendGift = sendGift;
window.filterGiftsByPrice = filterGiftsByPrice;
window.playVideo = playVideo;
window.openWallet = openWallet;
window.retryVideoLoad = retryVideoLoad;

// Démarrer l'application
document.addEventListener('DOMContentLoaded', initApp);
