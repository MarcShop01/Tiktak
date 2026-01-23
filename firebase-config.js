// Configuration Firebase pour TIKTAK - CORRIGÉ
const firebaseConfig = {
    apiKey: "AIzaSyD6UBg16fK3WP6ttzzmGMLglruXO4-KEzA",
    authDomain: "tiktak-97036.firebaseapp.com",
    projectId: "tiktak-97036",
    storageBucket: "tiktak-97036.appspot.com",
    messagingSenderId: "329130229096",
    appId: "1:329130229096:web:2dabf7f2a39de191b62add",
    measurementId: "G-8HN67F2F2R"
};

// Vérifier si Firebase est déjà initialisé
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase initialisé avec succès");
} else {
    firebase.app();
}

// Initialiser les services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ==================== FONCTIONS FIREBASE AMÉLIORÉES ====================

// Créer ou récupérer un utilisateur
async function createOrGetUser() {
    try {
        // Essayer de récupérer l'utilisateur actuel
        const user = auth.currentUser;
        
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                return { id: userDoc.id, ...userDoc.data() };
            }
        }
        
        // Créer un nouvel utilisateur avec ID unique
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const userData = {
            username: `User${Math.floor(Math.random() * 10000)}`,
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            coins: 100,
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(userId).set(userData);
        console.log('👤 Utilisateur créé:', userId);
        
        return { id: userId, ...userData };
        
    } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        
        // Fallback: créer un utilisateur local
        const localUserId = 'local_' + Date.now();
        return {
            id: localUserId,
            username: `LocalUser${Math.floor(Math.random() * 1000)}`,
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            coins: 50,
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
            updatedAt: new Date(),
            isLocal: true
        };
    }
}

// Obtenir l'utilisateur courant
async function getCurrentUser() {
    try {
        // Vérifier dans localStorage d'abord
        const storedUser = localStorage.getItem('tiktak_current_user');
        if (storedUser) {
            return JSON.parse(storedUser);
        }
        
        // Sinon créer/récupérer un utilisateur
        const user = await createOrGetUser();
        localStorage.setItem('tiktak_current_user', JSON.stringify(user));
        return user;
        
    } catch (error) {
        console.error('❌ Erreur getCurrentUser:', error);
        
        // Utilisateur de secours
        const fallbackUser = {
            id: 'fallback_user',
            username: 'Utilisateur TIKTAK',
            avatar: 'https://i.pravatar.cc/150?img=1',
            coins: 50,
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
            isLocal: true
        };
        
        localStorage.setItem('tiktak_current_user', JSON.stringify(fallbackUser));
        return fallbackUser;
    }
}

// Mettre à jour l'utilisateur
async function updateUser(userId, updates) {
    try {
        const userRef = db.collection('users').doc(userId);
        
        // Mettre à jour Firestore
        await userRef.update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Utilisateur mis à jour:', userId);
        return true;
        
    } catch (error) {
        console.error('❌ Erreur mise à jour utilisateur:', error);
        
        // Mise à jour locale en cas d'erreur
        const currentUser = JSON.parse(localStorage.getItem('tiktak_current_user') || '{}');
        const updatedUser = { ...currentUser, ...updates, updatedAt: new Date() };
        localStorage.setItem('tiktak_current_user', JSON.stringify(updatedUser));
        
        return true;
    }
}

// Mettre à jour le profil utilisateur
async function updateUserProfile(userId, updates) {
    return updateUser(userId, updates);
}

// Sauvegarder une vidéo
async function saveVideo(videoData) {
    try {
        const user = await getCurrentUser();
        const videoRef = db.collection('videos').doc();
        
        const videoWithMetadata = {
            ...videoData,
            id: videoRef.id,
            userId: user.id,
            username: user.username || videoData.username,
            avatar: user.avatar || videoData.avatar,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            gifts: 0,
            privacy: videoData.privacy || 'public',
            duration: videoData.duration || '00:15'
        };
        
        await videoRef.set(videoWithMetadata);
        
        // Mettre à jour la liste des vidéos de l'utilisateur
        await updateUser(user.id, {
            myVideos: firebase.firestore.FieldValue.arrayUnion(videoRef.id),
            coins: (user.coins || 0) + 10
        });
        
        console.log('✅ Vidéo sauvegardée:', videoRef.id);
        return videoWithMetadata;
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde vidéo:', error);
        
        // Sauvegarde locale
        const videoId = 'local_video_' + Date.now();
        const localVideo = {
            ...videoData,
            id: videoId,
            userId: 'local_user',
            username: videoData.username || 'Utilisateur',
            avatar: videoData.avatar || 'https://i.pravatar.cc/150?img=1',
            createdAt: new Date(),
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0
        };
        
        // Stocker localement
        const localVideos = JSON.parse(localStorage.getItem('tiktak_local_videos') || '[]');
        localVideos.push(localVideo);
        localStorage.setItem('tiktak_local_videos', JSON.stringify(localVideos));
        
        return localVideo;
    }
}

