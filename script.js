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
// ==================== INTERACTIONS ====================
async function toggleLike(videoId) {
    try {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;
        
        const isLiked = currentUser?.likedVideos?.includes(videoId);
        
        if (!isLiked) {
            video.likes = (video.likes || 0) + 1;
            currentUser.likedVideos = currentUser.likedVideos || [];
            currentUser.likedVideos.push(videoId);
            
            await firebaseApp.updateLikes(videoId, currentUser.id, 'like');
            await firebaseApp.updateUser(currentUser.id, {
                likedVideos: currentUser.likedVideos
            });
            
            showHeartAnimation();
            showNotification('Vidéo aimée ! ❤️', 'success');
            
            currentUser.coins = (currentUser.coins || 0) + 1;
            await firebaseApp.updateUser(currentUser.id, {
                coins: currentUser.coins
            });
            
        } else {
            video.likes = Math.max(0, (video.likes || 1) - 1);
            currentUser.likedVideos = (currentUser.likedVideos || []).filter(id => id !== videoId);
            
            await firebaseApp.updateLikes(videoId, currentUser.id, 'unlike');
            await firebaseApp.updateUser(currentUser.id, {
                likedVideos: currentUser.likedVideos
            });
            
            showNotification('Like retiré', 'info');
        }
        
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
            currentUser.following.push(userId);
            await firebaseApp.followUser(currentUser.id, userId);
            buttonElement.classList.add('following');
            buttonElement.innerHTML = '<i class="fas fa-check"></i> Abonné';
            buttonElement.style.background = '#00f2fe';
            buttonElement.style.color = '#000';
            showNotification('Utilisateur suivi !', 'success');
            
            currentUser.coins = (currentUser.coins || 0) + 5;
            await firebaseApp.updateUser(currentUser.id, {
                coins: currentUser.coins
            });
        } else {
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
        
        video.shares = (video.shares || 0) + 1;
        await firebaseApp.updateVideo(videoId, { shares: video.shares });
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?video=${videoId}`;
        const shareText = `Regarde cette vidéo sur TIKTAK: ${video.caption}`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'TIKTAK',
                    text: shareText,
                    url: shareUrl
                });
                console.log('✅ Partage réussi via Web Share API');
            } catch (shareError) {
                console.log('Partage annulé');
                await copyToClipboard(`${shareText}\n${shareUrl}`);
            }
        } else {
            await copyToClipboard(`${shareText}\n${shareUrl}`);
        }
        
        currentUser.coins = (currentUser.coins || 0) + 3;
        await firebaseApp.updateUser(currentUser.id, {
            coins: currentUser.coins
        });
        
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
        
        const commentsSnapshot = await firebaseApp.db.collection('videos').doc(videoId).collection('comments')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const comments = [];
        commentsSnapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
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
        
        const commentData = {
            userId: currentUser.id,
            username: currentUser.username,
            userAvatar: currentUser.avatar,
            text: commentText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            videoId: videoId
        };
        
        await firebaseApp.db.collection('videos').doc(videoId).collection('comments').add(commentData);
        
        const video = videos.find(v => v.id === videoId);
        if (video) {
            video.comments = (video.comments || 0) + 1;
            await firebaseApp.updateVideo(videoId, { comments: video.comments });
        }
        
        showNotification('Commentaire publié ! 💬', 'success');
        
        document.querySelector('.modal-overlay')?.remove();
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
    if (file.size > 100 * 1024 * 1024) {
        showNotification('Vidéo trop volumineuse (max 100MB)', 'error');
        return;
    }
    
    if (!file.type.startsWith('video/')) {
        showNotification('Fichier vidéo invalide', 'error');
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
        
        setTimeout(() => {
            document.getElementById('videoProcessing').style.display = 'none';
            document.getElementById('publishBtn').disabled = false;
            
            document.getElementById('videoFileInfo').innerHTML = `
                <i class="fas fa-file-video"></i>
                <span>${file.name} (${formatFileSize(file.size)})</span>
            `;
        }, 2000);
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
        <span>demo_video.mp4 (15 MB)</span>
    `;
    
    document.getElementById('publishBtn').disabled = false;
}

async function publishVideo() {
    if (isUploading) return;
    
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!caption) {
        showNotification('Veuillez ajouter une légende', 'error');
        return;
    }
    
    const publishBtn = document.getElementById('publishBtn');
    isUploading = true;
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    try {
        const hashtags = extractHashtags(caption);
        
        let videoUrl = '';
        const videoElement = document.getElementById('previewVideo');
        
        if (currentVideoFile && currentVideoFile instanceof File) {
            showNotification('Téléchargement vers Firebase...', 'info');
            videoUrl = await uploadVideoToFirebase(currentVideoFile);
        } else if (videoElement.src && videoElement.src.startsWith('http')) {
            videoUrl = videoElement.src;
        } else {
            showNotification('Aucune vidéo valide', 'error');
            return;
        }
        
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
            privacy: privacy
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
        isUploading = false;
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
    }
}

async function uploadVideoToFirebase(file) {
    return new Promise((resolve, reject) => {
        const storageRef = firebase.storage().ref();
        const videoRef = storageRef.child(`videos/${Date.now()}_${file.name}`);
        
        const uploadTask = videoRef.put(file);
        
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Progression upload:', progress + '%');
            },
            (error) => {
                console.error('Erreur upload:', error);
                reject(error);
            },
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                console.log('URL vidéo:', downloadURL);
                resolve(downloadURL);
            }
        );
    });
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
