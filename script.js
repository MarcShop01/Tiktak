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
    },
    stats: {
        totalVideos: 0,
        totalLikes: 0,
        totalFollowers: 0,
        totalFollowing: 0,
        totalViews: 0
    }
};

let videos = [];
let users = {};
let currentVideoFile = null;
let currentPlayingVideo = null;

// ==================== ALGORITHME DE RECOMMANDATION ====================
const ALGORITHM_CONFIG = {
    // Poids pour chaque facteur
    weights: {
        likes: 0.3,
        comments: 0.2,
        shares: 0.15,
        views: 0.1,
        followers: 0.15,
        recency: 0.1,
        engagement: 0.1
    },
    // Facteurs de boost
    boosts: {
        viral: 1.5,
        popular: 1.3,
        trending: 1.2,
        following: 2.0,
        monetized: 1.1
    }
};

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

// ==================== ALGORITHME DE SCORING ====================
function calculateVideoScore(video, userData = {}) {
    let score = 0;
    const breakdown = {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        followers: 0,
        recency: 0,
        engagement: 0,
        boosts: []
    };
    
    // Score de base basé sur les interactions
    const maxLikes = Math.max(...videos.map(v => v.likes)) || 1;
    const maxComments = Math.max(...videos.map(v => v.comments)) || 1;
    const maxShares = Math.max(...videos.map(v => v.shares)) || 1;
    const maxViews = Math.max(...videos.map(v => v.views)) || 1;
    
    // Normalisation des valeurs
    breakdown.likes = (video.likes / maxLikes) * 100 * ALGORITHM_CONFIG.weights.likes;
    breakdown.comments = (video.comments / maxComments) * 100 * ALGORITHM_CONFIG.weights.comments;
    breakdown.shares = (video.shares / maxShares) * 100 * ALGORITHM_CONFIG.weights.shares;
    breakdown.views = (video.views / maxViews) * 100 * ALGORITHM_CONFIG.weights.views;
    
    // Score des followers (utilisateur qui a posté)
    const userFollowers = users[video.userId]?.followers || 0;
    const maxFollowers = Math.max(...Object.values(users).map(u => u.followers || 0)) || 1;
    breakdown.followers = (userFollowers / maxFollowers) * 100 * ALGORITHM_CONFIG.weights.followers;
    
    // Récence (vidéos récentes boostées)
    const hoursSinceUpload = (Date.now() - video.timestamp) / (1000 * 60 * 60);
    breakdown.recency = Math.max(0, 100 - (hoursSinceUpload * 2)) * ALGORITHM_CONFIG.weights.recency;
    
    // Taux d'engagement (likes/views * 100)
    const engagementRate = video.views > 0 ? (video.likes / video.views) * 100 : 0;
    breakdown.engagement = engagementRate * ALGORITHM_CONFIG.weights.engagement;
    
    // Calcul du score total
    score = Object.values(breakdown).reduce((sum, val) => {
        if (typeof val === 'number') return sum + val;
        return sum;
    }, 0);
    
    // Boosts additionnels
    let boostMultiplier = 1;
    
    // Boost pour vidéo virale
    if (video.likes > 1000 || video.shares > 100) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.viral;
        breakdown.boosts.push('VIRAL');
    }
    
    // Boost pour utilisateur populaire
    if (userFollowers > 1000) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.popular;
        breakdown.boosts.push('POPULAIRE');
    }
    
    // Boost si la vidéo est en tendance
    const trendThreshold = Date.now() - (24 * 60 * 60 * 1000); // 24h
    if (video.timestamp > trendThreshold && video.likes > 100) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.trending;
        breakdown.boosts.push('TENDANCE');
    }
    
    // Boost si l'utilisateur suit le créateur
    if (currentUser.following?.includes(video.userId)) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.following;
        breakdown.boosts.push('ABONNÉ');
    }
    
    // Boost pour vidéo monétisée
    if (video.isMonetized) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.monetized;
        breakdown.boosts.push('MONÉTISÉ');
    }
    
    // Appliquer le boost
    score *= boostMultiplier;
    
    return {
        score: Math.round(score),
        breakdown: breakdown,
        boostMultiplier: boostMultiplier
    };
}

function sortVideosByAlgorithm() {
    // Calculer le score pour chaque vidéo
    const scoredVideos = videos.map(video => {
        const scoreData = calculateVideoScore(video);
        return {
            ...video,
            score: scoreData.score,
            scoreData: scoreData
        };
    });
    
    // Trier par score décroissant
    scoredVideos.sort((a, b) => b.score - a.score);
    
    return scoredVideos;
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        initializeApp();
    }, 1000);
});

