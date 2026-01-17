#!/bin/bash

echo "🚀 Déploiement de TIKTAK sur GitHub Pages..."

# Vérifier si on est dans un repo git
if [ ! -d ".git" ]; then
    echo "❌ Erreur: Ce n'est pas un repository Git!"
    echo "Initialisation du repo Git..."
    git init
    git add .
    git commit -m "Initial commit - TIKTAK app"
fi

# Ajouter tous les fichiers
git add .

# Commit des changements
git commit -m "Deploy TIKTAK v$(date +%Y%m%d_%H%M%S)"

# Push sur GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo "✅ Déploiement terminé!"
echo "🌐 Accédez à : https://votre-utilisateur.github.io/tiktak/"