// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;
let realtimeUnsubscribe = null;
let isUploading = false;

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TIKTAK - Démarrage...');
    
    const loadingScreen = document.getElementById('loadingScreen');
    const appContainer = document.getElementById('appContainer');
    
    setTimeout(async () => {
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        
        try {
            await initializeApp();
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            showNotification('Erreur de chargement', 'error');
        }
    }, 2000);
});

async function initializeApp() {
    console.log('🚀 Initialisation TIKTAK...');
    
    try {
        currentUser = await firebaseApp.getCurrentUser();
        console.log('👤 Utilisateur connecté:', currentUser.username);
        
        videos = await firebaseApp.loadVideos(50);
        console.log(`📹 ${videos.length} vidéos chargées`);
        
        await cacheVideoUsers();
        setupEventListeners();
        await renderVideoFeed();
        updateUI();
        setupRealtimeListener();
        
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        console.log('✅ Application initialisée');
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur de connexion à la base de données', 'error');
    }
}

async function cacheVideoUsers() {
    const uniqueUserIds = [...new Set(videos.map(v => v.userId))];
    
    for (const userId of uniqueUserIds) {
        if (!usersCache[userId]) {
            try {
                const user = await firebaseApp.loadUser(userId);
                if (user) {
                    usersCache[userId] = user;
                }
            } catch (error) {
                console.warn(`⚠️ Impossible de charger l'utilisateur ${userId}:`, error);
            }
        }
    }
}

function setupRealtimeListener() {
    try {
        realtimeUnsubscribe = firebaseApp.setupRealtimeListener((newVideos) => {
            console.log('🆕 Nouvelle vidéo en temps réel:', newVideos.length);
            
            newVideos.forEach(newVideo => {
                if (!videos.some(v => v.id === newVideo.id)) {
                    videos.unshift(newVideo);
                }
            });
            
            renderVideoFeed();
            
            if (newVideos.length > 0) {
                showNotification('Nouvelle vidéo disponible ! 📹', 'info');
            }
        });
    } catch (error) {
        console.warn('⚠️ Écoute temps réel non disponible:', error);
    }
}

// ==================== GESTION DES VIDÉOS ====================
async function renderVideoFeed(sortingAlgorithm = 'latest') {
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
                    <i class="fas fa-plus"></i> Créer une vidéo
                </button>
            </div>
        `;
        return;
    }
    
    const algorithmControls = document.createElement('div');
    algorithmControls.className = 'algorithm-controls';
    algorithmControls.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>Trier par:</span>
            <select id="sortingAlgorithm" onchange="changeSortingAlgorithm(this.value)" style="background: #333; color: white; border: 1px solid #444; padding: 5px 10px; border-radius: 5px;">
                <option value="latest" ${sortingAlgorithm === 'latest' ? 'selected' : ''}>Plus récent</option>
                <option value="popular" ${sortingAlgorithm === 'popular' ? 'selected' : ''}>Plus populaires</option>
                <option value="trending" ${sortingAlgorithm === 'trending' ? 'selected' : ''}>Tendances</option>
            </select>
            <span class="stat-item">
                <i class="fas fa-video"></i>
                <span>${videos.length} vidéos</span>
            </span>
        </div>
    `;
    videoFeed.appendChild(algorithmControls);
    
    let videosToDisplay = [];
    switch(sortingAlgorithm) {
        case 'latest':
            videosToDisplay = [...videos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            break;
        case 'popular':
            videosToDisplay = [...videos].sort((a, b) => b.views - a.views);
            break;
        case 'trending':
            videosToDisplay = getTrendingVideos();
            break;
        default:
            videosToDisplay = [...videos];
    }
    
    videosToDisplay.forEach((video, index) => {
        const videoElement = createVideoElement(video, index < 1);
        videoFeed.appendChild(videoElement);
    });
}

function getTrendingVideos() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return [...videos]
        .filter(video => {
            const videoTime = video.createdAt.getTime();
            const isRecent = videoTime > oneDayAgo;
            const hasEngagement = (video.likes || 0) > 10 || (video.shares || 0) > 5;
            return isRecent && hasEngagement;
        })
        .sort((a, b) => {
            const aScore = (a.likes || 0) * 2 + (a.shares || 0) * 3 + (a.comments || 0);
            const bScore = (b.likes || 0) * 2 + (b.shares || 0) * 3 + (b.comments || 0);
            return bScore - aScore;
        });
}

function changeSortingAlgorithm(algorithm) {
    renderVideoFeed(algorithm);
}

