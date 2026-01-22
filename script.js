// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;
let realtimeUnsubscribe = null;

// ==================== FONCTIONS D'AIDE ====================

// Fonction pour obtenir le type MIME d'une vidéo
function getMimeType(url) {
    if (!url) return 'video/mp4';
    
    const extension = url.split('.').pop().toLowerCase();
    switch(extension) {
        case 'mp4':
        case 'm4v':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'ogg':
        case 'ogv':
            return 'video/ogg';
        case 'mov':
            return 'video/quicktime';
        case 'avi':
            return 'video/x-msvideo';
        default:
            return 'video/mp4'; // Par défaut, on suppose MP4
    }
}

// Fonction pour vérifier si une vidéo est lisible
async function isVideoPlayable(videoUrl) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
            resolve(true);
        };
        
        video.onerror = () => {
            resolve(false);
        };
        
        video.src = videoUrl;
        
        // Timeout après 5 secondes
        setTimeout(() => resolve(false), 5000);
    });
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TIKTAK - Démarrage...');
    
    // Masquer l'écran de chargement après 2 secondes max
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
    for (const video of videosToDisplay) {
        try {
            // Vérifier si la vidéo est lisible
            const isPlayable = await isVideoPlayable(video.videoUrl);
            if (!isPlayable) {
                console.warn(`⚠️ Vidéo ${video.id} non lisible: ${video.videoUrl}`);
                continue;
            }
            
            const videoElement = createVideoElement(video, false); // Pas d'autoplay pour éviter les problèmes
            videoFeed.appendChild(videoElement);
        } catch (error) {
            console.error(`❌ Erreur création vidéo ${video.id}:`, error);
        }
    }
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
    
    const mimeType = getMimeType(video.videoUrl);
    const videoSource = video.videoUrl;
    
    container.innerHTML = `
        <div class="video-player-wrapper" style="position: relative; width: 100%; height: 600px; background: #000;">
            <video 
                id="video-${video.id}"
                poster="${video.thumbnail}"
                onclick="toggleVideoPlay(this)"
                ${autoPlay ? 'autoplay muted playsinline' : ''}
                loop
                preload="metadata"
                playsinline
                webkit-playsinline
                x5-playsinline
                style="width: 100%; height: 100%; object-fit: cover;"
            >
                <source src="${videoSource}" type="${mimeType}">
                Votre navigateur ne supporte pas la lecture de vidéos.
            </video>
            
            <div class="video-loading-indicator" style="display: none;">
                <div class="video-loading-spinner"></div>
            </div>
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
        
        <button class="manual-play-btn" onclick="toggleVideoPlay(this.parentElement.querySelector('video'))" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0, 242, 254, 0.9); color: white; border: none; border-radius: 50%; width: 70px; height: 70px; font-size: 28px; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-play"></i>
        </button>
    `;
    
    // Configurer le gestionnaire d'erreur vidéo
    const videoElement = container.querySelector('video');
    if (videoElement) {
        videoElement.addEventListener('error', function(e) {
            console.error(`❌ Erreur lecture vidéo ${video.id}:`, e.target.error);
            showNotification('Erreur de lecture vidéo', 'error');
            
            // Afficher un fallback
            const wrapper = videoElement.parentElement;
            wrapper.innerHTML = `
                <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; background: #111;">
                    <i class="fas fa-video-slash" style="font-size: 50px; margin-bottom: 20px; color: #ff4757;"></i>
                    <h3>Vidéo non disponible</h3>
                    <p>Cette vidéo ne peut pas être lue sur cet appareil.</p>
                    <button class="btn btn-primary" onclick="shareVideo('${video.id}')">
                        <i class="fas fa-share"></i> Partager
                    </button>
                </div>
            `;
        });
        
        videoElement.addEventListener('waiting', function() {
            const loadingIndicator = container.querySelector('.video-loading-indicator');
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
        });
        
        videoElement.addEventListener('playing', function() {
            const loadingIndicator = container.querySelector('.video-loading-indicator');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        });
    }
    
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
            // Forcer le chargement avant de jouer
            videoElement.load();
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
            
            // Essayer sans son
            try {
                videoElement.muted = true;
                await videoElement.play();
                playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                currentPlayingVideo = videoElement;
            } catch (mutedError) {
                console.error('Erreur même en muet:', mutedError);
                playBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
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

// ==================== RECHERCHE ====================

async function performSearch(query) {
    const searchInput = document.getElementById('searchInput');
    const searchValue = query || (searchInput ? searchInput.value : '');
    
    if (!searchValue.trim()) {
        showNotification('Veuillez entrer un terme de recherche', 'info');
        return;
    }
    
    try {
        console.log(`🔍 Lancement de la recherche: "${searchValue}"`);
        const results = await firebaseApp.searchVideos(searchValue);
        displaySearchResults(results, searchValue);
    } catch (error) {
        console.error('❌ Erreur recherche:', error);
        showNotification('Erreur lors de la recherche', 'error');
    }
}

function displaySearchResults(results, query) {
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
                    <i class="fas fa-home"></i> Retour à l'accueil
                </button>
            </div>
        `;
        return;
    }
    
    const searchHeader = document.createElement('div');
    searchHeader.className = 'search-header';
    searchHeader.innerHTML = `
        <h3 style="color: #00f2fe; margin-bottom: 20px;">Résultats pour "${query}" (${results.length})</h3>
    `;
    videoFeed.appendChild(searchHeader);
    
    results.forEach(video => {
        videoFeed.appendChild(createVideoElement(video));
    });
    
    showNotification(`${results.length} vidéo(s) trouvée(s)`, 'success');
}

// ==================== COMMENTAIRES ====================

async function openCommentsModal(videoId) {
    try {
        const video = videos.find(v => v.id === videoId);
        if (!video) {
            showNotification('Vidéo non trouvée', 'error');
            return;
        }
        
        // Récupérer les commentaires depuis Firebase
        const commentsSnapshot = await firebaseApp.db.collection('videos').doc(videoId).collection('comments')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const comments = [];
        commentsSnapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        // Créer la modale de commentaires
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2>Commentaires (${comments.length})</h2>
                
                <div class="comments-container" style="max-height: 400px; overflow-y: auto; margin: 20px 0;">
                    ${comments.length > 0 ? comments.map(comment => `
                        <div class="comment-item" style="background: #222; padding: 10px; margin: 10px 0; border-radius: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <img src="${comment.userAvatar || 'https://i.pravatar.cc/150?img=1'}" 
                                     style="width: 30px; height: 30px; border-radius: 50%;">
                                <strong>${comment.username || 'Utilisateur'}</strong>
                                <small style="color: #888; font-size: 12px;">${getTimeAgo(comment.createdAt?.toDate?.().getTime() || Date.now())}</small>
                            </div>
                            <p style="margin: 0; color: #ccc;">${comment.text}</p>
                        </div>
                    `).join('') : `
                        <div class="empty-state" style="text-align: center; padding: 40px 20px;">
                            <i class="fas fa-comment-slash" style="font-size: 50px; color: #444;"></i>
                            <h3>Aucun commentaire</h3>
                            <p>Soyez le premier à commenter !</p>
                        </div>
                    `}
                </div>
                
                <div class="comment-form" style="margin-top: 20px;">
                    <textarea id="newComment" placeholder="Ajouter un commentaire..." 
                              style="width: 100%; padding: 10px; background: #333; border: 1px solid #444; border-radius: 5px; color: white; resize: vertical; min-height: 60px;"></textarea>
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Annuler</button>
                        <button class="btn btn-primary" onclick="postComment('${videoId}')">Commenter</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('❌ Erreur ouverture commentaires:', error);
        showNotification('Impossible d\'ouvrir les commentaires', 'error');
    }
}

async function postComment(videoId) {
    try {
        const commentInput = document.getElementById('newComment');
        const commentText = commentInput.value.trim();
        
        if (!commentText) {
            showNotification('Veuillez écrire un commentaire', 'error');
            return;
        }
        
        if (!currentUser) {
            showNotification('Vous devez être connecté pour commenter', 'error');
            return;
        }
        
        // Ajouter le commentaire dans Firebase
        const commentData = {
            userId: currentUser.id,
            username: currentUser.username,
            userAvatar: currentUser.avatar,
            text: commentText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            videoId: videoId
        };
        
        await firebaseApp.db.collection('videos').doc(videoId).collection('comments').add(commentData);
        
        // Incrémenter le compteur de commentaires
        const video = videos.find(v => v.id === videoId);
        if (video) {
            video.comments = (video.comments || 0) + 1;
            await firebaseApp.updateVideo(videoId, { comments: video.comments });
        }
        
        showNotification('Commentaire publié ! 💬', 'success');
        
        // Fermer la modale
        document.querySelector('.modal-overlay')?.remove();
        
        // Recharger les commentaires
        openCommentsModal(videoId);
        
    } catch (error) {
        console.error('❌ Erreur publication commentaire:', error);
        showNotification('Erreur lors de la publication', 'error');
    }
}

// ==================== CRÉATION DE VIDÉO ====================

function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
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

function openFileUpload() {
    document.getElementById('createOptions').style.display = 'none';
    document.getElementById('videoUploadSection').style.display = 'block';
    document.getElementById('fileUploadControls').style.display = 'block';
    document.getElementById('cameraControls').style.display = 'none';
}

function openCameraForRecording() {
    openFileUpload();
    showNotification('Fonction caméra à venir', 'info');
}

function openFilePicker() {
    document.getElementById('videoInput').click();
}

function setupVideoInput() {
    const videoInput = document.getElementById('videoInput');
    if (videoInput) {
        videoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                processVideoFile(file);
            }
        });
    }
}

function processVideoFile(file) {
    // Vérifier le type de fichier
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Format non supporté. Utilisez MP4, WebM ou OGG', 'error');
        return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
        showNotification('Vidéo trop volumineuse (max 100MB)', 'error');
        return;
    }
    
    currentVideoFile = file;
    const reader = new FileReader();
    
    document.getElementById('videoProcessing').style.display = 'flex';
    
    reader.onload = function(e) {
        const videoElement = document.getElementById('previewVideo');
        const placeholder = document.querySelector('.preview-placeholder');
        
        videoElement.src = e.target.result;
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Vérifier si la vidéo est lisible
        videoElement.addEventListener('loadedmetadata', function() {
            setTimeout(() => {
                document.getElementById('videoProcessing').style.display = 'none';
                document.getElementById('publishBtn').disabled = false;
                
                document.getElementById('videoFileInfo').innerHTML = `
                    <i class="fas fa-file-video"></i>
                    <span>${file.name} (${formatFileSize(file.size)}) - ${getMimeType(file.name)}</span>
                `;
            }, 1000);
        });
        
        videoElement.addEventListener('error', function() {
            document.getElementById('videoProcessing').style.display = 'none';
            showNotification('Format vidéo non supporté', 'error');
            resetCreateModal();
        });
    };
    
    reader.readAsDataURL(file);
}

function formatFileSize(bytes) {
    if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + ' MB';
    if (bytes >= 1000) return (bytes / 1000).toFixed(1) + ' KB';
    return bytes + ' B';
}

function simulateRecording() {
    showNotification('Utilisation d\'une vidéo de démo', 'info');
    
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    
    const demoVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    ];
    
    videoElement.src = demoVideos[Math.floor(Math.random() * demoVideos.length)];
    videoElement.style.display = 'block';
    placeholder.style.display = 'none';
    
    currentVideoFile = {
        name: 'demo_video.mp4',
        size: 15000000,
        type: 'video/mp4'
    };
    
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>demo_video.mp4 (15 MB) - video/mp4</span>
    `;
    
    document.getElementById('publishBtn').disabled = false;
}

async function publishVideo() {
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!caption) {
        showNotification('Veuillez ajouter une légende', 'error');
        return;
    }
    
    const publishBtn = document.getElementById('publishBtn');
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    try {
        const hashtags = extractHashtags(caption);
        const videoUrl = document.getElementById('previewVideo').src || 
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        
        const videoData = {
            userId: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
            videoUrl: videoUrl,
            thumbnail: generateThumbnail(),
            caption: caption,
            isMonetized: isMonetized,
            hashtags: hashtags,
            duration: '00:15',
            privacy: privacy,
            videoType: getMimeType(videoUrl)
        };
        
        const newVideo = await firebaseApp.saveVideo(videoData);
        videos.unshift(newVideo);
        
        closeCreateModal();
        renderVideoFeed();
        updateUI();
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        
    } catch (error) {
        console.error('❌ Erreur publication:', error);
        showNotification('Erreur lors de la publication', 'error');
    } finally {
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
    }
}

