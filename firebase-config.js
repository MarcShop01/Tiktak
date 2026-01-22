// Configuration Firebase pour TIKTAK - MODE RÉEL CORRIGÉ
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

// Charger les vidéos - VERSION CORRIGÉE POUR TOUS LES APPAREILS
async function loadVideos(limit = 50) {
    try {
        console.log('📥 Chargement des vidéos depuis Firebase...');
        
        // Solution optimisée: Charger avec pagination
        const snapshot = await db.collection('videos')
            .where('privacy', '==', 'public')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        
        if (snapshot.empty) {
            console.log('📭 Aucune vidéo trouvée dans la base de données');
            return [];
        }
        
        const videos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Convertir le timestamp Firestore en Date
            let createdAt = new Date();
            if (data.createdAt && data.createdAt.toDate) {
                createdAt = data.createdAt.toDate();
            } else if (data.createdAt) {
                createdAt = new Date(data.createdAt);
            }
            
            // Assurer que l'URL vidéo est valide
            let videoUrl = data.videoUrl;
            if (!videoUrl || !videoUrl.startsWith('http')) {
                // Si l'URL n'est pas valide, utiliser une vidéo de démo
                videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            }
            
            videos.push({
                id: doc.id,
                ...data,
                videoUrl: videoUrl,
                createdAt: createdAt,
                likes: data.likes || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                views: data.views || 0,
                gifts: data.gifts || 0,
                duration: data.duration || '00:15',
                privacy: data.privacy || 'public',
                hashtags: data.hashtags || []
            });
        });
        
        console.log(`✅ ${videos.length} vidéos chargées`);
        return videos;
        
    } catch (error) {
        console.error('❌ Erreur chargement vidéos:', error);
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
            duration: '00:15',
            hashtags: videoData.hashtags || []
        };
        
        await videoRef.set(videoWithMetadata);
        
        // Mettre à jour l'utilisateur
        await db.collection('users').doc(user.uid).update({
            myVideos: firebase.firestore.FieldValue.arrayUnion(videoRef.id),
            coins: firebase.firestore.FieldValue.increment(10),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Vidéo sauvegardée:', videoRef.id);
        return { ...videoWithMetadata, createdAt: new Date() };
        
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
        console.log(`🔍 Recherche: "${query}"`);
        
        const snapshot = await db.collection('videos')
            .where('privacy', '==', 'public')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        if (snapshot.empty) return [];
        
        const allVideos = [];
        const normalizedQuery = query.toLowerCase().trim();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            
            allVideos.push({
                id: doc.id,
                ...data,
                createdAt: createdAt
            });
        });
        
        // Filtrer côté client
        const results = allVideos.filter(video => {
            if (video.caption && video.caption.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            if (video.username && video.username.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            if (video.hashtags && Array.isArray(video.hashtags)) {
                for (const tag of video.hashtags) {
                    if (tag.toLowerCase().includes(normalizedQuery)) {
                        return true;
                    }
                }
            }
            
            return false;
        });
        
        console.log(`✅ ${results.length} résultats trouvés pour "${query}"`);
        return results;
        
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
            const data = userDoc.data();
            return { 
                id: userDoc.id, 
                username: data.username || 'Utilisateur',
                avatar: data.avatar || 'https://i.pravatar.cc/150?img=1',
                followers: data.followers || [],
                following: data.following || [],
                coins: data.coins || 0,
                likedVideos: data.likedVideos || []
            };
        }
        return {
            id: userId,
            username: 'Utilisateur',
            avatar: 'https://i.pravatar.cc/150?img=1',
            followers: [],
            following: [],
            coins: 0,
            likedVideos: []
        };
    } catch (error) {
        console.error('❌ Erreur chargement utilisateur:', error);
        return {
            id: userId,
            username: 'Utilisateur',
            avatar: 'https://i.pravatar.cc/150?img=1',
            followers: [],
            following: [],
            coins: 0,
            likedVideos: []
        };
    }
}

