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
let users = {};
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

// ==================== ALGORITHME DE RECOMMANDATION ====================
const ALGORITHM_CONFIG = {
    weights: {
        likes: 0.3,
        comments: 0.2,
        shares: 0.15,
        views: 0.1,
        followers: 0.15,
        recency: 0.1,
        engagement: 0.1
    },
    boosts: {
        viral: 1.5,
        popular: 1.3,
        trending: 1.2,
        following: 2.0,
        monetized: 1.1,
        recent: 1.2
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

// ==================== ALGORITHME DE SCORING ====================
function calculateVideoScore(video, userData = {}) {
    if (!video) return { score: 0, breakdown: {}, boostMultiplier: 1 };
    
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
    
    // Normalisation des valeurs
    const maxLikes = Math.max(...videos.map(v => v.likes || 0), 1);
    const maxComments = Math.max(...videos.map(v => v.comments || 0), 1);
    const maxShares = Math.max(...videos.map(v => v.shares || 0), 1);
    const maxViews = Math.max(...videos.map(v => v.views || 0), 1);
    
    // Calcul des composants du score
    breakdown.likes = ((video.likes || 0) / maxLikes) * 100 * ALGORITHM_CONFIG.weights.likes;
    breakdown.comments = ((video.comments || 0) / maxComments) * 100 * ALGORITHM_CONFIG.weights.comments;
    breakdown.shares = ((video.shares || 0) / maxShares) * 100 * ALGORITHM_CONFIG.weights.shares;
    breakdown.views = ((video.views || 0) / maxViews) * 100 * ALGORITHM_CONFIG.weights.views;
    
    // Score des followers
    const userFollowers = userData.followers || users[video.userId]?.followers || 0;
    const maxFollowers = Math.max(...Object.values(users).map(u => u.followers || 0), 1);
    breakdown.followers = (userFollowers / maxFollowers) * 100 * ALGORITHM_CONFIG.weights.followers;
    
    // Récence (vidéos récentes boostées)
    const hoursSinceUpload = (Date.now() - video.timestamp) / (1000 * 60 * 60);
    breakdown.recency = Math.max(0, 100 - (hoursSinceUpload * 1.5)) * ALGORITHM_CONFIG.weights.recency;
    
    // Taux d'engagement
    const engagementRate = video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0;
    breakdown.engagement = Math.min(engagementRate, 50) * ALGORITHM_CONFIG.weights.engagement;
    
    // Score total de base
    score = Object.values(breakdown).reduce((sum, val) => {
        if (typeof val === 'number') return sum + val;
        return sum;
    }, 0);
    
    // Boosts additionnels
    let boostMultiplier = 1;
    
    // Boost viral (très populaire)
    if (video.likes > 1000 || video.shares > 100) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.viral;
        breakdown.boosts.push('VIRAL');
    }
    
    // Boost pour créateur populaire
    if (userFollowers > 1000) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.popular;
        breakdown.boosts.push('POPULAIRE');
    }
    
    // Boost trending (vidéo récente et populaire)
    const isRecent = hoursSinceUpload < 24; // Moins de 24h
    const isTrending = isRecent && video.likes > 100;
    if (isTrending) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.trending;
        breakdown.boosts.push('TENDANCE');
    }
    
    // Boost si l'utilisateur suit le créateur
    if (currentUser.following?.includes(video.userId)) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.following;
        breakdown.boosts.push('ABONNÉ');
    }
    
    // Boost vidéo monétisée
    if (video.isMonetized) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.monetized;
        breakdown.boosts.push('MONÉTISÉ');
    }
    
    // Boost vidéo très récente (moins de 1 heure)
    if (hoursSinceUpload < 1) {
        boostMultiplier *= ALGORITHM_CONFIG.boosts.recent;
        breakdown.boosts.push('NOUVEAU');
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
    if (videos.length === 0) return [];
    
    const scoredVideos = videos.map(video => {
        const userData = users[video.userId] || {};
        const scoreData = calculateVideoScore(video, userData);
        return {
            ...video,
            score: scoreData.score,
            scoreData: scoreData
        };
    });
    
    scoredVideos.sort((a, b) => {
        // Priorité aux vidéos avec score plus élevé
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // En cas d'égalité, priorité aux plus récentes
        return b.timestamp - a.timestamp;
    });
    
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
    console.log('🚀 Initialisation de TIKTAK...');
    
    try {
        await loadDataFromStorage();
        await initializeUsers();
        setupEventListeners();
        await renderVideoFeed();
        updateUI();
        
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        console.log('✅ Application initialisée avec succès');
    } catch (error) {
        console.error('Erreur initialisation:', error);
        showNotification('Erreur de chargement, utilisation des données de démo', 'warning');
        await loadDemoData();
        await renderVideoFeed();
    }
}

