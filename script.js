// ==================== GESTION DU STOCKAGE LOCAL ====================

const StorageManager = {
    // Clés de stockage
    KEYS: {
        VIDEOS: 'tiktak_videos',
        USER: 'tiktak_user',
        LIKES: 'tiktak_likes',
        DRAFTS: 'tiktak_drafts',
        COMMENTS: 'tiktak_comments',
        SETTINGS: 'tiktak_settings'
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
            coins: 100,
            email: 'user@tiktak.demo',
            createdAt: new Date().toISOString(),
            stats: {
                videos: 0,
                likes: 0,
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

// ==================== ÉTAT DE L'APPLICATION ====================

const AppState = {
    currentUser: null,
    videos: [],
    filteredVideos: [],
    currentVideo: null,
    viewMode: 'home', // 'home', 'trending', 'following', 'favorites', 'myvideos'
    
    init() {
        // Charger l'utilisateur
        this.currentUser = StorageManager.loadUser();
        
        // Charger les vidéos
        this.videos = StorageManager.loadVideos();
        
        // Si pas de vidéos, créer des démos
        if (this.videos.length === 0) {
            this.createDemoVideos();
        }
        
        this.filteredVideos = [...this.videos];
        
        console.log('✅ AppState initialisé:', {
            user: this.currentUser,
            videos: this.videos.length,
            likes: StorageManager.loadLikes().length
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
                views: 32000,
                duration: 28,
                createdAt: new Date(Date.now() - 43200000).toISOString(),
                isMonetized: false,
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
                views: 78000,
                duration: 32,
                createdAt: new Date(Date.now() - 21600000).toISOString(),
                isMonetized: true,
                tags: ["nature", "printemps", "paysage"]
            }
        ];
        
        this.videos = demoVideos;
        StorageManager.saveVideos(this.videos);
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
            views: 0,
            createdAt: new Date().toISOString()
        };
        
        this.videos.unshift(newVideo);
        this.filteredVideos = [...this.videos];
        StorageManager.saveVideos(this.videos);
        
        // Mettre à jour les stats utilisateur
        this.currentUser.stats.videos++;
        StorageManager.saveUser(this.currentUser);
        
        return newVideo;
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
        this.renderVideos();
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
        this.renderVideos();
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
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            if (e.target.value.length > 2) {
                AppState.filterByTag(e.target.value);
            } else {
                AppState.setViewMode('home');
            }
        });
        
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
    }
};

// ==================== GESTION DES VIDÉOS ====================

