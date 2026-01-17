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

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Simuler le chargement
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        initializeApp();
    }, 1500);
});

function initializeApp() {
    loadDataFromStorage();
    setupEventListeners();
    renderVideoFeed();
    updateUI();
    showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
}

function loadDataFromStorage() {
    // Charger les vidéos
    const savedVideos = localStorage.getItem('tiktak_videos');
    videos = savedVideos ? JSON.parse(savedVideos) : getDemoVideos();
    
    // Charger l'utilisateur
    const savedUser = localStorage.getItem('tiktak_user');
    if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        currentUser = { ...currentUser, ...parsedUser };
    }
    
    // Charger les commentaires
    const savedComments = localStorage.getItem('tiktak_comments');
    comments = savedComments ? JSON.parse(savedComments) : {};
    
    // Charger les transactions
    const savedTransactions = localStorage.getItem('tiktak_transactions');
    transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
}

function getDemoVideos() {
    return [
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
            username: 'Sport Extrême',
            avatar: 'https://randomuser.me/api/portraits/lego/4.jpg',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
            caption: 'Journée de sport extrême ! 🚵‍♂️ #sport #aventure',
            likes: 5200,
            comments: 412,
            shares: 156,
            views: 45000,
            timestamp: Date.now() - 10800000,
            isMonetized: true,
            gifts: 25,
            hashtags: ['#sport', '#aventure', '#extrême'],
            duration: '00:45',
            privacy: 'public'
        },
        {
            id: '4',
            userId: 'user_5',
            username: 'Cuisine Créative',
            avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=1065&q=80',
            caption: 'Recette facile et délicieuse 🍰 #cuisine #recette',
            likes: 3100,
            comments: 189,
            shares: 67,
            views: 32000,
            timestamp: Date.now() - 14400000,
            isMonetized: true,
            gifts: 15,
            hashtags: ['#cuisine', '#recette', '#food'],
            duration: '01:00',
            privacy: 'public'
        }
    ];
}

