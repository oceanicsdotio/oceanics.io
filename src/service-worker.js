let CACHE_NAME = 'bathysphere';
let urlsToCache = [
    '/osi-composite-web.png',
    '/limited-purpose-licenses.json',
    '/aquaculture-leases.json',
    '/maine-towns.json',
    '/nssp-closures.json',
    '/suitability.json'
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches
            .match(event.request)
            .then(response => {
                if (response) return response; // Cache hit - return response
                return fetch(event.request).then(r => {
                    // if(!response || response.status !== 200 || response.type !== 'basic') {
                    //   return response;
                    // }
                    // let responseToCache = response.clone();
                    // caches.open(CACHE_NAME)
                    //   .then(function(cache) {
                    //     cache.put(event.request, responseToCache);
                    //   });
                    return r;
                });
            })
    );
});
