// ==================== INITIALISATION ====================

// État de l'application
const appState = {
    user: null,
    userProfile: null,
    videos: [],
    currentVideoIndex: 0,
    currentVideoFile: null,
    currentThumbnailBlob: null,
    isLive: false,
    selectedGift: null,
    selectedVideoForGift: null,
    selectedReceiverForGift: null
};

// VIDÉOS DE DÉMO
const demoVideos = [
    {
        id: "1",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-under-neon-lights-1230-large.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=600&fit=crop",
        userId: "user1",
        username: "dancequeen",
        userAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
        caption: "Apprends cette choré avec moi ! #danse #fun",
        likes: 12400,
        comments: 1200,
        shares: 543,
        views: 54000,
        duration: 45,
        createdAt: new Date(Date.now() - 86400000),
        isMonetized: true
    },
    {
        id: "2",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-man-doing-tricks-with-skateboard-in-a-parking-lot-34553-large.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=400&h=600&fit=crop",
        userId: "user2",
        username: "skatepro",
        userAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
        caption: "Nouveau trick au skatepark ! #skate #trick",
        likes: 8900,
        comments: 450,
        shares: 210,
        views: 32000,
        duration: 28,
        createdAt: new Date(Date.now() - 43200000),
        isMonetized: false
    },
    {
        id: "3",
        videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&h=600&fit=crop",
        userId: "user3",
        username: "naturelover",
        userAvatar: "https://randomuser.me/api/portraits/women/67.jpg",
        caption: "Beauté de la nature au printemps 🌸 #nature #printemps",
        likes: 15600,
        comments: 890,
        shares: 430,
        views: 78000,
        duration: 32,
        createdAt: new Date(Date.now() - 21600000),
        isMonetized: true
    }
];

// ==================== FONCTIONS UI DE BASE ====================

function openFilePicker() {
    const videoInput = document.getElementById('videoInput');
    if (videoInput) videoInput.click();
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function openProfile() {
    alert('Profil - Fonctionnalité à venir');
}

function openWallet() {
    alert('Portefeuille - Fonctionnalité à venir');
}

function openSettings() {
    alert('Paramètres - Fonctionnalité à venir');
}

function openCoinShop() {
    alert('Boutique de coins - Fonctionnalité à venir');
}

function showForgotPassword() {
    alert('Mot de passe oublié - Fonctionnalité à venir');
}

function startRecording() {
    alert('Enregistrement vidéo - Fonctionnalité à venir');
}

// ==================== GESTION DES MODALES ====================

function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
}

function openCreateModal() {
    if (!appState.user) {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.style.display = 'flex';
        return;
    }
    const createModal = document.getElementById('createModal');
    if (createModal) createModal.style.display = 'flex';
}

