// Názov cache a verzia. Zmeňte verziu, keď chcete aktualizovať cachované súbory.
const CACHE_NAME = 'cashew-skener-cache-v1';

// Zoznam súborov, ktoré sa majú predcachovať počas inštalácie
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // Externé knižnice
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  'https://unpkg.com/html5-qrcode',
  // Ikonky (ak ich máte podľa manifestu)
  '/icons/icon-192x192.png',
  // Pridajte ďalšie assety (fonty, obrázky, atď.)
];

// Počúvanie udalosti 'install' - volá sa pri prvej inštalácii PWA
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Inštalácia...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pred-cachovanie aplikácie.');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Chyba pri pred-cachovaní:', error);
      })
  );
});

// Počúvanie udalosti 'activate' - čistí staré verzie cache
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Aktivácia...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] Mazanie starej cache: ', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Zabezpečí, že Service Worker prevezme kontrolu nad klientmi ihneď po aktivácii
  return self.clients.claim(); 
});

// Počúvanie udalosti 'fetch' - presmerováva sieťové požiadavky
self.addEventListener('fetch', (event) => {
  // Pre API Finančnej správy by sme nemali používať cache (vždy chceme čerstvé dáta)
  if (event.request.url.includes('ekasa.financnasprava.sk/mdu/api')) {
    // Necháme sieť spracovať požiadavku bežným spôsobom (Network Only)
    return; 
  }
  
  // Pre statické assety (HTML, JS, CSS, obrázky) použijeme stratégiu Cache-First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Ak je v cache, vrátime z cache
        if (response) {
          return response;
        }
        // Ak nie je v cache, ideme na sieť a výsledok uložíme do cache pre budúce použitie
        return fetch(event.request).then(
            (response) => {
                if(!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                
                return response;
            }
        );
      })
      .catch((error) => {
        // Tu by sa dala pridať custom offline stránka
        console.error('Fetch zlyhal (pre statický asset):', error);
      })
  );
});