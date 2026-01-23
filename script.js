// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;
let isInitialized = false;

// ==================== FONCTION OPEN GIFTSHOP ====================
function openGiftShop() {
    showNotification('Boutique de cadeaux à venir ! 🎁', 'info');
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 TIKTAK - Démarrage...');
    
    // Cacher l'écran de chargement après 1.5s
    setTimeout(async () => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        try {
            await initializeApp();
        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            showNotification('Application chargée en mode démo', 'warning');
            await initializeDemoMode();
        }
    }, 1500);
});

async function initializeApp() {
    if (isInitialized) return;
    
    console.log('🚀 Initialisation TIKTAK...');
    
    try {
        // Charger l'utilisateur depuis Firebase
        currentUser = await firebaseApp.getCurrentUser();
        
        if (!currentUser || !currentUser.id) {
            throw new Error('Utilisateur non disponible');
        }
        
        console.log('👤 Utilisateur connecté:', currentUser.username || currentUser.id);
        
        // Charger les vidéos
        videos = await firebaseApp.loadVideos(30);
        console.log(`📹 ${videos.length} vidéos chargées`);
        
        // Mettre en cache les utilisateurs
        await cacheVideoUsers();
        
        // Initialiser les écouteurs d'événements
        setupEventListeners();
        
        // Afficher le flux vidéo
        await renderVideoFeed();
        
        // Mettre à jour l'interface
        updateUI();
        
        // Configurer l'écoute en temps réel (si Firebase est disponible)
        setupRealtimeListener();
        
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        console.log('✅ Application initialisée');
        isInitialized = true;
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        throw error;
    }
}

async function initializeDemoMode() {
    console.log('📱 Mode démo activé');
    
    // Créer un utilisateur de démo
    currentUser = {
        id: 'demo_user',
        username: 'Utilisateur Démo',
        avatar: 'https://i.pravatar.cc/150?img=1',
        coins: 100,
        likedVideos: [],
        myVideos: [],
        drafts: [],
        following: [],
        followers: [],
        bio: 'Utilisateur de démonstration TIKTAK',
        phone: '',
        settings: {
            notifications: true,
            autoplay: true,
            privateAccount: false,
            privacy: 'public'
        },
        createdAt: new Date(),
        isDemo: true
    };
    
    // Charger les vidéos de démo
    videos = await firebaseApp.loadVideos(20);
    
    // Mettre en cache les utilisateurs
    await cacheVideoUsers();
    
    // Initialiser les écouteurs
    setupEventListeners();
    
    // Afficher le flux
    await renderVideoFeed();
    
    // Mettre à jour l'interface
    updateUI();
    
    showNotification('Mode démo activé - Bienvenue ! 🎬', 'info');
    console.log('✅ Mode démo initialisé');
    isInitialized = true;
}

async function cacheVideoUsers() {
    const uniqueUserIds = [...new Set(videos.map(video => video.userId))];
    
    for (const userId of uniqueUserIds) {
        if (!usersCache[userId]) {
            try {
                const user = await firebaseApp.loadUser(userId);
                if (user) {
                    usersCache[userId] = user;
                }
            } catch (error) {
                console.warn(`⚠️ Impossible de charger l'utilisateur ${userId}:`, error);
                usersCache[userId] = {
                    id: userId,
                    username: 'Utilisateur',
                    avatar: 'https://i.pravatar.cc/150?img=1'
                };
            }
        }
    }
}

function setupRealtimeListener() {
    try {
        if (!firebaseApp.db) {
            console.log('📡 Mode hors ligne - Pas d\'écoute en temps réel');
            return;
        }
        
        firebaseApp.db.collection('videos')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const newVideo = { id: change.doc.id, ...change.doc.data() };
                        
                        if (newVideo.privacy === 'public' || !newVideo.privacy) {
                            if (!videos.find(v => v.id === newVideo.id)) {
                                videos.unshift(newVideo);
                                renderVideoFeed();
                                showNotification('Nouvelle vidéo disponible ! 📹', 'info');
                            }
                        }
                    }
                });
            }, (error) => {
                console.warn('⚠️ Écoute temps réel désactivée:', error);
            });
    } catch (error) {
        console.warn('⚠️ Impossible de configurer l\'écoute temps réel');
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
                    Créer une vidéo
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
            videosToDisplay = [...videos].sort((a, b) => {
                const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                return bTime - aTime;
            });
            break;
        case 'popular':
            videosToDisplay = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'trending':
            videosToDisplay = getTrendingVideos();
            break;
        default:
            videosToDisplay = [...videos];
    }
    
    // Afficher les vidéos
    videosToDisplay.forEach((video, index) => {
        const videoElement = createVideoElement(video, index === 0); // Auto-play seulement la première
        videoFeed.appendChild(videoElement);
    });
}

