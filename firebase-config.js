// Remplacer le contenu de firebase-config.js par :

// Configuration Firebase pour TIKTAK (Plan Gratuit Spark)
const firebaseConfig = {
    apiKey: "AIzaSyD6UBg16fK3WP6ttzzmGMLglruXO4-KEzA",
    authDomain: "tiktak-97036.firebaseapp.com",
    projectId: "tiktak-97036",
    storageBucket: "tiktak-97036.appspot.com", // Changé ici
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

// Désactiver la persistance pour éviter les erreurs
// db.settings({
//     cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
// });

// ==================== FONCTIONS FIREBASE AMÉLIORÉES ====================

// Créer un utilisateur anonyme
async function createAnonymousUser() {
    try {
        const userCredential = await auth.signInAnonymously();
        const user = userCredential.user;
        
        // Créer le profil dans Firestore
        const userData = {
            username: `Utilisateur_${Math.floor(Math.random() * 10000)}`,
            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
            coins: 1000, // Augmenté pour tests
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isAnonymous: true,
            lastLogin: new Date().toISOString()
        };
        
        await db.collection('users').doc(user.uid).set(userData, { merge: true });
        console.log('👤 Utilisateur anonyme créé:', user.uid);
        
        return { id: user.uid, ...userData };
    } catch (error) {
        console.error('❌ Erreur création utilisateur:', error);
        // Fallback local
        return {
            id: 'demo_user_' + Date.now(),
            username: 'Utilisateur Démo',
            avatar: 'https://i.pravatar.cc/150?img=1',
            coins: 1000,
            likedVideos: [],
            myVideos: [],
            drafts: [],
            following: [],
            followers: [],
            settings: { notifications: true, autoplay: true }
        };
    }
}

// Obtenir l'utilisateur courant avec fallback
async function getCurrentUser() {
    try {
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
                    // Essayer de se connecter anonymement
                    const newUser = await createAnonymousUser();
                    resolve(newUser);
                }
            }, reject);
        });
    } catch (error) {
        console.log('⚠️ Utilisation du mode démo (Firebase hors ligne)');
        // Retourner un utilisateur de démo
        return {
            id: 'demo_user',
            username: 'Utilisateur Démo',
            avatar: 'https://i.pravatar.cc/150?img=1',
            coins: 1000,
            likedVideos: [],
            myVideos: [],
            drafts: [],
            following: [],
            followers: [],
            settings: { notifications: true, autoplay: true }
        };
    }
}

// Sauvegarder une vidéo (avec URL publique par défaut pour tests)
async function saveVideo(videoData) {
    try {
        const user = auth.currentUser;
        const userId = user ? user.uid : 'demo_user';
        
        const videoRef = db.collection('videos').doc();
        const videoWithMetadata = {
            ...videoData,
            id: videoRef.id,
            userId: userId,
            username: videoData.username || 'Utilisateur',
            avatar: videoData.avatar || 'https://i.pravatar.cc/150?img=1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            likes: 0,
            comments: 0,
            shares: 0,
            views: Math.floor(Math.random() * 1000) + 100,
            gifts: 0,
            duration: '00:15',
            privacy: videoData.privacy || 'public'
        };
        
        // Si pas d'URL vidéo, utiliser une démo
        if (!videoWithMetadata.videoUrl) {
            const demoVideos = [
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
            ];
            videoWithMetadata.videoUrl = demoVideos[Math.floor(Math.random() * demoVideos.length)];
        }
        
        if (!videoWithMetadata.thumbnail) {
            const thumbnails = [
                'https://images.unsplash.com/photo-1611605698335-8b1569810432',
                'https://images.unsplash.com/photo-1518709268805-4e9042af2176',
                'https://images.unsplash.com/photo-1517649763962-0c623066013b',
                'https://images.unsplash.com/photo-1565958011703-44f9829ba187'
            ];
            videoWithMetadata.thumbnail = thumbnails[Math.floor(Math.random() * thumbnails.length)];
        }
        
        await videoRef.set(videoWithMetadata);
        console.log('✅ Vidéo sauvegardée:', videoRef.id);
        
        // Mettre à jour l'utilisateur
        if (user) {
            await db.collection('users').doc(userId).update({
                myVideos: firebase.firestore.FieldValue.arrayUnion(videoRef.id),
                coins: firebase.firestore.FieldValue.increment(10)
            });
        }
        
        return videoWithMetadata;
    } catch (error) {
        console.error('❌ Erreur sauvegarde vidéo, mode démo activé:', error);
        // Mode démo
        return {
            id: 'demo_video_' + Date.now(),
            ...videoData,
            likes: 0,
            comments: 0,
            shares: 0,
            views: 100,
            createdAt: new Date().toISOString(),
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432'
        };
    }
}

