// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;

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
            loadDemoVideos();
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
        
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        console.log('✅ Application initialisée');
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur de connexion à la base de données', 'error');
        loadDemoVideos();
    }
}

// ==================== GESTION DES VIDÉOS ====================
async function renderVideoFeed() {
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
    
    videos.forEach((video, index) => {
        const videoElement = createVideoElement(video, index === 0);
        videoFeed.appendChild(videoElement);
    });
}

function createVideoElement(video, autoPlay = false) {
    const isLiked = currentUser?.likedVideos?.includes(video.id) || false;
    const user = usersCache[video.userId] || {};
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    const videoHtml = `
        <div class="video-player-wrapper">
            <video 
                src="${video.videoUrl}" 
                poster="${video.thumbnail || 'https://images.unsplash.com/photo-1611605698335-8b1569810432'}"
                onclick="toggleVideoPlay(this)"
                ${autoPlay ? 'autoplay muted playsinline' : 'preload="metadata"'}
                loop
                playsinline
                webkit-playsinline
                style="width: 100%; height: 100%; object-fit: cover; background: #000;"
            ></video>
            
            <button class="manual-play-btn" onclick="toggleVideoPlay(this.previousElementSibling)">
                <i class="fas fa-play"></i>
            </button>
        </div>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${user.avatar || video.avatar || 'https://i.pravatar.cc/150?img=1'}" 
                     alt="${user.username || video.username || 'Utilisateur'}" 
                     class="creator-avatar">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4>${user.username || video.username || 'Utilisateur'}</h4>
                    </div>
                    <p class="video-caption">${video.caption || 'Pas de description'}</p>
                </div>
            </div>
            
            <div class="video-stats">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views || 0)} vues
                </div>
                <div class="video-details">
                    <span class="time-ago">${getTimeAgo(video.createdAt.getTime())}</span>
                </div>
            </div>
        </div>
        
        <div class="video-actions">
            <div class="action ${isLiked ? 'liked' : ''}" onclick="toggleLike('${video.id}')">
                <i class="fas fa-heart"></i>
                <span>${formatNumber(video.likes || 0)}</span>
            </div>
            
            <div class="action" onclick="shareVideo('${video.id}')">
                <i class="fas fa-share"></i>
                <span>${formatNumber(video.shares || 0)}</span>
            </div>
        </div>
    `;
    
    container.innerHTML = videoHtml;
    return container;
}

// ==================== CRÉATION DE VIDÉO ====================
function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    resetCreateModal();
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetCreateModal();
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
    
    document.getElementById('publishBtn').disabled = true;
    document.getElementById('uploadProgressContainer').style.display = 'none';
    
    currentVideoFile = null;
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
    console.log('📁 Fichier sélectionné:', file.name);
    
    // Vérifications de base
    if (file.size > 500 * 1024 * 1024) {
        showNotification('Vidéo trop volumineuse (max 500MB)', 'error');
        return;
    }
    
    // Accepter tous les formats vidéo
    const allowedTypes = [
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
        'video/x-msvideo', 'video/x-matroska', 'video/3gpp', 'video/mpeg',
        'video/x-ms-wmv', 'video/avi', 'video/flv', 'video/mov'
    ];
    
    const extension = file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv', '3gp', 'mpeg', 'mpg', 'm4v'];
    
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('video/')) {
        if (!allowedExtensions.includes(extension)) {
            showNotification('Format non supporté. Formats acceptés: ' + allowedExtensions.join(', '), 'error');
            return;
        }
    }
    
    currentVideoFile = file;
    
    // Afficher la prévisualisation
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    
    videoElement.src = URL.createObjectURL(file);
    videoElement.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Activer le bouton de publication
    document.getElementById('publishBtn').disabled = false;
    
    // Mettre à jour les informations du fichier
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>${file.name} (${formatFileSize(file.size)})</span>
    `;
    
    showNotification('Vidéo chargée avec succès !', 'success');
}

function simulateRecording() {
    showNotification('Utilisation d\'une vidéo de démo', 'info');
    
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    
    const demoVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    ];
    
    videoElement.src = demoVideos[0];
    videoElement.style.display = 'block';
    placeholder.style.display = 'none';
    
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
    
    // Afficher la barre de progression
    document.getElementById('uploadProgressContainer').style.display = 'block';
    document.getElementById('uploadProgressBar').style.width = '0%';
    document.getElementById('uploadProgressText').textContent = '0%';
    
    try {
        const hashtags = extractHashtags(caption);
        let videoUrl;
        
        if (currentVideoFile.isDemo) {
            // Utiliser l'URL de démo
            videoUrl = document.getElementById('previewVideo').src;
            showNotification('Publication de la vidéo démo...', 'info');
        } else {
            // Upload vers Firebase Storage
            showNotification('Upload en cours...', 'info');
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
        
        // Réinitialiser le formulaire
        closeCreateModal();
        
        // Recharger le flux
        renderVideoFeed();
        updateUI();
        
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        
    } catch (error) {
        console.error('❌ Erreur publication:', error);
        
        let errorMessage = 'Erreur lors de la publication';
        if (error.message.includes('storage/unauthorized')) {
            errorMessage = 'Erreur d\'autorisation. Vérifiez vos règles Firebase Storage.';
        } else if (error.message.includes('Fichier trop volumineux')) {
            errorMessage = 'Le fichier est trop volumineux (max 500MB)';
        }
        
        showNotification(errorMessage + ': ' + error.message, 'error');
        
        // Réactiver le bouton
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
    return Math.floor(seconds / 2592000) + ' mois';
}

function extractHashtags(text) {
    const hashtags = text.match(/#[\wÀ-ÿ]+/g);
    return hashtags ? hashtags.slice(0, 5) : [];
}

function generateThumbnail() {
    const thumbnails = [
        'https://images.unsplash.com/photo-1611605698335-8b1569810432',
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b',
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187'
    ];
    return thumbnails[Math.floor(Math.random() * thumbnails.length)];
}

function showNotification(message, type = 'info') {
    let container = document.getElementById('notificationsContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationsContainer';
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
    
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
    
    setTimeout(() => {
        if (notification.parentElement) notification.remove();
    }, 5000);
}

// ==================== ÉCOUTEURS D'ÉVÉNEMENTS ====================
function setupEventListeners() {
    console.log('🔧 Configuration des écouteurs d\'événements...');
    
    // Input vidéo
    setupVideoInput();
    
    // Recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
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
    
    console.log('✅ Écouteurs d\'événements configurés');
}

// ==================== FONCTIONS EXPORTÉES ====================
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.openFilePicker = openFilePicker;
window.simulateRecording = simulateRecording;
window.publishVideo = publishVideo;

// Initialiser les écouteurs
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupEventListeners();
    }, 1000);
});

console.log('✅ script.js chargé avec succès');