function saveAsDraft() {
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    
    if (!currentUser.drafts) currentUser.drafts = [];
    
    currentUser.drafts.push({
        id: 'draft_' + Date.now(),
        caption: caption || 'Sans titre',
        date: new Date().toLocaleDateString('fr-FR'),
        isMonetized: isMonetized,
        timestamp: Date.now()
    });
    
    firebaseApp.updateUser(currentUser.id, {
        drafts: currentUser.drafts
    }).then(() => {
        showNotification('Brouillon sauvegardé 📁', 'success');
        closeCreateModal();
    }).catch(error => {
        showNotification('Erreur sauvegarde brouillon', 'error');
    });
}

function resetCreateModal() {
    document.getElementById('videoCaption').value = '';
    document.getElementById('monetizeVideo').checked = false;
    document.getElementById('videoPrivacy').value = 'public';
    
    const videoElement = document.getElementById('previewVideo');
    videoElement.src = '';
    videoElement.style.display = 'none';
    
    document.querySelector('.preview-placeholder').style.display = 'flex';
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>Aucun fichier sélectionné</span>
    `;
    
    document.getElementById('createOptions').style.display = 'flex';
    document.getElementById('videoUploadSection').style.display = 'none';
    document.getElementById('publishBtn').disabled = true;
    
    currentVideoFile = null;
}

// ==================== UTILITAIRES ====================

function formatNumber(num) {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'Récemment';
    
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
    
    setTimeout(() => heart.remove(), 1000);
}

function showNotification(message, type = 'info') {
    let container = document.getElementById('notificationsContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationsContainer';
        container.className = 'notifications-container';
        container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 1001;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        background: #222;
        border-radius: 10px;
        padding: 15px;
        border-left: 4px solid ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4757' : '#00f2fe'};
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s;
        max-width: 300px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    notification.innerHTML = `
        <div class="notification-content" style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification" onclick="this.parentElement.remove()" style="background: none; border: none; color: #888; cursor: pointer; font-size: 18px;">&times;</button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) notification.remove();
    }, 5000);
}

