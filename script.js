// ==================== VARIABLES GLOBALES ====================
let currentUser = null;
let videos = [];
let usersCache = {};
let currentVideoFile = null;
let currentPlayingVideo = null;

// ==================== ALGORITHME DE RECOMMANDATION ====================
const ALGORITHM_CONFIG = {
    weights: {
        likes: 0.3,
        comments: 0.2,
        shares: 0.15,
        views: 0.1,
        followers: 0.15,
        recency: 0.1,
        engagement: 0.1
    },
    boosts: {
        viral: 1.5,
        popular: 1.3,
        trending: 1.2,
        following: 2.0,
        monetized: 1.1,
        recent: 1.2
    }
};

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(async () => {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        await initializeApp();
    }, 1500);
});

async function initializeApp() {
    console.log('🚀 Initialisation TIKTAK...');
    
    try {
        // Charger l'utilisateur depuis Firebase
        currentUser = await firebaseApp.getCurrentUser();
        
        // Charger les vidéos
        videos = await firebaseApp.loadVideos(50);
        
        // Mettre en cache les utilisateurs des vidéos
        await cacheVideoUsers();
        
        setupEventListeners();
        await renderVideoFeed();
        updateUI();
        
        // Écouter les nouvelles vidéos en temps réel
        setupRealtimeListener();
        
        showNotification('Bienvenue sur TIKTAK ! 🎬', 'success');
        console.log('✅ Application initialisée');
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        showNotification('Erreur de chargement', 'error');
        await loadDemoData();
        await renderVideoFeed();
    }
}

async function cacheVideoUsers() {
    for (const video of videos) {
        if (!usersCache[video.userId]) {
            const user = await firebaseApp.loadUser(video.userId);
            if (user) {
                usersCache[video.userId] = user;
            } else {
                // Utilisateur par défaut
                usersCache[video.userId] = {
                    id: video.userId,
                    username: video.username || 'Utilisateur',
                    avatar: video.avatar || 'https://randomuser.me/api/portraits/lego/1.jpg',
                    followers: [],
                    following: [],
                    videos: []
                };
            }
        }
    }
}

function setupRealtimeListener() {
    // Écouter les nouvelles vidéos
    firebaseApp.db.collection('videos')
        .where('privacy', '==', 'public')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newVideo = { id: change.doc.id, ...change.doc.data() };
                    
                    // Vérifier si la vidéo n'est pas déjà dans la liste
                    if (!videos.find(v => v.id === newVideo.id)) {
                        videos.unshift(newVideo);
                        renderVideoFeed();
                        showNotification('Nouvelle vidéo disponible ! 📹', 'info');
                    }
                }
            });
        });
}