function closeCreateModal() {
    const modal = document.getElementById('createModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.getElementById('videoCaption').value = '';
    document.getElementById('previewVideo').style.display = 'none';
    document.getElementById('previewVideo').src = '';
    document.getElementById('thumbnailPreview').style.display = 'none';
    document.getElementById('thumbnailPreview').src = '';
    document.getElementById('uploadProgressContainer').style.display = 'none';
    document.getElementById('uploadProgressFill').style.width = '0%';
    document.getElementById('uploadProgressText').textContent = '0%';
    document.getElementById('uploadPercentage').textContent = '0%';
    document.getElementById('uploadStatus').textContent = 'Préparation de l\'upload...';
    document.getElementById('publishBtn').disabled = true;
    document.getElementById('videoFileInfo').innerHTML = '<i class="fas fa-file-video"></i><span>Aucun fichier sélectionné</span>';
    document.getElementById('monetizeVideo').checked = false;
    document.getElementById('videoPrivacy').value = 'public';
    const placeholder = document.querySelector('.preview-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
    
    appState.currentVideoFile = null;
    appState.currentThumbnailBlob = null;
}

function openLiveSetup() {
    if (!appState.user) {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.style.display = 'block';
        return;
    }
    const liveSetupModal = document.getElementById('liveSetupModal');
    if (liveSetupModal) liveSetupModal.style.display = 'block';
}

function closeLiveSetup() {
    const modal = document.getElementById('liveSetupModal');
    if (modal) modal.style.display = 'none';
}

function openGiftShop() {
    const modal = document.getElementById('giftShopModal');
    if (modal) modal.style.display = 'block';
}

function closeGiftShop() {
    const modal = document.getElementById('giftShopModal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.getElementById('selectedGift').style.display = 'none';
    document.getElementById('giftMessage').value = '';
    document.querySelectorAll('.gift-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    appState.selectedGift = null;
}

function selectGift(type, price) {
    // Désélectionner tous les cadeaux
    document.querySelectorAll('.gift-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Sélectionner le cadeau cliqué
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('selected');
    }
    
    // Mettre à jour l'affichage
    const iconMap = {
        'rose': '🌹',
        'crown': '👑',
        'diamond': '💎',
        'rocket': '🚀'
    };
    
    const nameMap = {
        'rose': 'Rose',
        'crown': 'Couronne',
        'diamond': 'Diamant',
        'rocket': 'Fusée'
    };
    
    const selectedGiftIcon = document.getElementById('selectedGiftIcon');
    const selectedGiftName = document.getElementById('selectedGiftName');
    const selectedGiftPrice = document.getElementById('selectedGiftPrice');
    const selectedGiftContainer = document.getElementById('selectedGift');
    
    if (selectedGiftIcon) selectedGiftIcon.textContent = iconMap[type] || '🎁';
    if (selectedGiftName) selectedGiftName.textContent = nameMap[type] || 'Cadeau';
    if (selectedGiftPrice) selectedGiftPrice.textContent = price;
    if (selectedGiftContainer) selectedGiftContainer.style.display = 'block';
    
    // Stocker dans l'état global
    appState.selectedGift = { type, price };
}

function sendGift() {
    if (!appState.user || !appState.selectedGift) {
        alert('Veuillez vous connecter et sélectionner un cadeau');
        return;
    }
    
    showNotification('Cadeau envoyé avec succès!', 'success');
    closeGiftShop();
}

function openGiftShopForVideo(videoId, receiverId) {
    appState.selectedVideoForGift = videoId;
    appState.selectedReceiverForGift = receiverId;
    openGiftShop();
}

// ==================== GESTION DES VIDÉOS ====================

function handleVideoInput() {
    const videoInput = document.getElementById('videoInput');
    if (!videoInput) return;
    
    videoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Vérifier la taille (max 100MB)
        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Le fichier est trop volumineux (max 100MB)');
            return;
        }
        
        // Mettre à jour l'affichage du fichier
        const fileInfo = document.getElementById('videoFileInfo');
        if (fileInfo) {
            fileInfo.innerHTML = `
                <i class="fas fa-file-video"></i>
                <span>${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
            `;
        }
        
        // Activer le bouton de publication
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) publishBtn.disabled = false;
        
        // Afficher la prévisualisation
        const previewVideo = document.getElementById('previewVideo');
        if (previewVideo) {
            previewVideo.style.display = 'block';
            previewVideo.src = URL.createObjectURL(file);
            previewVideo.load();
            
            // Cacher le placeholder
            const placeholder = document.querySelector('.preview-placeholder');
            if (placeholder) placeholder.style.display = 'none';
            
            // Générer et afficher la miniature
            previewVideo.addEventListener('loadeddata', function() {
                const canvas = document.createElement('canvas');
                canvas.width = previewVideo.videoWidth || 400;
                canvas.height = previewVideo.videoHeight || 600;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(function(blob) {
                    const thumbnailPreview = document.getElementById('thumbnailPreview');
                    if (thumbnailPreview) {
                        thumbnailPreview.style.display = 'block';
                        thumbnailPreview.src = URL.createObjectURL(blob);
                        
                        // Stocker dans l'état global
                        appState.currentVideoFile = file;
                        appState.currentThumbnailBlob = blob;
                    }
                }, 'image/jpeg', 0.8);
            });
        }
    });
}