function getTrendingVideos() {
    const now = Date.now();
    return [...videos]
        .filter(video => {
            const videoTime = video.createdAt?.getTime ? video.createdAt.getTime() : new Date(video.createdAt).getTime();
            const hours = (now - videoTime) / (1000 * 60 * 60);
            return hours < 48 && ((video.likes || 0) > 10 || (video.shares || 0) > 5);
        })
        .sort((a, b) => (b.likes || 0) - (a.likes || 0));
}

function changeSortingAlgorithm(algorithm) {
    renderVideoFeed(algorithm);
}

function createVideoElement(video, autoPlay = false) {
    const isLiked = currentUser?.likedVideos?.includes(video.id) || false;
    const user = usersCache[video.userId] || {
        username: video.username || 'Utilisateur',
        avatar: video.avatar || 'https://i.pravatar.cc/150?img=1'
    };
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    const shouldAutoplay = autoPlay && (currentUser?.settings?.autoplay !== false);
    
    container.innerHTML = `
        <div class="video-wrapper">
            <video 
                src="${video.videoUrl}" 
                poster="${video.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432'}"
                onclick="toggleVideoPlay(this)"
                ${shouldAutoplay ? 'autoplay muted' : ''}
                loop
                preload="metadata"
                playsinline
            ></video>
            
            <button class="manual-play-btn" onclick="toggleVideoPlay(this.previousElementSibling)">
                <i class="fas fa-play"></i>
            </button>
        </div>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img class="creator-avatar" src="${user.avatar}" 
                     alt="${user.username}" 
                     onclick="openCreatorProfile('${video.userId}')">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4>${user.username}</h4>
                    </div>
                    <p class="video-caption">${video.caption || 'Pas de description'}</p>
                    <div class="hashtags">
                        ${(video.hashtags || []).map(tag => `<span class="hashtag">${tag}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-follow" onclick="toggleFollow('${video.userId}', this)">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            
            <div class="video-stats">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views || 0)} vues
                </div>
                <div class="video-details">
                    <span class="duration">${video.duration || '00:15'}</span>
                    <span class="time-ago">${getTimeAgo(video.createdAt)}</span>
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
        // Arrêter la vidéo en cours si différente
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
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    } else {
        videoElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (currentPlayingVideo === videoElement) {
            currentPlayingVideo = null;
        }
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
            
            // Animation et notification
            showHeartAnimation();
            showNotification('Vidéo aimée ! ❤️', 'success');
            
            // Ajouter des coins
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
        
        // Mettre à jour l'affichage
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        if (container) {
            const likeElement = container.querySelector('.action:nth-child(1)');
            likeElement.className = `action ${!isLiked ? 'liked' : ''}`;
            const likeCount = likeElement.querySelector('span');
            if (likeCount) {
                likeCount.textContent = formatNumber(video.likes);
            }
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
            // Suivre l'utilisateur
            currentUser.following.push(userId);
            await firebaseApp.followUser(currentUser.id, userId);
            
            buttonElement.classList.add('following');
            buttonElement.innerHTML = '<i class="fas fa-check"></i>';
            showNotification('Utilisateur suivi !', 'success');
            
            // Ajouter des coins
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
            buttonElement.innerHTML = '<i class="fas fa-plus"></i>';
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
        
        // Préparer le partage
        const shareUrl = window.location.href;
        const shareText = `Regarde cette vidéo sur TIKTAK: ${video.caption?.substring(0, 100) || 'Vidéo cool'}`;
        
        // Utiliser l'API Web Share si disponible
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'TIKTAK',
                    text: shareText,
                    url: shareUrl
                });
                console.log('✅ Partage réussi');
            } catch (shareError) {
                // Fallback: copier dans le presse-papier
                await copyToClipboard(`${shareText}\n${shareUrl}`);
            }
        } else {
            // Fallback: copier dans le presse-papier
            await copyToClipboard(`${shareText}\n${shareUrl}`);
        }
        
        // Ajouter des coins
        currentUser.coins = (currentUser.coins || 0) + 3;
        await firebaseApp.updateUser(currentUser.id, {
            coins: currentUser.coins
        });
        
        // Mettre à jour l'affichage
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
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            showNotification('Lien copié ! 📋', 'success');
        } else {
            // Fallback pour anciens navigateurs
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                showNotification('Lien copié ! 📋', 'success');
            } else {
                throw new Error('Échec de la copie');
            }
        }
        return true;
    } catch (err) {
        console.error('Erreur copie:', err);
        showNotification('Erreur lors de la copie', 'error');
        return false;
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
    showNotification('Fonction caméra à venir dans la prochaine version', 'info');
}