async function initializeUsers() {
    const savedUsers = localStorage.getItem('tiktak_users');
    
    if (savedUsers) {
        users = JSON.parse(savedUsers);
    } else {
        // Créer des utilisateurs de démo
        users = {
            'user_1': {
                id: 'user_1',
                username: 'Utilisateur TIKTAK',
                avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
                followers: 150,
                following: 50,
                videos: [],
                joinDate: Date.now() - (365 * 24 * 60 * 60 * 1000),
                coins: 100
            },
            'user_2': {
                id: 'user_2',
                username: 'Créateur Pro',
                avatar: 'https://randomuser.me/api/portraits/lego/2.jpg',
                followers: 2500,
                following: 150,
                videos: ['1'],
                joinDate: Date.now() - (180 * 24 * 60 * 60 * 1000),
                coins: 500
            },
            'user_3': {
                id: 'user_3',
                username: 'Artiste Digital',
                avatar: 'https://randomuser.me/api/portraits/lego/3.jpg',
                followers: 1800,
                following: 300,
                videos: ['2'],
                joinDate: Date.now() - (90 * 24 * 60 * 60 * 1000),
                coins: 320
            },
            'user_4': {
                id: 'user_4',
                username: 'Influenceur Gaming',
                avatar: 'https://randomuser.me/api/portraits/lego/4.jpg',
                followers: 5000,
                following: 200,
                videos: ['3'],
                joinDate: Date.now() - (60 * 24 * 60 * 60 * 1000),
                coins: 800
            },
            'user_5': {
                id: 'user_5',
                username: 'Vlogger Voyage',
                avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
                followers: 3200,
                following: 400,
                videos: ['4'],
                joinDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
                coins: 450
            }
        };
        
        localStorage.setItem('tiktak_users', JSON.stringify(users));
    }
    
    // Mettre à jour currentUser avec les données du localStorage
    const savedUser = localStorage.getItem('tiktak_user');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        currentUser = { ...currentUser, ...parsedUser };
    }
}

async function loadDataFromStorage() {
    try {
        // Charger les vidéos
        const savedVideos = localStorage.getItem('tiktak_videos');
        if (savedVideos) {
            videos = JSON.parse(savedVideos);
            console.log(`✅ ${videos.length} vidéos chargées`);
        } else {
            await loadDemoData();
        }
        
        // Charger l'utilisateur
        const savedUser = localStorage.getItem('tiktak_user');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            currentUser = { ...currentUser, ...parsedUser };
        }
        
        // Charger les commentaires
        const savedComments = localStorage.getItem('tiktak_comments');
        if (savedComments) {
            comments = JSON.parse(savedComments);
        }
        
        // Charger les transactions
        const savedTransactions = localStorage.getItem('tiktak_transactions');
        if (savedTransactions) {
            transactions = JSON.parse(savedTransactions);
        }
    } catch (error) {
        console.error('Erreur chargement données:', error);
        throw error;
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
    
    saveVideosToLocalStorage();
}

// ==================== GESTION DES VIDÉOS ====================
async function renderVideoFeed(sortingAlgorithm = 'score') {
    const videoFeed = document.getElementById('videoFeed');
    if (!videoFeed) return;
    
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
    
    // Ajouter les contrôles d'algorithme
    const algorithmControls = document.createElement('div');
    algorithmControls.className = 'algorithm-controls';
    algorithmControls.innerHTML = `
        <span>Trier par:</span>
        <select id="sortingAlgorithm" onchange="changeSortingAlgorithm(this.value)">
            <option value="score" ${sortingAlgorithm === 'score' ? 'selected' : ''}>Algorithme intelligent</option>
            <option value="trending" ${sortingAlgorithm === 'trending' ? 'selected' : ''}>Tendances</option>
            <option value="latest" ${sortingAlgorithm === 'latest' ? 'selected' : ''}>Plus récent</option>
            <option value="following" ${sortingAlgorithm === 'following' ? 'selected' : ''}>Abonnements</option>
            <option value="popular" ${sortingAlgorithm === 'popular' ? 'selected' : ''}>Plus populaires</option>
        </select>
        <span class="stat-item">
            <i class="fas fa-users"></i>
            <span>${videos.length} vidéos</span>
        </span>
    `;
    
    videoFeed.appendChild(algorithmControls);
    
    // Appliquer le tri selon l'algorithme sélectionné
    let videosToDisplay = [];
    
    switch(sortingAlgorithm) {
        case 'score':
            videosToDisplay = sortVideosByAlgorithm();
            break;
        case 'trending':
            videosToDisplay = [...videos].filter(v => {
                const hours = (Date.now() - v.timestamp) / (1000 * 60 * 60);
                return hours < 48 && (v.likes > 100 || v.shares > 20);
            }).sort((a, b) => {
                const aScore = (a.likes * 2 + a.comments + a.shares * 3) / ((Date.now() - a.timestamp) / 3600000);
                const bScore = (b.likes * 2 + b.comments + b.shares * 3) / ((Date.now() - b.timestamp) / 3600000);
                return bScore - aScore;
            });
            break;
        case 'latest':
            videosToDisplay = [...videos].sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'following':
            videosToDisplay = videos.filter(video => currentUser.following?.includes(video.userId));
            if (videosToDisplay.length === 0) {
                videosToDisplay = videos.slice(0, 5); // Fallback
            }
            break;
        case 'popular':
            videosToDisplay = [...videos].sort((a, b) => b.views - a.views);
            break;
        default:
            videosToDisplay = sortVideosByAlgorithm();
    }
    
    // Afficher toutes les vidéos
    videosToDisplay.forEach((video, index) => {
        const videoElement = createVideoElement(video, index < 3); // Auto-play pour les 3 premières
        videoFeed.appendChild(videoElement);
    });
}

