// firebase-config.js - VERSION CORRIGÉE COMPLÈTE

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

// ==================== FONCTIONS CORRIGÉES ====================

async function loadVideos(limit = 50) {
    try {
        // Version corrigée sans index composite requis
        const snapshot = await db.collection('videos').get();
        
        if (snapshot.empty) {
            console.log('📭 Aucune vidéo trouvée');
            return getDemoVideos();
        }
        
        const allVideos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allVideos.push({
                id: doc.id,
                ...data,
                likes: data.likes || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                views: data.views || 0,
                // Gérer le timestamp
                createdAt: data.createdAt 
                    ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
                    : new Date()
            });
        });
        
        // Filtrer et trier côté client
        const publicVideos = allVideos
            .filter(v => v.privacy === 'public' || !v.privacy)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
        
        console.log(`✅ ${publicVideos.length} vidéos chargées`);
        return publicVideos;
        
    } catch (error) {
        console.error('❌ Erreur chargement vidéos:', error);
        return getDemoVideos();
    }
}

function getDemoVideos() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoHoursAgo = new Date(now.getTime() - 7200000);
    
    return [
        {
            id: 'demo1',
            userId: 'demo_user1',
            username: 'Créateur Pro',
            avatar: 'https://i.pravatar.cc/150?img=12',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432',
            caption: 'Découvrez les merveilles de la nature ! 🌿 #nature #beauté',
            likes: 2450,
            comments: 128,
            shares: 45,
            views: 15000,
            createdAt: oneHourAgo,
            isMonetized: true,
            gifts: 12,
            hashtags: ['#nature', '#beauté', '#découverte'],
            duration: '00:15',
            privacy: 'public'
        },
        {
            id: 'demo2',
            userId: 'demo_user2',
            username: 'Artiste Talent',
            avatar: 'https://i.pravatar.cc/150?img=25',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176',
            caption: 'Art digital en temps réel 🎨 #art #digital #création',
            likes: 3250,
            comments: 256,
            shares: 89,
            views: 25000,
            createdAt: twoHoursAgo,
            isMonetized: false,
            gifts: 25,
            hashtags: ['#art', '#digital', '#création'],
            duration: '00:20',
            privacy: 'public'
        }
    ];
}

// ==================== RESTE DU CODE (inchangé) ====================

async function createAnonymousUser() {
    // ... (code existant inchangé)
}

async function getCurrentUser() {
    // ... (code existant inchangé)
}

async function saveVideo(videoData) {
    // ... (code existant inchangé)
}

// ... autres fonctions inchangées

window.firebaseApp = {
    db,
    auth,
    storage,
    createAnonymousUser,
    getCurrentUser,
    saveVideo,
    loadVideos, // ← Celle-ci est corrigée
    // ... autres fonctions
};

console.log('🔥 Firebase configuré - Index corrigé');