function updateUI() {
    try {
        const coinCount = document.getElementById('coinCount');
        if (coinCount && currentUser) {
            coinCount.textContent = currentUser.coins || 0;
        }
        
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && currentUser.avatar) {
            userAvatar.src = currentUser.avatar;
        }
        
        console.log('✅ Interface utilisateur mise à jour');
    } catch (error) {
        console.error('❌ Erreur mise à jour UI:', error);
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
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function openSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.style.display = searchInput.style.display === 'none' ? 'block' : 'block';
    if (searchInput.style.display === 'block') {
        searchInput.focus();
        searchInput.select();
    }
}

// ==================== ÉCOUTEURS D'ÉVÉNEMENTS ====================

function setupEventListeners() {
    console.log('🔧 Configuration des écouteurs d\'événements...');
    
    // Recherche par Entrée
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch(this.value);
            }
        });
    }
    
    // Bouton de recherche
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            performSearch();
        });
    }
    
    // Input vidéo
    setupVideoInput();
    
    // Input photo de profil
    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentUser.avatar = e.target.result;
                    updateUI();
                    firebaseApp.updateUser(currentUser.id, { avatar: currentUser.avatar });
                    showNotification('Photo de profil mise à jour ✅', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Fermer les menus en cliquant à l'extérieur
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('userDropdown');
        const userMenu = document.querySelector('.user-menu');
        if (menu && menu.style.display === 'block' && userMenu && !userMenu.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
        
        // Fermer les modales
        ['createModal', 'profileModal', 'settingsModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.style.display === 'flex' && e.target === modal) {
                if (modalId === 'createModal') closeCreateModal();
                if (modalId === 'profileModal') closeProfile();
                if (modalId === 'settingsModal') closeSettings();
            }
        });
    });
    
    // Navigation mobile
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Gestion du rafraîchissement
    window.addEventListener('beforeunload', function() {
        if (realtimeUnsubscribe) {
            realtimeUnsubscribe();
        }
    });
    
    console.log('✅ Écouteurs d\'événements configurés');
}