// ==================== GESTION DES VIDÉOS ====================
async function renderVideoFeed(sortingAlgorithm = 'score') {
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
        <span>Trier par:</span>
        <select id="sortingAlgorithm" onchange="changeSortingAlgorithm(this.value)">
            <option value="score" ${sortingAlgorithm === 'score' ? 'selected' : ''}>Algorithme intelligent</option>
            <option value="trending" ${sortingAlgorithm === 'trending' ? 'selected' : ''}>Tendances</option>
            <option value="latest" ${sortingAlgorithm === 'latest' ? 'selected' : ''}>Plus récent</option>
            <option value="popular" ${sortingAlgorithm === 'popular' ? 'selected' : ''}>Plus populaires</option>
        </select>
        <span class="stat-item">
            <i class="fas fa-video"></i>
            <span>${videos.length} vidéos</span>
        </span>
    `;
    videoFeed.appendChild(algorithmControls);
    
    // Trier les vidéos
    let videosToDisplay = [];
    switch(sortingAlgorithm) {
        case 'score':
            videosToDisplay = sortVideosByAlgorithm();
            break;
        case 'trending':
            videosToDisplay = getTrendingVideos();
            break;
        case 'latest':
            videosToDisplay = [...videos].sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() || a.timestamp || 0;
                const bTime = b.createdAt?.toMillis?.() || b.timestamp || 0;
                return bTime - aTime;
            });
            break;
        case 'popular':
            videosToDisplay = [...videos].sort((a, b) => b.views - a.views);
            break;
        default:
            videosToDisplay = sortVideosByAlgorithm();
    }
    
    // Afficher les vidéos
    videosToDisplay.forEach((video, index) => {
        const videoElement = createVideoElement(video, index < 3);
        videoFeed.appendChild(videoElement);
    });
}

function calculateVideoScore(video) {
    const user = usersCache[video.userId] || {};
    const followers = user.followers?.length || 0;
    const videoTime = video.createdAt?.toMillis?.() || video.timestamp || Date.now();
    const hoursSinceUpload = (Date.now() - videoTime) / (1000 * 60 * 60);
    
    let score = 0;
    
    // Score de base
    score += video.likes * ALGORITHM_CONFIG.weights.likes;
    score += video.comments * ALGORITHM_CONFIG.weights.comments;
    score += video.shares * ALGORITHM_CONFIG.weights.shares;
    score += video.views * ALGORITHM_CONFIG.weights.views;
    score += followers * ALGORITHM_CONFIG.weights.followers;
    
    // Récence
    score += Math.max(0, 100 - (hoursSinceUpload * 5)) * ALGORITHM_CONFIG.weights.recency;
    
    // Engagement
    const engagementRate = video.views > 0 ? ((video.likes + video.comments) / video.views) * 100 : 0;
    score += engagementRate * ALGORITHM_CONFIG.weights.engagement;
    
    // Boosts
    let boost = 1;
    if (video.likes > 1000) boost *= ALGORITHM_CONFIG.boosts.viral;
    if (followers > 1000) boost *= ALGORITHM_CONFIG.boosts.popular;
    if (hoursSinceUpload < 24 && video.likes > 100) boost *= ALGORITHM_CONFIG.boosts.trending;
    if (currentUser?.following?.includes(video.userId)) boost *= ALGORITHM_CONFIG.boosts.following;
    if (video.isMonetized) boost *= ALGORITHM_CONFIG.boosts.monetized;
    if (hoursSinceUpload < 1) boost *= ALGORITHM_CONFIG.boosts.recent;
    
    return Math.round(score * boost);
}

function sortVideosByAlgorithm() {
    return [...videos].sort((a, b) => {
        const aScore = calculateVideoScore(a);
        const bScore = calculateVideoScore(b);
        return bScore - aScore;
    });
}

function getTrendingVideos() {
    const now = Date.now();
    return [...videos]
        .filter(video => {
            const videoTime = video.createdAt?.toMillis?.() || video.timestamp || now;
            const hours = (now - videoTime) / (1000 * 60 * 60);
            return hours < 48 && (video.likes > 100 || video.shares > 20);
        })
        .sort((a, b) => {
            const aRate = a.likes / ((now - (a.createdAt?.toMillis?.() || a.timestamp || now)) / 3600000);
            const bRate = b.likes / ((now - (b.createdAt?.toMillis?.() || b.timestamp || now)) / 3600000);
            return bRate - aRate;
        });
}

function changeSortingAlgorithm(algorithm) {
    renderVideoFeed(algorithm);
    showNotification(`Tri par ${getAlgorithmName(algorithm)} appliqué`, 'success');
}

function getAlgorithmName(algorithm) {
    const names = {
        'score': 'algorithme intelligent',
        'trending': 'tendances',
        'latest': 'plus récent',
        'popular': 'plus populaires'
    };
    return names[algorithm] || algorithm;
}

function createVideoElement(video, autoPlay = false) {
    const isLiked = currentUser?.likedVideos?.includes(video.id) || false;
    const user = usersCache[video.userId] || {};
    const isFollowing = currentUser?.following?.includes(video.userId) || false;
    const score = calculateVideoScore(video);
    
    // Badges
    const badges = [];
    if (video.likes > 1000) badges.push('<span class="viral-badge">VIRAL</span>');
    if (user.followers?.length > 1000) badges.push('<span class="popular-badge">POPULAIRE</span>');
    if (video.isMonetized) badges.push('<span class="monetization-badge"><i class="fas fa-coins"></i></span>');
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.dataset.videoId = video.id;
    
    container.innerHTML = `
        <div class="score-badge" title="Score: ${score}">
            <i class="fas fa-chart-line"></i> ${score}
        </div>
        
        <video 
            src="${video.videoUrl}" 
            poster="${video.thumbnail}"
            onclick="toggleVideoPlay(this)"
            ${autoPlay && currentUser?.settings?.autoplay ? 'autoplay muted' : ''}
            loop
        ></video>
        
        <div class="video-overlay">
            <div class="creator-info">
                <img src="${user.avatar || video.avatar}" alt="${user.username || video.username}" 
                     onclick="openCreatorProfile('${video.userId}')">
                <div class="creator-details">
                    <div class="creator-name">
                        <h4>${user.username || video.username}</h4>
                        ${isFollowing ? '<span class="following-badge">Abonné</span>' : ''}
                        ${badges.join('')}
                    </div>
                    <p class="video-caption">${video.caption}</p>
                    <div class="hashtags">
                        ${(video.hashtags || []).map(tag => `<span class="hashtag">${tag}</span>`).join('')}
                    </div>
                </div>
                <button class="btn btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${video.userId}', this)">
                    ${isFollowing ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>'}
                </button>
            </div>
            
            <div class="video-stats">
                <div class="view-count">
                    <i class="fas fa-eye"></i> ${formatNumber(video.views || 0)} vues
                </div>
                <div class="video-details">
                    <span class="duration">${video.duration || '00:15'}</span>
                    <span class="time-ago">${getTimeAgo(video.createdAt?.toMillis?.() || video.timestamp)}</span>
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
            
            <div class="action" onclick="openGiftShop('${video.id}')">
                <i class="fas fa-gift"></i>
                <span>${formatNumber(video.gifts || 0)}</span>
            </div>
        </div>
        
        <button class="manual-play-btn" onclick="toggleVideoPlay(this.previousElementSibling.previousElementSibling)">
            <i class="fas fa-play"></i>
        </button>
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
            // Ajouter le like
            video.likes = (video.likes || 0) + 1;
            currentUser.likedVideos.push(videoId);
            
            await firebaseApp.updateLikes(videoId, currentUser.id, 'like');
            await firebaseApp.updateUser(currentUser.id, {
                likedVideos: currentUser.likedVideos
            });
            
            showHeartAnimation();
            showNotification('Vidéo aimée ! ❤️', 'success');
            
            // Récompense
            currentUser.coins += 1;
            await firebaseApp.updateUser(currentUser.id, {
                coins: currentUser.coins
            });
            
        } else {
            // Retirer le like
            video.likes = Math.max(0, (video.likes || 1) - 1);
            currentUser.likedVideos = currentUser.likedVideos.filter(id => id !== videoId);
            
            await firebaseApp.updateLikes(videoId, currentUser.id, 'unlike');
            await firebaseApp.updateUser(currentUser.id, {
                likedVideos: currentUser.likedVideos
            });
            
            showNotification('Like retiré', 'info');
        }
        
        // Mettre à jour l'interface
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
        const isFollowing = currentUser?.following?.includes(userId);
        
        if (!isFollowing) {
            // Suivre
            currentUser.following.push(userId);
            await firebaseApp.followUser(currentUser.id, userId);
            buttonElement.classList.add('following');
            buttonElement.innerHTML = '<i class="fas fa-check"></i>';
            showNotification('Utilisateur suivi !', 'success');
            
            // Récompense
            currentUser.coins += 5;
            await firebaseApp.updateUser(currentUser.id, {
                coins: currentUser.coins
            });
        } else {
            // Se désabonner
            currentUser.following = currentUser.following.filter(id => id !== userId);
            
            // Note: Nous devrions avoir une fonction unfollow
            await firebaseApp.db.collection('users').doc(currentUser.id).update({
                following: firebase.firestore.FieldValue.arrayRemove(userId)
            });
            
            await firebaseApp.db.collection('users').doc(userId).update({
                followers: firebase.firestore.FieldValue.arrayRemove(currentUser.id)
            });
            
            buttonElement.classList.remove('following');
            buttonElement.innerHTML = '<i class="fas fa-plus"></i>';
            showNotification('Abonnement annulé', 'info');
        }
        
        await firebaseApp.updateUser(currentUser.id, {
            following: currentUser.following
        });
        
        updateUI();
        
    } catch (error) {
        console.error('❌ Erreur follow:', error);
        showNotification('Erreur lors du follow', 'error');
    }
}

