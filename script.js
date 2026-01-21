// ==================== VARIABLES GLOBALES ====================
let currentUser = {
    id: 'user_1',
    username: 'Utilisateur TIKTAK',
    avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
    coins: 100,
    likedVideos: [],
    myVideos: [],
    drafts: [],
    following: [],
    followers: [],
    notifications: [],
    settings: {
        notifications: true,
        autoplay: true,
        privacy: 'public'
    }
};

let videos = [];
let currentVideoFile = null;
let currentPlayingVideo = null;
let giftCategories = [
    { id: 'all', name: 'Tous', icon: 'fas fa-box' },
    { id: 'popular', name: 'Populaires', icon: 'fas fa-fire' },
    { id: 'luxury', name: 'Luxe', icon: 'fas fa-crown' },
    { id: 'funny', name: 'Drôles', icon: 'fas fa-laugh' },
    { id: 'love', name: 'Amour', icon: 'fas fa-heart' }
];

let gifts = [
    { id: 'gift1', name: 'Rose', icon: 'fas fa-rose', price: 10, coins: 10, category: 'love', description: 'Envoie une rose virtuelle' },
    { id: 'gift2', name: 'Ferrari', icon: 'fas fa-car', price: 100, coins: 100, category: 'luxury', description: 'Voiture de sport virtuelle' },
    { id: 'gift3', name: 'Couronne', icon: 'fas fa-crown', price: 50, coins: 50, category: 'luxury', description: 'Couronne royale virtuelle' },
    { id: 'gift4', name: 'Rocket', icon: 'fas fa-rocket', price: 200, coins: 200, category: 'popular', description: 'Fusée virtuelle' },
    { id: 'gift5', name: 'Balloon', icon: 'fas fa-balloon', price: 20, coins: 20, category: 'funny', description: 'Ballon festif' },
    { id: 'gift6', name: 'Diamond', icon: 'fas fa-gem', price: 150, coins: 150, category: 'luxury', description: 'Diamant précieux' },
    { id: 'gift7', name: 'Pizza', icon: 'fas fa-pizza-slice', price: 30, coins: 30, category: 'funny', description: 'Pizza délicieuse' },
    { id: 'gift8', name: 'Super Like', icon: 'fas fa-star', price: 80, coins: 80, category: 'popular', description: 'Super like spécial' }
];

let comments = {};
let transactions = [];
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];

// ==================== VARIABLES POUR GITHUB STORAGE ====================
let githubStorage = null;
let localCache = null;
let isGitHubInitialized = false;

// ==================== VARIABLES POUR LES NOUVELLES FONCTIONNALITÉS ====================
let cameraStream = null;
let recordingTimer = null;
let recordingSeconds = 0;
let liveStream = null;
let liveViewers = 0;
let liveChat = [];
let liveInterval = null;
let isLive = false;
let isUsingCamera = false;
let liveMessages = [];
let liveStreamActive = false;

// ==================== FONCTIONS UTILITAIRES ====================
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' h';
    if (seconds < 2592000) return Math.floor(seconds / 86400) + ' j';
    if (seconds < 31536000) return Math.floor(seconds / 2592000) + ' mois';
    return Math.floor(seconds / 31536000) + ' an';
}

function extractHashtags(text) {
    const hashtags = text.match(/#[\wÀ-ÿ]+/g);
    return hashtags ? hashtags.slice(0, 5) : [];
}

function generateThumbnail() {
    const thumbnails = [
        'https://images.unsplash.com/photo-1611605698335-8b1569810432?ixlib=rb-4.0.3&auto=format&fit=crop&w=1074&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=1068&q=80',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=1065&q=80'
    ];
    return thumbnails[Math.floor(Math.random() * thumbnails.length)];
}

function formatFileSize(bytes) {
    if (bytes >= 1000000) {
        return (bytes / 1000000).toFixed(1) + ' MB';
    }
    if (bytes >= 1000) {
        return (bytes / 1000).toFixed(1) + ' KB';
    }
    return bytes + ' B';
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Simuler le chargement
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        initializeApp();
    }, 1500);
});

async function initializeApp() {
    console.log('Initialisation de l\'application...');
    
    try {
        // Vérifier si GitHub Storage est disponible
        if (typeof GitHubStorage !== 'undefined') {
            await initializeGitHubStorage();
        } else {
            console.warn('GitHubStorage non disponible, utilisation du cache local');
            await initializeWithLocalStorage();
        }
        
        setupEventListeners();
        await renderVideoFeed();
        updateUI();
        initializeNewFeatures();
        initializeLiveFeatures();
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        
        console.log('Application initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement des données', 'error');
        await initializeWithLocalStorage();
    }
}

async function initializeGitHubStorage() {
    try {
        // Configuration GitHub
        const config = {
            owner: 'TON_USERNAME_GITHUB', // À remplacer
            repo: 'tiktok-data', // À remplacer
            token: 'TON_TOKEN_GITHUB', // À remplacer
            branch: 'main'
        };
        
        // Initialiser le cache local
        localCache = new LocalCache();
        
        // Initialiser le stockage GitHub
        githubStorage = new GitHubStorage(config);
        
        // Vérifier la connexion
        const test = await githubStorage.readFile('data/videos/index.json');
        if (test) {
            console.log('✅ Connexion GitHub Storage réussie');
            isGitHubInitialized = true;
        }
        
        // Charger les vidéos
        await loadVideosFromGitHub();
        
        // Charger l'utilisateur
        await loadCurrentUser();
        
    } catch (error) {
        console.error('Erreur initialisation GitHub:', error);
        throw error;
    }
}

