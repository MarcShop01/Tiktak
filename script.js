You are absolutely correct! My apologies. The previous response was truncated. Here's the complete script:

```javascript
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
            showNotification('Application chargée en mode hors ligne', 'warning');
            await initializeOfflineMode();
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

        // Charger les vidéos#
        videos = await firebaseApp.loadVideos(30);
        console.log(`📹 ${videos.length} vidéos réelles chargées`);

        // Mettre en cache les utilisateurs
        await cacheVideoUsers();

        // Initialiser les écouteurs d'événements
        setupEventListeners();

        // Afficher le flux vidéo
        await renderVideoFeed();

        // Mettre à jour l'interface
        updateUI();

        // Configurer l'écoute en temps réel
        setupRealtimeListener();

        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        console.log('✅ Application initialisée');
        isInitialized = true;

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        throw error;
    }
}

async function initializeOfflineMode() {
    console.log('📱 Mode hors ligne activé');

    currentUser = {
        id: 'offline_user_' + Date.now(),
        username: 'Utilisateur',
        avatar: 'https://i.pravatar.cc/150?img=1',
        coins: 0,
        likedVideos: [],
        myVideos: [],
        drafts: [],
        following: [],
        followers: [],
        bio: '',
        phone: '',
        settings: {
            notifications: true,
            autoplay: true,
            privateAccount: false,
            privacy: 'public'
        },
        createdAt: new Date(),
        isOffline: true
    };

    // Pas de vidéos en mode hors ligne
    videos = [];

    setupEventListeners();
    await renderVideoFeed();
    updateUI();

    showNotification('Mode hors ligne - Connectez-vous pour voir les vidéos', 'info');
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
        const videoElement = createVideoElement(video, index === 0);
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

    // VÉRIFICATION CRITIQUE : s'assurer que l'URL de la vidéo est valide
    // Ne pas afficher les vidéos avec des URLs blob ou data
    const videoUrl = video.videoUrl && !video.videoUrl.startsWith('blob:') && !video.videoUrl.startsWith('data:')
        ? video.videoUrl
        : '';

    container.innerHTML = `
        <div class="video-wrapper">
            <video
                src="${videoUrl}"
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
    if (!videoElement || !videoElement.src) return;

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
    showNotification('Fonction caméra à venir', 'info');
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

    // Créer une URL temporaire pour l'aperçu local seulement
    const videoObjectURL = URL.createObjectURL(file);

    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');

    if (!videoElement) {
        console.error('❌ Élément previewVideo non trouvé');
        return;
    }

    videoElement.src = videoObjectURL;
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
        // Libérer l'URL de l'objet
        URL.revokeObjectURL(videoObjectURL);
    };

    // Libérer l'URL de l'objet quand la vidéo est terminée
    videoElement.onended = function() {
        URL.revokeObjectURL(videoObjectURL);
    };
}

function formatFileSize(bytes) {
    if (bytes >= 1000000) return (bytes / 1000000).toFixed(1) + ' MB';
    if (bytes >= 1000) return (bytes / 1000).toFixed(1) + ' KB';
    return bytes + ' B';
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

        console.log('👤 Utilisateur ID:', currentUser.id);
        console.log('👤 Username:', currentUser.username);

        // IMPORTANT : Vous devez utiliser Firebase Storage pour obtenir une URL permanente
        // Actuellement, le code utilise l'URL de l'aperçu (blob: ou data:) qui ne fonctionne que localement

        // Pour que les vidéos fonctionnent sur tous les appareils, vous DEVEZ utiliser Firebase Storage
        // Voici ce que vous devriez faire (à implémenter quand vous activerez Firebase Storage) :

        // 1. Téléverser le fichier vers Firebase Storage
        // 2. Obtenir l'URL de téléchargement permanente
        // 3. Sauvegarder cette URL dans Firestore

        // Pour l'instant, on ne peut pas publier de vidéo réelle sans Firebase Storage
        // Nous allons donc désactiver cette fonctionnalité et demander à l'utilisateur d'activer Storage

        showNotification('⚠️ Fonctionnalité temporairement désactivée', 'warning');
        showNotification('Pour publier des vidéos réelles, activez Firebase Storage dans votre projet', 'info');

        // Réactiver le bouton
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        return;

        // Code à utiliser quand Firebase Storage sera activé :
        /*
        const videoData = {
            userId: currentUser.id,
            username: currentUser.username || `User${Math.floor(Math.random() * 10000)}`,
            avatar: currentUser.avatar || 'https://i.pravatar.cc/150?img=1',
            videoUrl: 'URL_DE_FIREBASE_STORAGE', // ← REMPLACER PAR L'URL DE STORAGE
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
        */

    } catch (error) {
        console.error('❌ Erreur détaillée publication:', error);

        let errorMessage = 'Erreur lors de la publication';
        if (error.message.includes('permission')) {
            errorMessage = 'Permissions insuffisantes';
        } else if (error.message.includes('network')) {
            errorMessage = 'Erreur réseau';
        }

        showNotification(errorMessage, 'error');

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
    const videoFeed = document

