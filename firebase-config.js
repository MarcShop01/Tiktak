// Configuration Firebase pour TIKTAK - MODE RÉEL
const firebaseConfig = {
    apiKey: "AIzaSyD6UBg16fK3WP6ttzzmGMLglruXO4-KEzA",
    authDomain: "tiktak-97036.firebaseapp.com",
    projectId: "tiktak-97036",
    storageBucket: "tiktak-97036.appspot.com",
    messagingSenderId: "329130229096",
    appId: "1:329130229096:web:2dabf7f2a39de191b62add",
    measurementId: "G-8HN67F2F2R"
};

// Initialiser Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialisé avec succès');
    } else {
        firebase.app();
    }
} catch (error) {
    console.error('❌ Erreur initialisation Firebase:', error);
}

// Initialiser les services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ==================== FONCTIONS FIREBASE CORRIGÉES ====================

// Créer un utilisateur anonyme
async function createAnonymousUser() {
    try {
        const userCredential = await auth.signInAnonymously();
        const user = userCredential.user;
        
        // Créer le profil dans Firestore
        const userData = {
            username: `User${Math.floor(Math.random() * 10000)}`,
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            coins: 1000,
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
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isAnonymous: true,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(user.uid).set(userData);
        console.log('👤 Utilisateur créé:', user.uid);
        
        return { id: user.uid, ...userData };
    } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        throw error;
    }
}

// Obtenir l'utilisateur courant
async function getCurrentUser() {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    resolve({ id: userDoc.id, ...userDoc.data() });
                } else {
                    const newUser = await createAnonymousUser();
                    resolve(newUser);
                }
            } else {
                const newUser = await createAnonymousUser();
                resolve(newUser);
            }
        }, reject);
    });
}

// Charger les vidéos SANS BESOIN D'INDEX
async function loadVideos(limit = 50) {
    try {
        // Solution: Charger sans filtre complexe
        const snapshot = await db.collection('videos')
            .orderBy('createdAt', 'desc')
            .limit(limit * 3) // Charger plus pour compenser
            .get();
        
        if (snapshot.empty) {
            console.log('📭 Aucune vidéo trouvée');
            return [];
        }
        
        const allVideos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Filtrer côté client
            if (data.privacy === 'public' || !data.privacy) {
                allVideos.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date()
                });
            }
        });
        
        console.log(`✅ ${allVideos.length} vidéos chargées`);
        return allVideos.slice(0, limit);
        
    } catch (error) {
        console.error('❌ Erreur chargement vidéos:', error);
        // Retourner vide au lieu de démo
        return [];
    }
}

// Sauvegarder une vidéo
async function saveVideo(videoData) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Utilisateur non connecté');
        
        const videoRef = db.collection('videos').doc();
        const videoWithMetadata = {
            ...videoData,
            id: videoRef.id,
            userId: user.uid,
            username: videoData.username || 'Utilisateur',
            avatar: videoData.avatar || 'https://i.pravatar.cc/150?img=1',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            gifts: 0,
            privacy: videoData.privacy || 'public',
            duration: '00:15'
        };
        
        await videoRef.set(videoWithMetadata);
        
        // Mettre à jour l'utilisateur
        await db.collection('users').doc(user.uid).update({
            myVideos: firebase.firestore.FieldValue.arrayUnion(videoRef.id),
            coins: firebase.firestore.FieldValue.increment(10),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Vidéo sauvegardée:', videoRef.id);
        return videoWithMetadata;
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde vidéo:', error);
        throw error;
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
        throw error;
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
            likes: firebase.firestore.FieldValue.increment(increment),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Mettre à jour l'utilisateur
        const userRef = db.collection('users').doc(userId);
        if (action === 'like') {
            await userRef.update({
                likedVideos: firebase.firestore.FieldValue.arrayUnion(videoId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await userRef.update({
                likedVideos: firebase.firestore.FieldValue.arrayRemove(videoId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erreur mise à jour likes:', error);
        throw error;
    }
}

// Suivre un utilisateur
async function followUser(followerId, followingId) {
    try {
        await db.collection('users').doc(followerId).update({
            following: firebase.firestore.FieldValue.arrayUnion(followingId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('users').doc(followingId).update({
            followers: firebase.firestore.FieldValue.arrayUnion(followerId),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('❌ Erreur follow:', error);
        throw error;
    }
}

// Rechercher des vidéos
async function searchVideos(query) {
    try {
        // Charger toutes et filtrer côté client
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

// Mettre à jour l'utilisateur
async function updateUser(userId, updates) {
    try {
        await db.collection('users').doc(userId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('❌ Erreur mise à jour utilisateur:', error);
        throw error;
    }
}

// Charger un utilisateur
async function loadUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return { id: userDoc.id, ...userDoc.data() };
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

// Initialiser la base de données
async function initializeDatabase() {
    try {
        // Vérifier si l'utilisateur existe
        const user = await getCurrentUser();
        
        // Créer quelques vidéos si la base est vide
        const videosCount = await db.collection('videos').get();
        if (videosCount.empty) {
            console.log('📝 Initialisation de la base de données...');
            
            const demoVideos = [
                {
                    userId: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432',
                    caption: 'Bienvenue sur TIKTAK ! 🎬 #premierevideo #tiktak',
                    likes: Math.floor(Math.random() * 100),
                    comments: Math.floor(Math.random() * 20),
                    shares: Math.floor(Math.random() * 10),
                    views: Math.floor(Math.random() * 1000),
                    gifts: Math.floor(Math.random() * 5),
                    hashtags: ['#premierevideo', '#tiktak', '#bienvenue'],
                    duration: '00:15',
                    privacy: 'public',
                    isMonetized: true
                }
            ];
            
            for (const video of demoVideos) {
                await saveVideo(video);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erreur initialisation base:', error);
        return false;
    }
}

// Exporter les fonctions
window.firebaseApp = {
    db,
    auth,
    storage,
    createAnonymousUser,
    getCurrentUser,
    saveVideo,
    loadVideos,
    updateVideo,
    incrementViews,
    updateLikes,
    followUser,
    searchVideos,
    updateUser,
    loadUser,
    initializeDatabase
};

// Initialiser au chargement
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔍 Initialisation Firebase...');
        await initializeDatabase();
        console.log('✅ Base de données prête');
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
    }
});

console.log('🔥 Firebase configuré pour TIKTAK - MODE RÉEL');
