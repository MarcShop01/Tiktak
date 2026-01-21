// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;
let realtimeUnsubscribe = null;
let isUploading = false;
let uploadTask = null;

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TIKTAK - Démarrage...');
    
    // Masquer l'écran de chargement après 2 secondes
    setTimeout(async () => {
        try {
            await initializeApp();
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            showNotification('Erreur de chargement de l\'application', 'error');
        }
    }, 1500);
});

async function initializeApp() {
    console.log('🚀 Initialisation TIKTAK...');
    
    try {
        // Charger l'utilisateur depuis Firebase
        currentUser = await firebaseApp.getCurrentUser();
        console.log('👤 Utilisateur connecté:', currentUser.username);
        
        // Charger les vidéos
        videos = await firebaseApp.loadVideos(50);
        console.log(`📹 ${videos.length} vidéos chargées`);
        
        // Mettre en cache les utilisateurs
        await cacheVideoUsers();
        
        // Configurer les écouteurs d'événements
        setupEventListeners();
        
        // Afficher les vidéos
        await renderVideoFeed();
        
        // Mettre à jour l'interface
        updateUI();
        
        // Configurer l'écoute en temps réel
        setupRealtimeListener();
        
        // Afficher l'appli
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        console.log('✅ Application initialisée');
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur de connexion à la base de données', 'error');
        
        // Afficher quand même l'appli en mode dégradé
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        
        // Afficher des vidéos de démo en cas d'erreur
        videos = getDemoVideos();
        renderVideoFeed();
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
            
            // Ajouter les nouvelles vidéos au début de la liste
            newVideos.forEach(newVideo => {
                if (!videos.some(v => v.id === newVideo.id)) {
                    videos.unshift(newVideo);
                }
            });
            
            // Re-render le flux
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
    
    // Contrôles de tri
    const algorithmControls = document.createElement('div');
    algorithmControls.className = 'algorithm-controls';
    algorithmControls.innerHTML = `
        <div class="controls-wrapper">
            <span>Trier par:</span>
            <select id="sortingAlgorithm" onchange="changeSortingAlgorithm(this.value)">
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
    
    // Trier les vidéos
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
    
    // Afficher les vidéos
    videosToDisplay.forEach((video, index) => {
        const videoElement = createVideoElement(video, index < 1); // Seule la première vidéo en autoplay
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
                playsinline
                webkit-playsinline
            >
                <source src="${video.videoUrl}" type="video/mp4">
                <source src="${video.videoUrl}" type="video/webm">
                Votre navigateur ne supporte pas la vidéo.
            </video>
            
            <button class="manual-play-btn" onclick="toggleVideoPlay(this.parentElement.querySelector('video'))">
                <i class="fas fa-play"></i>
            </button>
        </div>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${user.avatar || video.avatar || 'https://i.pravatar.cc/150?img=1'}" 
                     alt="${user.username || video.username || 'Utilisateur'}" 
                     onclick="openCreatorProfile('${video.userId}')"
                     class="creator-avatar">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4>${user.username || video.username || 'Utilisateur'}</h4>
                        ${isFollowing ? '<span class="following-badge">Abonné</span>' : ''}
                    </div>
                    <p class="video-caption">${video.caption || 'Pas de description'}</p>
                    <div class="hashtags">
                        ${(video.hashtags || []).map(tag => `<span class="hashtag">${tag}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${video.userId}', this)">
                    ${isFollowing ? '<i class="fas fa-check"></i> Abonné' : '<i class="fas fa-plus"></i> Suivre'}
                </button>
            </div>
            
            <div class="video-stats">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views || 0)} vues
                </div>
                <div class="video-details">
                    <span class="duration">${video.duration || '00:15'}</span>
                    <span class="time-ago">${getTimeAgo(video.createdAt.getTime())}</span>
                </div>
            </div>
        </div>
        
        <div class="video-actions">
            <div class="action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${video.id}')">
                <i class="fas fa-heart"></i>
                <span>${formatNumber(video.likes || 0)}</span>
            </div>
            
            <div class="action" onclick="openCommentsModal('${video.id}')">
                <i class="fas fa-comment"></i>
                <span>${formatNumber(video.comments || 0)}</span>
            </div>
            
            <div class="action" onclick="shareVideo('${video.id}')">
                <i class="fas fa-share"></i>
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
        // Arrêter la vidéo en cours
        if (currentPlayingVideo && currentPlayingVideo !== videoElement) {
            currentPlayingVideo.pause();
            const prevBtn = currentPlayingVideo.closest('.video-container')?.querySelector('.manual-play-btn');
            if (prevBtn) prevBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        try {
            await videoElement.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            currentPlayingVideo = videoElement;
            
            // Incrémenter les vues
            const videoId = container.dataset.videoId;
            await firebaseApp.incrementViews(videoId);
            
            // Mettre à jour localement
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
            showNotification('Impossible de lire la vidéo', 'error');
        }
    } else {
        videoElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingVideo = null;
    }
}

