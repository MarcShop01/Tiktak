// Initialisation améliorée de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TIKTAK - Initialisation...');
    
    // Vérifier la compatibilité du navigateur
    if (!('localStorage' in window)) {
        alert('Votre navigateur ne supporte pas le stockage local. L\'application ne fonctionnera pas correctement.');
        return;
    }
    
    // Détecter la taille de l'écran
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        document.body.classList.add('mobile');
    }
    
    // Vérifier la connexion internet
    window.addEventListener('online', function() {
        showNotification('Connexion internet rétablie ✅', 'success');
    });
    
    window.addEventListener('offline', function() {
        showNotification('Vous êtes hors ligne 🌐', 'warning');
    });
    
    // Prévenir la fermeture si des données non sauvegardées
    window.addEventListener('beforeunload', function(e) {
        // Vous pouvez ajouter une vérification pour les données non sauvegardées
        // e.preventDefault();
        // e.returnValue = '';
    });
    
    // Initialiser les tooltips
    initializeTooltips();
    
    console.log('✅ Initialisation terminée');
});

function initializeTooltips() {
    // Initialiser les tooltips personnalisés
    document.addEventListener('mouseover', function(e) {
        const target = e.target;
        if (target.hasAttribute('data-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.textContent = target.getAttribute('data-tooltip');
            document.body.appendChild(tooltip);
            
            const rect = target.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
            
            target._tooltip = tooltip;
        }
    });
    
    document.addEventListener('mouseout', function(e) {
        const target = e.target;
        if (target._tooltip) {
            target._tooltip.remove();
            delete target._tooltip;
        }
    });
}

// Fonction helper pour les notifications
function showNotification(message, type = 'info') {
    // Utilisez la fonction existante de script.js
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback simple
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px;
            border-radius: 10px;
            z-index: 10000;
            animation: slideIn 0.3s;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Gestionnaire d'erreurs global
window.addEventListener('error', function(e) {
    console.error('Erreur globale:', e.error);
    showNotification('Une erreur est survenue. Veuillez rafraîchir la page.', 'error');
});

// Gestionnaire pour les promesses non catchées
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesse non catchée:', e.reason);
    showNotification('Erreur système. Veuillez réessayer.', 'error');
});