// Upload vers Firebase Storage (FONCTION CRITIQUE)
async function uploadToFirebaseStorage(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('Aucun fichier sélectionné.'));
            return;
        }

        // Créer une référence avec un nom unique
        const storageRef = firebase.storage().ref();
        const fileExtension = file.name.split('.').pop();
        const fileName = `videos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
        const videoRef = storageRef.child(fileName);

        // Métadonnées pour accepter tous les formats
        const metadata = {
            contentType: file.type || 'video/*',
            customMetadata: {
                originalName: file.name,
                uploadedBy: auth.currentUser?.uid || 'anonymous',
                timestamp: Date.now().toString()
            }
        };

        const uploadTask = videoRef.put(file, metadata);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload: ${progress.toFixed(2)}%`);
                
                // Mettre à jour l'interface utilisateur si besoin
                const progressElement = document.getElementById('uploadProgress');
                if (progressElement) {
                    progressElement.style.width = `${progress}%`;
                }
            },
            (error) => {
                console.error('❌ Erreur upload:', error);
                
                // Messages d'erreur plus détaillés
                let errorMessage = 'Échec de l\'upload';
                if (error.code === 'storage/unauthorized') {
                    errorMessage = 'Non autorisé à uploader des fichiers';
                } else if (error.code === 'storage/canceled') {
                    errorMessage = 'Upload annulé';
                } else if (error.code === 'storage/unknown') {
                    errorMessage = 'Erreur inconnue';
                }
                
                showNotification(errorMessage + ': ' + error.message, 'error');
                reject(error);
            },
            async () => {
                try {
                    // Récupérer l'URL de téléchargement
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('✅ Fichier disponible à l\'URL:', downloadURL);
                    
                    // Rendre le fichier public (optionnel)
                    await uploadTask.snapshot.ref.updateMetadata({
                        cacheControl: 'public, max-age=31536000',
                        contentDisposition: `inline; filename="${file.name}"`
                    });
                    
                    resolve(downloadURL);
                } catch (urlError) {
                    console.error('❌ Erreur génération URL:', urlError);
                    
                    // Fallback: créer une URL signée manuellement si getDownloadURL échoue
                    try {
                        const token = await uploadTask.snapshot.ref.getMetadata()
                            .then(metadata => metadata.downloadTokens);
                        
                        if (token) {
                            const fallbackURL = `https://firebasestorage.googleapis.com/v0/b/${storageRef.bucket}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
                            console.log('✅ URL fallback générée:', fallbackURL);
                            resolve(fallbackURL);
                        } else {
                            reject(urlError);
                        }
                    } catch (fallbackError) {
                        reject(fallbackError);
                    }
                }
            }
        );
    });
}

// Initialiser la base de données
async function initializeDatabase() {
    try {
        const user = await getCurrentUser();
        
        const videosCount = await db.collection('videos').get();
        if (videosCount.empty) {
            console.log('📝 Initialisation avec des vidéos de démo...');
            
            const demoVideos = [
                {
                    userId: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432',
                    caption: 'Bienvenue sur TIKTAK ! 🎬 Créez votre première vidéo ! #bienvenue #tiktak',
                    likes: 15,
                    comments: 3,
                    shares: 2,
                    views: 150,
                    gifts: 0,
                    hashtags: ['#bienvenue', '#tiktak', '#premierevideo'],
                    duration: '00:15',
                    privacy: 'public',
                    isMonetized: false
                }
            ];
            
            for (const demoVideo of demoVideos) {
                await saveVideo(demoVideo);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erreur initialisation base:', error);
        return false;
    }
}

// Test de connexion Firebase
async function testFirebaseConnection() {
    try {
        console.log('🔍 Test de connexion Firebase...');
        
        // Test Storage
        const testFile = new Blob(['test'], { type: 'text/plain' });
        const testRef = storage.ref().child('_test_connection.txt');
        await testRef.put(testFile);
        await testRef.delete();
        
        console.log('✅ Firebase Storage: Connecté et fonctionnel');
        return true;
    } catch (error) {
        console.warn('⚠️ Firebase Storage: Problème de connexion', error);
        return false;
    }
}

// Écoute en temps réel
function setupRealtimeListener(callback) {
    try {
        console.log('👂 Configuration de l\'écoute en temps réel...');
        
        return db.collection('videos')
            .where('privacy', '==', 'public')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .onSnapshot((snapshot) => {
                const newVideos = [];
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        newVideos.push({
                            id: change.doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate?.() || new Date()
                        });
                    }
                });
                
                if (newVideos.length > 0 && callback) {
                    callback(newVideos);
                }
            }, (error) => {
                console.warn('⚠️ Écoute temps réel désactivée:', error);
            });
    } catch (error) {
        console.warn('⚠️ Impossible de configurer l\'écoute temps réel:', error);
        return null;
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
    uploadToFirebaseStorage, // AJOUTÉ
    initializeDatabase,
    testFirebaseConnection,
    setupRealtimeListener
};

// Initialiser au chargement
window.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Initialisation Firebase...');
        await testFirebaseConnection();
        await initializeDatabase();
        console.log('✅ Base de données prête');
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
    }
});

console.log('🔥 Firebase configuré pour TIKTAK - MODE RÉEL CORRIGÉ');