async function initializeApp() {
    console.log('Initialisation de l\'application...');
    
    try {
        // Charger les données depuis le localStorage
        await loadDataFromStorage();
        
        // Initialiser les utilisateurs
        await initializeUsers();
        
        setupEventListeners();
        await renderVideoFeed();
        updateUI();
        
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        
        console.log('Application initialisée avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showNotification('Erreur lors du chargement des données', 'error');
        // Charger des données de démo
        await loadDemoData();
        await renderVideoFeed();
    }
}

async function initializeUsers() {
    // Créer des utilisateurs de démo
    users = {
        'user_1': {
            id: 'user_1',
            username: 'Utilisateur TIKTAK',
            avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
            followers: 150,
            following: 50,
            videos: [],
            joinDate: Date.now() - (365 * 24 * 60 * 60 * 1000)
        },
        'user_2': {
            id: 'user_2',
            username: 'Créateur Pro',
            avatar: 'https://randomuser.me/api/portraits/lego/2.jpg',
            followers: 2500,
            following: 150,
            videos: ['1'],
            joinDate: Date.now() - (180 * 24 * 60 * 60 * 1000)
        },
        'user_3': {
            id: 'user_3',
            username: 'Artiste Digital',
            avatar: 'https://randomuser.me/api/portraits/lego/3.jpg',
            followers: 1800,
            following: 300,
            videos: ['2'],
            joinDate: Date.now() - (90 * 24 * 60 * 60 * 1000)
        },
        'user_4': {
            id: 'user_4',
            username: 'Influenceur Gaming',
            avatar: 'https://randomuser.me/api/portraits/lego/4.jpg',
            followers: 5000,
            following: 200,
            videos: [],
            joinDate: Date.now() - (60 * 24 * 60 * 60 * 1000)
        },
        'user_5': {
            id: 'user_5',
            username: 'Vlogger Voyage',
            avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
            followers: 3200,
            following: 400,
            videos: [],
            joinDate: Date.now() - (30 * 24 * 60 * 60 * 1000)
        }
    };
    
    // Sauvegarder les utilisateurs
    localStorage.setItem('tiktak_users', JSON.stringify(users));
}

async function loadDataFromStorage() {
    // Charger les vidéos
    const savedVideos = localStorage.getItem('tiktak_videos');
    if (savedVideos) {
        videos = JSON.parse(savedVideos);
        console.log(`✅ ${videos.length} vidéos chargées depuis localStorage`);
    } else {
        console.log('Aucune vidéo trouvée, initialisation avec vidéos de démo');
        await loadDemoData();
    }
    
    // Charger l'utilisateur
    const savedUser = localStorage.getItem('tiktak_user');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        currentUser = { ...currentUser, ...parsedUser };
    }
    
    // Charger les utilisateurs
    const savedUsers = localStorage.getItem('tiktak_users');
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    }
}

async function loadDemoData() {
    videos = [
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
        },
        {
            id: '3',
            userId: 'user_4',
            username: 'Influenceur Gaming',
            avatar: 'https://randomuser.me/api/portraits/lego/4.jpg',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-4.0.3&auto=format&fit=crop&w=1171&q=80',
            caption: 'Gameplay épique sur le nouveau jeu ! 🎮 #gaming #live',
            likes: 5200,
            comments: 420,
            shares: 150,
            views: 45000,
            timestamp: Date.now() - 1800000,
            isMonetized: true,
            gifts: 25,
            hashtags: ['#gaming', '#gameplay', '#esport'],
            duration: '00:45',
            privacy: 'public'
        },
        {
            id: '4',
            userId: 'user_5',
            username: 'Vlogger Voyage',
            avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=1035&q=80',
            caption: 'Découverte des plus beaux paysages 🌄 #voyage #aventure',
            likes: 3100,
            comments: 180,
            shares: 75,
            views: 32000,
            timestamp: Date.now() - 5400000,
            isMonetized: true,
            gifts: 18,
            hashtags: ['#voyage', '#aventure', '#paysage'],
            duration: '01:00',
            privacy: 'public'
        },
        {
            id: '5',
            userId: 'user_2',
            username: 'Créateur Pro',
            avatar: 'https://randomuser.me/api/portraits/lego/2.jpg',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
            caption: 'Tutoriel avancé pour débutants 📚 #tutoriel #apprendre',
            likes: 1800,
            comments: 95,
            shares: 32,
            views: 12000,
            timestamp: Date.now() - 9000000,
            isMonetized: false,
            gifts: 6,
            hashtags: ['#tutoriel', '#éducation', '#apprentissage'],
            duration: '00:25',
            privacy: 'public'
        }
    ];
    
    // Sauvegarder les vidéos de démo
    saveVideosToLocalStorage();
}

