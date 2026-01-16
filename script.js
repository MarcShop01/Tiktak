// Configuration Firebase avec VOS clés
const firebaseConfig = {
    apiKey: "AIzaSyD6UBg16fK3WP6ttzzmGMLglruXO4-KEzA",
    authDomain: "tiktak-97036.firebaseapp.com",
    projectId: "tiktak-97036",
    storageBucket: "tiktak-97036.firebasestorage.app",
    messagingSenderId: "329130229096",
    appId: "1:329130229096:web:2dabf7f2a39de191b62add",
    measurementId: "G-8HN67F2F2R"
};

// Initialiser Firebase avec vos informations
firebase.initializeApp(firebaseConfig);

// Services Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.functions();
const analytics = firebase.analytics();

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

// Données de démo (à utiliser si Firebase n'est pas encore configuré)
const mockVideos = [
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
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isMonetized: true,
        likesCount: 12400,
        commentsCount: 1200,
        sharesCount: 543,
        viewsCount: 54000
    }
];

// ==================== INITIALISATION ====================
async function initApp() {
    try {
        console.log('🚀 Initialisation de TikTok Clone...');
        
        // Vérifier la connexion Firebase
        await testFirebaseConnection();
        
        // Écouter les changements d'authentification
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

        // Configurer les écouteurs d'événements
        setupEventListeners();
        
        // Cacher l'écran de chargement
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 1000);

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur de connexion à Firebase', 'error');
        
        // Mode dégradé avec données mock
        appState.user = null;
        appState.videos = mockVideos;
        renderVideos();
        document.getElementById('loadingScreen').style.display = 'none';
        showApp();
    }
}

// Tester la connexion Firebase
async function testFirebaseConnection() {
    try {
        // Test Firestore
        const testDoc = await db.collection('test').doc('connection').get();
        console.log('✅ Connexion Firestore OK');
        
        // Test Storage (si activé)
        try {
            const storageRef = storage.ref();
            console.log('✅ Connexion Storage OK');
        } catch (storageError) {
            console.log('⚠️ Storage non configuré - veuillez activer le forfait Blaze');
            showNotification('Storage non configuré. Activez le forfait Blaze dans la console Firebase.', 'warning');
        }
    } catch (error) {
        console.log('⚠️ Firestore non configuré, mode démo activé');
    }
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
        console.log('✅ Connexion réussie');
    } catch (error) {
        console.error('Erreur connexion:', error);
        showNotification(getAuthErrorMessage(error.code), 'error');
    }
}