async function initializeWithLocalStorage() {
    console.log('Utilisation du localStorage comme fallback');
    isGitHubInitialized = false;
    
    // Initialiser le cache local
    localCache = new LocalCache();
    
    // Charger depuis localStorage
    await loadDataFromStorage();
}

async function loadVideosFromGitHub() {
    try {
        const videoIndex = await githubStorage.readFile('data/videos/index.json');
        if (videoIndex && videoIndex.videos) {
            videos = videoIndex.videos;
            console.log(`✅ ${videos.length} vidéos chargées depuis GitHub`);
        } else {
            console.log('Aucune vidéo trouvée, initialisation avec vidéos de démo');
            videos = getDemoVideos();
            await saveVideosToGitHub();
        }
    } catch (error) {
        console.error('Erreur chargement vidéos GitHub:', error);
        videos = getDemoVideos();
    }
}

async function loadCurrentUser() {
    try {
        const userId = localStorage.getItem('tiktak_current_user_id') || 'user_1';
        const userData = await githubStorage.readFile(`data/users/${userId}.json`);
        
        if (userData) {
            currentUser = userData;
            console.log('✅ Utilisateur chargé depuis GitHub:', currentUser.username);
        } else {
            // Créer un nouvel utilisateur
            await createNewUser();
        }
    } catch (error) {
        console.error('Erreur chargement utilisateur:', error);
        await loadDataFromStorage();
    }
}

async function createNewUser() {
    const userId = 'user_' + Date.now();
    const userData = {
        id: userId,
        profile: {
            username: 'Utilisateur TIKTAK',
            display_name: 'Utilisateur TIKTAK',
            bio: '',
            avatar_url: 'https://randomuser.me/api/portraits/lego/1.jpg',
            join_date: new Date().toISOString(),
            verified: false
        },
        stats: {
            total_videos: 0,
            total_likes: 0,
            total_followers: 0,
            total_following: 0,
            total_views: 0
        },
        preferences: {
            language: 'fr',
            theme: 'dark',
            autoplay: true,
            notifications: true
        },
        privacy: {
            account_private: false,
            show_online_status: true
        },
        likedVideos: [],
        myVideos: [],
        drafts: [],
        following: [],
        followers: [],
        notifications: [],
        coins: 100
    };
    
    try {
        await githubStorage.writeFile(`data/users/${userId}.json`, userData, 'Création nouvel utilisateur');
        currentUser = userData;
        localStorage.setItem('tiktak_current_user_id', userId);
        console.log('✅ Nouvel utilisateur créé:', userId);
    } catch (error) {
        console.error('Erreur création utilisateur:', error);
    }
}

function getDemoVideos() {
    return [
        {
            id: '1',
            userId: 'user_2',
            username: 'Créateur Pro',
            avatar: 'https://randomuser.me/api/portraits/lego/2.jpg',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80',
            caption: 'Découvrez les merveilles de la nature ! 🌿 #nature #beauté',
            likes: 2450,
            comments: 128,
            shares: 45,
            views: 15000,
            timestamp: Date.now() - 3600000,
            isMonetized: true,
            gifts: 12,
            hashtags: ['#nature', '#beauté', '#découverte'],
            duration: '00:15',
            privacy: 'public'
        },
        {
            id: '2',
            userId: 'user_3',
            username: 'Artiste Digital',
            avatar: 'https://randomuser.me/api/portraits/lego/3.jpg',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1068&q=80',
            caption: 'Création artistique en temps réel 🎨 #art #digital',
            likes: 3800,
            comments: 256,
            shares: 89,
            views: 28000,
            timestamp: Date.now() - 7200000,
            isMonetized: false,
            gifts: 8,
            hashtags: ['#art', '#digital', '#création'],
            duration: '00:30',
            privacy: 'public'
        }
    ];
}

// ==================== FONCTIONS DE SAUVEGARDE ====================
async function saveVideosToGitHub() {
    if (!isGitHubInitialized || !githubStorage) return;
    
    try {
        const videoIndex = {
            last_updated: new Date().toISOString(),
            total_videos: videos.length,
            videos: videos
        };
        
        await githubStorage.writeFile('data/videos/index.json', videoIndex, 'Mise à jour des vidéos');
        console.log('✅ Vidéos sauvegardées sur GitHub');
    } catch (error) {
        console.error('Erreur sauvegarde vidéos:', error);
        saveVideosToLocalStorage();
    }
}

async function saveCurrentUserToGitHub() {
    if (!isGitHubInitialized || !githubStorage || !currentUser.id) return;
    
    try {
        await githubStorage.writeFile(`data/users/${currentUser.id}.json`, currentUser, 'Mise à jour utilisateur');
        console.log('✅ Utilisateur sauvegardé sur GitHub');
    } catch (error) {
        console.error('Erreur sauvegarde utilisateur:', error);
        saveUserDataToLocalStorage();
    }
}

function saveVideosToLocalStorage() {
    localStorage.setItem('tiktak_videos', JSON.stringify(videos));
}