async function shareVideo(videoId) {
    try {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;
        
        // Incrémenter les partages
        video.shares = (video.shares || 0) + 1;
        await firebaseApp.updateVideo(videoId, { shares: video.shares });
        
        // Partager
        const shareUrl = `${window.location.origin}${window.location.pathname}?video=${videoId}`;
        const shareText = `Regarde cette vidéo sur TIKTAK: ${video.caption}`;
        
        if (navigator.share) {
            await navigator.share({
                title: 'TIKTAK',
                text: shareText,
                url: shareUrl
            });
        } else {
            await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            showNotification('Lien copié ! 📋', 'success');
        }
        
        // Récompense
        currentUser.coins += 3;
        await firebaseApp.updateUser(currentUser.id, {
            coins: currentUser.coins
        });
        
        // Mettre à jour l'interface
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
    document.getElementById('fileUploadControls').style.display = 'flex';
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
    videoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            processVideoFile(file);
        }
    });
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
    
    videoElement.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
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
        const videoUrl = document.getElementById('previewVideo').src || 
                        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
        
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
        
        // Mettre à jour l'utilisateur
        currentUser.myVideos.push(newVideo.id);
        currentUser.coins += 10;
        if (isMonetized) currentUser.coins += 5;
        
        await firebaseApp.updateUser(currentUser.id, {
            myVideos: currentUser.myVideos,
            coins: currentUser.coins
        });
        
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