async function register(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const username = document.getElementById('registerUsername').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showNotification('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Le mot de passe doit faire au moins 6 caractères', 'error');
        return;
    }
    
    try {
        showNotification('Création du compte...', 'info');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Mettre à jour le profil
        await userCredential.user.updateProfile({
            displayName: username,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=ff0050&color=fff`
        });
        
        // Créer le document utilisateur dans Firestore
        await createUserProfile(userCredential.user, username);
        
        showNotification('Compte créé avec succès!', 'success');
        switchAuthTab('login');
    } catch (error) {
        console.error('Erreur inscription:', error);
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
            
            // Mettre à jour l'avatar
            const userAvatar = document.getElementById('userAvatar');
            if (userAvatar && appState.userProfile.avatar) {
                userAvatar.src = appState.userProfile.avatar;
            }
            
            console.log('✅ Profil utilisateur chargé');
        } else {
            // Créer le profil s'il n'existe pas
            await createUserProfile(auth.currentUser, auth.currentUser.displayName);
        }
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        // Profil par défaut
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

// ==================== FONCTIONS STORAGE ====================
async function uploadVideoToStorage(file, userId) {
    try {
        console.log('📤 Upload de la vidéo vers Firebase Storage...');
        
        // Créer une référence pour le fichier
        const storageRef = storage.ref();
        const videoRef = storageRef.child(`videos/${userId}/${Date.now()}_${file.name}`);
        
        // Upload le fichier
        const uploadTask = videoRef.put(file);
        
        // Retourner une promesse pour suivre la progression
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progression de l'upload
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`📊 Progression: ${progress.toFixed(2)}%`);
                    
                    // Mettre à jour la barre de progression si elle existe
                    const progressBar = document.getElementById('uploadProgress');
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                        progressBar.textContent = `${Math.round(progress)}%`;
                    }
                },
                (error) => {
                    console.error('❌ Erreur upload:', error);
                    reject(error);
                },
                async () => {
                    // Upload terminé avec succès
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('✅ Vidéo uploadée avec succès:', downloadURL);
                    
                    resolve({
                        url: downloadURL,
                        path: uploadTask.snapshot.ref.fullPath,
                        fileName: file.name
                    });
                }
            );
        });
        
    } catch (error) {
        console.error('❌ Erreur upload vidéo:', error);
        throw error;
    }
}

async function uploadImageToStorage(file, userId) {
    try {
        console.log('📤 Upload de l\'image vers Firebase Storage...');
        
        // Créer une référence pour le fichier
        const storageRef = storage.ref();
        const imageRef = storageRef.child(`thumbnails/${userId}/${Date.now()}_${file.name}`);
        
        // Upload le fichier
        const uploadTask = imageRef.put(file);
        
        // Retourner une promesse pour suivre la progression
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progression de l'upload
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`📊 Progression: ${progress.toFixed(2)}%`);
                },
                (error) => {
                    console.error('❌ Erreur upload:', error);
                    reject(error);
                },
                async () => {
                    // Upload terminé avec succès
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('✅ Image uploadée avec succès:', downloadURL);
                    
                    resolve({
                        url: downloadURL,
                        path: uploadTask.snapshot.ref.fullPath,
                        fileName: file.name
                    });
                }
            );
        });
        
    } catch (error) {
        console.error('❌ Erreur upload image:', error);
        throw error;
    }
}

async function uploadAvatarToStorage(file, userId) {
    try {
        console.log('📤 Upload de l\'avatar vers Firebase Storage...');
        
        // Créer une référence pour le fichier
        const storageRef = storage.ref();
        const avatarRef = storageRef.child(`avatars/${userId}/${Date.now()}_${file.name}`);
        
        // Upload le fichier
        const uploadTask = avatarRef.put(file);
        
        // Retourner une promesse
        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                null,
                (error) => {
                    reject(error);
                },
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    resolve(downloadURL);
                }
            );
        });
        
    } catch (error) {
        console.error('❌ Erreur upload avatar:', error);
        throw error;
    }
}

// ==================== GESTION DES VIDÉOS ====================
async function loadVideos() {
    try {
        console.log('📹 Chargement des vidéos...');
        
        // Essayer de charger depuis Firestore
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
            // Aucune vidéo dans Firestore, utiliser les données mock
            console.log('⚠️ Aucune vidéo dans Firestore, mode démo activé');
            appState.videos = mockVideos;
        }
        
        renderVideos();
        
    } catch (error) {
        console.error('Erreur chargement vidéos:', error);
        // En cas d'erreur, utiliser les données de démo
        appState.videos = mockVideos;
        renderVideos();
        showNotification('Mode démo activé', 'info');
    }
}

function renderVideos() {
    const videoFeed = document.getElementById('videoFeed');
    if (!videoFeed || appState.videos.length === 0) {
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
    
    // Initialiser la lecture automatique
    initVideoPlayback();
}

function createVideoElement(video) {
    const div = document.createElement('div');
    div.className = 'video-container';
    div.setAttribute('data-video-id', video.id);
    
    // Calculer le temps depuis la publication
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
    `;
    
    return div;
}

async function publishVideo() {
    if (!appState.user) {
        showLoginModal();
        return;
    }
    
    const caption = document.getElementById('videoCaption').value.trim();
    const videoPreview = document.getElementById('previewVideo');
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
        
        // Afficher la barre de progression
        showUploadProgress();
        
        let videoUrl, thumbnailUrl;
        
        // 1. Upload de la vidéo vers Firebase Storage
        try {
            const videoUploadResult = await uploadVideoToStorage(appState.currentVideoFile, appState.user.uid);
            videoUrl = videoUploadResult.url;
            console.log('✅ Vidéo uploadée:', videoUrl);
        } catch (uploadError) {
            console.error('❌ Erreur upload vidéo:', uploadError);
            
            // Mode dégradé : utiliser une URL de démo
            showNotification('Erreur upload vidéo, mode démo activé', 'warning');
            videoUrl = "https://assets.mixkit.co/videos/preview/mixkit-woman-dancing-under-neon-lights-1230-large.mp4";
        }
        
        // 2. Upload de la miniature vers Firebase Storage
        if (appState.currentThumbnailBlob) {
            try {
                const thumbnailFile = new File([appState.currentThumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
                const thumbnailUploadResult = await uploadImageToStorage(thumbnailFile, appState.user.uid);
                thumbnailUrl = thumbnailUploadResult.url;
                console.log('✅ Miniature uploadée:', thumbnailUrl);
            } catch (thumbnailError) {
                console.error('❌ Erreur upload miniature:', thumbnailError);
                thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop';
            }
        } else {
            // Utiliser une miniature par défaut
            thumbnailUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop';
        }
        
        // 3. Extraire les hashtags
        const tags = extractHashtags(caption);
        
        // 4. Créer la nouvelle vidéo
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
            duration: videoPreview.duration || 30,
            isPublic: privacy === 'public',
            isMonetized: isMonetized,
            tags: tags,
            allowComments: true,
            allowDuet: true,
            allowStitch: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // 5. Enregistrer dans Firestore
        const videoRef = await db.collection('videos').add(newVideo);
        const videoId = videoRef.id;
        
        // 6. Incrémenter le compteur de vidéos de l'utilisateur
        await db.collection('users').doc(appState.user.uid).update({
            videosCount: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 7. Ajouter la vidéo à la liste locale
        appState.videos.unshift({
            id: videoId,
            ...newVideo
        });
        
        // 8. Re-rendre les vidéos
        renderVideos();
        
        // 9. Cacher la barre de progression
        hideUploadProgress();
        
        // 10. Fermer le modal et montrer la notification
        closeCreateModal();
        showNotification('Vidéo publiée avec succès!', 'success');
        
        // 11. Réinitialiser les fichiers
        appState.currentVideoFile = null;
        appState.currentThumbnailBlob = null;
        
        // 12. Faire défiler vers le haut
        window.scrollTo(0, 0);
        
    } catch (error) {
        console.error('❌ Erreur publication:', error);
        hideUploadProgress();
        showNotification('Erreur lors de la publication: ' + error.message, 'error');
    }
}

// ==================== GESTION DU TÉLÉVERSEMENT ====================
function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier la taille du fichier (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showNotification('La vidéo est trop grande (max 50MB)', 'error');
        return;
    }

    // Vérifier le type de fichier
    if (!file.type.includes('video/')) {
        showNotification('Veuillez sélectionner un fichier vidéo', 'error');
        return;
    }

    // Sauvegarder le fichier
    appState.currentVideoFile = file;

    // Afficher la prévisualisation
    const videoPreview = document.getElementById('previewVideo');
    if (videoPreview) {
        videoPreview.src = URL.createObjectURL(file);
        videoPreview.load();
        
        // Générer une miniature automatiquement
        videoPreview.addEventListener('loadeddata', function() {
            generateThumbnail(videoPreview).then(thumbnailBlob => {
                // Afficher la miniature
                const thumbnailPreview = document.getElementById('thumbnailPreview');
                if (thumbnailPreview) {
                    thumbnailPreview.src = URL.createObjectURL(thumbnailBlob);
                }
                // Stocker le blob de la miniature
                appState.currentThumbnailBlob = thumbnailBlob;
            });
        });
    }

    // Activer le bouton de publication
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.disabled = false;
    }

    console.log('✅ Vidéo sélectionnée:', file.name, file.size);
}

async function generateThumbnail(videoElement) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.8);
    });
}