function saveUserDataToLocalStorage() {
    localStorage.setItem('tiktak_user', JSON.stringify(currentUser));
}

async function loadDataFromStorage() {
    // Charger les vidéos
    const savedVideos = localStorage.getItem('tiktak_videos');
    videos = savedVideos ? JSON.parse(savedVideos) : getDemoVideos();
    
    // Charger l'utilisateur
    const savedUser = localStorage.getItem('tiktak_user');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        currentUser = { ...currentUser, ...parsedUser };
    }
    
    // Charger les commentaires
    const savedComments = localStorage.getItem('tiktak_comments');
    comments = savedComments ? JSON.parse(savedComments) : {};
    
    // Charger les transactions
    const savedTransactions = localStorage.getItem('tiktak_transactions');
    transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
}

// ==================== GESTION DES VIDÉOS ====================
async function renderVideoFeed() {
    const videoFeed = document.getElementById('videoFeed');
    videoFeed.innerHTML = '';
    
    if (videos.length === 0) {
        videoFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <h3>Aucune vidéo disponible</h3>
                <p>Soyez le premier à créer du contenu !</p>
                <button class="btn btn-primary" onclick="openCreateModal()">
                    Créer une vidéo
                </button>
            </div>
        `;
        return;
    }
    
    videos.forEach(video => {
        videoFeed.appendChild(createVideoElement(video));
    });
    
    // Initialiser la lecture automatique si activée
    if (currentUser.settings?.autoplay) {
        const firstVideo = document.querySelector('.video-container video');
        if (firstVideo) {
            firstVideo.muted = true;
            firstVideo.play().catch(e => console.log('Auto-play prevented'));
        }
    }
}

function createVideoElement(video) {
    const isLiked = currentUser.likedVideos?.includes(video.id) || false;
    const timeAgo = getTimeAgo(video.timestamp);
    const isFollowing = currentUser.following?.includes(video.userId) || false;
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    container.innerHTML = `
        <video 
            src="${video.videoUrl}" 
            poster="${video.thumbnail}"
            preload="metadata"
            onclick="toggleVideoPlay(this)"
            loop
        ></video>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${video.avatar}" alt="${video.username}" onclick="openCreatorProfile('${video.userId}')">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4>${video.username}</h4>
                        ${isFollowing ? '<span class="following-badge">Abonné</span>' : ''}
                    </div>
                    <p class="video-caption">${video.caption}</p>
                    <div class="hashtags">
                        ${video.hashtags ? video.hashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('') : ''}
                    </div>
                    ${video.isMonetized ? '<span class="monetization-badge"><i class="fas fa-coins"></i> Monétisé</span>' : ''}
                </div>
                <button class="btn btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${video.userId}', this)">
                    ${isFollowing ? '<i class="fas fa-check"></i> Abonné' : '<i class="fas fa-plus"></i> Suivre'}
                </button>
            </div>
            
            <div class="video-stats">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views)} vues
                </div>
                <div class="video-details">
                    <span class="duration">${video.duration || '00:15'}</span>
                    <span class="time-ago">${timeAgo}</span>
                </div>
            </div>
        </div>
        
        <div class="video-actions">
            <div class="action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${video.id}')">
                <i class="fas fa-heart"></i>
                <span>${formatNumber(video.likes)}</span>
            </div>
            
            <div class="action" onclick="openCommentsModal('${video.id}')">
                <i class="fas fa-comment"></i>
                <span>${formatNumber(video.comments)}</span>
            </div>
            
            <div class="action" onclick="shareVideo('${video.id}')">
                <i class="fas fa-share"></i>
                <span>${formatNumber(video.shares)}</span>
            </div>
            
            <div class="action" onclick="openGiftShop('${video.id}')">
                <i class="fas fa-gift"></i>
                <span>${formatNumber(video.gifts || 0)}</span>
            </div>
            
            <div class="action" onclick="saveVideo('${video.id}')">
                <i class="fas fa-bookmark"></i>
                <span>Enregistrer</span>
            </div>
        </div>
        
        <button class="manual-play-btn" onclick="toggleVideoPlay(this.previousElementSibling.previousElementSibling)">
            <i class="fas fa-play"></i>
        </button>
    `;
    
    return container;
}

function toggleVideoPlay(videoElement) {
    const container = videoElement.closest('.video-container');
    const playBtn = container.querySelector('.manual-play-btn');
    
    if (videoElement.paused) {
        // Arrêter la vidéo en cours de lecture
        if (currentPlayingVideo && currentPlayingVideo !== videoElement) {
            currentPlayingVideo.pause();
            const prevPlayBtn = currentPlayingVideo.closest('.video-container').querySelector('.manual-play-btn');
            if (prevPlayBtn) prevPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        videoElement.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        currentPlayingVideo = videoElement;
        
        // Incrémenter les vues
        const videoId = container.dataset.videoId;
        incrementViews(videoId);
    } else {
        videoElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingVideo = null;
    }
}

async function incrementViews(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
        videos[videoIndex].views++;
        
        // Sauvegarder
        if (isGitHubInitialized) {
            await saveVideosToGitHub();
        } else {
            saveVideosToLocalStorage();
        }
        
        // Mettre à jour l'UI
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        if (container) {
            const viewCount = container.querySelector('.view-count');
            viewCount.innerHTML = `<i class="fas fa-eye"></i> ${formatNumber(videos[videoIndex].views)} vues`;
        }
    }
}

// ==================== INTERACTIONS SOCIALES ====================
async function toggleLike(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) return;
    
    const video = videos[videoIndex];
    const userLikedIndex = currentUser.likedVideos?.indexOf(videoId) || -1;
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    
    if (userLikedIndex === -1) {
        // Ajouter le like
        video.likes++;
        if (!currentUser.likedVideos) currentUser.likedVideos = [];
        currentUser.likedVideos.push(videoId);
        
        // Animation de cœur
        showHeartAnimation();
        showNotification('Vidéo aimée ! ❤️', 'success');
        
        // Ajouter une notification au créateur
        if (video.userId !== currentUser.id) {
            await addNotification(video.userId, {
                id: 'notif_' + Date.now(),
                type: 'like',
                fromUserId: currentUser.id,
                fromUsername: currentUser.username,
                videoId: videoId,
                message: `${currentUser.username} a aimé votre vidéo`,
                timestamp: Date.now(),
                read: false
            });
        }
    } else {
        // Retirer le like
        video.likes--;
        currentUser.likedVideos.splice(userLikedIndex, 1);
        showNotification('Like retiré', 'info');
    }
    
    // Sauvegarder
    if (isGitHubInitialized) {
        await saveVideosToGitHub();
        await saveCurrentUserToGitHub();
    } else {
        saveVideosToLocalStorage();
        saveUserDataToLocalStorage();
    }
    
    // Mettre à jour l'UI
    if (container) {
        const likeElement = container.querySelector('.action:nth-child(1)');
        likeElement.className = `action ${userLikedIndex === -1 ? 'liked' : ''}`;
        likeElement.querySelector('span').textContent = formatNumber(video.likes);
    }
}

async function toggleFollow(userId, buttonElement) {
    const userIndex = currentUser.following?.indexOf(userId) || -1;
    
    if (userIndex === -1) {
        // Suivre
        if (!currentUser.following) currentUser.following = [];
        currentUser.following.push(userId);
        buttonElement.innerHTML = '<i class="fas fa-check"></i> Abonné';
        buttonElement.classList.add('following');
        showNotification('Utilisateur suivi !', 'success');
        
        // Ajouter une notification
        await addNotification(userId, {
            id: 'notif_' + Date.now(),
            type: 'follow',
            fromUserId: currentUser.id,
            fromUsername: currentUser.username,
            message: `${currentUser.username} vous a suivi`,
            timestamp: Date.now(),
            read: false
        });
    } else {
        // Se désabonner
        currentUser.following.splice(userIndex, 1);
        buttonElement.innerHTML = '<i class="fas fa-plus"></i> Suivre';
        buttonElement.classList.remove('following');
        showNotification('Abonnement annulé', 'info');
    }
    
    // Sauvegarder
    if (isGitHubInitialized) {
        await saveCurrentUserToGitHub();
    } else {
        saveUserDataToLocalStorage();
    }
}

function shareVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    if (navigator.share) {
        navigator.share({
            title: video.caption,
            text: 'Regarde cette vidéo sur TIKTAK!',
            url: window.location.href + '?video=' + videoId
        }).then(async () => {
            video.shares++;
            if (isGitHubInitialized) {
                await saveVideosToGitHub();
            } else {
                saveVideosToLocalStorage();
            }
            updateVideoStats(videoId);
            showNotification('Vidéo partagée ! 📤', 'success');
        });
    } else {
        // Fallback pour les navigateurs qui ne supportent pas Web Share API
        navigator.clipboard.writeText(window.location.href + '?video=' + videoId).then(async () => {
            video.shares++;
            if (isGitHubInitialized) {
                await saveVideosToGitHub();
            } else {
                saveVideosToLocalStorage();
            }
            updateVideoStats(videoId);
            showNotification('Lien copié dans le presse-papier ! 📋', 'success');
        });
    }
}

async function saveVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Ajouter aux favoris de l'utilisateur
    if (!currentUser.myVideos?.includes(videoId)) {
        if (!currentUser.myVideos) currentUser.myVideos = [];
        currentUser.myVideos.push(videoId);
        
        if (isGitHubInitialized) {
            await saveCurrentUserToGitHub();
        } else {
            saveUserDataToLocalStorage();
        }
        
        showNotification('Vidéo enregistrée dans vos favoris ! ⭐', 'success');
    } else {
        showNotification('Vidéo déjà enregistrée', 'info');
    }
}

// ==================== CRÉATION DE VIDÉO ====================
function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    dispatchEvent(new CustomEvent('modalOpen'));
    
    // Afficher les options de création
    showCreateOptions();
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetCreateModal();
}

function openFilePicker() {
    document.getElementById('videoInput').click();
}

function setupVideoInput() {
    const videoInput = document.getElementById('videoInput');
    
    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            processVideoFile(file);
        }
    });
}

function processVideoFile(file) {
    // Validation du fichier
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
        showNotification('La vidéo est trop volumineuse (max 100MB)', 'error');
        return;
    }
    
    if (!file.type.startsWith('video/')) {
        showNotification('Veuillez sélectionner un fichier vidéo valide', 'error');
        return;
    }
    
    currentVideoFile = file;
    const reader = new FileReader();
    
    // Afficher l'indicateur de traitement
    document.getElementById('videoProcessing').style.display = 'flex';
    
    reader.onload = function(e) {
        const videoElement = document.getElementById('previewVideo');
        const placeholder = document.querySelector('.preview-placeholder');
        
        videoElement.src = e.target.result;
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Simuler le traitement
        setTimeout(() => {
            document.getElementById('videoProcessing').style.display = 'none';
            videoElement.load();
            
            // Lorsque la vidéo est chargée, obtenir sa durée
            videoElement.onloadedmetadata = function() {
                const duration = videoElement.duration;
                document.getElementById('videoFileInfo').innerHTML += 
                    `<div class="duration-info">Durée: ${formatDuration(duration)}</div>`;
            };
        }, 2000);
        
        // Mettre à jour les informations du fichier
        document.getElementById('videoFileInfo').innerHTML = `
            <i class="fas fa-file-video"></i>
            <span>${file.name} (${formatFileSize(file.size)})</span>
        `;
        
        // Activer le bouton de publication
        document.getElementById('publishBtn').disabled = false;
    };
    
    reader.readAsDataURL(file);
}

function simulateRecording() {
    showNotification('Utilisation d\'une vidéo de démo 📹', 'info');
    
    const demoVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    
    videoElement.src = demoVideoUrl;
    videoElement.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Simuler un fichier
    currentVideoFile = {
        name: 'video_demo.mp4',
        size: 15300000,
        type: 'video/mp4'
    };
    
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>video_demo.mp4 (15.3 MB)</span>
        <div class="duration-info">Durée: 00:15</div>
    `;
    
    // Activer le bouton de publication
    document.getElementById('publishBtn').disabled = false;
}

