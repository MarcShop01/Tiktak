// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;
let realtimeUnsubscribe = null;

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
            loadDemoVideos(); // Fallback
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
        loadDemoVideos();
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
                    
                    if (newVideo.userId && !usersCache[newVideo.userId]) {
                        firebaseApp.loadUser(newVideo.userId).then(user => {
                            if (user) usersCache[newVideo.userId] = user;
                        });
                    }
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
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;">
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
        const videoElement = createVideoElement(video, index === 0);
        videoFeed.appendChild(videoElement);
    });
    
    setTimeout(() => {
        const firstVideo = videoFeed.querySelector('video');
        if (firstVideo && sortingAlgorithm === 'latest') {
            playVideo(firstVideo);
        }
    }, 500);
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
    
    const videoHtml = `
        <div class="video-player-wrapper">
            <video 
                src="${video.videoUrl}" 
                poster="${video.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432?ixlib=rb-4.0.3&auto=format&fit=crop&w=1074&q=80'}"
                onclick="toggleVideoPlay(this)"
                ${autoPlay ? 'autoplay muted playsinline' : 'preload="metadata"'}
                loop
                playsinline
                webkit-playsinline
                style="width: 100%; height: 100%; object-fit: cover; background: #000;"
                onerror="handleVideoError(this, '${video.id}')"
            ></video>
            
            <div class="video-loading-indicator" style="display: none;">
                <div class="video-loading-spinner"></div>
                <p>Chargement...</p>
            </div>
            
            <button class="manual-play-btn" onclick="toggleVideoPlay(this.previousElementSibling)">
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
                        ${(video.hashtags || []).slice(0, 3).map(tag => `<span class="hashtag">${tag}</span>`).join('')}
                    </div>
                </div>
                <button class="btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${video.userId}', this)">
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
    
    container.innerHTML = videoHtml;
    
    const videoElement = container.querySelector('video');
    if (videoElement) {
        videoElement.addEventListener('loadeddata', function() {
            console.log(`✅ Vidéo ${video.id} chargée`);
        });
        
        videoElement.addEventListener('error', function() {
            console.error(`❌ Erreur chargement vidéo ${video.id}`);
            handleVideoError(videoElement, video.id);
        });
    }
    
    return container;
}

function handleVideoError(videoElement, videoId) {
    const container = videoElement.closest('.video-container');
    const loadingIndicator = container.querySelector('.video-loading-indicator');
    const playBtn = container.querySelector('.manual-play-btn');
    
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (playBtn) playBtn.style.display = 'none';
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'video-error-state';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Vidéo non disponible</h3>
        <p>Cette vidéo ne peut pas être lue sur cet appareil</p>
        <button class="btn btn-secondary" onclick="reloadVideo('${videoId}')">
            <i class="fas fa-redo"></i> Réessayer
        </button>
    `;
    
    videoElement.style.display = 'none';
    videoElement.parentNode.insertBefore(errorDiv, videoElement);
}

function reloadVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (video) {
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        if (container) {
            container.remove();
            const newElement = createVideoElement(video);
            document.getElementById('videoFeed').appendChild(newElement);
        }
    }
}