function showUploadProgress() {
    const progressContainer = document.getElementById('uploadProgressContainer');
    const progressBar = document.getElementById('uploadProgress');
    
    if (progressContainer) {
        progressContainer.style.display = 'block';
    }
    
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';
    }
}

function hideUploadProgress() {
    const progressContainer = document.getElementById('uploadProgressContainer');
    if (progressContainer) {
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
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
            // Retirer le like
            await likeRef.delete();
            await videoRef.update({
                likesCount: firebase.firestore.FieldValue.increment(-1)
            });
            
            // Mise à jour UI
            const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
            if (videoContainer) {
                const likeAction = videoContainer.querySelector('.action');
                const likeCount = likeAction.querySelector('span');
                likeAction.classList.remove('liked');
                const currentCount = parseInt(likeCount.textContent) || 0;
                likeCount.textContent = formatNumber(Math.max(0, currentCount - 1));
            }
            
        } else {
            // Ajouter le like
            await likeRef.set({
                userId: appState.user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await videoRef.update({
                likesCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Créer une notification
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
            
            // Mise à jour UI
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
        
        // Incrémenter le compteur de partages
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
            // Copier le lien
            const shareUrl = window.location.href + '#video=' + videoId;
            await navigator.clipboard.writeText(shareUrl);
            showNotification('Lien copié dans le presse-papier!', 'success');
        }
        
        // Mise à jour UI
        const videoContainer = document.querySelector(`[data-video-id="${videoId}"]`);
        if (videoContainer) {
            const shareAction = videoContainer.querySelector('.action:nth-child(3)');
            const shareCount = shareAction.querySelector('span');
            const currentCount = parseInt(shareCount.textContent) || 0;
            shareCount.textContent = formatNumber(currentCount + 1);
        }
        
    } catch (error) {
        console.error('Erreur partage:', error);
        // Fallback: copier le lien
        const shareUrl = window.location.href + '#video=' + videoId;
        await navigator.clipboard.writeText(shareUrl);
        showNotification('Lien copié dans le presse-papier!', 'success');
    }
}

// ==================== STREAMING EN DIRECT ====================
async function startLiveStream() {
    const title = document.getElementById('liveTitle').value.trim();
    const description = document.getElementById('liveDescription').value.trim();
    const category = document.getElementById('liveCategory').value;
    
    if (!title) {
        showNotification('Veuillez entrer un titre', 'error');
        return;
    }
    
    if (!appState.user) {
        showLoginModal();
        return;
    }
    
    try {
        // Demander l'accès à la caméra
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: true
        });
        
        // Créer le document live dans Firestore
        const liveData = {
            userId: appState.user.uid,
            username: appState.userProfile.username,
            userAvatar: appState.userProfile.avatar,
            title: title,
            description: description,
            category: category,
            isActive: true,
            viewersCount: 0,
            likesCount: 0,
            giftsCount: 0,
            giftsValue: 0,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            endedAt: null
        };
        
        const streamRef = await db.collection('liveStreams').add(liveData);
        appState.currentStreamId = streamRef.id;
        appState.isLive = true;
        appState.liveStream = stream;
        
        // Mettre à jour l'interface
        document.getElementById('appContainer').style.display = 'none';
        document.getElementById('liveInterface').style.display = 'block';
        document.getElementById('streamerName').textContent = appState.userProfile.username;
        document.getElementById('streamerAvatar').src = appState.userProfile.avatar;
        
        // Démarrer la vidéo
        const liveVideo = document.getElementById('liveVideo');
        liveVideo.srcObject = stream;
        
        closeLiveSetup();
        showNotification('Live démarré! Les spectateurs peuvent maintenant vous rejoindre.', 'success');
        
        // Simuler des spectateurs
        simulateViewers();
        
        // Rejoindre le chat
        await joinLiveChat(appState.currentStreamId);
        
    } catch (error) {
        console.error('Erreur démarrage live:', error);
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            showNotification('Permission de la caméra refusée', 'error');
        } else if (error.name === 'NotFoundError') {
            showNotification('Aucune caméra trouvée', 'error');
        } else {
            showNotification('Erreur lors du démarrage du live: ' + error.message, 'error');
        }
    }
}

