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

// Charger les vidéos
async function loadVideos(limit = 50) {
    try {
        console.log('📥 Chargement des vidéos depuis Firebase...');
        
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
            let createdAt = new Date();
            if (data.createdAt && data.createdAt.toDate) {
                createdAt = data.createdAt.toDate();
            } else if (data.createdAt) {
                createdAt = new Date(data.createdAt);
            }
            
            videos.push({
                id: doc.id,
                ...data,
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

// Upload vers Firebase Storage - VERSION SIMPLIFIÉE ET CORRIGÉE
async function uploadToFirebaseStorage(file) {
    return new Promise((resolve, reject) => {
        console.log('📤 Début upload vers Firebase Storage...');
        
        if (!file) {
            reject(new Error('Aucun fichier sélectionné'));
            return;
        }

        // Vérifier la taille du fichier
        if (file.size > 500 * 1024 * 1024) {
            reject(new Error('Fichier trop volumineux (max 500MB)'));
            return;
        }

        // Créer une référence unique pour le fichier
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const fileName = `videos/${timestamp}_${randomId}.${fileExtension}`;
        
        console.log('📁 Nom du fichier:', fileName);
        console.log('📏 Taille du fichier:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        console.log('📄 Type MIME:', file.type);

        // Créer la référence dans Firebase Storage
        const storageRef = storage.ref();
        const fileRef = storageRef.child(fileName);

        // Métadonnées
        const metadata = {
            contentType: file.type || 'video/*',
            customMetadata: {
                originalName: file.name,
                uploadedAt: timestamp.toString(),
                userId: auth.currentUser?.uid || 'anonymous'
            }
        };

        // Upload avec gestion de progression
        const uploadTask = fileRef.put(file, metadata);

        uploadTask.on('state_changed',
            (snapshot) => {
                // Progression
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`📊 Progression: ${progress.toFixed(2)}%`);
                
                // Mettre à jour la barre de progression dans l'interface
                const progressBar = document.getElementById('uploadProgressBar');
                const progressText = document.getElementById('uploadProgressText');
                
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
                if (progressText) {
                    progressText.textContent = `Upload: ${progress.toFixed(0)}%`;
                }
            },
            (error) => {
                console.error('❌ Erreur upload:', error);
                
                let errorMessage = 'Échec de l\'upload';
                switch (error.code) {
                    case 'storage/unauthorized':
                        errorMessage = 'Non autorisé. Vérifiez les règles Firebase.';
                        break;
                    case 'storage/canceled':
                        errorMessage = 'Upload annulé';
                        break;
                    case 'storage/unknown':
                        errorMessage = 'Erreur inconnue';
                        break;
                }
                
                reject(new Error(`${errorMessage}: ${error.message}`));
            },
            async () => {
                try {
                    console.log('✅ Upload terminé, récupération URL...');
                    
                    // Récupérer l'URL de téléchargement
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    console.log('🔗 URL générée:', downloadURL);
                    
                    // Ajouter des métadonnées supplémentaires
                    await uploadTask.snapshot.ref.updateMetadata({
                        cacheControl: 'public, max-age=31536000',
                        contentDisposition: `inline; filename="${file.name}"`
                    });
                    
                    resolve(downloadURL);
                } catch (urlError) {
                    console.error('❌ Erreur génération URL:', urlError);
                    
                    // Fallback: créer une URL manuellement
                    try {
                        const token = await uploadTask.snapshot.ref.getMetadata()
                            .then(metadata => metadata.downloadTokens || 'no-token');
                        
                        if (token !== 'no-token') {
                            const encodedPath = encodeURIComponent(fileName);
                            const fallbackURL = `https://firebasestorage.googleapis.com/v0/b/tiktak-97036.appspot.com/o/${encodedPath}?alt=media&token=${token}`;
                            console.log('🔗 URL fallback:', fallbackURL);
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

// Test de connexion Firebase
async function testFirebaseConnection() {
    try {
        console.log('🔍 Test de connexion Firebase Storage...');
        
        // Test simple de connexion
        const testRef = storage.ref().child('_test_connection.txt');
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        
        await testRef.put(testBlob);
        const url = await testRef.getDownloadURL();
        await testRef.delete();
        
        console.log('✅ Firebase Storage: Connecté et fonctionnel');
        return true;
    } catch (error) {
        console.warn('⚠️ Firebase Storage: Problème de connexion', error);
        return false;
    }
}

// Initialiser la base de données
async function initializeDatabase() {
    try {
        const user = await getCurrentUser();
        
        const videosCount = await db.collection('videos').get();
        if (videosCount.empty) {
            console.log('📝 Initialisation avec une vidéo de démo...');
            
            const demoVideo = {
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
            };
            
            await saveVideo(demoVideo);
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
    getCurrentUser,
    saveVideo,
    loadVideos,
    uploadToFirebaseStorage,
    testFirebaseConnection,
    initializeDatabase
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

console.log('🔥 Firebase configuré pour TIKTAK - UPLOAD CORRIGÉ');