// Charger les vidéos avec fallback
async function loadVideos(limit = 50) {
    try {
        const snapshot = await db.collection('videos')
            .where('privacy', '==', 'public')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        
        if (snapshot.empty) {
            console.log('📭 Aucune vidéo trouvée, mode démo activé');
            return getDemoVideos();
        }
        
        const videos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            videos.push({
                id: doc.id,
                ...data,
                // Assurer les valeurs par défaut
                likes: data.likes || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                views: data.views || 0
            });
        });
        
        console.log(`✅ ${videos.length} vidéos chargées`);
        return videos;
    } catch (error) {
        console.error('❌ Erreur chargement vidéos, mode démo:', error);
        return getDemoVideos();
    }
}

// Vidéos de démo
function getDemoVideos() {
    return [
        {
            id: 'demo1',
            userId: 'demo_user1',
            username: 'Créateur Pro',
            avatar: 'https://i.pravatar.cc/150?img=12',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432',
            caption: 'Découvrez les merveilles de la nature ! 🌿 #nature #beauté',
            likes: Math.floor(Math.random() * 5000) + 1000,
            comments: Math.floor(Math.random() * 200) + 50,
            shares: Math.floor(Math.random() * 100) + 20,
            views: Math.floor(Math.random() * 100000) + 10000,
            timestamp: Date.now() - 3600000,
            isMonetized: true,
            gifts: 12,
            hashtags: ['#nature', '#beauté', '#découverte'],
            duration: '00:15',
            privacy: 'public',
            createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 'demo2',
            userId: 'demo_user2',
            username: 'Artiste Talent',
            avatar: 'https://i.pravatar.cc/150?img=25',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176',
            caption: 'Art digital en temps réel 🎨 #art #digital #création',
            likes: Math.floor(Math.random() * 8000) + 2000,
            comments: Math.floor(Math.random() * 300) + 100,
            shares: Math.floor(Math.random() * 200) + 50,
            views: Math.floor(Math.random() * 150000) + 20000,
            timestamp: Date.now() - 7200000,
            isMonetized: false,
            gifts: 25,
            hashtags: ['#art', '#digital', '#création'],
            duration: '00:20',
            privacy: 'public',
            createdAt: new Date(Date.now() - 7200000).toISOString()
        }
    ];
}

// Mettre à jour une vidéo
async function updateVideo(videoId, updates) {
    try {
        await db.collection('videos').doc(videoId).update({
            ...updates,
            updatedAt: new Date().toISOString()
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
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('⚠️ Vue non comptabilisée (mode démo):', error);
        return false;
    }
}

// Mettre à jour les likes
async function updateLikes(videoId, userId, action = 'like') {
    try {
        const increment = action === 'like' ? 1 : -1;
        await db.collection('videos').doc(videoId).update({
            likes: firebase.firestore.FieldValue.increment(increment),
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('⚠️ Like non enregistré:', error);
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

// Mettre à jour l'utilisateur
async function updateUser(userId, updates) {
    try {
        await db.collection('users').doc(userId).update({
            ...updates,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error('⚠️ Utilisateur non mis à jour:', error);
        return false;
    }
}

// Charger un utilisateur
async function loadUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            return { id: userDoc.id, ...userDoc.data() };
        }
        // Utilisateur par défaut
        return {
            id: userId,
            username: 'Utilisateur',
            avatar: 'https://i.pravatar.cc/150?img=1',
            followers: [],
            following: []
        };
    } catch (error) {
        console.error('⚠️ Chargement utilisateur échoué:', error);
        return {
            id: userId,
            username: 'Utilisateur',
            avatar: 'https://i.pravatar.cc/150?img=1',
            followers: [],
            following: []
        };
    }
}

// Suivre un utilisateur
async function followUser(followerId, followingId) {
    try {
        await db.collection('users').doc(followerId).update({
            following: firebase.firestore.FieldValue.arrayUnion(followingId),
            updatedAt: new Date().toISOString()
        });
        
        await db.collection('users').doc(followingId).update({
            followers: firebase.firestore.FieldValue.arrayUnion(followerId),
            updatedAt: new Date().toISOString()
        });
        
        return true;
    } catch (error) {
        console.error('⚠️ Follow non enregistré:', error);
        return false;
    }
}

// Tester la connexion Firebase
async function testFirebaseConnection() {
    try {
        console.log('🔍 Test de connexion Firebase...');
        
        // Test simple
        const testRef = db.collection('_tests');
        await testRef.add({
            test: 'connection',
            timestamp: new Date().toISOString()
        });
        
        // Nettoyer
        const snapshot = await testRef.where('test', '==', 'connection').get();
        snapshot.forEach(doc => doc.ref.delete());
        
        console.log('✅ Firebase: Connecté et fonctionnel');
        return true;
    } catch (error) {
        console.warn('⚠️ Firebase: Mode démo activé', error);
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

// Initialiser au chargement
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await testFirebaseConnection();
        
        // Vérifier si des vidéos existent, sinon en créer
        const videos = await loadVideos(1);
        if (videos.length === 0) {
            console.log('📝 Création des vidéos de démo...');
            // Créer quelques vidéos de démo
            const demoVideos = getDemoVideos();
            for (const video of demoVideos) {
                await saveVideo(video);
            }
        }
    } catch (error) {
        console.log('🌐 Application en mode démo');
    }
});

console.log('🔥 Firebase configuré pour TIKTAK - Mode Gratuit Spark');
