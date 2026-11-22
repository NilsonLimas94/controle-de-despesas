/**
 * SERVICE WORKER DO FINPULSE (PWA OFFLINE-FIRST)
 * ----------------------------------------------
 * Garante funcionamento completo mesmo sem internet e atende
 * todos os requisitos do PWABuilder para geração de pacote instalável.
 */

const CACHE_NAME = 'finpulse-cache-v1';

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './style.css',
    './manifest.webmanifest',
    './js/main.js',
    './js/financeDomain.js',
    './js/storage.js',
    './js/dashboardCharts.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-192.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
];

// Instalação: pré-armazena todos os arquivos essenciais do app no cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Ativação: remove versões antigas do cache e assume controle imediato
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((oldKey) => caches.delete(oldKey))
                )
            )
            .then(() => self.clients.claim())
    );
});

// Interceptação de requisições: permite abrir e usar o app 100% offline
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // 1. Navegação principal: tenta rede primeiro; se offline, entrega o index.html do cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.ok) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 2. Arquivos do próprio app (Stale-While-Revalidate: responde rápido do cache e atualiza em segundo plano)
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const networkFetch = fetch(request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.ok) {
                            const copy = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                        }
                        return networkResponse;
                    })
                    .catch(() => cachedResponse);

                return cachedResponse || networkFetch;
            })
        );
        return;
    }

    // 3. Google Fonts (Cache-First: depois do primeiro acesso, a fonte também funciona offline)
    if (
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com'
    ) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.ok) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return networkResponse;
                });
            })
        );
    }
});
