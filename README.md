# TIKTAK - Guide de Test Local

## 🚀 Pour tester la publication de vidéos :

1. **Ouvrez l'application** dans votre navigateur
2. **Cliquez sur le bouton +** (Créer)
3. **Dans la modale** :
   - Écrivez une légende (ex: "Ma première vidéo sur TIKTAK! #fun")
   - Cliquez sur "Publier"
4. **La vidéo apparaîtra** en haut de votre flux

## 💾 Données stockées localement :

L'application utilise `localStorage` pour :
- Vos vidéos publiées
- Vos likes
- Vos brouillons
- Votre profil

## 🔧 Pour voir les données stockées :

1. Ouvrez les **Outils de développement** (F12)
2. Allez dans l'onglet **Application** → **Stockage** → **Local Storage**
3. Vous verrez les clés :
   - `tiktak_videos` : vos vidéos
   - `tiktak_user` : votre profil
   - `tiktak_likes` : vos likes
   - `tiktak_drafts` : vos brouillons

## 🐛 Problèmes courants et solutions :

### 1. Vidéo non publiée :
- Vérifiez la console (F12 → Console)
- Assurez-vous d'avoir une légende

### 2. Données perdues :
- Ne videz pas le cache du navigateur
- Utilisez "Réinitialiser les données" dans Paramètres pour tester

### 3. Design cassé :
- Actualisez la page (F5)
- Vérifiez que styles.css est bien chargé

## ✅ Fonctionnalités testées :

- [x] Publication de vidéos
- [x] Like/Dislike
- [x] Recherche
- [x] Profil utilisateur
- [x] Brouillons
- [x] Paramètres
- [x] Notifications

## 📱 Compatibilité :

Testé sur :
- Chrome 120+
- Firefox 120+
- Safari 16+
- Edge 120+
- Mobile Chrome/Safari