async function publishVideo() {
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!currentVideoFile && !document.getElementById('previewVideo').src) {
        showNotification('Veuillez sélectionner une vidéo', 'error');
        return;
    }
    
    if (caption.length < 2) {
        showNotification('Veuillez ajouter une légende', 'error');
        return;
    }
    
    if (privacy === 'draft') {
        saveAsDraft(caption, isMonetized);
        return;
    }
    
    // Désactiver le bouton pendant la publication
    const publishBtn = document.getElementById('publishBtn');
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    // Extraire les hashtags de la légende
    const hashtags = extractHashtags(caption);
    
    // Simuler le processus de publication
    setTimeout(async () => {
        const videoUrl = document.getElementById('previewVideo').src || 
                        URL.createObjectURL(currentVideoFile) || 
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
        
        const newVideo = {
            id: 'video_' + Date.now(),
            userId: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
            videoUrl: videoUrl,
            thumbnail: generateThumbnail(),
            caption: caption,
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            timestamp: Date.now(),
            isMonetized: isMonetized,
            gifts: 0,
            hashtags: hashtags,
            duration: '00:15',
            privacy: privacy
        };
        
        // Ajouter en premier pour l'apparition en haut du feed
        videos.unshift(newVideo);
        
        if (!currentUser.myVideos) currentUser.myVideos = [];
        currentUser.myVideos.push(newVideo.id);
        
        // Sauvegarder
        if (isGitHubInitialized) {
            try {
                // Ajouter la vidéo à GitHub
                const videoId = await githubStorage.addVideo({
                    title: caption,
                    description: caption,
                    user_id: currentUser.id,
                    video_url: videoUrl,
                    thumbnail_url: generateThumbnail(),
                    hashtags: hashtags,
                    category: 'general'
                });
                
                newVideo.id = videoId;
                await saveVideosToGitHub();
                await saveCurrentUserToGitHub();
            } catch (error) {
                console.error('Erreur sauvegarde GitHub:', error);
                saveVideosToLocalStorage();
                saveUserDataToLocalStorage();
            }
        } else {
            saveVideosToLocalStorage();
            saveUserDataToLocalStorage();
        }
        
        renderVideoFeed();
        closeCreateModal();
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        
        // Réactiver le bouton
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        
        // Ajouter une transaction si monétisée
        if (isMonetized) {
            addTransaction({
                id: 'trans_' + Date.now(),
                type: 'video_upload',
                amount: 10,
                description: 'Gains vidéo monétisée',
                timestamp: Date.now()
            });
        }
    }, 2000);
}