// ==================== FONCTIONS NON IMPLÉMENTÉES ====================

function openWallet() {
    showNotification('Portefeuille - Solde: ' + (currentUser.coins || 0) + ' coins', 'info');
}

function openNotifications() {
    showNotification('Aucune nouvelle notification', 'info');
}

function showTrending() {
    renderVideoFeed('trending');
}

function showFollowing() {
    const followingVideos = videos.filter(v => currentUser.following?.includes(v.userId));
    if (followingVideos.length === 0) {
        showNotification('Vous ne suivez personne', 'info');
        renderVideoFeed();
    } else {
        const videoFeed = document.getElementById('videoFeed');
        videoFeed.innerHTML = '';
        followingVideos.forEach(video => videoFeed.appendChild(createVideoElement(video)));
        showNotification('Affichage des abonnements', 'info');
    }
}

function showFavorites() {
    const favoriteVideos = videos.filter(v => currentUser.likedVideos?.includes(v.id));
    if (favoriteVideos.length === 0) {
        showNotification('Vous n\'avez pas de vidéos favorites', 'info');
    } else {
        const videoFeed = document.getElementById('videoFeed');
        videoFeed.innerHTML = '';
        favoriteVideos.forEach(video => videoFeed.appendChild(createVideoElement(video)));
        showNotification('Affichage des favoris', 'info');
    }
}