function changeSortingAlgorithm(algorithm) {
    renderVideoFeed(algorithm);
    showNotification(`Tri par ${getAlgorithmName(algorithm)} appliqué`, 'success');
}

function getAlgorithmName(algorithm) {
    const names = {
        'score': 'algorithme intelligent',
        'trending': 'tendances',
        'latest': 'plus récent',
        'following': 'abonnements',
        'popular': 'plus populaires'
    };
    return names[algorithm] || algorithm;
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
    if (scoreData.breakdown.boosts.includes('VIRAL')) {
        badges.push('<span class="viral-badge">VIRAL</span>');
    }
    if (scoreData.breakdown.boosts.includes('POPULAIRE')) {
        badges.push('<span class="popular-badge">POPULAIRE</span>');
    }
    if (scoreData.breakdown.boosts.includes('TENDANCE')) {
        badges.push('<span class="trending-up"><i class="fas fa-fire"></i> TENDANCE</span>');
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
                <div class="score-item">
                    <span class="score-label">Recency:</span>
                    <span class="score-value">${Math.round(scoreData.breakdown.recency)}</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Engagement:</span>
                    <span class="score-value">${Math.round(scoreData.breakdown.engagement)}</span>
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
    if (videoElement) {
        videoElement.addEventListener('error', function() {
            console.error('Erreur de chargement de la vidéo:', video.videoUrl);
            showNotification('Erreur de chargement de la vidéo', 'error');
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'video-fallback';
            placeholder.innerHTML = `
                <img src="${video.thumbnail}" alt="Miniature">
                <div class="video-fallback-content">
                    <p>Vidéo non disponible</p>
                    <button class="btn btn-small" onclick="this.parentElement.parentElement.remove()">Fermer</button>
                </div>
            `;
            container.insertBefore(placeholder, videoElement);
        });
        
        videoElement.addEventListener('waiting', function() {
            const indicator = container.querySelector('.video-loading-indicator');
            if (indicator) indicator.style.display = 'block';
        });
        
        videoElement.addEventListener('playing', function() {
            const indicator = container.querySelector('.video-loading-indicator');
            if (indicator) indicator.style.display = 'none';
        });
        
        videoElement.addEventListener('loadeddata', function() {
            const indicator = container.querySelector('.video-loading-indicator');
            if (indicator) indicator.style.display = 'none';
        });
    }
    
    return container;
}

function toggleVideoPlay(videoElement) {
    if (!videoElement) return;
    
    const container = videoElement.closest('.video-container');
    if (!container) return;
    
    const playBtn = container.querySelector('.manual-play-btn');
    if (!playBtn) return;
    
    if (videoElement.paused) {
        // Arrêter la vidéo en cours de lecture
        if (currentPlayingVideo && currentPlayingVideo !== videoElement) {
            currentPlayingVideo.pause();
            const prevPlayBtn = currentPlayingVideo.closest('.video-container')?.querySelector('.manual-play-btn');
            if (prevPlayBtn) prevPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        videoElement.play().then(() => {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            currentPlayingVideo = videoElement;
            
            // Incrémenter les vues
            const videoId = container.dataset.videoId;
            incrementViews(videoId);
        }).catch(error => {
            console.error('Erreur lecture vidéo:', error);
            videoElement.muted = true;
            videoElement.play().catch(e => {
                showNotification('Impossible de lire la vidéo', 'error');
            });
        });
    } else {
        videoElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingVideo = null;
    }
}

async function incrementViews(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
        videos[videoIndex].views = (videos[videoIndex].views || 0) + 1;
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

// ==================== INTERACTIONS SOCIALES ====================
async function toggleLike(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) return;
    
    const video = videos[videoIndex];
    const userLikedIndex = currentUser.likedVideos?.indexOf(videoId) || -1;
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    
    if (userLikedIndex === -1) {
        // Ajouter le like
        video.likes = (video.likes || 0) + 1;
        if (!currentUser.likedVideos) currentUser.likedVideos = [];
        currentUser.likedVideos.push(videoId);
        
        showHeartAnimation();
        showNotification('Vidéo aimée ! ❤️', 'success');
        
        // Augmenter les coins pour l'interaction
        currentUser.coins += 1;
        updateUI();
    } else {
        // Retirer le like
        video.likes = Math.max(0, (video.likes || 1) - 1);
        currentUser.likedVideos.splice(userLikedIndex, 1);
        showNotification('Like retiré', 'info');
    }
    
    // Sauvegarder
    saveVideosToLocalStorage();
    saveUserDataToLocalStorage();
    
    // Mettre à jour l'UI
    if (container) {
        const likeElement = container.querySelector('.action:nth-child(1)');
        if (likeElement) {
            likeElement.className = `action ${userLikedIndex === -1 ? 'liked' : ''}`;
            const span = likeElement.querySelector('span');
            if (span) span.textContent = formatNumber(video.likes);
        }
    }
    
    // Re-calculer le score
    setTimeout(() => renderVideoFeed(document.getElementById('sortingAlgorithm')?.value || 'score'), 100);
}

async function toggleFollow(userId, buttonElement) {
    const userIndex = currentUser.following?.indexOf(userId) || -1;
    
    if (userIndex === -1) {
        // Suivre
        if (!currentUser.following) currentUser.following = [];
        currentUser.following.push(userId);
        if (buttonElement) {
            buttonElement.innerHTML = '<i class="fas fa-check"></i> Abonné';
            buttonElement.classList.add('following');
        }
        showNotification('Utilisateur suivi !', 'success');
        
        // Mettre à jour les stats de l'utilisateur
        if (users[userId]) {
            users[userId].followers = (users[userId].followers || 0) + 1;
            localStorage.setItem('tiktak_users', JSON.stringify(users));
        }
        
        // Récompense en coins
        currentUser.coins += 5;
    } else {
        // Se désabonner
        currentUser.following.splice(userIndex, 1);
        if (buttonElement) {
            buttonElement.innerHTML = '<i class="fas fa-plus"></i> Suivre';
            buttonElement.classList.remove('following');
        }
        showNotification('Abonnement annulé', 'info');
        
        // Mettre à jour les stats de l'utilisateur
        if (users[userId]) {
            users[userId].followers = Math.max(0, (users[userId].followers || 1) - 1);
            localStorage.setItem('tiktak_users', JSON.stringify(users));
        }
    }
    
    saveUserDataToLocalStorage();
    updateUI();
    
    // Re-calculer le score
    setTimeout(() => renderVideoFeed(document.getElementById('sortingAlgorithm')?.value || 'score'), 100);
}

function shareVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?video=${videoId}`;
    const shareText = `Regarde cette vidéo sur TIKTAK: ${video.caption}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'TIKTAK - Partage vidéo',
            text: shareText,
            url: shareUrl
        }).then(async () => {
            video.shares = (video.shares || 0) + 1;
            saveVideosToLocalStorage();
            updateVideoStats(videoId);
            showNotification('Vidéo partagée ! 📤', 'success');
            
            // Récompense en coins
            currentUser.coins += 3;
            updateUI();
            
            // Re-calculer le score
            setTimeout(() => renderVideoFeed(document.getElementById('sortingAlgorithm')?.value || 'score'), 100);
        }).catch(err => {
            console.log('Partage annulé:', err);
        });
    } else {
        // Fallback: copier dans le presse-papier
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(async () => {
            video.shares = (video.shares || 0) + 1;
            saveVideosToLocalStorage();
            updateVideoStats(videoId);
            showNotification('Lien copié dans le presse-papier ! 📋', 'success');
            
            // Récompense en coins
            currentUser.coins += 3;
            updateUI();
            
            // Re-calculer le score
            setTimeout(() => renderVideoFeed(document.getElementById('sortingAlgorithm')?.value || 'score'), 100);
        }).catch(err => {
            console.error('Erreur copie:', err);
            showNotification('Erreur lors du partage', 'error');
        });
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

async function saveVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Ajouter aux favoris de l'utilisateur
    if (!currentUser.myVideos?.includes(videoId)) {
        if (!currentUser.myVideos) currentUser.myVideos = [];
        currentUser.myVideos.push(videoId);
        
        saveUserDataToLocalStorage();
        showNotification('Vidéo enregistrée dans vos favoris ! ⭐', 'success');
        
        // Récompense en coins
        currentUser.coins += 2;
        updateUI();
    } else {
        showNotification('Vidéo déjà enregistrée', 'info');
    }
}

