// ==================== CONFIGURATION FIREBASE V8 ====================
const firebaseConfig = {
    apiKey: "AIzaSyD6UBg16fK3WP6ttzzmGMLglruXO4-KEzA",
    authDomain: "tiktak-97036.firebaseapp.com",
    projectId: "tiktak-97036",
    storageBucket: "tiktak-97036.appspot.com",
    messagingSenderId: "329130229096",
    appId: "1:329130229096:web:2dabf7f2a39de191b62add",
    measurementId: "G-8HN67F2F2R"
};

// Initialiser Firebase (syntaxe v8)
firebase.initializeApp(firebaseConfig);

// Services Firebase (SANS Storage)
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();
const analytics = firebase.analytics();

// NE PAS initialiser storage puisque vous n'avez pas activé le forfait Blaze
// const storage = firebase.storage();

// État de l'application
const appState = {
    user: null,
    userProfile: null,
    videos: [],
    currentVideoIndex: 0,
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    videoStream: null,
    liveStream: null,
    currentStreamId: null,
    isLive: false,
    selectedGift: null,
    notifications: [],
    selectedVideoForGift: null,
    selectedReceiverForGift: null,
    currentVideoFile: null,
    currentThumbnailBlob: null
};

// VIDÉOS DE DÉMO (gratuites et libres de droit)
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
        isMonetized: true,
        likesCount: 12400,
        commentsCount: 1200,
        sharesCount: 543,
        viewsCount: 54000
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
        isMonetized: false,
        likesCount: 8900,
        commentsCount: 450,
        sharesCount: 210,
        viewsCount: 32000
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
        isMonetized: true,
        likesCount: 15600,
        commentsCount: 890,
        sharesCount: 430,
        viewsCount: 78000
    }
];

// ==================== GESTION DES COMMENTAIRES ====================
function openComments(videoId) {
    const commentsSection = document.getElementById(`comments-${videoId}`);
    if (commentsSection) {
        commentsSection.style.display = 'block';
        commentsSection.classList.add('active');
        
        // Focus sur le champ de commentaire si disponible
        const commentInput = commentsSection.querySelector('textarea');
        if (commentInput) {
            setTimeout(() => commentInput.focus(), 100);
        }
    } else {
        console.error(`Section de commentaires introuvable pour la vidéo ${videoId}`);
        showNotification('Fonctionnalité commentaires en développement', 'info');
    }
}

function closeComments(videoId) {
    const commentsSection = document.getElementById(`comments-${videoId}`);
    if (commentsSection) {
        commentsSection.style.display = 'none';
        commentsSection.classList.remove('active');
    }
}

function toggleComments(videoId) {
    const commentsSection = document.getElementById(`comments-${videoId}`);
    if (!commentsSection) {
        console.error(`Section de commentaires introuvable pour la vidéo ${videoId}`);
        return;
    }
    
    if (commentsSection.style.display === 'none' || !commentsSection.classList.contains('active')) {
        openComments(videoId);
    } else {
        closeComments(videoId);
    }
}

// ==================== FONCTIONS UI ====================

function hideLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
}

function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.style.display = 'flex';
        switchAuthTab('login');
    }
}

function switchAuthTab(tab) {
    console.log(`🎯 Changement d'onglet vers: ${tab}`);
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTabBtn = document.getElementById('loginTabBtn');
    const registerTabBtn = document.getElementById('registerTabBtn');
    
    if (!loginForm || !registerForm || !loginTabBtn || !registerTabBtn) {
        console.error('❌ Éléments du formulaire non trouvés');
        return;
    }
    
    loginForm.style.display = 'none';
    registerForm.style.display = 'none';
    loginTabBtn.classList.remove('active');
    registerTabBtn.classList.remove('active');
    
    if (tab === 'login') {
        loginForm.style.display = 'block';
        loginTabBtn.classList.add('active');
    } else if (tab === 'register') {
        registerForm.style.display = 'block';
        registerTabBtn.classList.add('active');
    }
    
    console.log(`✅ Onglet ${tab} activé`);
}

function showApp() {
    const appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.style.display = 'block';
    }
}

function hideApp() {
    const appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.style.display = 'none';
    }
}