function showMyVideos() {
    const myVideos = videos.filter(v => v.userId === currentUser.id);
    if (myVideos.length === 0) {
        showNotification('Vous n\'avez pas de vidéos', 'info');
    } else {
        const videoFeed = document.getElementById('videoFeed');
        videoFeed.innerHTML = '';
        myVideos.forEach(video => videoFeed.appendChild(createVideoElement(video)));
        showNotification('Affichage de vos vidéos', 'info');
    }
}

function openCreatorProfile(userId) {
    showNotification('Profil créateur: ' + (usersCache[userId]?.username || userId), 'info');
}

function openGiftShop(videoId) {
    showNotification('Boutique de cadeaux pour la vidéo: ' + videoId, 'info');
}

function openLiveStream() {
    showNotification('Live streaming à venir', 'info');
}

function clearLocalStorage() {
    if (confirm('Réinitialiser les données locales ?')) {
        localStorage.clear();
        location.reload();
    }
}

function logout() {
    if (confirm('Se déconnecter ?')) {
        try {
            firebaseApp.auth.signOut().then(() => {
                localStorage.clear();
                location.reload();
            });
        } catch (error) {
            location.reload();
        }
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
        firebaseApp.updateUser(currentUser.id, { drafts: currentUser.drafts });
        showNotification('Brouillon supprimé', 'success');
    }
}

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
    document.getElementById('profileUsername').textContent = currentUser.username || 'Utilisateur';
    document.getElementById('profileCoins').textContent = currentUser.coins || 0;
    document.getElementById('profileAvatar').src = currentUser.avatar || 'https://i.pravatar.cc/150?img=1';
    
    const userVideos = videos.filter(v => v.userId === currentUser.id);
    const stats = `${userVideos.length} vidéos • ${currentUser.followers?.length || 0} abonnés • ${currentUser.following?.length || 0} abonnements`;
    document.getElementById('profileStats').textContent = stats;
    
    showProfileTab('videos');
}