async function toggleVideoPlay(videoElement) {
    if (!videoElement) return;
    
    const container = videoElement.closest('.video-container');
    const playBtn = container.querySelector('.manual-play-btn');
    const loadingIndicator = container.querySelector('.video-loading-indicator');
    
    if (videoElement.paused) {
        if (currentPlayingVideo && currentPlayingVideo !== videoElement) {
            currentPlayingVideo.pause();
            const prevBtn = currentPlayingVideo.closest('.video-container')?.querySelector('.manual-play-btn');
            if (prevBtn) prevBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        try {
            loadingIndicator.style.display = 'flex';
            videoElement.muted = false;
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
            showNotification('Impossible de lire la vidéo', 'error');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    } else {
        videoElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingVideo = null;
    }
}

function playVideo(videoElement) {
    if (videoElement && videoElement.paused) {
        videoElement.play().catch(e => console.log('Autoplay bloqué:', e));
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
    // Accepter TOUS les formats vidéo
    if (file.size > 500 * 1024 * 1024) {
        showNotification('Vidéo trop volumineuse (max 500MB)', 'error');
        return;
    }
    
    // Accepter tous les types de fichiers vidéo
    const videoTypes = [
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
        'video/x-msvideo', 'video/x-matroska', 'video/3gpp', 'video/mpeg',
        'video/x-ms-wmv', 'video/avi', 'video/flv', 'video/mov'
    ];
    
    if (!videoTypes.includes(file.type) && !file.type.startsWith('video/')) {
        // Essayer de détecter par extension
        const extension = file.name.split('.').pop().toLowerCase();
        const allowedExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv', '3gp', 'mpeg', 'mpg'];
        
        if (!allowedExtensions.includes(extension)) {
            showNotification('Format de fichier non supporté. Formats acceptés: MP4, WebM, OGG, MOV, AVI, WMV, FLV, MKV, 3GP, MPEG', 'error');
            return;
        }
    }
    
    currentVideoFile = file;
    
    const compatibilityIndicator = document.getElementById('compatibilityIndicator');
    compatibilityIndicator.className = 'compatibility-indicator compatible';
    compatibilityIndicator.innerHTML = `
        <div class="compatibility-dot compatible"></div>
        <span>Format accepté: ${file.type || 'Vidéo'}</span>
    `;
    compatibilityIndicator.style.display = 'flex';
    
    document.getElementById('videoProcessing').style.display = 'flex';
    
    setTimeout(() => {
        const videoElement = document.getElementById('previewVideo');
        const placeholder = document.querySelector('.preview-placeholder');
        
        const videoUrl = URL.createObjectURL(file);
        videoElement.src = videoUrl;
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
        
        document.getElementById('videoProcessing').style.display = 'none';
        document.getElementById('publishBtn').disabled = false;
        
        document.getElementById('videoFileInfo').innerHTML = `
            <i class="fas fa-file-video"></i>
            <span>${file.name} (${formatFileSize(file.size)}) - ${file.type || 'Format inconnu'}</span>
        `;
    }, 1000);
}

function simulateRecording() {
    showNotification('Utilisation d\'une vidéo de démo', 'info');
    
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    const compatibilityIndicator = document.getElementById('compatibilityIndicator');
    
    const demoVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    ];
    
    videoElement.src = demoVideos[0];
    videoElement.style.display = 'block';
    placeholder.style.display = 'none';
    
    compatibilityIndicator.className = 'compatibility-indicator compatible';
    compatibilityIndicator.innerHTML = `
        <div class="compatibility-dot compatible"></div>
        <span>Format MP4 compatible</span>
    `;
    compatibilityIndicator.style.display = 'flex';
    
    currentVideoFile = {
        name: 'demo_video.mp4',
        size: 15000000,
        type: 'video/mp4',
        isDemo: true
    };
    
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>demo_video.mp4 (15 MB) - Vidéo de démo</span>
    `;
    
    document.getElementById('publishBtn').disabled = false;
}

async function publishVideo() {
    const caption = document.getElementById('videoCaption').value.trim();
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!caption) {
        showNotification('Veuillez ajouter une légende', 'error');
        return;
    }
    
    if (!currentVideoFile) {
        showNotification('Veuillez sélectionner une vidéo', 'error');
        return;
    }
    
    const publishBtn = document.getElementById('publishBtn');
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    // Ajouter un indicateur de progression
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress';
    progressContainer.innerHTML = `
        <div class="upload-progress-bar" id="uploadProgress" style="width: 0%"></div>
        <div class="upload-progress-text" id="uploadProgressText">0%</div>
    `;
    document.querySelector('.modal-footer').prepend(progressContainer);
    
    try {
        const hashtags = extractHashtags(caption);
        let videoUrl;
        
        if (currentVideoFile.isDemo) {
            videoUrl = document.getElementById('previewVideo').src;
        } else {
            showNotification('Upload en cours...', 'info');
            
            // Utiliser la fonction uploadToFirebaseStorage de firebaseApp
            videoUrl = await firebaseApp.uploadToFirebaseStorage(currentVideoFile);
        }
        
        const videoData = {
            userId: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
            videoUrl: videoUrl,
            thumbnail: generateThumbnail(),
            caption: caption,
            hashtags: hashtags,
            duration: '00:15',
            privacy: privacy,
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            gifts: 0
        };
        
        const newVideo = await firebaseApp.saveVideo(videoData);
        videos.unshift(newVideo);
        
        if (!usersCache[currentUser.id]) {
            usersCache[currentUser.id] = currentUser;
        }
        
        closeCreateModal();
        renderVideoFeed();
        updateUI();
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        
    } catch (error) {
        console.error('❌ Erreur publication:', error);
        
        // Messages d'erreur spécifiques
        let errorMessage = 'Erreur lors de la publication';
        if (error.message.includes('storage/unauthorized')) {
            errorMessage = 'Erreur d\'autorisation Firebase. Vérifiez vos règles de sécurité.';
        } else if (error.message.includes('storage/canceled')) {
            errorMessage = 'Upload annulé';
        } else if (error.message.includes('storage/unknown')) {
            errorMessage = 'Erreur inconnue lors de l\'upload';
        }
        
        showNotification(errorMessage + ': ' + error.message, 'error');
    } finally {
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        
        // Supprimer la barre de progression
        const progressContainer = document.querySelector('.upload-progress');
        if (progressContainer) progressContainer.remove();
    }
}

function resetCreateModal() {
    document.getElementById('videoCaption').value = '';
    document.getElementById('videoPrivacy').value = 'public';
    
    const videoElement = document.getElementById('previewVideo');
    videoElement.src = '';
    videoElement.style.display = 'none';
    
    document.querySelector('.preview-placeholder').style.display = 'flex';
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>Aucun fichier sélectionné</span>
    `;
    
    document.getElementById('compatibilityIndicator').style.display = 'none';
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

function formatFileSize(bytes) {
    if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + ' MB';
    if (bytes >= 1000) return (bytes / 1000).toFixed(1) + ' KB';
    return bytes + ' B';
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
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar && currentUser.avatar) {
            userAvatar.src = currentUser.avatar;
        }
        
        console.log('✅ Interface utilisateur mise à jour');
    } catch (error) {
        console.error('❌ Erreur mise à jour UI:', error);
    }
}

// ==================== ÉCOUTEURS D'ÉVÉNEMENTS ====================
function setupEventListeners() {
    console.log('🔧 Configuration des écouteurs d\'événements...');
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
    
    setupVideoInput();
    
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
    
    document.addEventListener('click', function(e) {
        ['createModal', 'profileModal', 'settingsModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.style.display === 'flex' && e.target === modal) {
                if (modalId === 'createModal') closeCreateModal();
                if (modalId === 'profileModal') closeProfile();
                if (modalId === 'settingsModal') closeSettings();
            }
        });
    });
    
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    window.addEventListener('beforeunload', function() {
        if (realtimeUnsubscribe) {
            realtimeUnsubscribe();
        }
    });
    
    console.log('✅ Écouteurs d\'événements configurés');
}