const VideoManager = {
    renderVideos() {
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
            const videoElement = this.createVideoElement(video);
            videoFeed.appendChild(videoElement);
        });
        
        this.initVideoPlayback();
    },
    
    createVideoElement(video) {
        const div = document.createElement('div');
        div.className = 'video-container';
        div.setAttribute('data-video-id', video.id);
        
        const timeAgo = UI.formatTimeAgo(video.createdAt);
        const likes = StorageManager.loadLikes();
        const isLiked = likes.some(like => 
            like.videoId === video.id && like.userId === AppState.currentUser.id
        );
        
        div.innerHTML = `
            <video loop muted playsinline poster="${video.thumbnailUrl}">
                <source src="${video.videoUrl}" type="video/mp4">
                Votre navigateur ne supporte pas la vidéo.
            </video>
            
            <div class="video-overlay">
                <div class="creator-info">
                    <img src="${video.userAvatar}" alt="${video.username}" onclick="showUserProfile('${video.userId}')">
                    <div>
                        <h4>@${video.username}</h4>
                        <p>${video.description || video.title}</p>
                        <small class="time-ago">${timeAago}</small>
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
                    
                    ${video.isMonetized ? `
                    <div class="action" onclick="openGiftShop('${video.id}')">
                        <i class="fas fa-gift"></i>
                        <span>Donner</span>
                    </div>
                    ` : ''}
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
    },
    
    initVideoPlayback() {
        const videos = document.querySelectorAll('.video-container video');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting) {
                    video.play().catch(e => console.log('Lecture bloquée:', e));
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.5 });
        
        videos.forEach(video => observer.observe(video));
    },
    
    publishVideo(videoData) {
        try {
            const newVideo = AppState.addVideo(videoData);
            UI.showNotification('Vidéo publiée avec succès!', 'success');
            this.renderVideos();
            return newVideo;
        } catch (error) {
            console.error('Erreur publication:', error);
            UI.showNotification('Erreur lors de la publication', 'error');
            return null;
        }
    },
    
    toggleLike(videoId) {
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
        this.renderVideos();
    }
};

// ==================== FONCTIONS GLOBALES ====================

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
    VideoManager.renderVideos();
    
    console.log('✅ TIKTAK initialisé avec succès!');
}

// Gestion des modales
function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('videoCaption').value = '';
    document.getElementById('videoFileInfo').innerHTML = 
        '<i class="fas fa-file-video"></i><span>Aucun fichier sélectionné</span>';
}

function openProfile() {
    // Mettre à jour les infos du profil
    const user = AppState.currentUser;
    const userVideos = AppState.getUserVideos(user.id);
    
    document.getElementById('profileUsername').textContent = user.username;
    document.getElementById('profileCoins').textContent = user.coins;
    document.getElementById('profileAvatar').src = user.avatar;
    document.getElementById('profileStats').textContent = 
        `${userVideos.length} vidéos • ${user.stats.followers} abonnés • ${user.stats.following} abonnements`;
    
    // Afficher la modale
    document.getElementById('profileModal').style.display = 'flex';
    showProfileTab('videos');
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
}

function openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

// Fonctions de publication
function simulateRecording() {
    UI.showNotification('Fonction d\'enregistrement simulée (mode démo)', 'info');
}

function openFilePicker() {
    document.getElementById('videoInput').click();
    
    // Gérer la sélection de fichier
    document.getElementById('videoInput').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Vérifier la taille
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            UI.showNotification('Le fichier est trop volumineux (max 100MB)', 'error');
            return;
        }
        
        // Mettre à jour l'affichage
        const fileInfo = document.getElementById('videoFileInfo');
        if (fileInfo) {
            fileInfo.innerHTML = `
                <i class="fas fa-file-video"></i>
                <span>${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            `;
        }
        
        // Générer une URL pour prévisualisation
        if (file.type.startsWith('video/')) {
            const videoUrl = URL.createObjectURL(file);
            const previewVideo = document.getElementById('previewVideo');
            if (previewVideo) {
                previewVideo.style.display = 'block';
                previewVideo.src = videoUrl;
                document.querySelector('.preview-placeholder').style.display = 'none';
            }
        }
    };
}

function publishVideo() {
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!caption) {
        UI.showNotification('Veuillez ajouter une légende', 'warning');
        return;
    }
    
    // Données de la vidéo (simulation avec URL de démo)
    const videoData = {
        title: caption.substring(0, 50),
        description: caption,
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-under-neon-lights-1230-large.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=600&fit=crop",
        isMonetized: isMonetized,
        privacy: privacy,
        duration: 30,
        tags: caption.match(/#[a-zA-Z0-9_]+/g) || []
    };
    
    // Publier la vidéo
    VideoManager.publishVideo(videoData);
    
    // Fermer la modale
    closeCreateModal();
}

function saveAsDraft() {
    const caption = document.getElementById('videoCaption').value.trim();
    
    if (!caption) {
        UI.showNotification('Le brouillon est vide', 'warning');
        return;
    }
    
    const draft = {
        caption: caption,
        isMonetized: document.getElementById('monetizeVideo').checked,
        privacy: document.getElementById('videoPrivacy').value,
        createdAt: new Date().toISOString()
    };
    
    StorageManager.saveDraft(draft);
    UI.showNotification('Brouillon sauvegardé', 'success');
    closeCreateModal();
}

// Fonctions utilitaires
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        UI.showNotification('Déconnexion réussie', 'success');
        toggleUserMenu();
    }
}

function clearLocalStorage() {
    if (confirm('ATTENTION: Cela effacera toutes vos données locales. Continuer ?')) {
        StorageManager.clearAll();
        location.reload();
    }
}

function saveSettings() {
    const username = document.getElementById('settingsUsername').value;
    const email = document.getElementById('settingsEmail').value;
    
    if (username) {
        AppState.currentUser.username = username;
        StorageManager.saveUser(AppState.currentUser);
        UI.updateUserUI();
        UI.showNotification('Paramètres sauvegardés', 'success');
    }
}

function showProfileTab(tab) {
    // Mettre à jour les onglets actifs
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Afficher le contenu correspondant
    document.querySelectorAll('.profile-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const contentId = `profile${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
    document.getElementById(contentId).style.display = 'block';
    
    // Charger le contenu
    switch(tab) {
        case 'videos':
            loadUserVideos();
            break;
        case 'likes':
            loadLikedVideos();
            break;
        case 'drafts':
            loadDrafts();
            break;
    }
}

function loadUserVideos() {
    const userVideos = AppState.getUserVideos(AppState.currentUser.id);
    const container = document.getElementById('profileVideos');
    
    if (userVideos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <p>Vous n'avez pas encore publié de vidéos</p>
                <button class="btn btn-primary" onclick="openCreateModal()">
                    <i class="fas fa-plus"></i> Créer votre première vidéo
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="videos-grid">
            ${userVideos.map(video => `
                <div class="video-thumbnail" onclick="playVideo('${video.id}')">
                    <img src="${video.thumbnailUrl}" alt="${video.title}">
                    <div class="thumbnail-overlay">
                        <span><i class="fas fa-play"></i> ${UI.formatNumber(video.views)}</span>
                        <span><i class="fas fa-heart"></i> ${UI.formatNumber(video.likes)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function loadLikedVideos() {
    const likedVideos = AppState.getLikedVideos();
    const container = document.getElementById('profileLikes');
    
    if (likedVideos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <p>Vous n'avez pas encore aimé de vidéos</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="videos-grid">
            ${likedVideos.map(video => `
                <div class="video-thumbnail" onclick="playVideo('${video.id}')">
                    <img src="${video.thumbnailUrl}" alt="${video.title}">
                    <div class="thumbnail-overlay">
                        <span><i class="fas fa-play"></i> ${UI.formatNumber(video.views)}</span>
                        <span><i class="fas fa-heart"></i> ${UI.formatNumber(video.likes)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function loadDrafts() {
    const drafts = StorageManager.loadDrafts();
    const container = document.getElementById('profileDrafts');
    
    if (drafts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <p>Vous n'avez pas de brouillons</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="drafts-list">
            ${drafts.map(draft => `
                <div class="draft-item">
                    <div>
                        <h4>${draft.caption.substring(0, 50)}...</h4>
                        <small>Créé le ${new Date(draft.createdAt).toLocaleDateString('fr-FR')}</small>
                    </div>
                    <div class="draft-actions">
                        <button class="btn btn-small" onclick="editDraft('${draft.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteDraft('${draft.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Fonctions de navigation
function showHome() {
    AppState.setViewMode('home');
    updateNavActive('home');
}

function showTrending() {
    AppState.setViewMode('trending');
    updateNavActive('trending');
}

function showFollowing() {
    UI.showNotification('Fonctionnalité à venir: Abonnements', 'info');
}

function showFavorites() {
    AppState.setViewMode('favorites');
    updateNavActive('favorites');
}

function showMyVideos() {
    AppState.setViewMode('myvideos');
    updateNavActive('myvideos');
}

function updateNavActive(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItems = {
        'home': 0,
        'trending': 1,
        'favorites': 2,
        'myvideos': 3
    };
    
    if (navItems[activeItem] !== undefined) {
        document.querySelectorAll('.nav-item')[navItems[activeItem]]?.classList.add('active');
    }
}

// ==================== EXPORT GLOBAL ====================

// Exposer les fonctions globales
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
window.toggleLike = VideoManager.toggleLike.bind(VideoManager);

// Démarrer l'application
document.addEventListener('DOMContentLoaded', initApp);