function showProfileTab(tabName) {
    // Désactiver tous les onglets
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.profile-content').forEach(content => content.style.display = 'none');
    
    // Activer l'onglet sélectionné
    const tabs = document.querySelectorAll('.profile-tab');
    const clickedTab = event ? event.target : tabs[0];
    clickedTab.classList.add('active');
    
    const contentId = 'profile' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const content = document.getElementById(contentId);
    if (content) content.style.display = 'block';
    
    // Charger le contenu
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
        return;
    }
    
    container.innerHTML = `
        <div class="videos-grid">
            ${userVideos.map(video => `
                <div class="video-thumbnail" onclick="openVideoDetail('${video.id}')">
                    <img src="${video.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432'}" alt="${video.caption || ''}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
                    <div class="thumbnail-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 5px; display: flex; justify-content: space-between; color: white; font-size: 12px;">
                        <span><i class="fas fa-eye"></i> ${formatNumber(video.views || 0)}</span>
                        <span><i class="fas fa-heart"></i> ${formatNumber(video.likes || 0)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
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
        return;
    }
    
    container.innerHTML = `
        <div class="videos-grid">
            ${likedVideos.map(video => `
                <div class="video-thumbnail" onclick="openVideoDetail('${video.id}')">
                    <img src="${video.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432'}" alt="${video.caption || ''}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px;">
                    <div class="thumbnail-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 5px; display: flex; justify-content: space-between; color: white; font-size: 12px;">
                        <span><i class="fas fa-eye"></i> ${formatNumber(video.views || 0)}</span>
                        <span><i class="fas fa-heart"></i> ${formatNumber(video.likes || 0)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
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
        return;
    }
    
    container.innerHTML = `
        <div class="drafts-list">
            ${currentUser.drafts.map(draft => `
                <div class="draft-item" style="background: #333; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #00f2fe; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin: 0; color: white;">${draft.caption}</h4>
                        <p style="margin: 5px 0 0 0; color: #aaa; font-size: 12px;">Crée le ${draft.date}</p>
                        ${draft.isMonetized ? '<span class="draft-monetized" style="background: #ffd700; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; margin-left: 10px;">Monétisé</span>' : ''}
                    </div>
                    <div class="draft-actions" style="display: flex; gap: 10px;">
                        <button class="btn btn-small btn-primary" onclick="editDraft('${draft.id}')" style="padding: 5px 10px; font-size: 12px; background: #00f2fe; color: #000; border: none; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteDraft('${draft.id}')" style="padding: 5px 10px; font-size: 12px; background: #ff4757; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function changeProfilePicture() {
    document.getElementById('profilePictureInput').click();
}

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
    document.getElementById('settingsUsername').value = currentUser.username || 'Utilisateur';
    document.getElementById('settingsEmail').value = currentUser.email || '';
    document.getElementById('settingsNotifications').checked = currentUser.settings?.notifications || true;
    document.getElementById('settingsAutoplay').checked = currentUser.settings?.autoplay || true;
}

async function saveSettings() {
    const username = document.getElementById('settingsUsername').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    const notifications = document.getElementById('settingsNotifications').checked;
    const autoplay = document.getElementById('settingsAutoplay').checked;
    
    if (username && username !== currentUser.username) {
        currentUser.username = username;
        
        // Mettre à jour les vidéos de l'utilisateur
        for (const video of videos) {
            if (video.userId === currentUser.id) {
                video.username = username;
                await firebaseApp.updateVideo(video.id, { username: username });
            }
        }
    }
    
    if (email) currentUser.email = email;
    
    currentUser.settings = {
        notifications: notifications,
        autoplay: autoplay,
        privacy: currentUser.settings?.privacy || 'public'
    };
    
    await firebaseApp.updateUser(currentUser.id, {
        username: currentUser.username,
        email: currentUser.email,
        settings: currentUser.settings
    });
    
    closeSettings();
    updateUI();
    showNotification('Paramètres sauvegardés ✅', 'success');
}

// ==================== EXPORT DES FONCTIONS ====================

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
window.changeProfilePicture = changeProfilePicture;
window.openLiveStream = openLiveStream;
window.performSearch = performSearch;
window.showProfileTab = showProfileTab;
window.editDraft = editDraft;
window.deleteDraft = deleteDraft;
window.openVideoDetail = openVideoDetail;
window.changeSortingAlgorithm = changeSortingAlgorithm;
window.openCameraForRecording = openCameraForRecording;
window.openFileUpload = openFileUpload;
window.formatNumber = formatNumber;
window.postComment = postComment;

// Initialiser les écouteurs d'événements au chargement
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupEventListeners();
    }, 1000);
});

console.log('✅ script.js chargé avec succès - MODE RÉEL ACTIF');
