// sw.js — SERVICE WORKER DI PULIZIA ("kill switch"), v27.
//
// Perché esiste: alcune installazioni della PWA erano rimaste agganciate a un
// vecchio service worker che serviva dalla cache una versione sorpassata
// dell'app, impedendo di vedere gli aggiornamenti.
//
// Cosa fa: appena il browser scarica questo file come aggiornamento della
// registrazione esistente, questo SW svuota tutte le cache, si disinstalla da
// solo e ricarica le schede aperte. Da lì in poi l'app torna a caricarsi
// sempre dalla rete (nessun handler fetch), quindi gli aggiornamenti arrivano
// subito a ogni pubblicazione. L'utente non deve fare nulla a mano.
const VERSION = 'kill-v27';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // 1) svuota tutte le cache lasciate dai service worker precedenti
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (err) {}
    // 2) disinstalla questo service worker
    try { await self.registration.unregister(); } catch (err) {}
    // 3) ricarica le schede aperte → si ricaricano fresche, senza service worker
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(c => { try { c.navigate(c.url); } catch (err) {} });
    } catch (err) {}
  })());
});

// Nessun handler 'fetch': tutte le richieste vanno direttamente in rete.