// Charger les vidéos
async function loadVideos(limit = 50) {
    try {
        // Essayer de charger depuis Firestore
        const snapshot = await db.collection('videos')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        
        if (snapshot.empty) {
            console.log('📭 Aucune vidéo dans Firestore');
            return [];
        }
        
        const videos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            videos.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            });
        });
        
        console.log(`✅ ${videos.length} vidéos chargées depuis Firestore`);
        return videos;
        
    } catch (error) {
        console.error('❌ Erreur chargement vidéos Firestore:', error);
        
        // Charger les vidéos locales
        const localVideos = JSON.parse(localStorage.getItem('tiktak_local_videos') || '[]');
        
        // Charger quelques vidéos de démo
        const demoVideos = [
            {
                id: 'demo_1',
                userId: 'demo_user_1',
                username: 'Créateur TIKTAK',
                avatar: 'https://i.pravatar.cc/150?img=5',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432',
                caption: 'Bienvenue sur TIKTAK ! 🎬 Découvrez l\'application de vidéos la plus cool !',
                hashtags: ['#TIKTAK', '#Bienvenue', '#Vidéo'],
                duration: '01:15',
                views: 15432,
                likes: 1243,
                comments: 89,
                shares: 45,
                createdAt: new Date(Date.now() - 3600000)
            },
            {
                id: 'demo_2',
                userId: 'demo_user_2',
                username: 'Aventurier Duo',
                avatar: 'https://i.pravatar.cc/150?img=8',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176',
                caption: 'Les plus belles aventures commencent ici 🌍 #Aventure #Découverte',
                hashtags: ['#Aventure', '#Découverte', '#Voyage'],
                duration: '02:30',
                views: 23456,
                likes: 1897,
                comments: 123,
                shares: 67,
                createdAt: new Date(Date.now() - 7200000)
            },
            {
                id: 'demo_3',
                userId: 'demo_user_3',
                username: 'TechMaster',
                avatar: 'https://i.pravatar.cc/150?img=12',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1517649763962-0c623066013b',
                caption: 'Découvrez les dernières tendances tech! 📱 #Tech #Innovation',
                hashtags: ['#Tech', '#Innovation', '#Nouveauté'],
                duration: '01:45',
                views: 18765,
                likes: 1567,
                comments: 98,
                shares: 54,
                createdAt: new Date(Date.now() - 10800000)
            }
        ];
        
        const allVideos = [...demoVideos, ...localVideos].slice(0, limit);
        console.log(`📱 ${allVideos.length} vidéos chargées (démo + locales)`);
        return allVideos;
    }
}

// Mettre à jour une vidéo
async function updateVideo(videoId, updates) {
    try {
        await db.collection('videos').doc(videoId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('❌ Erreur mise à jour vidéo:', error);
        return false;
    }
}

// Incrémenter les vues
async function incrementViews(videoId) {
    try {
        await db.collection('videos').doc(videoId).update({
            views: firebase.firestore.FieldValue.increment(1),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('⚠️ Vue non comptabilisée:', error);
        return false;
    }
}

// Mettre à jour les likes
async function updateLikes(videoId, userId, action = 'like') {
    try {
        const increment = action === 'like' ? 1 : -1;
        await db.collection('videos').doc(videoId).update({
            likes: firebase.firestore.FieldValue.increment(increment)
        });
        return true;
    } catch (error) {
        console.error('❌ Erreur mise à jour likes:', error);
        return false;
    }
}

// Suivre un utilisateur
async function followUser(followerId, followingId) {
    try {
        await db.collection('users').doc(followerId).update({
            following: firebase.firestore.FieldValue.arrayUnion(followingId)
        });
        
        await db.collection('users').doc(followingId).update({
            followers: firebase.firestore.FieldValue.arrayUnion(followerId)
        });
        
        return true;
    } catch (error) {
        console.error('❌ Erreur follow:', error);
        return false;
    }
}

// Rechercher des vidéos
async function searchVideos(query) {
    try {
        const allVideos = await loadVideos(100);
        const normalizedQuery = query.toLowerCase();
        
        return allVideos.filter(video => 
            video.caption?.toLowerCase().includes(normalizedQuery) ||
            video.username?.toLowerCase().includes(normalizedQuery) ||
            (video.hashtags && video.hashtags.some(tag => 
                tag.toLowerCase().includes(normalizedQuery)
            ))
        );
    } catch (error) {
        console.error('❌ Erreur recherche:', error);
        return [];
    }
}

// Charger un utilisateur
async function loadUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return { 
                id: userDoc.id, 
                ...userData
            };
        }
        return {
            id: userId,
            username: 'Utilisateur',
            avatar: 'https://i.pravatar.cc/150?img=1',
            followers: [],
            following: []
        };
    } catch (error) {
        console.error('❌ Erreur chargement utilisateur:', error);
        return {
            id: userId,
            username: 'Utilisateur',
            avatar: 'https://i.pravatar.cc/150?img=1',
            followers: [],
            following: []
        };
    }
}

// Exporter les services et fonctions
window.firebaseApp = {
    db,
    auth,
    storage,
    getCurrentUser,
    updateUser,
    updateUserProfile,
    saveVideo,
    loadVideos,
    updateVideo,
    incrementViews,
    updateLikes,
    followUser,
    searchVideos,
    loadUser
};

console.log('🔥 Firebase configuré pour TIKTAK - Version corrigée');