// ==================== CRÉATION DE VIDÉO ====================
function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Afficher les options de création
    showCreateOptions();
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetCreateModal();
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
    document.getElementById('cameraControls').style.display = 'flex';
    document.getElementById('fileUploadControls').style.display = 'none';
    
    // Pour l'instant, simuler l'accès à la caméra
    showNotification('Fonction caméra à venir dans la prochaine mise à jour', 'info');
    setTimeout(() => {
        document.getElementById('fileUploadControls').style.display = 'flex';
        document.getElementById('cameraControls').style.display = 'none';
    }, 1000);
}

function openFileUpload() {
    openUploadSection();
    document.getElementById('cameraControls').style.display = 'none';
    document.getElementById('fileUploadControls').style.display = 'flex';
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
    const processingElement = document.getElementById('videoProcessing');
    if (processingElement) processingElement.style.display = 'flex';
    
    reader.onload = function(e) {
        const videoElement = document.getElementById('previewVideo');
        const placeholder = document.querySelector('.preview-placeholder');
        
        if (videoElement) {
            videoElement.src = e.target.result;
            videoElement.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        
        // Simuler le traitement
        setTimeout(() => {
            if (processingElement) processingElement.style.display = 'none';
            if (videoElement) {
                videoElement.load();
                
                videoElement.onloadedmetadata = function() {
                    const duration = videoElement.duration;
                    const fileInfo = document.getElementById('videoFileInfo');
                    if (fileInfo) {
                        fileInfo.innerHTML = `
                            <i class="fas fa-file-video"></i>
                            <span>${file.name} (${formatFileSize(file.size)})</span>
                            <div class="duration-info">Durée: ${formatDuration(duration)}</div>
                        `;
                    }
                };
            }
            
            // Activer le bouton de publication
            const publishBtn = document.getElementById('publishBtn');
            if (publishBtn) publishBtn.disabled = false;
        }, 1500);
    };
    
    reader.readAsDataURL(file);
}

function simulateRecording() {
    showNotification('Utilisation d\'une vidéo de démo 📹', 'info');
    
    const demoVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    
    if (videoElement) {
        videoElement.src = demoVideoUrl;
        videoElement.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    
    // Simuler un fichier
    currentVideoFile = {
        name: 'video_demo.mp4',
        size: 15300000,
        type: 'video/mp4'
    };
    
    const fileInfo = document.getElementById('videoFileInfo');
    if (fileInfo) {
        fileInfo.innerHTML = `
            <i class="fas fa-file-video"></i>
            <span>video_demo.mp4 (15.3 MB)</span>
            <div class="duration-info">Durée: 00:15</div>
        `;
    }
    
    // Activer le bouton de publication
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) publishBtn.disabled = false;
}

async function publishVideo() {
    const captionElement = document.getElementById('videoCaption');
    const monetizeElement = document.getElementById('monetizeVideo');
    const privacyElement = document.getElementById('videoPrivacy');
    
    if (!captionElement || !monetizeElement || !privacyElement) return;
    
    const caption = captionElement.value.trim();
    const isMonetized = monetizeElement.checked;
    const privacy = privacyElement.value;
    
    if (!currentVideoFile && !document.getElementById('previewVideo')?.src) {
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
    if (!publishBtn) return;
    
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    const hashtags = extractHashtags(caption);
    
    // Simuler le processus de publication
    setTimeout(async () => {
        const videoUrl = document.getElementById('previewVideo')?.src || 
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
        
        // Mettre à jour l'utilisateur courant
        if (!currentUser.myVideos) currentUser.myVideos = [];
        currentUser.myVideos.push(newVideo.id);
        
        // Mettre à jour les stats de l'utilisateur
        if (!users[currentUser.id]) {
            users[currentUser.id] = {
                id: currentUser.id,
                username: currentUser.username,
                avatar: currentUser.avatar,
                followers: 0,
                following: currentUser.following?.length || 0,
                videos: [],
                joinDate: Date.now(),
                coins: currentUser.coins
            };
        }
        
        if (!users[currentUser.id].videos) {
            users[currentUser.id].videos = [];
        }
        users[currentUser.id].videos.push(newVideo.id);
        
        // Sauvegarder toutes les données
        saveVideosToLocalStorage();
        saveUserDataToLocalStorage();
        localStorage.setItem('tiktak_users', JSON.stringify(users));
        
        // Récompense pour la publication
        currentUser.coins += 10;
        if (isMonetized) currentUser.coins += 5;
        
        renderVideoFeed();
        closeCreateModal();
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        updateUI();
        
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
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
    
    saveUserDataToLocalStorage();
    
    showNotification('Brouillon sauvegardé 📁', 'success');
    closeCreateModal();
}

function resetCreateModal() {
    const captionElement = document.getElementById('videoCaption');
    const monetizeElement = document.getElementById('monetizeVideo');
    const privacyElement = document.getElementById('videoPrivacy');
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    const fileInfo = document.getElementById('videoFileInfo');
    
    if (captionElement) captionElement.value = '';
    if (monetizeElement) monetizeElement.checked = false;
    if (privacyElement) privacyElement.value = 'public';
    if (videoElement) {
        videoElement.src = '';
        videoElement.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';
    if (fileInfo) {
        fileInfo.innerHTML = `
            <i class="fas fa-file-video"></i>
            <span>Aucun fichier sélectionné</span>
        `;
    }
    
    currentVideoFile = null;
    
    // Réinitialiser les options de création
    document.getElementById('createOptions').style.display = 'flex';
    document.getElementById('videoUploadSection').style.display = 'none';
    
    // Désactiver le bouton de publication
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) publishBtn.disabled = true;
}

// ==================== FONCTIONS DE SAUVEGARDE ====================
function saveVideosToLocalStorage() {
    try {
        localStorage.setItem('tiktak_videos', JSON.stringify(videos));
        console.log('✅ Vidéos sauvegardées');
    } catch (error) {
        console.error('Erreur sauvegarde vidéos:', error);
        showNotification('Erreur de sauvegarde des vidéos', 'error');
    }
}

function saveUserDataToLocalStorage() {
    try {
        localStorage.setItem('tiktak_user', JSON.stringify(currentUser));
        console.log('✅ Utilisateur sauvegardé');
    } catch (error) {
        console.error('Erreur sauvegarde utilisateur:', error);
    }
}

// ==================== PROFIL UTILISATEUR ====================
function openProfile() {
    loadProfileData();
    document.getElementById('profileModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function loadProfileData() {
    // Mettre à jour les informations de base
    const usernameElement = document.getElementById('profileUsername');
    const coinsElement = document.getElementById('profileCoins');
    const avatarElement = document.getElementById('profileAvatar');
    const statsElement = document.getElementById('profileStats');
    
    if (usernameElement) usernameElement.textContent = currentUser.username || 'Utilisateur TIKTAK';
    if (coinsElement) coinsElement.textContent = currentUser.coins || 100;
    if (avatarElement) avatarElement.src = currentUser.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg';
    
    // Calculer les statistiques
    const userVideos = videos.filter(v => v.userId === currentUser.id);
    if (statsElement) {
        statsElement.textContent = `${userVideos.length} vidéos • ${currentUser.followers?.length || 0} abonnés • ${currentUser.following?.length || 0} abonnements`;
    }
    
    // Afficher l'onglet par défaut
    showProfileTab('videos');
}

function showProfileTab(tabName) {
    // Masquer tous les onglets
    document.querySelectorAll('.profile-content').forEach(el => {
        el.style.display = 'none';
    });
    
    // Désactiver tous les onglets
    document.querySelectorAll('.profile-tab').forEach(el => {
        el.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    document.getElementById('profile' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).style.display = 'block';
    event.target.classList.add('active');
    
    // Charger les données de l'onglet
    switch(tabName) {
        case 'videos':
            loadProfileVideos();
            break;
        case 'likes':
            loadProfileLikes();
            break;
        case 'drafts':
            loadProfileDrafts();
            break;
    }
}

function loadProfileVideos() {
    const container = document.getElementById('profileVideos');
    const userVideos = videos.filter(v => v.userId === currentUser.id);
    
    if (userVideos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <h3>Aucune vidéo</h3>
                <p>Commencez à créer du contenu !</p>
                <button class="btn btn-primary" onclick="openCreateModal(); closeProfile();">
                    Créer une vidéo
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="videos-grid">
                ${userVideos.map(video => `
                    <div class="video-thumbnail" onclick="openVideoDetail('${video.id}')">
                        <img src="${video.thumbnail}" alt="${video.caption}">
                        <div class="thumbnail-overlay">
                            <span><i class="fas fa-play"></i> ${formatNumber(video.views)}</span>
                            <span><i class="fas fa-heart"></i> ${formatNumber(video.likes)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function loadProfileLikes() {
    const container = document.getElementById('profileLikes');
    const likedVideos = videos.filter(v => currentUser.likedVideos?.includes(v.id));
    
    if (likedVideos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>Aucun like</h3>
                <p>Les vidéos que vous aimez apparaîtront ici</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="videos-grid">
                ${likedVideos.map(video => `
                    <div class="video-thumbnail" onclick="openVideoDetail('${video.id}')">
                        <img src="${video.thumbnail}" alt="${video.caption}">
                        <div class="thumbnail-overlay">
                            <span><i class="fas fa-play"></i> ${formatNumber(video.views)}</span>
                            <span><i class="fas fa-heart"></i> ${formatNumber(video.likes)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function loadProfileDrafts() {
    const container = document.getElementById('profileDrafts');
    
    if (!currentUser.drafts || currentUser.drafts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>Aucun brouillon</h3>
                <p>Vos vidéos non publiées apparaîtront ici</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="drafts-list">
                ${currentUser.drafts.map(draft => `
                    <div class="draft-item">
                        <div>
                            <h4>${draft.caption}</h4>
                            <p>Créé le ${draft.date}</p>
                            ${draft.isMonetized ? '<span class="draft-monetized">Monétisé</span>' : ''}
                        </div>
                        <div class="draft-actions">
                            <button class="btn btn-small btn-primary" onclick="editDraft('${draft.id}')">
                                <i class="fas fa-edit"></i> Éditer
                            </button>
                            <button class="btn btn-small btn-danger" onclick="deleteDraft('${draft.id}')">
                                <i class="fas fa-trash"></i> Supprimer
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function changeProfilePicture() {
    document.getElementById('profilePictureInput').click();
}

// ==================== PARAMÈTRES ====================
function openSettings() {
    loadSettings();
    document.getElementById('settingsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function loadSettings() {
    const usernameElement = document.getElementById('settingsUsername');
    const emailElement = document.getElementById('settingsEmail');
    const notificationsElement = document.getElementById('settingsNotifications');
    const autoplayElement = document.getElementById('settingsAutoplay');
    
    if (usernameElement) usernameElement.value = currentUser.username || 'Utilisateur TIKTAK';
    if (emailElement) emailElement.value = currentUser.email || 'user@tiktak.demo';
    if (notificationsElement) notificationsElement.checked = currentUser.settings?.notifications || true;
    if (autoplayElement) autoplayElement.checked = currentUser.settings?.autoplay || true;
}

async function saveSettings() {
    const usernameElement = document.getElementById('settingsUsername');
    const emailElement = document.getElementById('settingsEmail');
    const notificationsElement = document.getElementById('settingsNotifications');
    const autoplayElement = document.getElementById('settingsAutoplay');
    
    if (!usernameElement || !emailElement || !notificationsElement || !autoplayElement) return;
    
    const newUsername = usernameElement.value.trim();
    const newEmail = emailElement.value.trim();
    
    if (newUsername && newUsername !== currentUser.username) {
        currentUser.username = newUsername;
        
        // Mettre à jour le nom dans toutes les vidéos
        videos.forEach(video => {
            if (video.userId === currentUser.id) {
                video.username = newUsername;
            }
        });
        
        // Mettre à jour dans les utilisateurs
        if (users[currentUser.id]) {
            users[currentUser.id].username = newUsername;
            localStorage.setItem('tiktak_users', JSON.stringify(users));
        }
        
        saveVideosToLocalStorage();
    }
    
    if (newEmail) {
        currentUser.email = newEmail;
    }
    
    currentUser.settings = currentUser.settings || {};
    currentUser.settings.notifications = notificationsElement.checked;
    currentUser.settings.autoplay = autoplayElement.checked;
    
    saveUserDataToLocalStorage();
    
    showNotification('Paramètres sauvegardés ✅', 'success');
    updateUI();
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
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

// ==================== MISE À JOUR DE L'INTERFACE ====================
function updateUI() {
    // Mettre à jour le solde de coins
    const coinCount = document.getElementById('coinCount');
    if (coinCount) coinCount.textContent = currentUser.coins || 100;
    
    const coinBalance = document.getElementById('coinBalance');
    if (coinBalance) coinBalance.title = `${currentUser.coins || 100} coins disponibles`;
    
    // Mettre à jour l'avatar utilisateur
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = currentUser.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg';
    
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

// ==================== NAVIGATION ====================
function showHome() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const firstNavItem = document.querySelector('.nav-item:nth-child(1)');
    if (firstNavItem) firstNavItem.classList.add('active');
    renderVideoFeed();
}

function toggleUserMenu() {
    const menu = document.getElementById('userDropdown');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

// ==================== ÉCOUTEURS D'ÉVÉNEMENTS ====================
function setupEventListeners() {
    // Recherche
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
                this.value = '';
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                performSearch(searchInput.value);
                searchInput.value = '';
            }
        });
    }
    
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
            modals.forEach(modal => modal.style.display = 'none');
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
            e.preventDefault();
            document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Input photo de profil
    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentUser.avatar = e.target.result;
                    updateUI();
                    saveUserDataToLocalStorage();
                    showNotification('Photo de profil mise à jour ✅', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function performSearch(query) {
    if (!query || !query.trim()) {
        showNotification('Veuillez entrer un terme de recherche', 'info');
        return;
    }
    
    const results = videos.filter(video => 
        video.caption?.toLowerCase().includes(query.toLowerCase()) ||
        video.username?.toLowerCase().includes(query.toLowerCase()) ||
        (video.hashtags && video.hashtags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
    
    const videoFeed = document.getElementById('videoFeed');
    if (!videoFeed) return;
    
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
    if (searchInput) {
        searchInput.style.display = searchInput.style.display === 'none' ? 'block' : 'none';
        if (searchInput.style.display === 'block') {
            searchInput.focus();
        }
    }
}

function openWallet() {
    showNotification('Portefeuille - Solde: ' + (currentUser.coins || 100) + ' coins', 'info');
}

function openNotifications() {
    showNotification('Aucune nouvelle notification', 'info');
}

function showTrending() {
    renderVideoFeed('trending');
    showNotification('Affichage des tendances', 'info');
}

function showFollowing() {
    renderVideoFeed('following');
    showNotification('Affichage des abonnements', 'info');
}

function showFavorites() {
    showNotification('Fonctionnalité favoris à venir', 'info');
}

function showMyVideos() {
    showNotification('Fonctionnalité mes vidéos à venir', 'info');
}

function openCreatorProfile(userId) {
    showNotification('Ouverture du profil créateur', 'info');
    // Implémentation future: afficher modale avec profil
}

function openGiftShop(videoId) {
    showNotification('Boutique de cadeaux - Vidéo: ' + videoId, 'info');
}

function openCommentsModal(videoId) {
    showNotification('Commentaires - Vidéo: ' + videoId, 'info');
}

function openLiveStream() {
    document.getElementById('liveModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeLiveModal() {
    document.getElementById('liveModal').style.display = 'none';
    document.body.style.overflow = 'auto';
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

function openVideoDetail(videoId) {
    showNotification('Détails vidéo: ' + videoId, 'info');
}

function editDraft(draftId) {
    showNotification('Édition brouillon: ' + draftId, 'info');
}

function deleteDraft(draftId) {
    if (confirm('Supprimer ce brouillon ?')) {
        currentUser.drafts = currentUser.drafts.filter(d => d.id !== draftId);
        saveUserDataToLocalStorage();
        loadProfileDrafts();
        showNotification('Brouillon supprimé', 'success');
    }
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
window.toggleFollow = toggleFollow;
window.saveVideo = saveVideo;
window.changeProfilePicture = changeProfilePicture;
window.openLiveStream = openLiveStream;
window.closeLiveModal = closeLiveModal;
window.startLiveStream = startLiveStream;
window.stopLiveStream = stopLiveStream;
window.sendChatMessage = sendChatMessage;
window.setupLiveStream = setupLiveStream;
window.openCameraForRecording = openCameraForRecording;
window.openFileUpload = openFileUpload;
window.showProfileTab = showProfileTab;
window.editDraft = editDraft;
window.deleteDraft = deleteDraft;
window.openVideoDetail = openVideoDetail;
window.changeSortingAlgorithm = changeSortingAlgorithm;

// Initialisation finale
window.onload = function() {
    console.log('🌍 TIKTAK - Prêt à être utilisé !');
    
    // Vérifier si nous sommes dans un iframe
    if (window.self !== window.top) {
        document.body.classList.add('iframe-mode');
    }
    
    // Vérifier les performances
    if ('performance' in window) {
        const perf = window.performance.getEntriesByType('navigation')[0];
        if (perf) {
            console.log('📊 Performance:', {
                loadTime: perf.loadEventEnd - perf.loadEventStart,
                domReady: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
                pageLoad: perf.loadEventEnd - perf.fetchStart
            });
        }
    }
};