function saveAsDraft(caption, isMonetized) {
    const draft = {
        id: 'draft_' + Date.now(),
        caption: caption || 'Sans titre',
        date: new Date().toLocaleDateString('fr-FR'),
        hasVideo: !!currentVideoFile,
        isMonetized: isMonetized,
        timestamp: Date.now()
    };
    
    if (!currentUser.drafts) currentUser.drafts = [];
    currentUser.drafts.push(draft);
    
    if (isGitHubInitialized) {
        saveCurrentUserToGitHub();
    } else {
        saveUserDataToLocalStorage();
    }
    
    showNotification('Brouillon sauvegardé 📁', 'success');
    closeCreateModal();
}

function resetCreateModal() {
    document.getElementById('videoCaption').value = '';
    document.getElementById('monetizeVideo').checked = false;
    document.getElementById('videoPrivacy').value = 'public';
    document.getElementById('previewVideo').src = '';
    document.getElementById('previewVideo').style.display = 'none';
    document.querySelector('.preview-placeholder').style.display = 'flex';
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>Aucun fichier sélectionné</span>
    `;
    currentVideoFile = null;
    
    // Réinitialiser le bouton d'enregistrement si nécessaire
    if (isRecording) {
        stopRecording();
    }
    
    // Arrêter la caméra si elle est active
    stopCamera();
    
    // Masquer les options de création
    document.getElementById('createOptions').style.display = 'flex';
    document.getElementById('videoUploadSection').style.display = 'none';
}

// ==================== FONCTIONS LIVE STREAMING ====================
function openLiveStream() {
    document.getElementById('liveModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    dispatchEvent(new CustomEvent('modalOpen'));
}

function closeLiveModal() {
    document.getElementById('liveModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ==================== PROFIL UTILISATEUR ====================
function openProfile() {
    loadProfileData();
    document.getElementById('profileModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    dispatchEvent(new CustomEvent('modalOpen'));
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function loadProfileData() {
    // Mettre à jour les informations de base
    document.getElementById('profileUsername').textContent = currentUser.username || 'Utilisateur TIKTAK';
    document.getElementById('profileCoins').textContent = currentUser.coins || 100;
    document.getElementById('profileAvatar').src = currentUser.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    // Calculer les statistiques
    const userVideos = videos.filter(v => v.userId === currentUser.id);
    const stats = `${userVideos.length} vidéos • ${currentUser.followers?.length || 0} abonnés • ${currentUser.following?.length || 0} abonnements`;
    document.getElementById('profileStats').textContent = stats;
    
    // Afficher l'onglet par défaut
    showProfileTab('videos');
}

// ==================== PARAMÈTRES ====================
function openSettings() {
    loadSettings();
    document.getElementById('settingsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    dispatchEvent(new CustomEvent('modalOpen'));
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function loadSettings() {
    document.getElementById('settingsUsername').value = currentUser.username || 'Utilisateur TIKTAK';
    document.getElementById('settingsEmail').value = currentUser.email || 'user@tiktak.demo';
    document.getElementById('settingsNotifications').checked = currentUser.settings?.notifications || true;
    document.getElementById('settingsAutoplay').checked = currentUser.settings?.autoplay || true;
}

async function saveSettings() {
    const newUsername = document.getElementById('settingsUsername').value.trim();
    const newEmail = document.getElementById('settingsEmail').value.trim();
    
    if (newUsername && newUsername !== currentUser.username) {
        currentUser.username = newUsername;
        
        // Mettre à jour le nom dans toutes les vidéos
        videos.forEach(video => {
            if (video.userId === currentUser.id) {
                video.username = newUsername;
            }
        });
        
        if (isGitHubInitialized) {
            await saveVideosToGitHub();
        } else {
            saveVideosToLocalStorage();
        }
    }
    
    if (newEmail) {
        currentUser.email = newEmail;
    }
    
    currentUser.settings = currentUser.settings || {};
    currentUser.settings.notifications = document.getElementById('settingsNotifications').checked;
    currentUser.settings.autoplay = document.getElementById('settingsAutoplay').checked;
    
    if (isGitHubInitialized) {
        await saveCurrentUserToGitHub();
    } else {
        saveUserDataToLocalStorage();
    }
    
    showNotification('Paramètres sauvegardés ✅', 'success');
    
    // Mettre à jour l'UI
    updateUI();
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

async function addNotification(userId, notification) {
    // Dans une application réelle, cette fonction enverrait la notification au serveur
    // Pour la démo, nous l'ajoutons simplement à l'utilisateur actuel si c'est lui
    if (userId === currentUser.id) {
        if (!currentUser.notifications) currentUser.notifications = [];
        currentUser.notifications.unshift(notification);
        
        if (isGitHubInitialized) {
            await saveCurrentUserToGitHub();
        } else {
            saveUserDataToLocalStorage();
        }
        
        // Mettre à jour le badge de notifications
        updateNotificationBadge();
    }
}

// ==================== MISE À JOUR DE L'INTERFACE ====================
function updateUI() {
    // Mettre à jour le solde de coins
    document.getElementById('coinCount').textContent = currentUser.coins || 100;
    document.getElementById('coinBalance').title = `${currentUser.coins || 100} coins disponibles`;
    
    // Mettre à jour l'avatar utilisateur
    document.getElementById('userAvatar').src = currentUser.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    // Mettre à jour le badge de notifications
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const unreadCount = currentUser.notifications?.filter(n => !n.read).length || 0;
    const badge = document.querySelector('.notification-badge');
    
    if (unreadCount > 0) {
        if (!badge) {
            const bell = document.querySelector('.nav-item:nth-child(4)');
            if (bell) {
                const newBadge = document.createElement('span');
                newBadge.className = 'notification-badge';
                newBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                bell.appendChild(newBadge);
            }
        } else {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        }
    } else if (badge) {
        badge.remove();
    }
}

function updateVideoStats(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;
    
    // Mettre à jour les likes
    const likeElement = container.querySelector('.action:nth-child(1)');
    if (likeElement) {
        likeElement.querySelector('span').textContent = formatNumber(video.likes);
    }
    
    // Mettre à jour les commentaires
    const commentElement = container.querySelector('.action:nth-child(2)');
    if (commentElement) {
        commentElement.querySelector('span').textContent = formatNumber(video.comments);
    }
    
    // Mettre à jour les partages
    const shareElement = container.querySelector('.action:nth-child(3)');
    if (shareElement) {
        shareElement.querySelector('span').textContent = formatNumber(video.shares);
    }
    
    // Mettre à jour les cadeaux
    const giftElement = container.querySelector('.action:nth-child(4)');
    if (giftElement) {
        giftElement.querySelector('span').textContent = formatNumber(video.gifts || 0);
    }
}

// ==================== NAVIGATION ====================
function showHome() {
    showNotification('Accueil', 'info');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    renderVideoFeed();
}

function toggleUserMenu() {
    const menu = document.getElementById('userDropdown');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// ==================== FONCTIONS RESTANTES (simplifiées pour GitHub Storage) ====================
function showHeartAnimation() {
    const heart = document.createElement('div');
    heart.innerHTML = '<i class="fas fa-heart"></i>';
    heart.style.position = 'fixed';
    heart.style.top = '50%';
    heart.style.left = '50%';
    heart.style.transform = 'translate(-50%, -50%)';
    heart.style.fontSize = '100px';
    heart.style.color = '#ff4757';
    heart.style.zIndex = '9999';
    heart.style.pointerEvents = 'none';
    heart.style.opacity = '0.8';
    heart.style.animation = 'heartPulse 1s ease-out forwards';
    
    document.body.appendChild(heart);
    
    setTimeout(() => {
        heart.remove();
    }, 1000);
}

function showCreateOptions() {
    document.getElementById('createOptions').style.display = 'flex';
    document.getElementById('videoUploadSection').style.display = 'none';
}

function openUploadSection() {
    document.getElementById('createOptions').style.display = 'none';
    document.getElementById('videoUploadSection').style.display = 'block';
}

function openCameraForRecording() {
    openUploadSection();
    isUsingCamera = true;
    document.getElementById('cameraControls').style.display = 'flex';
    document.getElementById('fileUploadControls').style.display = 'none';
}

function openFileUpload() {
    openUploadSection();
    isUsingCamera = false;
    document.getElementById('cameraControls').style.display = 'none';
    document.getElementById('fileUploadControls').style.display = 'flex';
}

function clearLocalStorage() {
    if (confirm('Voulez-vous vraiment réinitialiser toutes les données locales ? Cette action est irréversible.')) {
        localStorage.clear();
        location.reload();
    }
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        showNotification('Déconnexion...', 'info');
        setTimeout(() => {
            localStorage.removeItem('tiktak_current_user_id');
            location.reload();
        }, 1000);
    }
}

// ==================== ÉCOUTEURS D'ÉVÉNEMENTS ====================
function setupEventListeners() {
    // Recherche
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
            this.value = '';
        }
    });
    
    document.querySelector('.search-btn').addEventListener('click', function() {
        const searchInput = document.getElementById('searchInput');
        performSearch(searchInput.value);
        searchInput.value = '';
    });
    
    // Input vidéo
    setupVideoInput();
    
    // Fermer les modales avec Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeCreateModal();
            closeProfile();
            closeSettings();
            closeLiveModal();
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
            document.body.style.overflow = 'auto';
        }
    });
    
    // Fermer les modales en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('userDropdown');
        const userMenu = document.querySelector('.user-menu');
        if (menu && menu.style.display === 'block' && !userMenu.contains(event.target) && !menu.contains(event.target)) {
            menu.style.display = 'none';
        }
        
        const modals = ['createModal', 'profileModal', 'settingsModal', 'liveModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.style.display === 'flex' && event.target === modal) {
                if (modalId === 'createModal') closeCreateModal();
                if (modalId === 'profileModal') closeProfile();
                if (modalId === 'settingsModal') closeSettings();
                if (modalId === 'liveModal') closeLiveModal();
            }
        });
    });
    
    // Navigation mobile
    document.querySelectorAll('.bottom-nav .nav-item').forEach((item, index) => {
        item.addEventListener('click', function(e) {
            document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function performSearch(query) {
    if (!query.trim()) {
        showNotification('Veuillez entrer un terme de recherche', 'info');
        return;
    }
    
    const results = videos.filter(video => 
        video.caption.toLowerCase().includes(query.toLowerCase()) ||
        video.username.toLowerCase().includes(query.toLowerCase()) ||
        (video.hashtags && video.hashtags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
    
    const videoFeed = document.getElementById('videoFeed');
    videoFeed.innerHTML = '';
    
    if (results.length === 0) {
        videoFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Aucun résultat</h3>
                <p>Aucune vidéo ne correspond à "${query}"</p>
                <button class="btn btn-primary" onclick="showHome()">
                    Retour à l'accueil
                </button>
            </div>
        `;
    } else {
        results.forEach(video => {
            videoFeed.appendChild(createVideoElement(video));
        });
    }
    
    showNotification(`${results.length} résultat(s) pour "${query}"`, 'success');
}