function openFilePicker() {
    document.getElementById('videoInput').click();
}

function processVideoFile(file) {
    if (!file) return;
    
    // Vérifications
    if (file.size > 100 * 1024 * 1024) {
        showNotification('Vidéo trop volumineuse (max 100MB)', 'error');
        return;
    }
    
    if (!file.type.startsWith('video/')) {
        showNotification('Fichier vidéo invalide', 'error');
        return;
    }
    
    currentVideoFile = file;
    
    // Afficher l'indicateur de traitement
    const videoProcessing = document.getElementById('videoProcessing');
    if (videoProcessing) {
        videoProcessing.style.display = 'flex';
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const videoElement = document.getElementById('previewVideo');
        const placeholder = document.querySelector('.preview-placeholder');
        
        if (!videoElement) {
            console.error('❌ Élément previewVideo non trouvé');
            return;
        }
        
        videoElement.src = e.target.result;
        videoElement.style.display = 'block';
        
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        videoElement.onloadeddata = function() {
            setTimeout(() => {
                if (videoProcessing) {
                    videoProcessing.style.display = 'none';
                }
                
                const publishBtn = document.getElementById('publishBtn');
                if (publishBtn) {
                    publishBtn.disabled = false;
                }
                
                const videoFileInfo = document.getElementById('videoFileInfo');
                if (videoFileInfo) {
                    videoFileInfo.innerHTML = `
                        <i class="fas fa-file-video"></i>
                        <span>${file.name} (${formatFileSize(file.size)})</span>
                    `;
                }
                
                showNotification('Vidéo chargée avec succès !', 'success');
            }, 1000);
        };
        
        videoElement.onerror = function() {
            if (videoProcessing) {
                videoProcessing.style.display = 'none';
            }
            showNotification('Erreur de chargement de la vidéo', 'error');
        };
    };
    
    reader.onerror = function() {
        if (videoProcessing) {
            videoProcessing.style.display = 'none';
        }
        showNotification('Erreur de lecture du fichier', 'error');
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
    
    if (!videoElement) {
        console.error('❌ Élément previewVideo non trouvé');
        return;
    }
    
    const demoVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    ];
    
    const randomVideo = demoVideos[Math.floor(Math.random() * demoVideos.length)];
    videoElement.src = randomVideo;
    videoElement.style.display = 'block';
    
    if (placeholder) {
        placeholder.style.display = 'none';
    }
    
    currentVideoFile = {
        name: 'demo_video.mp4',
        size: 15000000,
        type: 'video/mp4',
        url: randomVideo
    };
    
    const videoFileInfo = document.getElementById('videoFileInfo');
    if (videoFileInfo) {
        videoFileInfo.innerHTML = `
            <i class="fas fa-file-video"></i>
            <span>demo_video.mp4 (15 MB)</span>
        `;
    }
    
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.disabled = false;
    }
}

