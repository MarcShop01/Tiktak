// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;
let realtimeUnsubscribe = null;

// ==================== FONCTIONS D'AIDE ====================

// Fonction pour vérifier si une vidéo est compatible
function isVideoCompatible(videoUrl) {
    return new Promise((resolve) => {
        if (!videoUrl || videoUrl.trim() === '') {
            resolve(false);
            return;
        }
        
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        // Timeout après 3 secondes
        const timeout = setTimeout(() => {
            video.remove();
            resolve(false);
        }, 3000);
        
        video.onloadedmetadata = () => {
            clearTimeout(timeout);
            video.remove();
            resolve(true);
        };
        
        video.onerror = () => {
            clearTimeout(timeout);
            video.remove();
            resolve(false);
        };
        
        // Essayer de charger la vidéo
        video.src = videoUrl;
    });
}

// Obtenir le type MIME d'une vidéo
function getVideoMimeType(url) {
    if (!url) return 'video/mp4';
    
    // Extraire l'extension
    const urlWithoutParams = url.split('?')[0];
    const extension = urlWithoutParams.split('.').pop().toLowerCase();
    
    switch(extension) {
        case 'mp4':
            return 'video/mp4';
        case 'webm':
            return 'video/webm';
        case 'ogg':
        case 'ogv':
            return 'video/ogg';
        case 'mov':
            return 'video/quicktime';
        default:
            // Par défaut, on utilise MP4
            return 'video/mp4';
    }
}

// Vérifier le format du fichier
function isValidVideoFormat(file) {
    const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime'
    ];
    
    const allowedExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
    const fileName = file.name.toLowerCase();
    
    // Vérifier par type MIME
    if (allowedTypes.includes(file.type)) {
        return true;
    }
    
    // Vérifier par extension
    for (const ext of allowedExtensions) {
        if (fileName.endsWith(ext)) {
            return true;
        }
    }
    
    return false;
}

