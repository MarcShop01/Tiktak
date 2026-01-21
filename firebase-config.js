// Configuration Firebase pour TIKTAK
const firebaseConfig = {
    apiKey: "AIzaSyD6UBg16fK3WP6ttzzmGMLglruXO4-KEzA",
    authDomain: "tiktak-97036.firebaseapp.com",
    projectId: "tiktak-97036",
    storageBucket: "tiktak-97036.firebasestorage.app",
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

// Activer la persistance des données
db.enablePersistence()
    .then(() => console.log('✅ Persistance Firestore activée'))
    .catch(err => console.warn('⚠️ Persistance non supportée:', err));

// ==================== FONCTIONS FIREBASE ====================

// Créer un utilisateur anonyme
async function createAnonymousUser() {
    try {
        const userCredential = await auth.signInAnonymously();
        const user = userCredential.user;
        
        // Créer le profil dans Firestore
        const userData = {
            username: `Utilisateur_${Math.floor(Math.random() * 10000)}`,
            avatar: `https://randomuser.me/api/portraits/lego/${Math.floor(Math.random() * 8) + 1}.jpg`,
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
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isAnonymous: true
        };
        
        await db.collection('users').doc(user.uid).set(userData);
        console.log('👤 Utilisateur anonyme créé:', user.uid);
        
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
                // Charger l'utilisateur depuis Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    resolve({ id: user.uid, ...userDoc.data() });
                } else {
                    // Créer un nouvel utilisateur
                    const newUser = await createAnonymousUser();
                    resolve(newUser);
                }
            } else {
                // Créer un utilisateur anonyme
                const newUser = await createAnonymousUser();
                resolve(newUser);
            }
        }, reject);
    });
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
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
            gifts: 0
        };
        
        await videoRef.set(videoWithMetadata);
        
        // Ajouter la vidéo à l'utilisateur
        await db.collection('users').doc(user.uid).update({
            myVideos: firebase.firestore.FieldValue.arrayUnion(videoRef.id),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Vidéo sauvegardée:', videoRef.id);
        return { id: videoRef.id, ...videoWithMetadata };
    } catch (error) {
        console.error('❌ Erreur sauvegarde vidéo:', error);
        throw error;
    }
}

// Charger toutes les vidéos
async function loadVideos(limit = 50) {
    try {
        const snapshot = await db.collection('videos')
            .where('privacy', '==', 'public')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        
        const videos = [];
        snapshot.forEach(doc => {
            videos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ ${videos.length} vidéos chargées`);
        return videos;
    } catch (error) {
        console.error('❌ Erreur chargement vidéos:', error);
        return [];
    }
}

// Mettre à jour une vidéo
async function updateVideo(videoId, updates) {
    try {
        await db.collection('videos').doc(videoId).update({
            ...updates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Vidéo mise à jour:', videoId);
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
        console.error('❌ Erreur incrément vues:', error);
        throw error;
    }
}

// Mettre à jour les likes
async function updateLikes(videoId, userId, action = 'like') {
    try {
        const videoRef = db.collection('videos').doc(videoId);
        const userRef = db.collection('users').doc(userId);
        
        if (action === 'like') {
            // Ajouter le like
            await videoRef.update({
                likes: firebase.firestore.FieldValue.increment(1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await userRef.update({
                likedVideos: firebase.firestore.FieldValue.arrayUnion(videoId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Retirer le like
            await videoRef.update({
                likes: firebase.firestore.FieldValue.increment(-1),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
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
        // Recherche par hashtags
        const hashtagQuery = query.startsWith('#') ? query.slice(1) : query;
        
        const snapshot = await db.collection('videos')
            .where('privacy', '==', 'public')
            .where('hashtags', 'array-contains', `#${hashtagQuery}`)
            .limit(20)
            .get();
        
        const videos = [];
        snapshot.forEach(doc => {
            videos.push({ id: doc.id, ...doc.data() });
        });
        
        // Si pas de résultats, recherche dans les légendes
        if (videos.length === 0) {
            const allVideos = await loadVideos(50);
            const filteredVideos = allVideos.filter(video => 
                video.caption?.toLowerCase().includes(query.toLowerCase()) ||
                video.username?.toLowerCase().includes(query.toLowerCase())
            );
            return filteredVideos;
        }
        
        return videos;
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
        return null;
    } catch (error) {
        console.error('❌ Erreur chargement utilisateur:', error);
        throw error;
    }
}

// Test de connexion Firebase
async function testFirebaseConnection() {
    try {
        console.log('🔍 Test de connexion Firebase...');
        
        // Test Firestore
        const testRef = db.collection('_tests').doc('connection');
        await testRef.set({
            test: 'connexion',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        await testRef.delete();
        console.log('✅ Firestore: Connecté');
        
        // Test Auth
        const user = auth.currentUser;
        console.log(user ? '✅ Auth: Connecté' : '✅ Auth: Prêt (anonyme)');
        
        return true;
    } catch (error) {
        console.error('❌ Erreur connexion Firebase:', error);
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
    testFirebaseConnection
};

// Tester la connexion au chargement
window.addEventListener('load', () => {
    setTimeout(() => {
        testFirebaseConnection();
    }, 1000);
});

console.log('🔥 Firebase configuré pour TIKTAK');