// ==================== FONCTIONS D'ASSISTANCE ====================
function openSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput.style.display === 'none' || searchInput.style.display === '') {
        searchInput.style.display = 'block';
        searchInput.focus();
    } else {
        searchInput.style.display = 'none';
    }
}

function openWallet() {
    // Implémenter plus tard
    showNotification('Fonctionnalité portefeuille à venir', 'info');
}

function openNotifications() {
    showNotification('Fonctionnalité notifications à venir', 'info');
}

function showTrending() {
    showNotification('Fonctionnalité tendances à venir', 'info');
}

function showFollowing() {
    showNotification('Fonctionnalité abonnements à venir', 'info');
}

function showFavorites() {
    showNotification('Fonctionnalité favoris à venir', 'info');
}

function showMyVideos() {
    showNotification('Fonctionnalité mes vidéos à venir', 'info');
}

function showProfileTab(tabName) {
    showNotification(`Onglet ${tabName} à venir`, 'info');
}

function openCreatorProfile(userId) {
    showNotification('Profil créateur à venir', 'info');
}

function openGiftShop(videoId) {
    showNotification('Boutique de cadeaux à venir', 'info');
}

function openCommentsModal(videoId) {
    showNotification('Commentaires à venir', 'info');
}

function changeProfilePicture() {
    showNotification('Changer photo de profil à venir', 'info');
}