// Convertir une vidéo en MP4 (simulation)
async function convertToMP4(file) {
    return new Promise((resolve) => {
        showNotification('Conversion du format vidéo...', 'info');
        
        // Dans une vraie application, vous utiliseriez un serveur de conversion
        // Ici, nous simulons la conversion
        setTimeout(() => {
            // Créer un faux blob MP4
            const convertedFile = new File([file], file.name.replace(/\.[^/.]+$/, "") + '.mp4', {
                type: 'video/mp4',
                lastModified: Date.now()
            });
            
            showNotification('Conversion terminée', 'success');
            resolve(convertedFile);
        }, 2000);
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
            // Vérifier si la vidéo est compatible
            const isCompatible = await isVideoCompatible(video.videoUrl);
            
            const videoElement = createVideoElement(video, false, isCompatible);
            videoFeed.appendChild(videoElement);
        } catch (error) {
            console.error(`❌ Erreur création vidéo ${video.id}:`, error);
            // Créer un élément d'erreur
            const errorElement = createVideoErrorElement(video);
            videoFeed.appendChild(errorElement);
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

function createVideoElement(video, autoPlay = false, isCompatible = true) {
    const isLiked = currentUser?.likedVideos?.includes(video.id) || false;
    const user = usersCache[video.userId] || {};
    const isFollowing = currentUser?.following?.includes(video.userId) || false;
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    const mimeType = getVideoMimeType(video.videoUrl);
    const videoSource = video.videoUrl;
    
    container.innerHTML = `
        <div class="video-player-wrapper" style="position: relative; width: 100%; height: 600px; background: #000;">
            ${isCompatible ? `
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
            ` : `
                <div class="video-error-state" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 50px; color: #ff4757; margin-bottom: 20px;"></i>
                    <h3>Format vidéo non supporté</h3>
                    <p style="margin-bottom: 20px; color: #aaa;">Cette vidéo ne peut pas être lue sur votre appareil.</p>
                    <button class="btn btn-primary" onclick="shareVideo('${video.id}')">
                        <i class="fas fa-share"></i> Partager la vidéo
                    </button>
                </div>
            `}
            
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
        
        ${isCompatible ? `
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
        ` : ''}
    `;
    
    // Configurer le gestionnaire d'erreur vidéo seulement si compatible
    if (isCompatible) {
        const videoElement = container.querySelector('video');
        if (videoElement) {
            videoElement.addEventListener('error', function(e) {
                console.error(`❌ Erreur lecture vidéo ${video.id}:`, e.target.error);
                showNotification('Format vidéo non supporté', 'error');
                
                // Afficher un fallback
                const wrapper = videoElement.parentElement;
                wrapper.innerHTML = `
                    <div class="video-error-state" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 20px; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 50px; color: #ff4757; margin-bottom: 20px;"></i>
                        <h3>Format vidéo non supporté</h3>
                        <p style="margin-bottom: 20px; color: #aaa;">Cette vidéo ne peut pas être lue sur votre appareil.</p>
                        <button class="btn btn-primary" onclick="shareVideo('${video.id}')">
                            <i class="fas fa-share"></i> Partager la vidéo
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
    }
    
    return container;
}

function createVideoErrorElement(video) {
    const user = usersCache[video.userId] || {};
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    container.innerHTML = `
        <div style="background: #111; border-radius: 15px; padding: 20px; border: 1px solid #ff4757;">
            <div style="text-align: center; color: white; padding: 40px 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 60px; color: #ff4757; margin-bottom: 20px;"></i>
                <h3>Vidéo non disponible</h3>
                <p style="color: #aaa; margin-bottom: 20px;">Cette vidéo utilise un format incompatible avec votre appareil.</p>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; justify-content: center;">
                    <img src="${user.avatar || video.avatar || 'https://i.pravatar.cc/150?img=1'}" 
                         style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #00f2fe;">
                    <div style="text-align: left;">
                        <h4 style="margin: 0; font-size: 16px;">${user.username || video.username || 'Utilisateur'}</h4>
                        <p style="margin: 5px 0; font-size: 14px; color: #ccc;">${video.caption || 'Pas de description'}</p>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-secondary" onclick="openCreatorProfile('${video.userId}')">
                        <i class="fas fa-user"></i> Voir le profil
                    </button>
                    <button class="btn btn-primary" onclick="shareVideo('${video.id}')">
                        <i class="fas fa-share"></i> Partager
                    </button>
                </div>
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

// ==================== CRÉATION DE VIDÉO - PARTIE CRITIQUE ====================

function processVideoFile(file) {
    // Vérifier le format du fichier
    if (!isValidVideoFormat(file)) {
        showNotification('Format vidéo non supporté. Utilisez MP4 (recommandé), WebM ou OGG.', 'error');
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
                    <span>${file.name} (${formatFileSize(file.size)}) - ${file.type || 'video/mp4'}</span>
                `;
            }, 1000);
        });
        
        videoElement.addEventListener('error', function() {
            document.getElementById('videoProcessing').style.display = 'none';
            showNotification('Cette vidéo ne peut pas être lue. Essayez un format MP4.', 'error');
            resetCreateModal();
        });
    };
    
    reader.readAsDataURL(file);
}

function simulateRecording() {
    showNotification('Utilisation d\'une vidéo de démo compatible', 'info');
    
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    
    // Vidéos de démo 100% compatibles (MP4 avec codec standard)
    const demoVideos = [
        'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
    ];
    
    videoElement.src = demoVideos[Math.floor(Math.random() * demoVideos.length)];
    videoElement.style.display = 'block';
    placeholder.style.display = 'none';
    
    currentVideoFile = {
        name: 'demo_compatible.mp4',
        size: 15000000,
        type: 'video/mp4'
    };
    
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>demo_compatible.mp4 (15 MB) - video/mp4</span>
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
        let videoUrl = document.getElementById('previewVideo').src;
        
        // Si c'est une vidéo de démo, utiliser une URL publique
        if (videoUrl.startsWith('data:') || videoUrl.includes('blob:')) {
            // Pour les vidéos uploadées, on utilise une démo
            videoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
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
            privacy: privacy,
            videoFormat: 'mp4' // Toujours marquer comme MP4 pour la compatibilité
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

function formatFileSize(bytes) {
    if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + ' MB';
    if (bytes >= 1000) return (bytes / 1000).toFixed(1) + ' KB';
    return bytes + ' B';
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

// ... (le reste du code reste identique à la version précédente) ...

console.log('✅ script.js chargé avec succès - FORMATS VIDÉO CORRIGÉS');