// ==================== PUBLICATION DE VIDÉO ====================
async function publishVideo() {
    console.log('🚀 Début de la publication...');
    
    // VÉRIFICATION CRITIQUE : currentUser doit exister
    if (!currentUser || !currentUser.id) {
        console.error('❌ currentUser est null ou n\'a pas d\'ID');
        
        // Tentative de récupération de l'utilisateur
        try {
            currentUser = await firebaseApp.getCurrentUser();
            if (!currentUser) {
                showNotification('Impossible de se connecter. Création d\'un utilisateur temporaire...', 'warning');
                currentUser = {
                    id: 'temp_user_' + Date.now(),
                    username: 'Utilisateur Temp',
                    avatar: 'https://i.pravatar.cc/150?img=1',
                    coins: 0,
                    likedVideos: [],
                    myVideos: [],
                    drafts: [],
                    following: [],
                    followers: [],
                    isTemporary: true
                };
            }
        } catch (error) {
            showNotification('Erreur de connexion. Mode hors ligne activé.', 'error');
            currentUser = {
                id: 'offline_user',
                username: 'Utilisateur Hors Ligne',
                avatar: 'https://i.pravatar.cc/150?img=1',
                coins: 0,
                isOffline: true
            };
        }
    }
    
    const captionInput = document.getElementById('videoCaption');
    const monetizeCheckbox = document.getElementById('monetizeVideo');
    const privacySelect = document.getElementById('videoPrivacy');
    const publishBtn = document.getElementById('publishBtn');
    
    if (!captionInput || !monetizeCheckbox || !privacySelect || !publishBtn) {
        console.error('❌ Un des éléments du formulaire est manquant');
        showNotification('Erreur du formulaire', 'error');
        return;
    }
    
    const caption = captionInput.value.trim();
    const isMonetized = monetizeCheckbox.checked;
    const privacy = privacySelect.value;
    
    if (!caption) {
        showNotification('Veuillez ajouter une légende', 'error');
        return;
    }
    
    const previewVideo = document.getElementById('previewVideo');
    if (!previewVideo || !previewVideo.src) {
        showNotification('Veuillez sélectionner une vidéo', 'error');
        return;
    }
    
    // Désactiver le bouton pendant la publication
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    try {
        console.log('📝 Préparation des données vidéo...');
        const hashtags = extractHashtags(caption);
        let videoUrl;
        
        // Détection du type de vidéo
        if (currentVideoFile && currentVideoFile instanceof File) {
            console.log('📁 Fichier vidéo local détecté');
            // Pour les fichiers locaux, utiliser une URL de données
            videoUrl = previewVideo.src;
        } else if (currentVideoFile && currentVideoFile.url) {
            console.log('🎥 Vidéo de démo détectée');
            videoUrl = currentVideoFile.url;
        } else {
            console.log('🔗 URL vidéo par défaut');
            videoUrl = previewVideo.src;
        }
        
        console.log('👤 Utilisateur ID:', currentUser.id);
        console.log('👤 Username:', currentUser.username);
        
        const videoData = {
            userId: currentUser.id,
            username: currentUser.username || `User${Math.floor(Math.random() * 10000)}`,
            avatar: currentUser.avatar || 'https://i.pravatar.cc/150?img=1',
            videoUrl: videoUrl,
            thumbnail: generateThumbnail(),
            caption: caption,
            isMonetized: isMonetized,
            hashtags: hashtags,
            duration: '00:15',
            privacy: privacy,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0
        };
        
        console.log('💾 Sauvegarde de la vidéo...');
        
        const newVideo = await firebaseApp.saveVideo(videoData);
        console.log('✅ Vidéo sauvegardée avec ID:', newVideo.id);
        
        // Ajouter à la liste locale
        videos.unshift(newVideo);
        
        // Fermer la modale et rafraîchir
        closeCreateModal();
        await renderVideoFeed();
        updateUI();
        
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        
    } catch (error) {
        console.error('❌ Erreur détaillée publication:', error);
        
        let errorMessage = 'Erreur lors de la publication';
        if (error.message.includes('permission')) {
            errorMessage = 'Vidéo sauvegardée localement (mode hors ligne)';
            // Sauvegarde locale
            const localVideo = {
                ...videoData,
                id: 'local_' + Date.now(),
                isLocal: true,
                createdAt: new Date()
            };
            videos.unshift(localVideo);
            closeCreateModal();
            renderVideoFeed();
        } else if (error.message.includes('network')) {
            errorMessage = 'Erreur réseau. Vidéo sauvegardée localement.';
        }
        
        showNotification(errorMessage, errorMessage.includes('sauvegardée') ? 'success' : 'error');
        
    } finally {
        // Réactiver le bouton
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
    }
}