function createVideoElement(video, autoPlay = false) {
    const isLiked = currentUser?.likedVideos?.includes(video.id) || false;
    const user = usersCache[video.userId] || {};
    const isFollowing = currentUser?.following?.includes(video.userId) || false;
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    container.innerHTML = `
        <div class="video-wrapper">
            <video 
                ${autoPlay ? 'autoplay muted' : ''}
                onclick="toggleVideoPlay(this)"
                loop
                preload="metadata"
                style="width: 100%; height: 600px; object-fit: cover; background: #000;"
                playsinline
                webkit-playsinline
            >
                <source src="${video.videoUrl}" type="video/mp4">
                <source src="${video.videoUrl}" type="video/webm">
                Votre navigateur ne supporte pas la vidéo.
            </video>
            
            <button class="manual-play-btn" onclick="toggleVideoPlay(this.parentElement.querySelector('video'))" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 242, 254, 0.9); color: white; border: none; border-radius: 50%; width: 70px; height: 70px; font-size: 28px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-play"></i>
            </button>
        </div>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${user.avatar || video.avatar || 'https://i.pravatar.cc/150?img=1'}" 
                     alt="${user.username || video.username || 'Utilisateur'}" 
                     onclick="openCreatorProfile('${video.userId}')"
                     style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #00f2fe; cursor: pointer;">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4 style="margin: 0; font-size: 16px;">${user.username || video.username || 'Utilisateur'}</h4>
                        ${isFollowing ? '<span class="following-badge">Abonné</span>' : ''}
                    </div>
                    <p class="video-caption" style="margin: 5px 0; font-size: 14px;">${video.caption || 'Pas de description'}</p>
                    <div class="hashtags">
                        ${(video.hashtags || []).map(tag => `<span class="hashtag">${tag}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${video.userId}', this)" style="background: ${isFollowing ? '#00f2fe' : '#333'}; color: ${isFollowing ? '#000' : 'white'}; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer;">
                    ${isFollowing ? '<i class="fas fa-check"></i> Abonné' : '<i class="fas fa-plus"></i> Suivre'}
                </button>
            </div>
            
            <div class="video-stats" style="margin-top: 10px; display: flex; justify-content: space-between; font-size: 14px; color: #aaa;">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views || 0)} vues
                </div>
                <div class="video-details">
                    <span class="duration">${video.duration || '00:15'}</span>
                    <span class="time-ago">${getTimeAgo(video.createdAt.getTime())}</span>
                </div>
            </div>
        </div>
        
        <div class="video-actions" style="position: absolute; right: 15px; bottom: 100px; display: flex; flex-direction: column; gap: 20px;">
            <div class="action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${video.id}')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; color: ${isLiked ? '#ff4757' : 'white'}">
                <i class="fas fa-heart" style="font-size: 24px; margin-bottom: 5px;"></i>
                <span>${formatNumber(video.likes || 0)}</span>
            </div>
            
            <div class="action" onclick="openCommentsModal('${video.id}')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; color: white">
                <i class="fas fa-comment" style="font-size: 24px; margin-bottom: 5px;"></i>
                <span>${formatNumber(video.comments || 0)}</span>
            </div>
            
            <div class="action" onclick="shareVideo('${video.id}')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; color: white">
                <i class="fas fa-share" style="font-size: 24px; margin-bottom: 5px;"></i>
                <span>${formatNumber(video.shares || 0)}</span>
            </div>
        </div>
    `;
    
    return container;
}

async function toggleVideoPlay(videoElement) {
    if (!videoElement) return;
    
    const container = videoElement.closest('.video-container');
    const playBtn = container.querySelector('.manual-play-btn');
    
    if (videoElement.paused) {
        if (currentPlayingVideo && currentPlayingVideo !== videoElement) {
            currentPlayingVideo.pause();
            const prevBtn = currentPlayingVideo.closest('.video-container')?.querySelector('.manual-play-btn');
            if (prevBtn) prevBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        try {
            // Activer le son si nécessaire
            if (videoElement.muted) {
                videoElement.muted = false;
            }
            
            await videoElement.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            currentPlayingVideo = videoElement;
            
            const videoId = container.dataset.videoId;
            await firebaseApp.incrementViews(videoId);
            
            const video = videos.find(v => v.id === videoId);
            if (video) {
                video.views = (video.views || 0) + 1;
                const viewCount = container.querySelector('.view-count');
                if (viewCount) {
                    viewCount.innerHTML = `<i class="fas fa-eye"></i> ${formatNumber(video.views)} vues`;
                }
            }
        } catch (error) {
            console.error('Erreur lecture vidéo:', error);
            showNotification('Erreur de lecture vidéo', 'error');
        }
    } else {
        videoElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingVideo = null;
    }
}