function publishVideo() {
    if (!appState.user) {
        openCreateModal();
        return;
    }
    
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!appState.currentVideoFile) {
        alert('Veuillez sélectionner une vidéo');
        return;
    }
    
    if (!caption) {
        alert('Veuillez ajouter une légende');
        return;
    }
    
    try {
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
        }
        
        // Simuler l'upload
        showNotification('Publication en cours... (Mode démo)', 'info');
        
        // VIDÉOS DE DÉMO
        const demoVideoUrls = [
            "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-under-neon-lights-1230-large.mp4",
            "https://assets.mixkit.co/videos/preview/mixkit-man-doing-tricks-with-skateboard-in-a-parking-lot-34553-large.mp4",
            "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4"
        ];
        
        // MINIATURES DE DÉMO
        const demoThumbnails = [
            'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=600&fit=crop',
            'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=400&h=600&fit=crop',
            'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&h=600&fit=crop'
        ];
        
        // Simuler un délai d'upload
        setTimeout(() => {
            const videoUrl = demoVideoUrls[Math.floor(Math.random() * demoVideoUrls.length)];
            const thumbnailUrl = demoThumbnails[Math.floor(Math.random() * demoThumbnails.length)];
            
            // Créer la nouvelle vidéo
            const newVideo = {
                id: Date.now().toString(),
                videoUrl: videoUrl,
                thumbnailUrl: thumbnailUrl,
                userId: "demo_user",
                username: appState.userProfile?.username || "Utilisateur",
                userAvatar: appState.userProfile?.avatar || "https://randomuser.me/api/portraits/lego/1.jpg",
                caption: caption,
                likes: 0,
                comments: 0,
                shares: 0,
                views: 0,
                duration: 30,
                createdAt: new Date(),
                isMonetized: isMonetized
            };
            
            // Ajouter à la liste
            appState.videos.unshift(newVideo);
            
            // Re-rendre les vidéos
            renderVideos();
            
            // Fermer le modal et montrer une notification
            closeCreateModal();
            showNotification('Vidéo publiée avec succès! (Mode démo)', 'success');
            
            // Réinitialiser le bouton
            if (publishBtn) {
                publishBtn.disabled = false;
                publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
            }
        }, 2000);
        
    } catch (error) {
        console.error('Erreur publication:', error);
        alert('Erreur lors de la publication: ' + error.message);
        
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        }
    }
}

// ==================== GESTION DES COMMENTAIRES ====================

function openComments(videoId) {
    const commentsSection = document.getElementById(`comments-${videoId}`);
    if (commentsSection) {
        commentsSection.style.display = 'block';
    } else {
        // Si la section n'existe pas, la créer
        const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
        if (videoContainer) {
            const commentsHTML = `
                <div id="comments-${videoId}" class="comments-section" style="display: block;">
                    <div class="comments-header">
                        <h4>Commentaires</h4>
                        <button onclick="closeComments('${videoId}')" class="close-comments-btn">×</button>
                    </div>
                    <div class="comments-list">
                        <div class="comment">
                            <strong>@user123</strong>
                            <p>Super vidéo !</p>
                        </div>
                        <div class="comment">
                            <strong>@fan456</strong>
                            <p>J'adore 😍</p>
                        </div>
                    </div>
                    <div class="comment-form">
                        <textarea placeholder="Ajouter un commentaire..." rows="2"></textarea>
                        <button onclick="postComment('${videoId}')">Publier</button>
                    </div>
                </div>
            `;
            videoContainer.insertAdjacentHTML('beforeend', commentsHTML);
        }
    }
}

function closeComments(videoId) {
    const commentsSection = document.getElementById(`comments-${videoId}`);
    if (commentsSection) {
        commentsSection.style.display = 'none';
    }
}

function postComment(videoId) {
    const commentInput = document.querySelector(`#comments-${videoId} textarea`);
    if (!commentInput || !commentInput.value.trim()) {
        alert('Veuillez écrire un commentaire');
        return;
    }
    
    showNotification('Commentaire publié! (Mode démo)', 'success');
    commentInput.value = '';
}

// ==================== LIKES ET PARTAGES ====================

function handleLike(videoId) {
    const video = appState.videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Mettre à jour le compteur
    video.likes += 1;
    
    // Mettre à jour l'affichage
    const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
    if (videoContainer) {
        const likeCount = videoContainer.querySelector('.action:nth-child(1) span');
        if (likeCount) {
            likeCount.textContent = formatNumber(video.likes);
        }
        
        // Ajouter la classe liked
        const likeButton = videoContainer.querySelector('.action:nth-child(1)');
        if (likeButton) {
            likeButton.classList.add('liked');
        }
    }
    
    showNotification('Vous avez aimé cette vidéo!', 'success');
}

