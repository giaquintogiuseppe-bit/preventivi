// sw.js — service worker dell'app Amministrazione 81|00, v28.
//
// Obiettivi:
//  - AVVIO RAPIDO: il "guscio" dell'app (HTML, icone, librerie) può arrivare
//    dalla cache, così l'apertura non riscarica tutto da zero ogni volta.
//  - DATI SEMPRE FRESCHI: le chiamate a Supabase e Google non vengono mai messe
//    in cache; passano sempre dalla rete.
//  - AGGIORNAMENTO AUTOMATICO: quando esce una nuova versione, l'app se ne
//    accorge e si ricarica da sola (registrazione lato pagina in index.html).
//
// Strategia pagina: "network-first con timeout" — se la rete risponde entro
// pochi secondi si usa la versione fresca; se è lenta o assente si usa la copia
// in cache (apertura comunque rapida e funzionante offline).
const CACHE = 'otto8100-amm-v28';
const PRECACHE = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  })());
});

// La pagina chiede l'attivazione immediata della nuova versione (vedi index.html).
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // dati e servizi: sempre dalla rete, mai in cache
  if (url.hostname.includes('supabase') || url.hostname.includes('google') ||
      url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) return;

  const isPagina = e.request.mode === 'navigate' ||
    url.pathname.endsWith('index.html') || url.pathname.endsWith('/');

  if (isPagina) {
    e.respondWith((async () => {
      try {
        const net = await Promise.race([
          fetch(e.request),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500))
        ]);
        if (net && net.status === 200) {
          const clone = net.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return net;
        }
        return (await caches.match(e.request)) || (await caches.match('./index.html')) || net;
      } catch (err) {
        return (await caches.match(e.request)) || (await caches.match('./index.html')) || fetch(e.request);
      }
    })());
    return;
  }

  // altri file statici (icone locali, eventuali librerie CDN): stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const rete = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || rete;
    })
  );
});