function saveAsDraft() {
    const captionInput = document.getElementById('videoCaption');
    const monetizeCheckbox = document.getElementById('monetizeVideo');
    
    if (!captionInput || !monetizeCheckbox) {
        showNotification('Erreur du formulaire', 'error');
        return;
    }
    
    const caption = captionInput.value.trim();
    const isMonetized = monetizeCheckbox.checked;
    
    if (!currentUser) {
        showNotification('Utilisateur non connecté', 'error');
        return;
    }
    
    if (!currentUser.drafts) currentUser.drafts = [];
    
    const draft = {
        id: 'draft_' + Date.now(),
        caption: caption || 'Sans titre',
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR'),
        isMonetized: isMonetized,
        timestamp: Date.now(),
        hasVideo: !!currentVideoFile
    };
    
    currentUser.drafts.push(draft);
    
    // Sauvegarder
    firebaseApp.updateUser(currentUser.id, {
        drafts: currentUser.drafts
    }).then(() => {
        showNotification('Brouillon sauvegardé 📁', 'success');
        closeCreateModal();
    }).catch(error => {
        console.error('❌ Erreur sauvegarde brouillon:', error);
        // Sauvegarde locale
        localStorage.setItem('tiktak_drafts', JSON.stringify(currentUser.drafts));
        showNotification('Brouillon sauvegardé localement', 'info');
        closeCreateModal();
    });
}

function resetCreateModal() {
    const captionInput = document.getElementById('videoCaption');
    const monetizeCheckbox = document.getElementById('monetizeVideo');
    const privacySelect = document.getElementById('videoPrivacy');
    const videoElement = document.getElementById('previewVideo');
    const videoFileInfo = document.getElementById('videoFileInfo');
    const publishBtn = document.getElementById('publishBtn');
    
    if (captionInput) captionInput.value = '';
    if (monetizeCheckbox) monetizeCheckbox.checked = false;
    if (privacySelect) privacySelect.value = 'public';
    
    if (videoElement) {
        videoElement.src = '';
        videoElement.style.display = 'none';
    }
    
    const placeholder = document.querySelector('.preview-placeholder');
    if (placeholder) {
        placeholder.style.display = 'flex';
    }
    
    if (videoFileInfo) {
        videoFileInfo.innerHTML = `
            <i class="fas fa-file-video"></i>
            <span>Aucun fichier sélectionné</span>
        `;
    }
    
    if (document.getElementById('createOptions')) {
        document.getElementById('createOptions').style.display = 'flex';
    }
    if (document.getElementById('videoUploadSection')) {
        document.getElementById('videoUploadSection').style.display = 'none';
    }
    
    if (publishBtn) {
        publishBtn.disabled = true;
    }
    
    currentVideoFile = null;
}