// ==================== GESTION DES VIDÉOS ====================
async function renderVideoFeed(sortingAlgorithm = 'score') {
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
    
    // Appliquer l'algorithme de tri
    let videosToDisplay = [];
    
    switch(sortingAlgorithm) {
        case 'score':
            videosToDisplay = sortVideosByAlgorithm();
            break;
        case 'latest':
            videosToDisplay = [...videos].sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'trending':
            videosToDisplay = [...videos].sort((a, b) => {
                const aScore = calculateVideoScore(a);
                const bScore = calculateVideoScore(b);
                return bScore.score - aScore.score;
            });
            break;
        case 'following':
            videosToDisplay = videos.filter(video => currentUser.following?.includes(video.userId));
            break;
        default:
            videosToDisplay = sortVideosByAlgorithm();
    }
    
    // Ajouter les contrôles d'algorithme
    const algorithmControls = document.createElement('div');
    algorithmControls.className = 'algorithm-controls';
    algorithmControls.innerHTML = `
        <span>Trier par:</span>
        <select id="sortingAlgorithm" onchange="changeSortingAlgorithm(this.value)">
            <option value="score">Algorithme de score</option>
            <option value="trending">Tendances</option>
            <option value="latest">Plus récent</option>
            <option value="following">Abonnements</option>
        </select>
        <span class="stat-item">
            <i class="fas fa-users"></i>
            <span>${videos.length} vidéos</span>
        </span>
    `;
    
    videoFeed.appendChild(algorithmControls);
    
    // Afficher toutes les vidéos
    videosToDisplay.forEach((video, index) => {
        const videoElement = createVideoElement(video, index < 3); // Auto-play pour les 3 premières
        videoFeed.appendChild(videoElement);
    });
}

function changeSortingAlgorithm(algorithm) {
    renderVideoFeed(algorithm);
    showNotification(`Tri par ${algorithm} appliqué`, 'success');
}