function updateCoinDisplay(coins) {
    const coinElement = document.getElementById('coinBalance');
    if (coinElement) {
        const span = coinElement.querySelector('span');
        if (span) {
            span.textContent = coins;
        }
    }
}

function updateUIForUser() {
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && appState.userProfile && appState.userProfile.avatar) {
        userAvatar.src = appState.userProfile.avatar;
    }
    
    if (appState.userProfile) {
        updateCoinDisplay(appState.userProfile.coins || 0);
    }
    
    console.log('✅ UI mise à jour pour l\'utilisateur');
}

// ==================== AUTHENTIFICATION ====================
async function login(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    try {
        showNotification('Connexion en cours...', 'info');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Connexion réussie pour:', userCredential.user.email);
        
    } catch (error) {
        console.error('❌ Erreur connexion:', error);
        showNotification(getAuthErrorMessage(error.code), 'error');
    }
}

async function register(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const username = document.getElementById('registerUsername').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!email || !password || !username || !confirmPassword) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Le mot de passe doit faire au moins 6 caractères', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Le nom d\'utilisateur doit faire au moins 3 caractères', 'error');
        return;
    }
    
    try {
        showNotification('Création du compte...', 'info');
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Utilisateur créé:', user.uid);
        
        await user.updateProfile({
            displayName: username,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=ff0050&color=fff`
        });
        
        console.log('✅ Profil Firebase Auth mis à jour');
        
        await createUserProfile(user, username);
        
        showNotification('Compte créé avec succès!', 'success');
        
        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerConfirmPassword').value = '';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erreur inscription:', error);
        showNotification(getAuthErrorMessage(error.code), 'error');
    }
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const result = await auth.signInWithPopup(provider);
        console.log('✅ Connexion Google réussie');
    } catch (error) {
        console.error('Erreur Google:', error);
        showNotification('Erreur lors de la connexion avec Google', 'error');
    }
}

async function logout() {
    try {
        if (appState.isLive) {
            await endLiveStream();
        }
        
        await auth.signOut();
        showNotification('Déconnexion réussie', 'success');
    } catch (error) {
        console.error('Erreur déconnexion:', error);
        showNotification('Erreur lors de la déconnexion', 'error');
    }
}

// ==================== PROFIL UTILISATEUR ====================
async function loadUserProfile(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            appState.userProfile = userDoc.data();
            updateCoinDisplay(appState.userProfile.coins || 0);
            
            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar && appState.userProfile.avatar) {
                userAvatar.src = appState.userProfile.avatar;
            }
            
            console.log('✅ Profil utilisateur chargé');
        } else {
            await createUserProfile(auth.currentUser, auth.currentUser.displayName);
        }
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        appState.userProfile = {
            uid: userId,
            username: auth.currentUser.displayName || 'Utilisateur',
            avatar: auth.currentUser.photoURL || 'https://ui-avatars.com/api/?name=User&background=ff0050&color=fff',
            coins: 100,
            followers: 0,
            following: 0
        };
        updateCoinDisplay(100);
    }
}

async function createUserProfile(user, username) {
    try {
        const userProfile = {
            uid: user.uid,
            email: user.email,
            username: username,
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=ff0050&color=fff`,
            fullName: user.displayName || '',
            bio: '',
            coins: 100,
            followers: 0,
            following: 0,
            videosCount: 0,
            isVerified: false,
            isCreator: false,
            preferences: {
                language: 'fr',
                notifications: true,
                privacy: 'public'
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(user.uid).set(userProfile);
        appState.userProfile = userProfile;
        updateCoinDisplay(100);
        
        console.log('✅ Profil utilisateur créé');
    } catch (error) {
        console.error('Erreur création profil:', error);
        throw error;
    }
}

// ==================== VIDÉOS (MODE DÉMO - SANS STORAGE) ====================
async function loadVideos() {
    try {
        console.log('📹 Chargement des vidéos...');
        
        const videosSnapshot = await db.collection('videos')
            .where('isPublic', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        if (!videosSnapshot.empty) {
            const videos = videosSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            appState.videos = videos;
            console.log(`✅ ${videos.length} vidéos chargées depuis Firestore`);
        } else {
            console.log('⚠️ Aucune vidéo dans Firestore, mode démo activé');
            appState.videos = demoVideos;
        }
        
        renderVideos();
        
    } catch (error) {
        console.error('Erreur chargement vidéos:', error);
        appState.videos = demoVideos;
        renderVideos();
        showNotification('Mode démo activé', 'info');
    }
}

function renderVideos() {
    const videoFeed = document.getElementById('videoFeed');
    if (!videoFeed) return;
    
    if (appState.videos.length === 0) {
        videoFeed.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video-slash"></i>
                <h3>Aucune vidéo disponible</h3>
                <p>Soyez le premier à publier une vidéo!</p>
                <button class="btn btn-primary" onclick="openCreateModal()">
                    <i class="fas fa-plus"></i> Créer une vidéo
                </button>
            </div>
        `;
        return;
    }
    
    videoFeed.innerHTML = '';
    
    appState.videos.forEach((video, index) => {
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
        <video loop muted playsinline data-index="${appState.videos.indexOf(video)}">
            <source src="${video.videoUrl}" type="video/mp4">
        </video>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${video.userAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg'}" 
                     alt="${video.username}">
                <div>
                    <h4>@${video.username}</h4>
                    <p>${video.caption || ''}</p>
                    <small class="time-ago">${timeAgo}</small>
                </div>
            </div>
            
            <div class="video-actions">
                <div class="action ${video.userLiked ? 'liked' : ''}" onclick="handleLike('${video.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${formatNumber(video.likesCount || video.likes || 0)}</span>
                </div>
                
                <div class="action" onclick="openComments('${video.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${formatNumber(video.commentsCount || video.comments || 0)}</span>
                </div>
                
                <div class="action" onclick="handleShare('${video.id}')">
                    <i class="fas fa-share"></i>
                    <span>${formatNumber(video.sharesCount || video.shares || 0)}</span>
                </div>
                
                ${video.isMonetized ? `
                <div class="action" onclick="openGiftShopForVideo('${video.id}', '${video.userId}')">
                    <i class="fas fa-gift"></i>
                    <span>Donner</span>
                </div>
                ` : ''}
            </div>
            
            <div class="video-stats">
                <span class="view-count"><i class="fas fa-eye"></i> ${formatNumber(video.viewsCount || video.views || 0)}</span>
                ${video.duration ? `<span class="duration">${formatDuration(video.duration)}</span>` : ''}
            </div>
            
            ${video.isMonetized ? `
            <div class="monetization-badge">
                <i class="fas fa-coins"></i> Monétisé
            </div>
            ` : ''}
        </div>
        
        <!-- Section des commentaires -->
        <div id="comments-${video.id}" class="comments-section" style="display: none;">
            <div class="comments-header">
                <h4>Commentaires (${formatNumber(video.commentsCount || video.comments || 0)})</h4>
                <button onclick="closeComments('${video.id}')" class="close-comments-btn">×</button>
            </div>
            <div class="comments-list">
                <div class="comment">
                    <strong>@fan123</strong>
                    <p>Super vidéo ! J'adore 😍</p>
                </div>
                <div class="comment">
                    <strong>@creative_user</strong>
                    <p>Trop stylé ! Continue comme ça 👍</p>
                </div>
                <div class="comment">
                    <strong>@tiktok_fan</strong>
                    <p>#tiktokclone #awesome</p>
                </div>
            </div>
            <div class="comment-form">
                <textarea placeholder="Ajouter un commentaire..." rows="2"></textarea>
                <button onclick="postComment('${video.id}')">Publier</button>
            </div>
        </div>
    `;
    
    return div;
}

function postComment(videoId) {
    if (!appState.user) {
        showLoginModal();
        return;
    }
    
    const commentInput = document.querySelector(`#comments-${videoId} textarea`);
    if (!commentInput || !commentInput.value.trim()) {
        showNotification('Veuillez écrire un commentaire', 'error');
        return;
    }
    
    showNotification('Commentaire publié! (Mode démo)', 'success');
    commentInput.value = '';
}

// ==================== PUBLICATION DE VIDÉO (SANS STORAGE) ====================
async function publishVideo() {
    if (!appState.user) {
        showLoginModal();
        return;
    }
    
    const caption = document.getElementById('videoCaption').value.trim();
    const isMonetized = document.getElementById('monetizeVideo').checked;
    const privacy = document.getElementById('videoPrivacy').value;
    
    if (!appState.currentVideoFile) {
        showNotification('Veuillez sélectionner une vidéo', 'error');
        return;
    }
    
    if (!caption) {
        showNotification('Veuillez ajouter une légende', 'error');
        return;
    }
    
    try {
        showNotification('Publication en cours...', 'info');
        
        // DÉSACTIVER LE BOUTON
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
        }
        
        // VIDÉOS DE DÉMO DISPONIBLES
        const demoVideoUrls = [
            "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-under-neon-lights-1230-large.mp4",
            "https://assets.mixkit.co/videos/preview/mixkit-man-doing-tricks-with-skateboard-in-a-parking-lot-34553-large.mp4",
            "https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4",
            "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
            "https://assets.mixkit.co/videos/preview/mixkit-group-of-friends-partying-happily-4640-large.mp4",
            "https://assets.mixkit.co/videos/preview/mixkit-young-women-listening-to-music-while-walking-in-the-city-50013-large.mp4"
        ];
        
        // MINIATURES DE DÉMO
        const demoThumbnails = [
            'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=600&fit=crop',
            'https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=400&h=600&fit=crop',
            'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&h=600&fit=crop',
            'https://images.unsplash.com/photo-1492684223066-e9e3b74d2c9e?w=400&h=600&fit=crop'
        ];
        
        // CHOISIR UNE VIDÉO ET UNE MINIATURE AU HASARD
        const videoUrl = demoVideoUrls[Math.floor(Math.random() * demoVideoUrls.length)];
        const thumbnailUrl = demoThumbnails[Math.floor(Math.random() * demoThumbnails.length)];
        
        // Extraire les hashtags
        const tags = extractHashtags(caption);
        
        // Créer la nouvelle vidéo
        const newVideo = {
            userId: appState.user.uid,
            username: appState.userProfile.username,
            userAvatar: appState.userProfile.avatar,
            videoUrl: videoUrl,
            thumbnailUrl: thumbnailUrl,
            caption: caption,
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            duration: 30,
            isPublic: privacy === 'public',
            isMonetized: isMonetized,
            tags: tags,
            allowComments: true,
            allowDuet: true,
            allowStitch: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Enregistrer dans Firestore
        const videoRef = await db.collection('videos').add(newVideo);
        const videoId = videoRef.id;
        
        // Incrémenter le compteur de vidéos de l'utilisateur
        await db.collection('users').doc(appState.user.uid).update({
            videosCount: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Ajouter la vidéo à la liste locale
        appState.videos.unshift({
            id: videoId,
            ...newVideo
        });
        
        // Re-rendre les vidéos
        renderVideos();
        
        // Fermer le modal
        closeCreateModal();
        showNotification('Vidéo publiée avec succès! (Mode démo)', 'success');
        
        // Réinitialiser
        appState.currentVideoFile = null;
        appState.currentThumbnailBlob = null;
        
        // Faire défiler vers le haut
        window.scrollTo(0, 0);
        
    } catch (error) {
        console.error('❌ Erreur publication:', error);
        showNotification('Erreur lors de la publication: ' + error.message, 'error');
        
        // Réactiver le bouton
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
        }
    }
}

// ==================== LIKES ET INTERACTIONS ====================
async function handleLike(videoId) {
    if (!appState.user) {
        showLoginModal();
        return;
    }
    
    try {
        const videoRef = db.collection('videos').doc(videoId);
        const likeRef = videoRef.collection('likes').doc(appState.user.uid);
        const likeDoc = await likeRef.get();
        
        if (likeDoc.exists) {
            await likeRef.delete();
            await videoRef.update({
                likesCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
            if (videoContainer) {
                const likeAction = videoContainer.querySelector('.action');
                const likeCount = likeAction.querySelector('span');
                likeAction.classList.remove('liked');
                const currentCount = parseInt(likeCount.textContent) || 0;
                likeCount.textContent = formatNumber(Math.max(0, currentCount - 1));
            }
            
        } else {
            await likeRef.set({
                userId: appState.user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await videoRef.update({
                likesCount: firebase.firestore.FieldValue.increment(1)
            });
            
            const videoDoc = await videoRef.get();
            if (videoDoc.exists) {
                const videoData = videoDoc.data();
                if (videoData.userId !== appState.user.uid) {
                    await createNotification({
                        userId: videoData.userId,
                        type: 'like',
                        fromUserId: appState.user.uid,
                        fromUsername: appState.userProfile.username,
                        fromUserAvatar: appState.userProfile.avatar,
                        videoId: videoId,
                        message: "a aimé votre vidéo",
                        isRead: false,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            
            const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
            if (videoContainer) {
                const likeAction = videoContainer.querySelector('.action');
                const likeCount = likeAction.querySelector('span');
                likeAction.classList.add('liked');
                const currentCount = parseInt(likeCount.textContent) || 0;
                likeCount.textContent = formatNumber(currentCount + 1);
            }
        }
        
    } catch (error) {
        console.error('Erreur like:', error);
        showNotification('Erreur lors du like', 'error');
    }
}

async function handleShare(videoId) {
    try {
        const video = appState.videos.find(v => v.id === videoId);
        if (!video) return;
        
        const videoRef = db.collection('videos').doc(videoId);
        await videoRef.update({
            sharesCount: firebase.firestore.FieldValue.increment(1)
        });
        
        if (navigator.share) {
            await navigator.share({
                title: `Regarde cette vidéo de @${video.username}`,
                text: video.caption,
                url: window.location.href + '#video=' + videoId
            });
        } else {
            const shareUrl = window.location.href + '#video=' + videoId;
            await navigator.clipboard.writeText(shareUrl);
            showNotification('Lien copié dans le presse-papier!', 'success');
        }
        
        const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
        if (videoContainer) {
            const shareAction = videoContainer.querySelector('.action:nth-child(3)');
            const shareCount = shareAction.querySelector('span');
            const currentCount = parseInt(shareCount.textContent) || 0;
            shareCount.textContent = formatNumber(currentCount + 1);
        }
        
    } catch (error) {
        console.error('Erreur partage:', error);
        const shareUrl = window.location.href + '#video=' + videoId;
        await navigator.clipboard.writeText(shareUrl);
        showNotification('Lien copié dans le presse-papier!', 'success');
    }
}

// ==================== NOTIFICATIONS ====================
async function createNotification(notificationData) {
    try {
        await db.collection('notifications').add(notificationData);
        console.log('✅ Notification créée');
    } catch (error) {
        console.error('Erreur création notification:', error);
    }
}

function setupRealtimeListeners() {
    if (!appState.user) return;
    
    db.collection('notifications')
        .where('userId', '==', appState.user.uid)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notification = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    showNotificationInUI(notification);
                }
            });
        });
}

// ==================== UTILITAIRES ====================
function formatNumber(num) {
    if (typeof num !== 'number') num = parseInt(num) || 0;
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'Récemment';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} j`;
    return `${Math.floor(diffInSeconds / 604800)} sem`;
}

function extractHashtags(text) {
    if (!text) return [];
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.substring(1).toLowerCase());
}

function getAuthErrorMessage(errorCode) {
    const errors = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/operation-not-allowed': 'Opération non autorisée',
        'auth/weak-password': 'Mot de passe trop faible (min 6 caractères)',
        'auth/user-disabled': 'Compte désactivé',
        'auth/user-not-found': 'Utilisateur non trouvé',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard',
        'auth/network-request-failed': 'Erreur réseau, vérifiez votre connexion',
        'auth/popup-closed-by-user': 'La fenêtre de connexion a été fermée',
        'auth/cancelled-popup-request': 'Connexion annulée',
        'auth/popup-blocked': 'La fenêtre de connexion a été bloquée'
    };
    
    return errors[errorCode] || 'Une erreur est survenue: ' + errorCode;
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

function showNotificationInUI(notification) {
    const message = `@${notification.fromUsername} ${notification.message}`;
    showNotification(message, 'info');
}

function initVideoPlayback() {
    const videos = document.querySelectorAll('.video-container video');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(e => {
                    console.log('Lecture automatique bloquée:', e);
                });
            } else {
                video.pause();
            }
        });
    }, {
        threshold: 0.5
    });
    
    videos.forEach(video => observer.observe(video));
}

// ==================== INITIALISATION ====================
async function testFirebaseConnection() {
    try {
        const testDoc = await db.collection('test').doc('connection').get();
        console.log('✅ Connexion Firestore OK');
    } catch (error) {
        console.log('⚠️ Firestore non configuré, mode démo activé');
    }
}

async function setupApp() {
    await testFirebaseConnection();
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('✅ Utilisateur connecté:', user.email);
            appState.user = user;
            await loadUserProfile(user.uid);
            hideLoginModal();
            showApp();
            await loadVideos();
            setupRealtimeListeners();
            updateUIForUser();
        } else {
            console.log('🔐 Aucun utilisateur connecté');
            showLoginModal();
            hideApp();
        }
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 1000);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleSearch() {
    console.log('Recherche en cours...');
}

async function initApp() {
    try {
        console.log('🚀 Initialisation de TikTok Clone (Mode Démo)...');
        
        if (document.readyState !== 'loading') {
            await setupApp();
        } else {
            document.addEventListener('DOMContentLoaded', setupApp);
        }
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur de connexion à Firebase', 'error');
        
        appState.user = null;
        appState.videos = demoVideos;
        renderVideos();
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        showApp();
    }
}

// ==================== STREAMING (SIMULATION) ====================
async function startLiveStream() {
    const title = document.getElementById('liveTitle').value.trim();
    
    if (!title) {
        showNotification('Veuillez entrer un titre', 'error');
        return;
    }
    
    if (!appState.user) {
        showLoginModal();
        return;
    }
    
    try {
        showNotification('Live démarré! Les spectateurs peuvent maintenant vous rejoindre.', 'success');
        closeLiveSetup();
        
        const appContainer = document.getElementById('appContainer');
        const liveInterface = document.getElementById('liveInterface');
        const streamerName = document.getElementById('streamerName');
        const streamerAvatar = document.getElementById('streamerAvatar');
        
        if (appContainer) appContainer.style.display = 'none';
        if (liveInterface) liveInterface.style.display = 'block';
        if (streamerName) streamerName.textContent = appState.userProfile.username;
        if (streamerAvatar) streamerAvatar.src = appState.userProfile.avatar;
        
        appState.isLive = true;
        
    } catch (error) {
        console.error('Erreur démarrage live:', error);
        showNotification('Erreur lors du démarrage du live: ' + error.message, 'error');
    }
}

async function endLiveStream() {
    try {
        appState.isLive = false;
        
        const appContainer = document.getElementById('appContainer');
        const liveInterface = document.getElementById('liveInterface');
        
        if (appContainer) appContainer.style.display = 'block';
        if (liveInterface) liveInterface.style.display = 'none';
        
        showNotification('Live terminé avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur arrêt live:', error);
        showNotification('Erreur lors de l\'arrêt du live', 'error');
    }
}

// ==================== CADEAUX ====================
function openGiftShopForVideo(videoId, receiverId) {
    appState.selectedVideoForGift = videoId;
    appState.selectedReceiverForGift = receiverId;
    openGiftShop();
}

async function sendGift() {
    if (!appState.user || !appState.selectedGift) {
        showLoginModal();
        return;
    }
    
    const giftMessage = document.getElementById('giftMessage').value;
    const userCoins = appState.userProfile.coins || 0;
    
    if (userCoins < appState.selectedGift.price) {
        showNotification('Solde insuffisant!', 'error');
        return;
    }
    
    try {
        showNotification('Cadeau envoyé avec succès!', 'success');
        closeGiftShop();
        
    } catch (error) {
        console.error('Erreur envoi cadeau:', error);
        showNotification('Erreur lors de l\'envoi du cadeau', 'error');
    }
}

// ==================== EXPORT GLOBAL ====================
window.appState = appState;
window.switchAuthTab = switchAuthTab;
window.hideLoginModal = hideLoginModal;
window.showLoginModal = showLoginModal;
window.login = login;
window.register = register;
window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.publishVideo = publishVideo;
window.handleLike = handleLike;
window.handleShare = handleShare;
window.openComments = openComments;
window.closeComments = closeComments;
window.toggleComments = toggleComments;
window.postComment = postComment;
window.openGiftShopForVideo = openGiftShopForVideo;
window.sendGift = sendGift;
window.selectGift = selectGift;
window.startLiveStream = startLiveStream;
window.endLiveStream = endLiveStream;
window.openGiftShop = openGiftShop;
window.closeGiftShop = closeGiftShop;

// Initialiser l'application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initApp, 100);
    });
} else {
    setTimeout(initApp, 100);
}