function initializeNewFeatures() {
    // Fonction vide pour l'instant
}

function initializeLiveFeatures() {
    // Fonction vide pour l'instant
}

function startLiveStream() {
    showNotification('Démarrage du live à venir', 'info');
}

function stopLiveStream() {
    showNotification('Arrêt du live à venir', 'info');
}

function sendChatMessage() {
    showNotification('Chat live à venir', 'info');
}

function setupLiveStream() {
    showNotification('Configuration live à venir', 'info');
}

function startCameraForRecording() {
    showNotification('Caméra à venir', 'info');
}

function stopCameraForRecording() {
    showNotification('Arrêt caméra à venir', 'info');
}

function stopCamera() {
    // Fonction vide pour l'instant
}

function startRecording() {
    showNotification('Enregistrement à venir', 'info');
}

function stopRecording() {
    showNotification('Arrêt enregistrement à venir', 'info');
}

function addTransaction(transaction) {
    transactions.unshift(transaction);
    localStorage.setItem('tiktak_transactions', JSON.stringify(transactions));
}

// ==================== EXPORT DES FONCTIONS GLOBALES ====================
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleUserMenu = toggleUserMenu;
window.openFilePicker = openFilePicker;
window.simulateRecording = simulateRecording;
window.publishVideo = publishVideo;
window.saveAsDraft = saveAsDraft;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.toggleVideoPlay = toggleVideoPlay;
window.toggleLike = toggleLike;
window.openCommentsModal = openCommentsModal;
window.shareVideo = shareVideo;
window.openGiftShop = openGiftShop;
window.openNotifications = openNotifications;
window.openWallet = openWallet;
window.logout = logout;
window.showHome = showHome;
window.showTrending = showTrending;
window.showFollowing = showFollowing;
window.showFavorites = showFavorites;
window.openSearch = openSearch;
window.saveSettings = saveSettings;
window.clearLocalStorage = clearLocalStorage;
window.openCreatorProfile = openCreatorProfile;
window.openTransactions = function() {
    showNotification('Transactions à venir', 'info');
};
window.buyCoins = function(coins, price) {
    showNotification('Achat de coins à venir', 'info');
};
window.sendGift = function(videoId, giftId) {
    showNotification('Envoi de cadeau à venir', 'info');
};
window.toggleFollow = toggleFollow;
window.saveVideo = saveVideo;
window.openCoinShop = function() {
    showNotification('Boutique de coins à venir', 'info');
};
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
};
window.filterGifts = function(categoryId, buttonElement) {
    showNotification('Filtrage cadeaux à venir', 'info');
};
window.previewGift = function(giftId) {
    showNotification('Prévisualisation cadeau à venir', 'info');
};
window.postComment = function(videoId) {
    showNotification('Publication commentaire à venir', 'info');
};
window.likeComment = function(videoId, commentId) {
    showNotification('Like commentaire à venir', 'info');
};
window.deleteComment = function(videoId, commentId) {
    showNotification('Suppression commentaire à venir', 'info');
};
window.showProfileTab = showProfileTab;
window.editDraft = function(draftId) {
    showNotification('Édition brouillon à venir', 'info');
};
window.deleteDraft = function(draftId) {
    showNotification('Suppression brouillon à venir', 'info');
};
window.openVideoDetail = function(videoId) {
    showNotification('Détail vidéo à venir', 'info');
};
window.handleNotificationClick = function(notificationId) {
    showNotification('Notification à venir', 'info');
};
window.markAllAsRead = function() {
    showNotification('Marquer tout comme lu à venir', 'info');
};
window.clearAllNotifications = function() {
    showNotification('Supprimer toutes les notifications à venir', 'info');
};
window.changeProfilePicture = changeProfilePicture;
window.openLiveStream = openLiveStream;
window.startLiveStream = startLiveStream;
window.stopLiveStream = stopLiveStream;
window.sendChatMessage = sendChatMessage;
window.setupLiveStream = setupLiveStream;
window.startCameraRecording = startRecording;
window.stopCameraRecording = stopRecording;
window.openCameraForRecording = openCameraForRecording;
window.openFileUpload = openFileUpload;
window.startCameraForRecording = startCameraForRecording;
window.stopCameraForRecording = stopCameraForRecording;
window.closeLiveModal = closeLiveModal;