function createVideoElement(video, autoPlay = false) {
    const isLiked = currentUser.likedVideos?.includes(video.id) || false;
    const timeAgo = getTimeAgo(video.timestamp);
    const isFollowing = currentUser.following?.includes(video.userId) || false;
    const userData = users[video.userId] || {};
    const scoreData = calculateVideoScore(video, userData);
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    // Badges algorithmiques
    const badges = [];
    if (scoreData.boostMultiplier >= ALGORITHM_CONFIG.boosts.viral) {
        badges.push('<span class="viral-badge">VIRAL</span>');
    }
    if (userData.followers > 1000) {
        badges.push('<span class="popular-badge">POPULAIRE</span>');
    }
    if (video.isMonetized) {
        badges.push('<span class="monetization-badge"><i class="fas fa-coins"></i> MONÉTISÉ</span>');
    }
    
    container.innerHTML = `
        <div class="video-loading-indicator" style="display: none;">
            <i class="fas fa-spinner fa-spin"></i> Chargement...
        </div>
        
        <video 
            src="${video.videoUrl}" 
            poster="${video.thumbnail}"
            preload="metadata"
            onclick="toggleVideoPlay(this)"
            loop
            ${autoPlay && currentUser.settings?.autoplay ? 'autoplay muted' : ''}
        ></video>
        
        <!-- Badge de score algorithmique -->
        <div class="score-badge" title="Score algorithmique: ${scoreData.score}">
            <i class="fas fa-chart-line"></i> ${scoreData.score}
            <div class="score-tooltip">
                <div class="score-item">
                    <span class="score-label">Likes:</span>
                    <span class="score-value">${Math.round(scoreData.breakdown.likes)}</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Comments:</span>
                    <span class="score-value">${Math.round(scoreData.breakdown.comments)}</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Shares:</span>
                    <span class="score-value">${Math.round(scoreData.breakdown.shares)}</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Followers:</span>
                    <span class="score-value">${Math.round(scoreData.breakdown.followers)}</span>
                </div>
                <div class="score-total">
                    Score total: ${scoreData.score}
                    ${scoreData.breakdown.boosts.length > 0 ? `<br>Boosts: ${scoreData.breakdown.boosts.join(', ')}` : ''}
                </div>
            </div>
        </div>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${video.avatar}" alt="${video.username}" onclick="openCreatorProfile('${video.userId}')">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4>${video.username}</h4>
                        ${isFollowing ? '<span class="following-badge">Abonné</span>' : ''}
                        ${badges.join('')}
                    </div>
                    <div class="user-stats">
                        <div class="stat-item">
                            <i class="fas fa-users"></i>
                            <span class="stat-value">${formatNumber(userData.followers || 0)}</span>
                            <span>abonnés</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-video"></i>
                            <span class="stat-value">${userData.videos?.length || 0}</span>
                            <span>vidéos</span>
                        </div>
                    </div>
                    <p class="video-caption">${video.caption}</p>
                    <div class="hashtags">
                        ${video.hashtags ? video.hashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('') : ''}
                    </div>
                </div>
                <button class="btn btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${video.userId}', this)">
                    ${isFollowing ? '<i class="fas fa-check"></i> Abonné' : '<i class="fas fa-plus"></i> Suivre'}
                </button>
            </div>
            
            <div class="video-stats">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views)} vues
                    ${video.views > 10000 ? '<span class="trending-up"><i class="fas fa-arrow-up"></i></span>' : ''}
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
    
    // Gestionnaire d'erreur pour la vidéo
    const videoElement = container.querySelector('video');
    videoElement.addEventListener('error', function() {
        console.error('Erreur de chargement de la vidéo:', video.videoUrl);
        showNotification('Erreur de chargement de la vidéo', 'error');
    });
    
    videoElement.addEventListener('waiting', function() {
        container.querySelector('.video-loading-indicator').style.display = 'block';
    });
    
    videoElement.addEventListener('playing', function() {
        container.querySelector('.video-loading-indicator').style.display = 'none';
    });
    
    return container;
}

async function toggleLike(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) return;
    
    const video = videos[videoIndex];
    const userLikedIndex = currentUser.likedVideos?.indexOf(videoId) || -1;
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    
    if (userLikedIndex === -1) {
        video.likes++;
        if (!currentUser.likedVideos) currentUser.likedVideos = [];
        currentUser.likedVideos.push(videoId);
        
        showHeartAnimation();
        showNotification('Vidéo aimée ! ❤️', 'success');
    } else {
        video.likes--;
        currentUser.likedVideos.splice(userLikedIndex, 1);
        showNotification('Like retiré', 'info');
    }
    
    // Sauvegarder
    saveVideosToLocalStorage();
    saveUserDataToLocalStorage();
    
    // Mettre à jour l'UI
    if (container) {
        const likeElement = container.querySelector('.action:nth-child(1)');
        likeElement.className = `action ${userLikedIndex === -1 ? 'liked' : ''}`;
        likeElement.querySelector('span').textContent = formatNumber(video.likes);
    }
    
    // Re-calculer le score et re-rendre si nécessaire
    renderVideoFeed();
}

async function toggleFollow(userId, buttonElement) {
    const userIndex = currentUser.following?.indexOf(userId) || -1;
    
    if (userIndex === -1) {
        if (!currentUser.following) currentUser.following = [];
        currentUser.following.push(userId);
        buttonElement.innerHTML = '<i class="fas fa-check"></i> Abonné';
        buttonElement.classList.add('following');
        showNotification('Utilisateur suivi !', 'success');
        
        // Mettre à jour les stats de l'utilisateur
        if (users[userId]) {
            users[userId].followers = (users[userId].followers || 0) + 1;
            localStorage.setItem('tiktak_users', JSON.stringify(users));
        }
    } else {
        currentUser.following.splice(userIndex, 1);
        buttonElement.innerHTML = '<i class="fas fa-plus"></i> Suivre';
        buttonElement.classList.remove('following');
        showNotification('Abonnement annulé', 'info');
        
        // Mettre à jour les stats de l'utilisateur
        if (users[userId]) {
            users[userId].followers = Math.max(0, (users[userId].followers || 1) - 1);
            localStorage.setItem('tiktak_users', JSON.stringify(users));
        }
    }
    
    saveUserDataToLocalStorage();
    renderVideoFeed();
}

// ==================== CRÉATION DE VIDÉO ====================
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
    
    const publishBtn = document.getElementById('publishBtn');
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    const hashtags = extractHashtags(caption);
    
    setTimeout(async () => {
        const videoUrl = document.getElementById('previewVideo').src || 
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
        
        videos.unshift(newVideo);
        
        // Mettre à jour les stats de l'utilisateur
        if (!users[currentUser.id]) {
            users[currentUser.id] = {
                id: currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar,
                followers: 0,
                following: currentUser.following?.length || 0,
                videos: [],
                joinDate: Date.now()
            };
        }
        
        if (!users[currentUser.id].videos) {
            users[currentUser.id].videos = [];
        }
        users[currentUser.id].videos.push(newVideo.id);
        
        // Mettre à jour l'utilisateur courant
        if (!currentUser.myVideos) currentUser.myVideos = [];
        currentUser.myVideos.push(newVideo.id);
        
        // Sauvegarder toutes les données
        saveVideosToLocalStorage();
        saveUserDataToLocalStorage();
        localStorage.setItem('tiktak_users', JSON.stringify(users));
        
        renderVideoFeed();
        closeCreateModal();
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        
        if (isMonetized) {
            currentUser.coins += 10;
            updateUI();
            showNotification('+10 coins pour la vidéo monétisée !', 'success');
        }
    }, 2000);
}

// ==================== FONCTIONS DE SAUVEGARDE ====================
function saveVideosToLocalStorage() {
    try {
        localStorage.setItem('tiktak_videos', JSON.stringify(videos));
        console.log('✅ Vidéos sauvegardées dans localStorage');
    } catch (error) {
        console.error('Erreur sauvegarde vidéos:', error);
        showNotification('Erreur de sauvegarde', 'error');
    }
}

function saveUserDataToLocalStorage() {
    try {
        localStorage.setItem('tiktak_user', JSON.stringify(currentUser));
        console.log('✅ Utilisateur sauvegardé dans localStorage');
    } catch (error) {
        console.error('Erreur sauvegarde utilisateur:', error);
    }
}

// ==================== FONCTIONS RESTANTES ====================
// Les fonctions restantes restent les mêmes mais assurez-vous qu'elles sauvegardent correctement
// dans localStorage après chaque modification

// Exemple pour incrementViews:
async function incrementViews(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
        videos[videoIndex].views++;
        saveVideosToLocalStorage();
        
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        if (container) {
            const viewCount = container.querySelector('.view-count');
            if (viewCount) {
                viewCount.innerHTML = `<i class="fas fa-eye"></i> ${formatNumber(videos[videoIndex].views)} vues`;
            }
        }
    }
}

// Pour shareVideo:
async function shareVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    if (navigator.share) {
        navigator.share({
            title: video.caption,
            text: 'Regarde cette vidéo sur TIKTAK!',
            url: window.location.href + '?video=' + videoId
        }).then(async () => {
            video.shares++;
            saveVideosToLocalStorage();
            updateVideoStats(videoId);
            showNotification('Vidéo partagée ! 📤', 'success');
            renderVideoFeed(); // Re-calculer les scores
        });
    } else {
        navigator.clipboard.writeText(window.location.href + '?video=' + videoId).then(async () => {
            video.shares++;
            saveVideosToLocalStorage();
            updateVideoStats(videoId);
            showNotification('Lien copié dans le presse-papier ! 📋', 'success');
            renderVideoFeed(); // Re-calculer les scores
        });
    }
}

// Mettez à jour toutes les fonctions qui modifient les vidéos pour qu'elles sauvegardent
// et re-rendent le feed pour mettre à jour les scores

// ==================== EXPORT DES FONCTIONS GLOBALES ====================
// Gardez toutes les fonctions window.* existantes
// Assurez-vous que toutes les fonctions qui modifient des données sauvegardent et re-rendent

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
window.startCameraRecording = function() {
    showNotification('Enregistrement caméra à venir', 'info');
};
window.stopCameraRecording = function() {
    showNotification('Arrêt enregistrement à venir', 'info');
};
window.openCameraForRecording = openCameraForRecording;
window.openFileUpload = openFileUpload;
window.startCameraForRecording = function() {
    showNotification('Démarrage caméra à venir', 'info');
};
window.stopCameraForRecording = function() {
    showNotification('Arrêt caméra à venir', 'info');
};
window.closeLiveModal = closeLiveModal;
window.changeSortingAlgorithm = changeSortingAlgorithm;