// ==================== FONCTIONS DIVERSES ====================
function showHome() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const firstNavItem = document.querySelector('.nav-item:nth-child(1)');
    if (firstNavItem) firstNavItem.classList.add('active');
    renderVideoFeed();
}

function openNotifications() {
    showNotification('Aucune nouvelle notification', 'info');
}

function changeProfilePicture() {
    document.getElementById('profilePictureInput').click();
}

function clearLocalStorage() {
    if (confirm('Réinitialiser le cache local ?')) {
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

function openCreatorProfile(userId) {
    const user = usersCache[userId];
    if (user) {
        showNotification(`Profil de ${user.username}`, 'info');
    } else {
        showNotification('Profil créateur', 'info');
    }
}

function loadDemoVideos() {
    videos = [
        {
            id: 'demo1',
            userId: 'demo_user',
            username: 'Utilisateur Démo',
            avatar: 'https://i.pravatar.cc/150?img=1',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432',
            caption: 'Bienvenue sur TIKTAK ! 🎬 #bienvenue #demo',
            likes: 25,
            comments: 5,
            shares: 10,
            views: 150,
            hashtags: ['#bienvenue', '#demo', '#tiktak'],
            duration: '00:15',
            privacy: 'public',
            createdAt: new Date(Date.now() - 3600000)
        }
    ];
    
    renderVideoFeed();
    showNotification('Mode démo activé', 'warning');
}

// ==================== EXPORT DES FONCTIONS ====================
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.openFilePicker = openFilePicker;
window.simulateRecording = simulateRecording;
window.publishVideo = publishVideo;
window.toggleVideoPlay = toggleVideoPlay;
window.toggleLike = toggleLike;
window.shareVideo = shareVideo;
window.openNotifications = openNotifications;
window.logout = logout;
window.showHome = showHome;
window.performSearch = performSearch;
window.openFileUpload = openFileUpload;
window.reloadVideo = reloadVideo;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupEventListeners();
    }, 1000);
});

console.log('✅ script.js chargé avec succès - MODE CORRIGÉ');
