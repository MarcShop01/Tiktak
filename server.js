const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://www.gstatic.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            mediaSrc: ["'self'", "https:", "blob:"],
            connectSrc: ["'self'", "https:", "wss:", "ws:"]
        }
    }
}));
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    setHeaders: (res, filepath) => {
        if (path.extname(filepath) === '.html') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// Sitemap pour le SEO
app.get('/sitemap.xml', (req, res) => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
            <loc>http://${HOST}:${PORT}/</loc>
            <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
            <changefreq>daily</changefreq>
            <priority>1.0</priority>
        </url>
        <url>
            <loc>http://${HOST}:${PORT}/#explore</loc>
            <changefreq>daily</changefreq>
            <priority>0.8</priority>
        </url>
        <url>
            <loc>http://${HOST}:${PORT}/#trending</loc>
            <changefreq>hourly</changefreq>
            <priority>0.9</priority>
        </url>
    </urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: http://${HOST}:${PORT}/sitemap.xml`;
    
    res.type('text/plain');
    res.send(robots);
});

// API de test (simulée)
app.get('/api/test', (req, res) => {
    res.json({
        status: 'ok',
        message: 'TikTok Clone API',
        version: '1.0.0',
        firebase: {
            projectId: 'tiktak-97036',
            status: 'connected'
        }
    });
});

// Route principale (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, HOST, () => {
    console.log(`🚀 Serveur TikTok Clone démarré sur http://${HOST}:${PORT}`);
    console.log(`📄 Sitemap: http://${HOST}:${PORT}/sitemap.xml`);
    console.log(`🔍 Test API: http://${HOST}:${PORT}/api/test`);
    console.log(`🔥 Firebase: tiktak-97036`);
});