// ==================== RECHERCHE ====================

async function performSearch(query) {
    if (!query.trim()) {
        showNotification('Veuillez entrer un terme de recherche', 'info');
        return;
    }
    
    try {
        const results = await firebaseApp.searchVideos(query);
        displaySearchResults(results, query);
    } catch (error) {
        console.error('❌ Erreur recherche:', error);
        fallbackSearch(query);
    }
}

function displaySearchResults(results, query) {
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
        return;
    }
    
    const searchHeader = document.createElement('div');
    searchHeader.className = 'search-header';
    searchHeader.innerHTML = `
        <h3>Résultats pour "${query}" (${results.length})</h3>
    `;
    videoFeed.appendChild(searchHeader);
    
    results.forEach(video => {
        videoFeed.appendChild(createVideoElement(video));
    });
    
    showNotification(`${results.length} vidéo(s) trouvée(s)`, 'success');
}

function fallbackSearch(query) {
    const results = videos.filter(video => 
        video.caption?.toLowerCase().includes(query.toLowerCase()) ||
        video.username?.toLowerCase().includes(query.toLowerCase()) ||
        (video.hashtags && video.hashtags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
    
    displaySearchResults(results, query);
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
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileCoins').textContent = currentUser.coins || 0;
    document.getElementById('profileAvatar').src = currentUser.avatar;
    
    const userVideos = videos.filter(v => v.userId === currentUser.id);
    const stats = `${userVideos.length} vidéos • ${currentUser.followers?.length || 0} abonnés • ${currentUser.following?.length || 0} abonnements`;
    document.getElementById('profileStats').textContent = stats;
    
    showProfileTab('videos');
}

function showProfileTab(tabName) {
    // Désactiver tous les onglets
    document.querySelectorAll('.profile-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.profile-content').forEach(content => content.style.display = 'none');
    
    // Activer l'onglet sélectionné
    event.target.classList.add('active');
    const contentId = 'profile' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
    document.getElementById(contentId).style.display = 'block';
    
    // Charger le contenu
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
    
    container.innerHTML = `
        <div class="videos-grid">
            ${userVideos.map(video => `
                <div class="video-thumbnail" onclick="openVideoDetail('${video.id}')">
                    <img src="${video.thumbnail}" alt="${video.caption}">
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
                    <img src="${video.thumbnail}" alt="${video.caption}">
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
                        <h4>${draft.caption}</h4>
                        <p>Créé le ${draft.date}</p>
                        ${draft.isMonetized ? '<span class="draft-monetized">Monétisé</span>' : ''}
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
    document.getElementById('settingsUsername').value = currentUser.username || 'Utilisateur';
    document.getElementById('settingsEmail').value = currentUser.email || '';
    document.getElementById('settingsNotifications').checked = currentUser.settings?.notifications || true;
    document.getElementById('settingsAutoplay').checked = currentUser.settings?.autoplay || true;
}

async function saveSettings() {
    const username = document.getElementById('settingsUsername').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    const notifications = document.getElementById('settingsNotifications').checked;
    const autoplay = document.getElementById('settingsAutoplay').checked;
    
    if (username && username !== currentUser.username) {
        currentUser.username = username;
        
        // Mettre à jour les vidéos de l'utilisateur
        for (const video of videos) {
            if (video.userId === currentUser.id) {
                video.username = username;
                await firebaseApp.updateVideo(video.id, { username: username });
            }
        }
    }
    
    if (email) currentUser.email = email;
    
    currentUser.settings = {
        notifications: notifications,
        autoplay: autoplay,
        privacy: currentUser.settings?.privacy || 'public'
    };
    
    await firebaseApp.updateUser(currentUser.id, {
        username: currentUser.username,
        email: currentUser.email,
        settings: currentUser.settings
    });
    
    closeSettings();
    updateUI();
    showNotification('Paramètres sauvegardés ✅', 'success');
}

// ==================== UTILITAIRES ====================

function formatNumber(num) {
    if (!num) return '0';
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
        if (notification.parentElement) notification.remove();
    }, 5000);
}