// ==================== INTERACTIONS ====================
async function toggleLike(videoId) {
    try {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;
        
        const isLiked = currentUser?.likedVideos?.includes(videoId);
        
        if (!isLiked) {
            // Ajouter le like
            video.likes = (video.likes || 0) + 1;
            currentUser.likedVideos = currentUser.likedVideos || [];
            currentUser.likedVideos.push(videoId);
            
            await firebaseApp.updateLikes(videoId, currentUser.id, 'like');
            await firebaseApp.updateUser(currentUser.id, {
                likedVideos: currentUser.likedVideos
            });
            
            showHeartAnimation();
            showNotification('Vidéo aimée ! ❤️', 'success');
            
            // Récompense
            currentUser.coins = (currentUser.coins || 0) + 1;
            await firebaseApp.updateUser(currentUser.id, {
                coins: currentUser.coins
            });
            
        } else {
            // Retirer le like
            video.likes = Math.max(0, (video.likes || 1) - 1);
            currentUser.likedVideos = (currentUser.likedVideos || []).filter(id => id !== videoId);
            
            await firebaseApp.updateLikes(videoId, currentUser.id, 'unlike');
            await firebaseApp.updateUser(currentUser.id, {
                likedVideos: currentUser.likedVideos
            });
            
            showNotification('Like retiré', 'info');
        }
        
        // Mettre à jour l'interface
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        if (container) {
            const likeElement = container.querySelector('.action:nth-child(1)');
            likeElement.className = `action ${!isLiked ? 'liked' : ''}`;
            likeElement.querySelector('span').textContent = formatNumber(video.likes);
        }
        
        updateUI();
        
    } catch (error) {
        console.error('❌ Erreur like:', error);
        showNotification('Erreur lors du like', 'error');
    }
}

async function toggleFollow(userId, buttonElement) {
    try {
        currentUser.following = currentUser.following || [];
        const isFollowing = currentUser.following.includes(userId);
        
        if (!isFollowing) {
            // Suivre
            currentUser.following.push(userId);
            await firebaseApp.followUser(currentUser.id, userId);
            buttonElement.classList.add('following');
            buttonElement.innerHTML = '<i class="fas fa-check"></i> Abonné';
            buttonElement.style.background = '#00f2fe';
            buttonElement.style.color = '#000';
            showNotification('Utilisateur suivi !', 'success');
            
            // Récompense
            currentUser.coins = (currentUser.coins || 0) + 5;
            await firebaseApp.updateUser(currentUser.id, {
                coins: currentUser.coins
            });
        } else {
            // Se désabonner
            currentUser.following = currentUser.following.filter(id => id !== userId);
            
            await firebaseApp.updateUser(currentUser.id, {
                following: currentUser.following
            });
            
            buttonElement.classList.remove('following');
            buttonElement.innerHTML = '<i class="fas fa-plus"></i> Suivre';
            buttonElement.style.background = '#333';
            buttonElement.style.color = 'white';
            showNotification('Abonnement annulé', 'info');
        }
        
        updateUI();
        
    } catch (error) {
        console.error('❌ Erreur follow:', error);
        showNotification('Erreur lors du follow', 'error');
    }
}

async function shareVideo(videoId) {
    try {
        const video = videos.find(v => v.id === videoId);
        if (!video) {
            showNotification('Vidéo non trouvée', 'error');
            return;
        }
        
        // Incrémenter les partages
        video.shares = (video.shares || 0) + 1;
        await firebaseApp.updateVideo(videoId, { shares: video.shares });
        
        // URL de partage
        const shareUrl = `${window.location.origin}${window.location.pathname}?video=${videoId}`;
        const shareText = `Regarde cette vidéo sur TIKTAK: ${video.caption}`;
        
        // Essayer Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'TIKTAK',
                    text: shareText,
                    url: shareUrl
                });
                console.log('✅ Partage réussi via Web Share API');
            } catch (shareError) {
                // L'utilisateur a annulé le partage
                console.log('Partage annulé');
                await copyToClipboard(`${shareText}\n${shareUrl}`);
            }
        } else {
            // Fallback
            await copyToClipboard(`${shareText}\n${shareUrl}`);
        }
        
        // Récompense
        currentUser.coins = (currentUser.coins || 0) + 3;
        await firebaseApp.updateUser(currentUser.id, {
            coins: currentUser.coins
        });
        
        // Mettre à jour l'interface
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        if (container) {
            const shareElement = container.querySelector('.action:nth-child(3) span');
            if (shareElement) {
                shareElement.textContent = formatNumber(video.shares);
            }
        }
        
        updateUI();
        showNotification('Vidéo partagée ! 📤', 'success');
        
    } catch (error) {
        console.error('❌ Erreur partage:', error);
        showNotification('Erreur lors du partage', 'error');
    }
}

async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            showNotification('Lien copié ! 📋', 'success');
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('Lien copié ! 📋', 'success');
        }
        return true;
    } catch (err) {
        console.error('Erreur copie:', err);
        showNotification('Erreur lors de la copie', 'error');
        return false;
    }
}