function handleShare(videoId) {
    const video = appState.videos.find(v => v.id === videoId);
    if (!video) return;
    
    // Mettre à jour le compteur
    video.shares += 1;
    
    // Mettre à jour l'affichage
    const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
    if (videoContainer) {
        const shareCount = videoContainer.querySelector('.action:nth-child(3) span');
        if (shareCount) {
            shareCount.textContent = formatNumber(video.shares);
        }
    }
    
    // Partager le lien
    if (navigator.share) {
        navigator.share({
            title: `Regarde cette vidéo de @${video.username}`,
            text: video.caption,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showNotification('Lien copié dans le presse-papier!', 'success');
    }
}

// ==================== STREAMING ====================

function startLiveStream() {
    const title = document.getElementById('liveTitle').value.trim();
    
    if (!title) {
        alert('Veuillez entrer un titre pour le live');
        return;
    }
    
    if (!appState.user) {
        alert('Veuillez vous connecter pour démarrer un live');
        return;
    }
    
    showNotification('Live démarré! (Mode démo)', 'success');
    closeLiveSetup();
    
    // Simuler l'interface de live
    const appContainer = document.getElementById('appContainer');
    const liveInterface = document.getElementById('liveInterface');
    
    if (appContainer) appContainer.style.display = 'none';
    if (liveInterface) liveInterface.style.display = 'block';
    
    appState.isLive = true;
    
    // Mettre à jour les infos du streamer
    const streamerName = document.getElementById('streamerName');
    const streamerAvatar = document.getElementById('streamerAvatar');
    
    if (streamerName) streamerName.textContent = appState.userProfile?.username || "Streamer";
    if (streamerAvatar) streamerAvatar.src = appState.userProfile?.avatar || "https://randomuser.me/api/portraits/lego/1.jpg";
}

function endLiveStream() {
    appState.isLive = false;
    
    const appContainer = document.getElementById('appContainer');
    const liveInterface = document.getElementById('liveInterface');
    
    if (appContainer) appContainer.style.display = 'block';
    if (liveInterface) liveInterface.style.display = 'none';
    
    showNotification('Live terminé avec succès', 'success');
}

// ==================== RENDU DES VIDÉOS ====================

function renderVideos() {
    const videoFeed = document.getElementById('videoFeed');
    if (!videoFeed) return;
    
    if (appState.videos.length === 0) {
        appState.videos = [...demoVideos];
    }
    
    videoFeed.innerHTML = '';
    
    appState.videos.forEach((video) => {
        const videoElement = createVideoElement(video);
        videoFeed.appendChild(videoElement);
    });
    
    initVideoPlayback();
}

function createVideoElement(video) {
    const div = document.createElement('div');
    div.className = 'video-container';
    div.setAttribute('data-video-id', video.id);
    
    const timeAgo = getTimeAgo(video.createdAt);
    
    div.innerHTML = `
        <video loop muted playsinline>
            <source src="${video.videoUrl}" type="video/mp4">
        </video>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${video.userAvatar}" alt="${video.username}">
                <div>
                    <h4>@${video.username}</h4>
                    <p>${video.caption}</p>
                    <small class="time-ago">${timeAgo}</small>
                </div>
            </div>
            
            <div class="video-actions">
                <div class="action" onclick="handleLike('${video.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${formatNumber(video.likes)}</span>
                </div>
                
                <div class="action" onclick="openComments('${video.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${formatNumber(video.comments)}</span>
                </div>
                
                <div class="action" onclick="handleShare('${video.id}')">
                    <i class="fas fa-share"></i>
                    <span>${formatNumber(video.shares)}</span>
                </div>
                
                ${video.isMonetized ? `
                <div class="action" onclick="openGiftShopForVideo('${video.id}', '${video.userId}')">
                    <i class="fas fa-gift"></i>
                    <span>Donner</span>
                </div>
                ` : ''}
            </div>
            
            <div class="video-stats">
                <span class="view-count"><i class="fas fa-eye"></i> ${formatNumber(video.views)}</span>
                ${video.duration ? `<span class="duration">${formatDuration(video.duration)}</span>` : ''}
            </div>
            
            ${video.isMonetized ? `
            <div class="monetization-badge">
                <i class="fas fa-coins"></i> Monétisé
            </div>
            ` : ''}
        </div>
    `;
    
    return div;
}

function initVideoPlayback() {
    const videos = document.querySelectorAll('.video-container video');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(e => console.log('Lecture bloquée:', e));
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.5 });
    
    videos.forEach(video => observer.observe(video));
}