async function endLiveStream() {
    try {
        if (appState.liveStream) {
            appState.liveStream.getTracks().forEach(track => track.stop());
            appState.liveStream = null;
        }
        
        if (appState.currentStreamId) {
            await db.collection('liveStreams').doc(appState.currentStreamId).update({
                isActive: false,
                endedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        appState.isLive = false;
        
        document.getElementById('liveInterface').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        
        showNotification('Live terminé avec succès', 'success');
        
    } catch (error) {
        console.error('Erreur arrêt live:', error);
        showNotification('Erreur lors de l\'arrêt du live', 'error');
    }
}

// ==================== CADEAUX ET MONÉTISATION ====================
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
        // Déduire les coins de l'envoyeur
        await db.collection('users').doc(appState.user.uid).update({
            coins: firebase.firestore.FieldValue.increment(-appState.selectedGift.price)
        });
        
        // Ajouter les coins au destinataire (70%)
        const receiverAmount = Math.floor(appState.selectedGift.price * 0.7);
        await db.collection('users').doc(appState.selectedReceiverForGift).update({
            coins: firebase.firestore.FieldValue.increment(receiverAmount)
        });
        
        // Enregistrer la transaction
        await db.collection('transactions').add({
            userId: appState.user.uid,
            type: 'debit',
            amount: appState.selectedGift.price,
            description: `Cadeau ${appState.selectedGift.type} à ${appState.selectedReceiverForGift}`,
            status: 'completed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Si c'est pour un live
        if (appState.isLive && appState.currentStreamId) {
            await db.collection('liveStreams').doc(appState.currentStreamId).collection('gifts').add({
                senderId: appState.user.uid,
                senderName: appState.userProfile.username,
                senderAvatar: appState.userProfile.avatar,
                receiverId: appState.selectedReceiverForGift,
                type: appState.selectedGift.type,
                value: appState.selectedGift.price,
                message: giftMessage,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Mettre à jour le compteur de cadeaux
            await db.collection('liveStreams').doc(appState.currentStreamId).update({
                giftsCount: firebase.firestore.FieldValue.increment(1),
                giftsValue: firebase.firestore.FieldValue.increment(appState.selectedGift.price)
            });
            
            // Mettre à jour l'affichage
            const giftCount = document.getElementById('liveGifts');
            const currentCount = parseInt(giftCount.textContent) || 0;
            giftCount.textContent = currentCount + 1;
        }
        
        // Mettre à jour le solde local
        appState.userProfile.coins -= appState.selectedGift.price;
        updateCoinDisplay(appState.userProfile.coins);
        
        // Animation
        showGiftAnimation(appState.selectedGift.type);
        
        closeGiftShop();
        showNotification('Cadeau envoyé avec succès!', 'success');
        
        // Créer une notification
        await createNotification({
            userId: appState.selectedReceiverForGift,
            type: 'gift',
            fromUserId: appState.user.uid,
            fromUsername: appState.userProfile.username,
            fromUserAvatar: appState.userProfile.avatar,
            message: `vous a envoyé un cadeau ${appState.selectedGift.type}`,
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error('Erreur envoi cadeau:', error);
        showNotification('Erreur lors de l\'envoi du cadeau', 'error');
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
    
    // Écouter les notifications
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
    
    // Écouter les nouveaux lives
    db.collection('liveStreams')
        .where('isActive', '==', true)
        .orderBy('viewersCount', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            // Mettre à jour la liste des lives actifs
            console.log('Lives actifs mis à jour');
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

// ==================== UI HELPERS ====================
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
    
    // Supprimer automatiquement
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

function updateCoinDisplay(coins) {
    const coinElement = document.getElementById('coinBalance');
    if (coinElement) {
        coinElement.querySelector('span').textContent = coins;
    }
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

// ==================== ÉVÉNEMENTS ====================
function setupEventListeners() {
    // Bouton de création
    document.getElementById('createBtn')?.addEventListener('click', openCreateModal);
    
    // Upload de vidéo
    document.getElementById('videoInput')?.addEventListener('change', handleVideoUpload);
    
    // Chat en direct
    document.getElementById('sendChatBtn')?.addEventListener('click', sendChatMessage);
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Recherche
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
    
    // Clic extérieur pour fermer les dropdowns
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-menu') && !e.target.closest('.dropdown-menu')) {
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    });
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

// ==================== FONCTIONS UI (À AJOUTER DANS VOTRE HTML SI ABSENTES) ====================
function openCreateModal() {
    if (!appState.user) {
        showLoginModal();
        return;
    }
    document.getElementById('createModal').style.display = 'block';
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
    // Réinitialiser le formulaire
    document.getElementById('videoCaption').value = '';
    document.getElementById('previewVideo').src = '';
    document.getElementById('thumbnailPreview').src = '';
    appState.currentVideoFile = null;
    appState.currentThumbnailBlob = null;
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function showApp() {
    document.getElementById('appContainer').style.display = 'block';
}

function hideApp() {
    document.getElementById('appContainer').style.display = 'none';
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.style.display = 'none';
    });
    document.getElementById(`${tab}Form`).style.display = 'block';
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', initApp);