function updateUI() {
    document.getElementById('coinCount').textContent = currentUser.coins || 0;
    document.getElementById('userAvatar').src = currentUser.avatar;
}

// ==================== NAVIGATION ====================

function showHome() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.nav-item:nth-child(1)').classList.add('active');
    renderVideoFeed();
}

function toggleUserMenu() {
    const menu = document.getElementById('userDropdown');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function openSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.style.display = searchInput.style.display === 'none' ? 'block' : 'none';
    if (searchInput.style.display === 'block') searchInput.focus();
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
    
    // Input vidéo
    setupVideoInput();
    
    // Input photo de profil
    document.getElementById('profilePictureInput').addEventListener('change', async function(e) {
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
    
    // Fermer les menus en cliquant à l'extérieur
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('userDropdown');
        const userMenu = document.querySelector('.user-menu');
        if (menu && menu.style.display === 'block' && !userMenu.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = 'none';
        }
        
        // Fermer les modales
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
        item.addEventListener('click', function() {
            document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// ==================== FONCTIONS DE DÉMO ====================

async function loadDemoData() {
    videos = [
        {
            id: 'demo1',
            userId: 'demo_user1',
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
        }
    ];
}

// ==================== FONCTIONS NON IMPLÉMENTÉES ====================

function openWallet() {
    showNotification('Portefeuille - Solde: ' + (currentUser.coins || 0) + ' coins', 'info');
}

function openNotifications() {
    showNotification('Aucune nouvelle notification', 'info');
}

function showTrending() {
    renderVideoFeed('trending');
    showNotification('Affichage des tendances', 'info');
}

function showFollowing() {
    const followingVideos = videos.filter(v => currentUser.following?.includes(v.userId));
    if (followingVideos.length === 0) {
        showNotification('Vous ne suivez personne', 'info');
    } else {
        const videoFeed = document.getElementById('videoFeed');
        videoFeed.innerHTML = '';
        followingVideos.forEach(video => videoFeed.appendChild(createVideoElement(video)));
        showNotification('Affichage des abonnements', 'info');
    }
}

function showFavorites() {
    showNotification('Fonctionnalité favoris à venir', 'info');
}

function showMyVideos() {
    const myVideos = videos.filter(v => v.userId === currentUser.id);
    if (myVideos.length === 0) {
        showNotification('Vous n\'avez pas de vidéos', 'info');
    } else {
        const videoFeed = document.getElementById('videoFeed');
        videoFeed.innerHTML = '';
        myVideos.forEach(video => videoFeed.appendChild(createVideoElement(video)));
        showNotification('Affichage de vos vidéos', 'info');
    }
}

function openCreatorProfile(userId) {
    showNotification('Profil créateur: ' + (usersCache[userId]?.username || userId), 'info');
}

function openGiftShop(videoId) {
    showNotification('Boutique de cadeaux pour la vidéo: ' + videoId, 'info');
}

function openCommentsModal(videoId) {
    showNotification('Commentaires pour la vidéo: ' + videoId, 'info');
}

function openLiveStream() {
    showNotification('Live streaming à venir', 'info');
}

function clearLocalStorage() {
    if (confirm('Réinitialiser les données locales ?')) {
        localStorage.clear();
        location.reload();
    }
}

function logout() {
    if (confirm('Se déconnecter ?')) {
        firebaseApp.auth.signOut().then(() => {
            localStorage.clear();
            location.reload();
        });
    }
}

function openVideoDetail(videoId) {
    showNotification('Détails vidéo: ' + videoId, 'info');
}

function editDraft(draftId) {
    showNotification('Édition brouillon: ' + draftId, 'info');
}

function deleteDraft(draftId) {
    if (confirm('Supprimer ce brouillon ?')) {
        currentUser.drafts = currentUser.drafts.filter(d => d.id !== draftId);
        firebaseApp.updateUser(currentUser.id, { drafts: currentUser.drafts });
        loadProfileDrafts();
        showNotification('Brouillon supprimé', 'success');
    }
}

// ==================== EXPORT DES FONCTIONS ====================

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
window.saveSettings = saveSettings;
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