// ==================== GESTION DES MODALES ====================
function openCreateModal() {
    document.getElementById('createModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    dispatchEvent(new CustomEvent('modalOpen'));
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetCreateModal();
}

function openProfile() {
    loadProfileData();
    document.getElementById('profileModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    dispatchEvent(new CustomEvent('modalOpen'));
}

function closeProfile() {
    document.getElementById('profileModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function openSettings() {
    loadSettings();
    document.getElementById('settingsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    dispatchEvent(new CustomEvent('modalOpen'));
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function toggleUserMenu() {
    const menu = document.getElementById('userDropdown');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// ==================== GESTION DES VIDÉOS ====================
function renderVideoFeed() {
    const videoFeed = document.getElementById('videoFeed');
    videoFeed.innerHTML = '';
    
    videos.forEach(video => {
        videoFeed.appendChild(createVideoElement(video));
    });
    
    // Initialiser la lecture automatique si activée
    if (currentUser.settings.autoplay) {
        const firstVideo = document.querySelector('.video-container video');
        if (firstVideo) {
            firstVideo.muted = true;
            firstVideo.play().catch(e => console.log('Auto-play prevented'));
        }
    }
}

function createVideoElement(video) {
    const isLiked = currentUser.likedVideos.includes(video.id);
    const timeAgo = getTimeAgo(video.timestamp);
    const isFollowing = currentUser.following.includes(video.userId);
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    container.innerHTML = `
        <video 
            src="${video.videoUrl}" 
            poster="${video.thumbnail}"
            preload="metadata"
            onclick="toggleVideoPlay(this)"
            loop
        ></video>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${video.avatar}" alt="${video.username}" onclick="openCreatorProfile('${video.userId}')">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4>${video.username}</h4>
                        ${isFollowing ? '<span class="following-badge">Abonné</span>' : ''}
                    </div>
                    <p class="video-caption">${video.caption}</p>
                    <div class="hashtags">
                        ${video.hashtags ? video.hashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('') : ''}
                    </div>
                    ${video.isMonetized ? '<span class="monetization-badge"><i class="fas fa-coins"></i> Monétisé</span>' : ''}
                </div>
                <button class="btn btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${video.userId}', this)">
                    ${isFollowing ? '<i class="fas fa-check"></i> Abonné' : '<i class="fas fa-plus"></i> Suivre'}
                </button>
            </div>
            
            <div class="video-stats">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views)} vues
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
    
    return container;
}

function toggleVideoPlay(videoElement) {
    const container = videoElement.closest('.video-container');
    const playBtn = container.querySelector('.manual-play-btn');
    
    if (videoElement.paused) {
        // Arrêter la vidéo en cours de lecture
        if (currentPlayingVideo && currentPlayingVideo !== videoElement) {
            currentPlayingVideo.pause();
            const prevPlayBtn = currentPlayingVideo.closest('.video-container').querySelector('.manual-play-btn');
            if (prevPlayBtn) prevPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        videoElement.play();
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        currentPlayingVideo = videoElement;
        
        // Incrémenter les vues
        const videoId = container.dataset.videoId;
        incrementViews(videoId);
    } else {
        videoElement.pause();
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        currentPlayingVideo = null;
    }
}

function incrementViews(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex !== -1) {
        videos[videoIndex].views++;
        saveVideos();
        
        // Mettre à jour l'UI
        const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
        if (container) {
            const viewCount = container.querySelector('.view-count');
            viewCount.innerHTML = `<i class="fas fa-eye"></i> ${formatNumber(videos[videoIndex].views)} vues`;
        }
    }
}

// ==================== INTERACTIONS SOCIALES ====================
function toggleLike(videoId) {
    const videoIndex = videos.findIndex(v => v.id === videoId);
    if (videoIndex === -1) return;
    
    const video = videos[videoIndex];
    const userLikedIndex = currentUser.likedVideos.indexOf(videoId);
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    
    if (userLikedIndex === -1) {
        // Ajouter le like
        video.likes++;
        currentUser.likedVideos.push(videoId);
        
        // Animation de cœur
        showHeartAnimation();
        showNotification('Vidéo aimée ! ❤️', 'success');
        
        // Ajouter une notification au créateur
        if (video.userId !== currentUser.id) {
            addNotification(video.userId, {
                id: 'notif_' + Date.now(),
                type: 'like',
                fromUserId: currentUser.id,
                fromUsername: currentUser.username,
                videoId: videoId,
                message: `${currentUser.username} a aimé votre vidéo`,
                timestamp: Date.now(),
                read: false
            });
        }
    } else {
        // Retirer le like
        video.likes--;
        currentUser.likedVideos.splice(userLikedIndex, 1);
        showNotification('Like retiré', 'info');
    }
    
    saveVideos();
    saveUserData();
    
    // Mettre à jour l'UI
    const likeElement = container.querySelector('.action:nth-child(1)');
    likeElement.className = `action ${userLikedIndex === -1 ? 'liked' : ''}`;
    likeElement.querySelector('span').textContent = formatNumber(video.likes);
}

function toggleFollow(userId, buttonElement) {
    const userIndex = currentUser.following.indexOf(userId);
    
    if (userIndex === -1) {
        // Suivre
        currentUser.following.push(userId);
        buttonElement.innerHTML = '<i class="fas fa-check"></i> Abonné';
        buttonElement.classList.add('following');
        showNotification('Utilisateur suivi !', 'success');
        
        // Ajouter une notification
        addNotification(userId, {
            id: 'notif_' + Date.now(),
            type: 'follow',
            fromUserId: currentUser.id,
            fromUsername: currentUser.username,
            message: `${currentUser.username} vous a suivi`,
            timestamp: Date.now(),
            read: false
        });
    } else {
        // Se désabonner
        currentUser.following.splice(userIndex, 1);
        buttonElement.innerHTML = '<i class="fas fa-plus"></i> Suivre';
        buttonElement.classList.remove('following');
        showNotification('Abonnement annulé', 'info');
    }
    
    saveUserData();
}

function shareVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    if (navigator.share) {
        navigator.share({
            title: video.caption,
            text: 'Regarde cette vidéo sur TIKTAK!',
            url: window.location.href + '?video=' + videoId
        }).then(() => {
            video.shares++;
            saveVideos();
            updateVideoStats(videoId);
            showNotification('Vidéo partagée ! 📤', 'success');
        });
    } else {
        // Fallback pour les navigateurs qui ne supportent pas Web Share API
        navigator.clipboard.writeText(window.location.href + '?video=' + videoId).then(() => {
            video.shares++;
            saveVideos();
            updateVideoStats(videoId);
            showNotification('Lien copié dans le presse-papier ! 📋', 'success');
        });
    }
}

function saveVideo(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Ajouter aux favoris de l'utilisateur
    if (!currentUser.myVideos.includes(videoId)) {
        currentUser.myVideos.push(videoId);
        saveUserData();
        showNotification('Vidéo enregistrée dans vos favoris ! ⭐', 'success');
    } else {
        showNotification('Vidéo déjà enregistrée', 'info');
    }
}

// ==================== CRÉATION DE VIDÉO ====================
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
    document.getElementById('videoProcessing').style.display = 'flex';
    
    reader.onload = function(e) {
        const videoElement = document.getElementById('previewVideo');
        const placeholder = document.querySelector('.preview-placeholder');
        
        videoElement.src = e.target.result;
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Simuler le traitement
        setTimeout(() => {
            document.getElementById('videoProcessing').style.display = 'none';
            videoElement.load();
            
            // Lorsque la vidéo est chargée, obtenir sa durée
            videoElement.onloadedmetadata = function() {
                const duration = videoElement.duration;
                document.getElementById('videoFileInfo').innerHTML += 
                    `<div class="duration-info">Durée: ${formatDuration(duration)}</div>`;
            };
        }, 2000);
        
        // Mettre à jour les informations du fichier
        document.getElementById('videoFileInfo').innerHTML = `
            <i class="fas fa-file-video"></i>
            <span>${file.name} (${formatFileSize(file.size)})</span>
        `;
        
        // Activer le bouton de publication
        document.getElementById('publishBtn').disabled = false;
    };
    
    reader.readAsDataURL(file);
}

function simulateRecording() {
    showNotification('Utilisation d\'une vidéo de démo 📹', 'info');
    
    const demoVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
    const videoElement = document.getElementById('previewVideo');
    const placeholder = document.querySelector('.preview-placeholder');
    
    videoElement.src = demoVideoUrl;
    videoElement.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Simuler un fichier
    currentVideoFile = {
        name: 'video_demo.mp4',
        size: 15300000,
        type: 'video/mp4'
    };
    
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>video_demo.mp4 (15.3 MB)</span>
        <div class="duration-info">Durée: 00:15</div>
    `;
    
    // Activer le bouton de publication
    document.getElementById('publishBtn').disabled = false;
}

function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('La fonction d\'enregistrement n\'est pas supportée sur votre navigateur', 'error');
        return;
    }
    
    showNotification('Démarrage de l\'enregistrement... 🎥', 'info');
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(function(stream) {
            isRecording = true;
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];
            
            mediaRecorder.ondataavailable = function(event) {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = function() {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const file = new File([blob], 'recording.webm', { type: 'video/webm' });
                processVideoFile(file);
                
                // Arrêter tous les tracks du stream
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            document.getElementById('recordBtn').innerHTML = '<i class="fas fa-stop"></i> Arrêter';
            document.getElementById('recordBtn').classList.add('recording');
            
            // Arrêter automatiquement après 60 secondes
            setTimeout(() => {
                if (isRecording) {
                    stopRecording();
                }
            }, 60000);
        })
        .catch(function(error) {
            console.error('Erreur d\'enregistrement:', error);
            showNotification('Erreur lors de l\'accès à la caméra/microphone', 'error');
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('recordBtn').innerHTML = '<i class="fas fa-video"></i> Enregistrer';
        document.getElementById('recordBtn').classList.remove('recording');
        showNotification('Enregistrement terminé ✅', 'success');
    }
}

function publishVideo() {
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!currentVideoFile && !document.getElementById('previewVideo').src) {
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
    
    // Désactiver le bouton pendant la publication
    const publishBtn = document.getElementById('publishBtn');
    publishBtn.disabled = true;
    publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
    
    // Extraire les hashtags de la légende
    const hashtags = extractHashtags(caption);
    
    // Simuler le processus de publication
    setTimeout(() => {
        const videoUrl = document.getElementById('previewVideo').src || 
                        URL.createObjectURL(currentVideoFile) || 
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
        currentUser.myVideos.push(newVideo.id);
        
        saveVideos();
        saveUserData();
        renderVideoFeed();
        
        closeCreateModal();
        showNotification('Vidéo publiée avec succès ! 🎉', 'success');
        
        // Réactiver le bouton
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        
        // Ajouter une transaction si monétisée
        if (isMonetized) {
            addTransaction({
                id: 'trans_' + Date.now(),
                type: 'video_upload',
                amount: 10,
                description: 'Gains vidéo monétisée',
                timestamp: Date.now()
            });
        }
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
    
    currentUser.drafts.push(draft);
    saveUserData();
    
    showNotification('Brouillon sauvegardé 📁', 'success');
    closeCreateModal();
}

function resetCreateModal() {
    document.getElementById('videoCaption').value = '';
    document.getElementById('monetizeVideo').checked = false;
    document.getElementById('videoPrivacy').value = 'public';
    document.getElementById('previewVideo').src = '';
    document.getElementById('previewVideo').style.display = 'none';
    document.querySelector('.preview-placeholder').style.display = 'flex';
    document.getElementById('videoFileInfo').innerHTML = `
        <i class="fas fa-file-video"></i>
        <span>Aucun fichier sélectionné</span>
    `;
    currentVideoFile = null;
    
    // Réinitialiser le bouton d'enregistrement si nécessaire
    if (isRecording) {
        stopRecording();
    }
}

// ==================== BOUTIQUE DE CADEAUX ====================
function openGiftShop(videoId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'giftShopModal';
    modal.innerHTML = `
        <div class="modal-content gift-shop-modal">
            <span class="close-btn" onclick="closeModal('giftShopModal')">&times;</span>
            <h2><i class="fas fa-gift"></i> Boutique de Cadeaux</h2>
            <p class="balance-info">Votre solde: <span class="coin-count">${currentUser.coins}</span> <i class="fas fa-coins"></i></p>
            
            <div class="gift-categories" id="giftCategories">
                ${giftCategories.map(category => `
                    <button class="gift-category-btn ${category.id === 'all' ? 'active' : ''}" onclick="filterGifts('${category.id}', this)">
                        <i class="${category.icon}"></i> ${category.name}
                    </button>
                `).join('')}
            </div>
            
            <div class="gifts-grid" id="giftsGrid">
                ${gifts.map(gift => `
                    <div class="gift-item" data-category="${gift.category}">
                        <div class="gift-icon">
                            <i class="${gift.icon}"></i>
                        </div>
                        <div class="gift-name">${gift.name}</div>
                        <div class="gift-description">${gift.description}</div>
                        <div class="gift-price">
                            <span class="gift-coins">${gift.coins} <i class="fas fa-coins"></i></span>
                            <span class="gift-usd">≈ $${gift.price}</span>
                        </div>
                        <div class="gift-actions">
                            <button class="btn btn-small btn-primary" onclick="sendGift('${videoId}', '${gift.id}')">
                                Envoyer
                            </button>
                            <button class="btn btn-small btn-secondary" onclick="previewGift('${gift.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="openCoinShop()">
                    <i class="fas fa-shopping-cart"></i> Acheter des Coins
                </button>
                <button class="btn btn-primary" onclick="closeModal('giftShopModal')">
                    Fermer
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

function filterGifts(categoryId, buttonElement) {
    const giftItems = document.querySelectorAll('.gift-item');
    const categoryButtons = document.querySelectorAll('.gift-category-btn');
    
    // Mettre à jour les boutons de catégorie
    categoryButtons.forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');
    
    // Filtrer les cadeaux
    giftItems.forEach(item => {
        if (categoryId === 'all' || item.dataset.category === categoryId) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function sendGift(videoId, giftId) {
    const gift = gifts.find(g => g.id === giftId);
    const video = videos.find(v => v.id === videoId);
    
    if (!gift || !video) return;
    
    if (currentUser.coins < gift.coins) {
        showNotification('Fonds insuffisants ! Achetez plus de coins.', 'error');
        openCoinShop();
        return;
    }
    
    // Déduire les coins
    currentUser.coins -= gift.coins;
    
    // Ajouter les cadeaux à la vidéo
    video.gifts = (video.gifts || 0) + 1;
    
    // Ajouter une transaction
    addTransaction({
        id: 'trans_' + Date.now(),
        type: 'gift_sent',
        amount: -gift.coins,
        description: `Cadeau "${gift.name}" envoyé à ${video.username}`,
        timestamp: Date.now()
    });
    
    // Ajouter une notification au créateur
    if (video.userId !== currentUser.id) {
        addNotification(video.userId, {
            id: 'notif_' + Date.now(),
            type: 'gift',
            fromUserId: currentUser.id,
            fromUsername: currentUser.username,
            giftId: giftId,
            giftName: gift.name,
            videoId: videoId,
            message: `${currentUser.username} vous a envoyé un cadeau: ${gift.name}`,
            timestamp: Date.now(),
            read: false
        });
    }
    
    // Sauvegarder les données
    saveUserData();
    saveVideos();
    
    // Mettre à jour l'UI
    updateUI();
    updateVideoStats(videoId);
    
    // Animation du cadeau
    showGiftAnimation(gift);
    
    showNotification(`Cadeau "${gift.name}" envoyé ! 🎁`, 'success');
    
    // Fermer la boutique après un délai
    setTimeout(() => {
        closeModal('giftShopModal');
    }, 1500);
}

function previewGift(giftId) {
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;
    
    showNotification(`Prévisualisation: ${gift.name} - ${gift.description}`, 'info');
}

// ==================== BOUTIQUE DE COINS ====================
function openCoinShop() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'coinShopModal';
    modal.innerHTML = `
        <div class="modal-content coin-shop-modal">
            <span class="close-btn" onclick="closeModal('coinShopModal')">&times;</span>
            <h2><i class="fas fa-shopping-cart"></i> Boutique de Coins</h2>
            <p class="current-balance">Votre solde actuel: <strong>${currentUser.coins}</strong> <i class="fas fa-coins"></i></p>
            
            <div class="coin-packages">
                <div class="coin-package" onclick="buyCoins(100, 4.99)">
                    <div class="package-header">
                        <i class="fas fa-coins package-icon"></i>
                        <h3>100 Coins</h3>
                    </div>
                    <div class="package-price">$4.99</div>
                    <div class="package-bonus">+0 bonus</div>
                    <button class="btn btn-primary">Acheter</button>
                </div>
                
                <div class="coin-package popular" onclick="buyCoins(500, 19.99)">
                    <div class="package-header">
                        <i class="fas fa-crown package-icon"></i>
                        <h3>500 Coins</h3>
                    </div>
                    <div class="package-price">$19.99</div>
                    <div class="package-bonus">+50 bonus</div>
                    <button class="btn btn-primary">Meilleure offre</button>
                </div>
                
                <div class="coin-package" onclick="buyCoins(1000, 34.99)">
                    <div class="package-header">
                        <i class="fas fa-gem package-icon"></i>
                        <h3>1000 Coins</h3>
                    </div>
                    <div class="package-price">$34.99</div>
                    <div class="package-bonus">+150 bonus</div>
                    <button class="btn btn-primary">Acheter</button>
                </div>
                
                <div class="coin-package" onclick="buyCoins(5000, 149.99)">
                    <div class="package-header">
                        <i class="fas fa-rocket package-icon"></i>
                        <h3>5000 Coins</h3>
                    </div>
                    <div class="package-price">$149.99</div>
                    <div class="package-bonus">+1000 bonus</div>
                    <button class="btn btn-primary">Économique</button>
                </div>
            </div>
            
            <div class="payment-methods">
                <h4>Méthodes de paiement:</h4>
                <div class="payment-icons">
                    <i class="fab fa-cc-visa" title="Visa"></i>
                    <i class="fab fa-cc-mastercard" title="Mastercard"></i>
                    <i class="fab fa-cc-paypal" title="PayPal"></i>
                    <i class="fab fa-cc-apple-pay" title="Apple Pay"></i>
                    <i class="fab fa-google-pay" title="Google Pay"></i>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('coinShopModal')">
                    Annuler
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function buyCoins(coins, price) {
    // Simuler un processus d'achat
    showNotification(`Achat de ${coins} coins pour $${price} en cours...`, 'info');
    
    // Simuler le traitement du paiement
    setTimeout(() => {
        currentUser.coins += coins;
        
        // Ajouter une transaction
        addTransaction({
            id: 'trans_' + Date.now(),
            type: 'coin_purchase',
            amount: coins,
            description: `Achat de ${coins} coins`,
            price: price,
            timestamp: Date.now()
        });
        
        // Sauvegarder
        saveUserData();
        updateUI();
        
        showNotification(`${coins} coins ajoutés à votre compte ! 💰`, 'success');
        closeModal('coinShopModal');
    }, 2000);
}

// ==================== COMMENTAIRES ====================
function openCommentsModal(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'commentsModal';
    modal.innerHTML = `
        <div class="modal-content comments-modal">
            <span class="close-btn" onclick="closeModal('commentsModal')">&times;</span>
            <h2><i class="fas fa-comments"></i> Commentaires (${video.comments})</h2>
            
            <div class="comments-container" id="commentsContainer">
                ${renderComments(videoId)}
            </div>
            
            <div class="comment-form">
                <textarea id="newCommentText" placeholder="Ajouter un commentaire..." rows="3"></textarea>
                <div class="comment-form-actions">
                    <button class="btn btn-secondary" onclick="closeModal('commentsModal')">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="postComment('${videoId}')">
                        <i class="fas fa-paper-plane"></i> Commenter
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Focus sur le champ de commentaire
    setTimeout(() => {
        document.getElementById('newCommentText').focus();
    }, 100);
}

function renderComments(videoId) {
    const videoComments = comments[videoId] || [];
    
    if (videoComments.length === 0) {
        return `
            <div class="empty-comments">
                <i class="fas fa-comment-slash"></i>
                <h3>Aucun commentaire</h3>
                <p>Soyez le premier à commenter !</p>
            </div>
        `;
    }
    
    return videoComments.map(comment => `
        <div class="comment-item" data-comment-id="${comment.id}">
            <div class="comment-header">
                <img src="${comment.userAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}" alt="${comment.username}">
                <div>
                    <strong>${comment.username}</strong>
                    <small>${getTimeAgo(comment.timestamp)}</small>
                </div>
                <div class="comment-actions">
                    <button class="comment-like-btn" onclick="likeComment('${videoId}', '${comment.id}')">
                        <i class="fas fa-heart"></i> ${comment.likes || 0}
                    </button>
                    ${comment.userId === currentUser.id ? `
                        <button class="comment-delete-btn" onclick="deleteComment('${videoId}', '${comment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="comment-text">${comment.text}</div>
        </div>
    `).join('');
}

function postComment(videoId) {
    const commentText = document.getElementById('newCommentText').value.trim();
    if (!commentText) {
        showNotification('Veuillez écrire un commentaire', 'error');
        return;
    }
    
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Créer le commentaire
    const comment = {
        id: 'comment_' + Date.now(),
        videoId: videoId,
        userId: currentUser.id,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        text: commentText,
        likes: 0,
        timestamp: Date.now()
    };
    
    // Ajouter aux commentaires
    if (!comments[videoId]) {
        comments[videoId] = [];
    }
    comments[videoId].unshift(comment);
    
    // Mettre à jour le nombre de commentaires
    video.comments++;
    
    // Sauvegarder
    saveComments();
    saveVideos();
    
    // Ajouter une notification au créateur
    if (video.userId !== currentUser.id) {
        addNotification(video.userId, {
            id: 'notif_' + Date.now(),
            type: 'comment',
            fromUserId: currentUser.id,
            fromUsername: currentUser.username,
            videoId: videoId,
            message: `${currentUser.username} a commenté votre vidéo: "${commentText.substring(0, 50)}..."`,
            timestamp: Date.now(),
            read: false
        });
    }
    
    // Mettre à jour l'UI
    const commentsContainer = document.getElementById('commentsContainer');
    if (commentsContainer) {
        commentsContainer.innerHTML = renderComments(videoId);
    }
    
    // Réinitialiser le champ
    document.getElementById('newCommentText').value = '';
    
    // Mettre à jour le compteur dans le feed
    updateVideoStats(videoId);
    
    showNotification('Commentaire publié ! 💬', 'success');
}

function likeComment(videoId, commentId) {
    const comment = comments[videoId]?.find(c => c.id === commentId);
    if (!comment) return;
    
    comment.likes = (comment.likes || 0) + 1;
    saveComments();
    
    // Mettre à jour l'UI
    const commentElement = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    if (commentElement) {
        const likeBtn = commentElement.querySelector('.comment-like-btn');
        likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${comment.likes}`;
    }
    
    showNotification('Commentaire aimé !', 'info');
}

function deleteComment(videoId, commentId) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    
    const video = videos.find(v => v.id === videoId);
    const commentIndex = comments[videoId]?.findIndex(c => c.id === commentId);
    
    if (commentIndex !== -1 && video) {
        comments[videoId].splice(commentIndex, 1);
        video.comments--;
        
        // Sauvegarder
        saveComments();
        saveVideos();
        
        // Mettre à jour l'UI
        const commentsContainer = document.getElementById('commentsContainer');
        if (commentsContainer) {
            commentsContainer.innerHTML = renderComments(videoId);
        }
        
        updateVideoStats(videoId);
        showNotification('Commentaire supprimé', 'info');
    }
}

// ==================== PROFIL UTILISATEUR ====================
function loadProfileData() {
    // Mettre à jour les informations de base
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileCoins').textContent = currentUser.coins;
    document.getElementById('profileAvatar').src = currentUser.avatar;
    
    // Calculer les statistiques
    const userVideos = videos.filter(v => v.userId === currentUser.id);
    const stats = `${userVideos.length} vidéos • ${currentUser.followers.length} abonnés • ${currentUser.following.length} abonnements`;
    document.getElementById('profileStats').textContent = stats;
    
    // Afficher l'onglet par défaut
    showProfileTab('videos');
}

function showProfileTab(tabName) {
    // Mettre à jour les onglets actifs
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    // Afficher le contenu correspondant
    const contents = ['profileVideos', 'profileLikes', 'profileDrafts'];
    contents.forEach(content => {
        document.getElementById(content).style.display = 'none';
    });
    
    const activeContent = document.getElementById('profile' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    activeContent.style.display = 'block';
    
    // Charger le contenu de l'onglet
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
    
    let videosHTML = '<div class="videos-grid">';
    userVideos.forEach(video => {
        videosHTML += `
            <div class="video-thumbnail" onclick="openVideoDetail('${video.id}')">
                <img src="${video.thumbnail}" alt="${video.caption}">
                <div class="thumbnail-overlay">
                    <span><i class="fas fa-heart"></i> ${formatNumber(video.likes)}</span>
                    <span><i class="fas fa-eye"></i> ${formatNumber(video.views)}</span>
                    ${video.isMonetized ? '<span class="monetized-indicator"><i class="fas fa-coins"></i></span>' : ''}
                </div>
            </div>
        `;
    });
    videosHTML += '</div>';
    
    container.innerHTML = videosHTML;
}

function loadProfileLikes() {
    const container = document.getElementById('profileLikes');
    const likedVideos = videos.filter(v => currentUser.likedVideos.includes(v.id));
    
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
    
    let videosHTML = '<div class="videos-grid">';
    likedVideos.forEach(video => {
        videosHTML += `
            <div class="video-thumbnail" onclick="openVideoDetail('${video.id}')">
                <img src="${video.thumbnail}" alt="${video.caption}">
                <div class="thumbnail-overlay">
                    <span><i class="fas fa-heart"></i> ${formatNumber(video.likes)}</span>
                    <span><i class="fas fa-eye"></i> ${formatNumber(video.views)}</span>
                </div>
            </div>
        `;
    });
    videosHTML += '</div>';
    
    container.innerHTML = videosHTML;
}

function loadProfileDrafts() {
    const container = document.getElementById('profileDrafts');
    
    if (currentUser.drafts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>Aucun brouillon</h3>
                <p>Vos vidéos non publiées apparaîtront ici</p>
            </div>
        `;
        return;
    }
    
    let draftsHTML = '<div class="drafts-list">';
    currentUser.drafts.forEach(draft => {
        draftsHTML += `
            <div class="draft-item">
                <div class="draft-info">
                    <h4>${draft.caption}</h4>
                    <p><i class="fas fa-calendar"></i> ${draft.date}</p>
                    ${draft.isMonetized ? '<span class="draft-monetized"><i class="fas fa-coins"></i> Monétisé</span>' : ''}
                </div>
                <div class="draft-actions">
                    <button class="btn btn-small btn-secondary" onclick="editDraft('${draft.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="deleteDraft('${draft.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    draftsHTML += '</div>';
    
    container.innerHTML = draftsHTML;
}

function editDraft(draftId) {
    const draft = currentUser.drafts.find(d => d.id === draftId);
    if (!draft) return;
    
    openCreateModal();
    document.getElementById('videoCaption').value = draft.caption;
    document.getElementById('monetizeVideo').checked = draft.isMonetized || false;
    document.getElementById('videoPrivacy').value = 'draft';
    
    showNotification('Brouillon chargé pour édition', 'info');
}

function deleteDraft(draftId) {
    if (!confirm('Supprimer ce brouillon ?')) return;
    
    const draftIndex = currentUser.drafts.findIndex(d => d.id === draftId);
    if (draftIndex !== -1) {
        currentUser.drafts.splice(draftIndex, 1);
        saveUserData();
        loadProfileDrafts();
        showNotification('Brouillon supprimé', 'success');
    }
}

function openVideoDetail(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Créer une modale de détail
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'videoDetailModal';
    modal.innerHTML = `
        <div class="modal-content video-detail-modal">
            <span class="close-btn" onclick="closeModal('videoDetailModal')">&times;</span>
            
            <div class="video-detail-container">
                <video src="${video.videoUrl}" poster="${video.thumbnail}" controls autoplay></video>
                
                <div class="video-detail-info">
                    <div class="creator-info">
                        <img src="${video.avatar}" alt="${video.username}">
                        <div>
                            <h4>${video.username}</h4>
                            <p>${getTimeAgo(video.timestamp)}</p>
                        </div>
                    </div>
                    
                    <div class="video-description">
                        <p>${video.caption}</p>
                        <div class="hashtags">
                            ${video.hashtags ? video.hashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('') : ''}
                        </div>
                    </div>
                    
                    <div class="video-stats-detailed">
                        <div class="stat">
                            <i class="fas fa-heart"></i>
                            <span>${formatNumber(video.likes)} likes</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-comment"></i>
                            <span>${formatNumber(video.comments)} commentaires</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-share"></i>
                            <span>${formatNumber(video.shares)} partages</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-eye"></i>
                            <span>${formatNumber(video.views)} vues</span>
                        </div>
                        <div class="stat">
                            <i class="fas fa-gift"></i>
                            <span>${formatNumber(video.gifts || 0)} cadeaux</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

// ==================== PARAMÈTRES ====================
function loadSettings() {
    document.getElementById('settingsUsername').value = currentUser.username;
    document.getElementById('settingsEmail').value = currentUser.email || 'user@tiktak.demo';
    document.getElementById('settingsNotifications').checked = currentUser.settings.notifications;
    document.getElementById('settingsAutoplay').checked = currentUser.settings.autoplay;
}

function saveSettings() {
    const newUsername = document.getElementById('settingsUsername').value.trim();
    const newEmail = document.getElementById('settingsEmail').value.trim();
    
    if (newUsername && newUsername !== currentUser.username) {
        currentUser.username = newUsername;
        
        // Mettre à jour le nom dans toutes les vidéos
        videos.forEach(video => {
            if (video.userId === currentUser.id) {
                video.username = newUsername;
            }
        });
        
        saveVideos();
    }
    
    if (newEmail) {
        currentUser.email = newEmail;
    }
    
    currentUser.settings.notifications = document.getElementById('settingsNotifications').checked;
    currentUser.settings.autoplay = document.getElementById('settingsAutoplay').checked;
    
    saveUserData();
    showNotification('Paramètres sauvegardés ✅', 'success');
    
    // Mettre à jour l'UI
    updateUI();
}

// ==================== TRANSACTIONS ====================
function addTransaction(transaction) {
    transactions.unshift(transaction);
    localStorage.setItem('tiktak_transactions', JSON.stringify(transactions));
}

function openTransactions() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'transactionsModal';
    
    let transactionsHTML = '<div class="transactions-list">';
    transactions.slice(0, 20).forEach(trans => {
        const typeIcon = getTransactionIcon(trans.type);
        const amountClass = trans.amount > 0 ? 'positive' : 'negative';
        
        transactionsHTML += `
            <div class="transaction-item">
                <div class="transaction-icon">
                    <i class="${typeIcon}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${trans.description}</div>
                    <div class="transaction-info">
                        <span class="transaction-date">${new Date(trans.timestamp).toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${trans.amount > 0 ? '+' : ''}${trans.amount} <i class="fas fa-coins"></i>
                </div>
            </div>
        `;
    });
    transactionsHTML += '</div>';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn" onclick="closeModal('transactionsModal')">&times;</span>
            <h2><i class="fas fa-history"></i> Historique des Transactions</h2>
            ${transactionsHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function getTransactionIcon(type) {
    switch(type) {
        case 'coin_purchase': return 'fas fa-shopping-cart';
        case 'gift_sent': return 'fas fa-gift';
        case 'video_upload': return 'fas fa-video';
        case 'gift_received': return 'fas fa-gift';
        default: return 'fas fa-exchange-alt';
    }
}

// ==================== NOTIFICATIONS ====================
function openNotifications() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'notificationsModal';
    
    const userNotifications = currentUser.notifications || [];
    
    let notificationsHTML = '<div class="notifications-list">';
    if (userNotifications.length === 0) {
        notificationsHTML += `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h3>Aucune notification</h3>
                <p>Vous serez notifié des nouvelles activités</p>
            </div>
        `;
    } else {
        userNotifications.forEach(notif => {
            const icon = getNotificationIcon(notif.type);
            notificationsHTML += `
                <div class="notification-item ${notif.read ? '' : 'unread'}" onclick="handleNotificationClick('${notif.id}')">
                    <div class="notification-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <p>${notif.message}</p>
                        <small>${getTimeAgo(notif.timestamp)}</small>
                    </div>
                    ${!notif.read ? '<span class="unread-dot"></span>' : ''}
                </div>
            `;
        });
    }
    notificationsHTML += '</div>';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-btn" onclick="closeModal('notificationsModal')">&times;</span>
            <h2><i class="fas fa-bell"></i> Notifications</h2>
            <div class="notifications-header">
                <button class="btn btn-small" onclick="markAllAsRead()">
                    <i class="fas fa-check-double"></i> Tout marquer comme lu
                </button>
                <button class="btn btn-small btn-danger" onclick="clearAllNotifications()">
                    <i class="fas fa-trash"></i> Tout supprimer
                </button>
            </div>
            ${notificationsHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function getNotificationIcon(type) {
    switch(type) {
        case 'like': return 'fas fa-heart';
        case 'comment': return 'fas fa-comment';
        case 'follow': return 'fas fa-user-plus';
        case 'gift': return 'fas fa-gift';
        default: return 'fas fa-bell';
    }
}

function addNotification(userId, notification) {
    // Dans une application réelle, cette fonction enverrait la notification au serveur
    // Pour la démo, nous l'ajoutons simplement à l'utilisateur actuel si c'est lui
    if (userId === currentUser.id) {
        currentUser.notifications.unshift(notification);
        saveUserData();
        
        // Mettre à jour le badge de notifications
        updateNotificationBadge();
    }
}

function handleNotificationClick(notificationId) {
    const notification = currentUser.notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    // Marquer comme lu
    notification.read = true;
    saveUserData();
    
    // Traiter selon le type
    switch(notification.type) {
        case 'like':
        case 'comment':
        case 'gift':
            if (notification.videoId) {
                openVideoDetail(notification.videoId);
            }
            break;
        case 'follow':
            openCreatorProfile(notification.fromUserId);
            break;
    }
    
    // Fermer la modale
    closeModal('notificationsModal');
}

function markAllAsRead() {
    currentUser.notifications.forEach(notif => notif.read = true);
    saveUserData();
    openNotifications(); // Recharger
    updateNotificationBadge();
}

function clearAllNotifications() {
    if (confirm('Supprimer toutes les notifications ?')) {
        currentUser.notifications = [];
        saveUserData();
        openNotifications(); // Recharger
        updateNotificationBadge();
    }
}

function updateNotificationBadge() {
    const unreadCount = currentUser.notifications.filter(n => !n.read).length;
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

// ==================== FONCTIONS UTILITAIRES ====================
function saveVideos() {
    localStorage.setItem('tiktak_videos', JSON.stringify(videos));
}

function saveUserData() {
    localStorage.setItem('tiktak_user', JSON.stringify(currentUser));
}

function saveComments() {
    localStorage.setItem('tiktak_comments', JSON.stringify(comments));
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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
    return hashtags ? hashtags.slice(0, 5) : []; // Maximum 5 hashtags
}

function generateThumbnail() {
    // Dans une application réelle, on générerait une miniature à partir de la vidéo
    // Pour la démo, on utilise des images aléatoires
    const thumbnails = [
        'https://images.unsplash.com/photo-1611605698335-8b1569810432?ixlib=rb-4.0.3&auto=format&fit=crop&w=1074&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=1068&q=80',
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=1065&q=80'
    ];
    return thumbnails[Math.floor(Math.random() * thumbnails.length)];
}

function updateUI() {
    // Mettre à jour le solde de coins
    document.getElementById('coinCount').textContent = currentUser.coins;
    document.getElementById('coinBalance').title = `${currentUser.coins} coins disponibles`;
    
    // Mettre à jour l'avatar utilisateur
    document.getElementById('userAvatar').src = currentUser.avatar;
    
    // Mettre à jour le badge de notifications
    updateNotificationBadge();
}

function updateVideoStats(videoId) {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    const container = document.querySelector(`.video-container[data-video-id="${videoId}"]`);
    if (!container) return;
    
    // Mettre à jour les likes
    const likeElement = container.querySelector('.action:nth-child(1)');
    likeElement.querySelector('span').textContent = formatNumber(video.likes);
    
    // Mettre à jour les commentaires
    const commentElement = container.querySelector('.action:nth-child(2)');
    commentElement.querySelector('span').textContent = formatNumber(video.comments);
    
    // Mettre à jour les partages
    const shareElement = container.querySelector('.action:nth-child(3)');
    shareElement.querySelector('span').textContent = formatNumber(video.shares);
    
    // Mettre à jour les cadeaux
    const giftElement = container.querySelector('.action:nth-child(4)');
    giftElement.querySelector('span').textContent = formatNumber(video.gifts || 0);
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
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

function showGiftAnimation(gift) {
    const animation = document.createElement('div');
    animation.className = 'gift-animation';
    animation.innerHTML = `<i class="${gift.icon}"></i>`;
    animation.style.color = getRandomColor();
    
    document.body.appendChild(animation);
    
    setTimeout(() => {
        animation.remove();
    }, 2000);
}

function getRandomColor() {
    const colors = ['#ff4757', '#00f2fe', '#ffd700', '#ffaa00', '#00ff88', '#4facfe'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// ==================== NAVIGATION ====================
function showHome() {
    showNotification('Accueil', 'info');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    renderVideoFeed();
}

function showTrending() {
    // Trier les vidéos par popularité
    const trendingVideos = [...videos].sort((a, b) => 
        (b.likes + b.comments * 2 + b.shares * 3 + b.views * 0.1) - 
        (a.likes + a.comments * 2 + a.shares * 3 + a.views * 0.1)
    );
    
    const videoFeed = document.getElementById('videoFeed');
    videoFeed.innerHTML = '';
    trendingVideos.forEach(video => {
        videoFeed.appendChild(createVideoElement(video));
    });
    
    showNotification('Tendances', 'info');
}

function showFollowing() {
    const followingVideos = videos.filter(v => currentUser.following.includes(v.userId));
    
    const videoFeed = document.getElementById('videoFeed');
    videoFeed.innerHTML = '';
    
    if (followingVideos.length === 0) {
        videoFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>Pas encore d'abonnements</h3>
                <p>Suivez des créateurs pour voir leurs vidéos ici</p>
            </div>
        `;
    } else {
        followingVideos.forEach(video => {
            videoFeed.appendChild(createVideoElement(video));
        });
    }
    
    showNotification('Abonnements', 'info');
}

function showFavorites() {
    const favoriteVideos = videos.filter(v => currentUser.likedVideos.includes(v.id));
    
    const videoFeed = document.getElementById('videoFeed');
    videoFeed.innerHTML = '';
    
    if (favoriteVideos.length === 0) {
        videoFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>Pas encore de favoris</h3>
                <p>Likez des vidéos pour les retrouver ici</p>
            </div>
        `;
    } else {
        favoriteVideos.forEach(video => {
            videoFeed.appendChild(createVideoElement(video));
        });
    }
    
    showNotification('Favoris', 'info');
}

function openSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput.style.display === 'none' || searchInput.style.display === '') {
        searchInput.style.display = 'block';
        searchInput.focus();
    } else {
        searchInput.style.display = 'none';
    }
}

function openWallet() {
    openCoinShop();
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        showNotification('Déconnexion...', 'info');
        setTimeout(() => {
            // Effacer les données de session
            localStorage.removeItem('tiktak_user');
            location.reload();
        }, 1000);
    }
}

function openCreatorProfile(userId) {
    const user = getUserById(userId);
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'creatorProfileModal';
    
    modal.innerHTML = `
        <div class="modal-content profile-modal">
            <span class="close-btn" onclick="closeModal('creatorProfileModal')">&times;</span>
            
            <div class="creator-profile-header">
                <img src="${user.avatar}" alt="${user.username}">
                <div class="creator-profile-info">
                    <h3>${user.username}</h3>
                    <p><i class="fas fa-coins"></i> ${user.coins || 0} coins</p>
                    <div class="creator-stats">
                        <div class="stat">
                            <strong>${videos.filter(v => v.userId === userId).length}</strong>
                            <span>Vidéos</span>
                        </div>
                        <div class="stat">
                            <strong>${user.followers ? user.followers.length : 0}</strong>
                            <span>Abonnés</span>
                        </div>
                        <div class="stat">
                            <strong>${user.following ? user.following.length : 0}</strong>
                            <span>Abonnements</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="creator-videos">
                <h4>Vidéos de ${user.username}</h4>
                <div class="videos-grid">
                    ${videos.filter(v => v.userId === userId).map(video => `
                        <div class="video-thumbnail" onclick="openVideoDetail('${video.id}'); closeModal('creatorProfileModal')">
                            <img src="${video.thumbnail}" alt="${video.caption}">
                            <div class="thumbnail-overlay">
                                <span><i class="fas fa-heart"></i> ${formatNumber(video.likes)}</span>
                                <span><i class="fas fa-eye"></i> ${formatNumber(video.views)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function getUserById(userId) {
    // Dans une application réelle, ce serait une requête API
    // Pour la démo, on simule un utilisateur
    if (userId === currentUser.id) {
        return currentUser;
    }
    
    // Simuler d'autres utilisateurs
    const demoUsers = [
        {
            id: 'user_2',
            username: 'Créateur Pro',
            avatar: 'https://randomuser.me/api/portraits/lego/2.jpg',
            coins: 500,
            followers: ['user_1', 'user_3'],
            following: ['user_3']
        },
        {
            id: 'user_3',
            username: 'Artiste Digital',
            avatar: 'https://randomuser.me/api/portraits/lego/3.jpg',
            coins: 250,
            followers: ['user_1', 'user_2'],
            following: ['user_2']
        },
        {
            id: 'user_4',
            username: 'Sport Extrême',
            avatar: 'https://randomuser.me/api/portraits/lego/4.jpg',
            coins: 750,
            followers: ['user_1'],
            following: ['user_2']
        },
        {
            id: 'user_5',
            username: 'Cuisine Créative',
            avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
            coins: 300,
            followers: ['user_1', 'user_3'],
            following: ['user_2', 'user_3']
        }
    ];
    
    return demoUsers.find(u => u.id === userId) || {
        id: userId,
        username: 'Utilisateur Inconnu',
        avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
        coins: 0,
        followers: [],
        following: []
    };
}

// ==================== ÉCOUTEURS D'ÉVÉNEMENTS ====================
function setupEventListeners() {
    // Recherche
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(this.value);
            this.value = '';
        }
    });
    
    document.querySelector('.search-btn').addEventListener('click', function() {
        const searchInput = document.getElementById('searchInput');
        performSearch(searchInput.value);
        searchInput.value = '';
    });
    
    // Bouton Live
    document.querySelector('.btn-live').addEventListener('click', function() {
        showNotification('Fonctionnalité Live à venir prochainement 🎥', 'info');
    });
    
    // Input vidéo
    setupVideoInput();
    
    // Fermer les modales avec Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeCreateModal();
            closeProfile();
            closeSettings();
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => modal.remove());
            document.body.style.overflow = 'auto';
        }
    });
    
    // Fermer les modales en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        // Menu utilisateur
        const menu = document.getElementById('userDropdown');
        const userMenu = document.querySelector('.user-menu');
        if (menu && menu.style.display === 'block' && !userMenu.contains(event.target) && !menu.contains(event.target)) {
            menu.style.display = 'none';
        }
        
        // Modales principales
        const modals = ['createModal', 'profileModal', 'settingsModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.style.display === 'flex' && event.target === modal) {
                if (modalId === 'createModal') closeCreateModal();
                if (modalId === 'profileModal') closeProfile();
                if (modalId === 'settingsModal') closeSettings();
            }
        });
    });
    
    // Navigation mobile
    document.querySelectorAll('.bottom-nav .nav-item').forEach((item, index) => {
        item.addEventListener('click', function(e) {
            document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Intersection Observer pour le lazy loading des vidéos
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const video = entry.target.querySelector('video');
                    if (video && currentUser.settings.autoplay && video.paused) {
                        video.muted = true;
                        video.play().catch(e => console.log('Auto-play prevented'));
                    }
                } else {
                    const video = entry.target.querySelector('video');
                    if (video && !video.paused) {
                        video.pause();
                    }
                }
            });
        }, { threshold: 0.5 });
        
        // Observer les vidéos quand elles sont ajoutées au DOM
        const observerConfig = { childList: true, subtree: true };
        const domObserver = new MutationObserver(() => {
            document.querySelectorAll('.video-container').forEach(container => {
                observer.observe(container);
            });
        });
        
        domObserver.observe(document.body, observerConfig);
    }
}

function performSearch(query) {
    if (!query.trim()) {
        showNotification('Veuillez entrer un terme de recherche', 'info');
        return;
    }
    
    const results = videos.filter(video => 
        video.caption.toLowerCase().includes(query.toLowerCase()) ||
        video.username.toLowerCase().includes(query.toLowerCase()) ||
        (video.hashtags && video.hashtags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
    
    const videoFeed = document.getElementById('videoFeed');
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

// ==================== GESTION DES VIDÉOS EN LECTURE ====================
document.addEventListener('visibilitychange', function() {
    if (document.hidden && currentPlayingVideo) {
        currentPlayingVideo.pause();
        if (currentPlayingVideo.closest('.video-container')) {
            currentPlayingVideo.closest('.video-container').querySelector('.manual-play-btn').innerHTML = '<i class="fas fa-play"></i>';
        }
    }
});

// Événement personnalisé pour l'ouverture de modales
window.addEventListener('modalOpen', function() {
    if (currentPlayingVideo) {
        currentPlayingVideo.pause();
        if (currentPlayingVideo.closest('.video-container')) {
            currentPlayingVideo.closest('.video-container').querySelector('.manual-play-btn').innerHTML = '<i class="fas fa-play"></i>';
        }
    }
});

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
window.startRecording = startRecording;
window.stopRecording = stopRecording;
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
window.showMyVideos = showMyVideos;
window.openSearch = openSearch;
window.saveSettings = saveSettings;
window.clearLocalStorage = function() {
    if (confirm('Voulez-vous vraiment réinitialiser toutes les données ? Cette action est irréversible.')) {
        localStorage.clear();
        location.reload();
    }
};
window.openCreatorProfile = openCreatorProfile;
window.openTransactions = openTransactions;
window.buyCoins = buyCoins;
window.sendGift = sendGift;
window.toggleFollow = toggleFollow;
window.saveVideo = saveVideo;
window.openCoinShop = openCoinShop;
window.closeModal = closeModal;
window.filterGifts = filterGifts;
window.previewGift = previewGift;
window.postComment = postComment;
window.likeComment = likeComment;
window.deleteComment = deleteComment;
window.showProfileTab = showProfileTab;
window.editDraft = editDraft;
window.deleteDraft = deleteDraft;
window.openVideoDetail = openVideoDetail;
window.handleNotificationClick = handleNotificationClick;
window.markAllAsRead = markAllAsRead;
window.clearAllNotifications = clearAllNotifications;
