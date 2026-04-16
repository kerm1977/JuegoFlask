const CACHE_NAME = 'latribu-pwa-v6';

// CORRECCIÓN DEFINITIVA: 
// Solo cachear archivos ESTÁTICOS puros. 
// Las rutas HTML (como /login o /dashboard) se cachearán dinámicamente al navegar
// para evitar que los redireccionamientos (302) de Flask rompan la instalación.
const ASSETS_TO_CACHE = [
    '/static/css/main.css',
    '/static/js/auth.js',
    '/static/js/lobby.js',
    '/static/js/game.js',
    '/static/js/network.js',
    '/manifest.json',
    '/static/icon-192.png',
    '/static/icon-512.png'
];

// Instalación: Forzar que tome el control inmediatamente
self.addEventListener('install', event => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caché abierto. Guardando archivos críticos para PWA Nativa.');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(err => console.error("Error crítico al cachear (Bloqueaba el WebAPK):", err))
    );
});

// Activación y limpieza de caché vieja
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Estrategia Network First
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.url.includes('/socket.io/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});