// ==================== UTILITAIRES ====================

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} j`;
    return `${Math.floor(diffInSeconds / 604800)} sem`;
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
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
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ==================== ÉVÉNEMENTS GLOBAUX ====================

function setupEventListeners() {
    // Fermer les modales en cliquant à l'extérieur
    document.addEventListener('click', function(event) {
        // Fermer le menu utilisateur
        const userMenu = document.getElementById('userMenu');
        const dropdown = document.getElementById('userDropdown');
        
        if (userMenu && dropdown && !userMenu.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.style.display = 'none';
        }
        
        // Fermer les modales
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            if (modal.style.display === 'flex' && event.target === modal) {
                modal.style.display = 'none';
                
                // Réinitialiser la modale de création si c'est elle
                if (modal.id === 'createModal') {
                    closeCreateModal();
                }
            }
        });
    });
    
    // Empêcher la fermeture des modales en cliquant à l'intérieur
    document.querySelectorAll('.modal-content').forEach(modalContent => {
        modalContent.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
    
    // Gestionnaire de fichier vidéo
    handleVideoInput();
    
    // Recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            console.log('Recherche:', this.value);
        });
    }
    
    // Chat en direct
    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    
    if (chatInput && sendChatBtn) {
        sendChatBtn.addEventListener('click', function() {
            if (chatInput.value.trim()) {
                showNotification('Message envoyé! (Mode démo)', 'success');
                chatInput.value = '';
            }
        });
        
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                showNotification('Message envoyé! (Mode démo)', 'success');
                this.value = '';
            }
        });
    }
}

// ==================== INITIALISATION ====================

function initApp() {
    console.log('🚀 Initialisation de TikTok Clone...');
    
    // Cacher l'écran de chargement
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
        }, 1000);
    }
    
    // Initialiser l'état
    appState.videos = [...demoVideos];
    
    // Rendre les vidéos
    renderVideos();
    
    // Configurer les événements
    setupEventListeners();
    
    // Simuler un utilisateur pour la démo
    appState.user = { uid: 'demo_user' };
    appState.userProfile = {
        username: 'Utilisateur Démo',
        avatar: 'https://randomuser.me/api/portraits/lego/1.jpg',
        coins: 100
    };
    
    // Mettre à jour l'UI
    const userAvatar = document.getElementById('userAvatar');
    const coinBalance = document.getElementById('coinBalance');
    
    if (userAvatar && appState.userProfile.avatar) {
        userAvatar.src = appState.userProfile.avatar;
    }
    
    if (coinBalance) {
        const span = coinBalance.querySelector('span');
        if (span) span.textContent = appState.userProfile.coins;
    }
    
    console.log('✅ Application initialisée (Mode Démo)');
}

// ==================== EXPORT GLOBAL ====================

// Exposer toutes les fonctions globalement
window.appState = appState;
window.openFilePicker = openFilePicker;
window.toggleUserMenu = toggleUserMenu;
window.openProfile = openProfile;
window.openWallet = openWallet;
window.openSettings = openSettings;
window.openCoinShop = openCoinShop;
window.showForgotPassword = showForgotPassword;
window.startRecording = startRecording;
window.hideLoginModal = hideLoginModal;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.openLiveSetup = openLiveSetup;
window.closeLiveSetup = closeLiveSetup;
window.openGiftShop = openGiftShop;
window.closeGiftShop = closeGiftShop;
window.selectGift = selectGift;
window.sendGift = sendGift;
window.openGiftShopForVideo = openGiftShopForVideo;
window.publishVideo = publishVideo;
window.openComments = openComments;
window.closeComments = closeComments;
window.postComment = postComment;
window.handleLike = handleLike;
window.handleShare = handleShare;
window.startLiveStream = startLiveStream;
window.endLiveStream = endLiveStream;

// Démarrer l'application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    setTimeout(initApp, 100);
}