// ==================== RECHERCHE ====================
async function performSearch(query) {
    const searchInput = document.getElementById('searchInput');
    if (!query) {
        if (!searchInput) return;
        query = searchInput.value;
    }
    
    if (!query.trim()) {
        showNotification('Veuillez entrer un terme de recherche', 'info');
        return;
    }
    
    try {
        const results = await firebaseApp.searchVideos(query);
        displaySearchResults(results, query);
    } catch (error) {
        console.error('❌ Erreur recherche:', error);
        // Recherche locale
        const normalizedQuery = query.toLowerCase();
        const results = videos.filter(video => 
            video.caption?.toLowerCase().includes(normalizedQuery) ||
            video.username?.toLowerCase().includes(normalizedQuery) ||
            (video.hashtags && video.hashtags.some(tag => 
                tag.toLowerCase().includes(normalizedQuery)
            ))
        );
        displaySearchResults(results, query);
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
                    Retour à l'accueil
                </button>
            </div>
        `;
        return;
    }
    
    const searchHeader = document.createElement('div');
    searchHeader.className = 'search-header';
    searchHeader.innerHTML = `
        <h3>Résultats pour "${query}" (${results.length})</h3>
        <button class="btn btn-small btn-secondary" onclick="showHome()" style="margin-top: 10px;">
            <i class="fas fa-arrow-left"></i> Retour
        </button>
    `;
    videoFeed.appendChild(searchHeader);
    
    results.forEach(video => {
        videoFeed.appendChild(createVideoElement(video));
    });
    
    showNotification(`${results.length} vidéo(s) trouvée(s)`, 'success');
}

// ==================== PROFIL ====================
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
    const profileUsername = document.getElementById('profileUsername');
    const profileCoins = document.getElementById('profileCoins');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileStats = document.getElementById('profileStats');
    
    if (!currentUser) {
        showNotification('Utilisateur non connecté', 'error');
        return;
    }
    
    if (profileUsername) profileUsername.textContent = currentUser.username || 'Utilisateur';
    if (profileCoins) profileCoins.textContent = currentUser.coins || 0;
    if (profileAvatar) profileAvatar.src = currentUser.avatar || 'https://i.pravatar.cc/150?img=1';
    
    const userVideos = videos.filter(v => v.userId === currentUser.id);
    const followersCount = currentUser.followers?.length || 0;
    const followingCount = currentUser.following?.length || 0;
    const stats = `${userVideos.length} vidéos • ${followersCount} abonnés • ${followingCount} abonnements`;
    if (profileStats) profileStats.textContent = stats;
    
    showProfileTab('videos');
}

function showProfileTab(tabName) {
    if (!event || !event.target) return;
    
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.profile-content').forEach(content => content.style.display = 'none');
    
    event.target.classList.add('active');
    const contentId = 'profile' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    const content = document.getElementById(contentId);
    if (content) content.style.display = 'block';
    
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
    if (!container) return;
    
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
                    <img src="${video.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432'}" alt="${video.caption || ''}">
                    <div class="thumbnail-overlay">
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
    if (!container) return;
    
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
                    <img src="${video.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432'}" alt="${video.caption || ''}">
                    <div class="thumbnail-overlay">
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
    if (!container) return;
    
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
                <div class="draft-item">
                    <div>
                        <h4>${draft.caption || 'Sans titre'}</h4>
                        <p>Créé le ${draft.date} à ${draft.time || ''}</p>
                        ${draft.isMonetized ? '<span class="draft-monetized">Monétisé</span>' : ''}
                        ${!draft.hasVideo ? '<span class="draft-warning">Sans vidéo</span>' : ''}
                    </div>
                    <div class="draft-actions">
                        <button class="btn btn-small btn-primary" onclick="editDraft('${draft.id}')">
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
    if (!currentUser) return;
    
    const settingsUsername = document.getElementById('settingsUsername');
    const settingsEmail = document.getElementById('settingsEmail');
    const settingsPhone = document.getElementById('settingsPhone');
    const settingsBio = document.getElementById('settingsBio');
    const settingsNotifications = document.getElementById('settingsNotifications');
    const settingsAutoplay = document.getElementById('settingsAutoplay');
    const settingsPrivateAccount = document.getElementById('settingsPrivateAccount');
    
    if (settingsUsername) settingsUsername.value = currentUser.username || '';
    if (settingsEmail) settingsEmail.value = currentUser.email || '';
    if (settingsPhone) settingsPhone.value = currentUser.phone || '';
    if (settingsBio) settingsBio.value = currentUser.bio || '';
    if (settingsNotifications) settingsNotifications.checked = currentUser.settings?.notifications !== false;
    if (settingsAutoplay) settingsAutoplay.checked = currentUser.settings?.autoplay !== false;
    if (settingsPrivateAccount) settingsPrivateAccount.checked = currentUser.settings?.privateAccount || false;
}

async function saveProfileSettings() {
    const settingsUsername = document.getElementById('settingsUsername');
    const settingsEmail = document.getElementById('settingsEmail');
    const settingsPhone = document.getElementById('settingsPhone');
    const settingsBio = document.getElementById('settingsBio');
    const settingsNotifications = document.getElementById('settingsNotifications');
    const settingsAutoplay = document.getElementById('settingsAutoplay');
    const settingsPrivateAccount = document.getElementById('settingsPrivateAccount');
    
    if (!settingsUsername || !settingsEmail || !settingsPhone || !settingsBio || 
        !settingsNotifications || !settingsAutoplay || !settingsPrivateAccount) {
        showNotification('Erreur du formulaire', 'error');
        return;
    }
    
    const username = settingsUsername.value.trim();
    const email = settingsEmail.value.trim();
    const phone = settingsPhone.value.trim();
    const bio = settingsBio.value.trim();
    const notifications = settingsNotifications.checked;
    const autoplay = settingsAutoplay.checked;
    const privateAccount = settingsPrivateAccount.checked;
    
    if (!currentUser) {
        showNotification('Utilisateur non connecté', 'error');
        return;
    }
    
    const updates = {};
    
    // Mettre à jour le nom d'utilisateur
    if (username && username !== currentUser.username) {
        updates.username = username;
        currentUser.username = username;
        
        // Mettre à jour les vidéos de l'utilisateur
        for (const video of videos) {
            if (video.userId === currentUser.id) {
                video.username = username;
                try {
                    await firebaseApp.updateVideo(video.id, { username: username });
                } catch (error) {
                    console.warn('⚠️ Impossible de mettre à jour la vidéo:', video.id);
                }
            }
        }
    }
    
    // Mettre à jour l'email
    if (email) {
        updates.email = email;
        currentUser.email = email;
    }
    
    // Mettre à jour le téléphone et la bio
    if (phone !== currentUser.phone) {
        updates.phone = phone;
        currentUser.phone = phone;
    }
    if (bio !== currentUser.bio) {
        updates.bio = bio;
        currentUser.bio = bio;
    }
    
    // Mettre à jour les paramètres
    currentUser.settings = {
        notifications: notifications,
        autoplay: autoplay,
        privateAccount: privateAccount,
        privacy: currentUser.settings?.privacy || 'public'
    };
    updates.settings = currentUser.settings;
    
    try {
        await firebaseApp.updateUserProfile(currentUser.id, updates);
        showNotification('Paramètres sauvegardés avec succès ✅', 'success');
        
        // Mettre à jour l'affichage du profil
        const profileUsername = document.getElementById('profileUsername');
        if (profileUsername) profileUsername.textContent = currentUser.username;
        
        // Sauvegarder localement
        localStorage.setItem('tiktak_current_user', JSON.stringify(currentUser));
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde paramètres:', error);
        showNotification('Paramètres sauvegardés localement', 'info');
        localStorage.setItem('tiktak_current_user', JSON.stringify(currentUser));
    }
}

function changePassword() {
    showNotification('Changement de mot de passe - Fonctionnalité à venir', 'info');
}

function deleteAccount() {
    if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
        showNotification('Suppression de compte - Fonctionnalité à venir', 'info');
    }
}

// ==================== UTILITAIRES ====================
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'Récemment';
    
    let date;
    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' h';
    if (seconds < 2592000) return Math.floor(seconds / 86400) + ' j';
    if (seconds < 31536000) return Math.floor(seconds / 2592000) + ' mois';
    return Math.floor(seconds / 31536000) + ' an';
}

function extractHashtags(text) {
    if (!text) return [];
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
    
    setTimeout(() => {
        if (heart.parentElement) heart.remove();
    }, 1000);
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) {
        // Créer le conteneur s'il n'existe pas
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationsContainer';
        newContainer.className = 'notifications-container';
        document.body.appendChild(newContainer);
        container = newContainer;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
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
        if (notification.parentElement === container) {
            notification.remove();
        }
    }, 5000);
}

function updateUI() {
    try {
        // Mettre à jour le nombre de coins dans la navigation si présent
        const coinElements = document.querySelectorAll('.coin-count');
        coinElements.forEach(el => {
            if (currentUser && currentUser.coins !== undefined) {
                el.textContent = currentUser.coins;
            }
        });
        
        // Mettre à jour l'avatar si présent
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(el => {
            if (currentUser && currentUser.avatar) {
                el.src = currentUser.avatar;
            }
        });
        
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

function openSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.style.display = 'block';
        searchInput.focus();
    }
}

// ==================== ÉCOUTEURS D'ÉVÉNEMENTS ====================
function setupEventListeners() {
    // Recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
                this.value = '';
                this.blur();
            }
        });
    }
    
    const searchBtn = document.querySelector('.search-btn');
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
    const videoInput = document.getElementById('videoInput');
    if (videoInput) {
        videoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                processVideoFile(file);
            }
        });
    }
    
    // Input photo de profil
    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file && currentUser) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    currentUser.avatar = e.target.result;
                    
                    // Mettre à jour l'affichage
                    const profileAvatar = document.getElementById('profileAvatar');
                    if (profileAvatar) profileAvatar.src = currentUser.avatar;
                    
                    // Sauvegarder
                    firebaseApp.updateUser(currentUser.id, { avatar: currentUser.avatar })
                        .then(() => {
                            showNotification('Photo de profil mise à jour ✅', 'success');
                            localStorage.setItem('tiktak_current_user', JSON.stringify(currentUser));
                        })
                        .catch(error => {
                            console.error('❌ Erreur mise à jour photo:', error);
                            showNotification('Photo sauvegardée localement', 'info');
                            localStorage.setItem('tiktak_current_user', JSON.stringify(currentUser));
                        });
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Fermer les modales en cliquant à l'extérieur
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
    
    // Navigation mobile
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Touche Échap pour fermer les modales
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('createModal').style.display === 'flex') closeCreateModal();
            if (document.getElementById('profileModal').style.display === 'flex') closeProfile();
            if (document.getElementById('settingsModal').style.display === 'flex') closeSettings();
        }
    });
    
    // Détecter les clics en dehors de la recherche pour la cacher
    document.addEventListener('click', function(e) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.style.display === 'block' && 
            !e.target.closest('.search-bar') && !e.target.closest('.bottom-nav .nav-item:nth-child(2)')) {
            searchInput.style.display = 'none';
        }
    });
}

// ==================== FONCTIONS DE NAVIGATION ====================
function showTrending() {
    renderVideoFeed('trending');
    showNotification('Affichage des tendances', 'info');
}

function showFollowing() {
    if (!currentUser || !currentUser.following || currentUser.following.length === 0) {
        showNotification('Vous ne suivez personne', 'info');
        return;
    }
    
    const followingVideos = videos.filter(v => currentUser.following.includes(v.userId));
    if (followingVideos.length === 0) {
        showNotification('Aucune vidéo de vos abonnements', 'info');
        return;
    }
    
    const videoFeed = document.getElementById('videoFeed');
    if (videoFeed) {
        videoFeed.innerHTML = '';
        followingVideos.forEach(video => videoFeed.appendChild(createVideoElement(video)));
        showNotification('Affichage des abonnements', 'info');
    }
}

function showFavorites() {
    showNotification('Fonctionnalité favoris à venir', 'info');
}

function showMyVideos() {
    if (!currentUser) {
        showNotification('Utilisateur non connecté', 'info');
        return;
    }
    
    const myVideos = videos.filter(v => v.userId === currentUser.id);
    if (myVideos.length === 0) {
        showNotification('Vous n\'avez pas de vidéos', 'info');
        return;
    }
    
    const videoFeed = document.getElementById('videoFeed');
    if (videoFeed) {
        videoFeed.innerHTML = '';
        myVideos.forEach(video => videoFeed.appendChild(createVideoElement(video)));
        showNotification('Affichage de vos vidéos', 'info');
    }
}

function openCreatorProfile(userId) {
    showNotification('Profil créateur: ' + (usersCache[userId]?.username || userId), 'info');
}

function openCommentsModal(videoId) {
    showNotification('Commentaires pour la vidéo - Fonctionnalité à venir', 'info');
}

function openLiveStream() {
    showNotification('Live streaming à venir', 'info');
}

function clearLocalStorage() {
    if (confirm('Réinitialiser les données locales ? Cela supprimera vos paramètres et brouillons.')) {
        localStorage.removeItem('tiktak_current_user');
        localStorage.removeItem('tiktak_local_videos');
        localStorage.removeItem('tiktak_drafts');
        showNotification('Données locales effacées', 'success');
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

function logout() {
    if (confirm('Se déconnecter ? Vous perdrez les données non synchronisées.')) {
        localStorage.clear();
        showNotification('Déconnexion réussie', 'success');
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

function openVideoDetail(videoId) {
    showNotification('Détails vidéo - Fonctionnalité à venir', 'info');
}

function editDraft(draftId) {
    showNotification('Édition brouillon - Fonctionnalité à venir', 'info');
}

function deleteDraft(draftId) {
    if (confirm('Supprimer ce brouillon ?')) {
        if (currentUser && currentUser.drafts) {
            currentUser.drafts = currentUser.drafts.filter(d => d.id !== draftId);
            firebaseApp.updateUser(currentUser.id, { drafts: currentUser.drafts })
                .then(() => {
                    loadProfileDrafts();
                    showNotification('Brouillon supprimé', 'success');
                })
                .catch(error => {
                    console.error('❌ Erreur suppression brouillon:', error);
                    showNotification('Brouillon supprimé localement', 'info');
                    localStorage.setItem('tiktak_drafts', JSON.stringify(currentUser.drafts));
                    loadProfileDrafts();
                });
        }
    }
}

function openNotifications() {
    showNotification('Aucune nouvelle notification', 'info');
}

function openWallet() {
    showNotification(`Portefeuille - Solde: ${currentUser?.coins || 0} coins`, 'info');
}

// ==================== EXPORT DES FONCTIONS ====================
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
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
window.saveProfileSettings = saveProfileSettings;
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
window.changePassword = changePassword;
window.deleteAccount = deleteAccount;
window.showMyVideos = showMyVideos;

// Initialiser les écouteurs d'événements au chargement
setTimeout(() => {
    setupEventListeners();
}, 500);

console.log('✅ script.js chargé avec succès - VERSION CORRIGÉE');
