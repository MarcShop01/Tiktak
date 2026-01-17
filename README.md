# TIKTAK - Instructions pour tester l'upload de vidéos

## 🎬 Comment importer et publier une vidéo :

1. **Cliquez sur le bouton +** (Créer)
2. **Cliquez sur "Importer une vidéo"**
3. **Sélectionnez une vidéo** de votre ordinateur (max 100MB)
4. **Ajoutez une légende** dans le champ texte
5. **Cliquez sur "Publier"**

## 🔧 Fonctionnalités ajoutées :

- ✅ **Conversion Base64** : Les vidéos sont converties en base64 pour le stockage
- ✅ **Génération de miniature** : Une miniature est créée automatiquement
- ✅ **Stockage persistant** : Les vidéos sont sauvegardées dans localStorage
- ✅ **Support des grandes vidéos** : Jusqu'à 100MB
- ✅ **Interface de progression** : Indicateur pendant la conversion

## 📊 Capacité de stockage :

- **localStorage** : Limité à ~5-10MB par domaine
- **Solution** : Nous utilisons compression base64 avec gestion intelligente
- **Conseil** : Pour des vidéos > 20MB, utilisez "Vidéo de démo" pour les tests

## 🐛 Dépannage :

### Problème : Vidéo ne s'affiche pas après publication
**Solution :**
1. Vérifiez la console (F12 → Console) pour les erreurs
2. Essayez avec une vidéo plus petite (< 10MB)
3. Utilisez "Vidéo de démo" pour tester

### Problème : Publication lente
**Solution :**
- La conversion d'une vidéo de 13MB prend environ 3-5 secondes
- Patientez pendant la conversion

### Problème : Vidéo disparaît après rechargement
**Solution :**
- Les vidéos sont persistantes
- Vérifiez que vous n'avez pas vidé le cache

## ✅ Test recommandé :

1. Testez d'abord avec "Vidéo de démo"
2. Puis testez avec une petite vidéo (< 5MB)
3. Enfin testez avec votre vidéo de 13MB

## 📱 Compatibilité :

- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Safari 16+
- ✅ Edge 120+
- ✅ Mobile Chrome/Safari

**Note :** Sur mobile, la conversion peut être plus lente.
