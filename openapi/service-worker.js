let CACHE_NAME = 'bathysphere';
let urlsToCache = [
    './spatial/osi-composite-web.png',
    './spatial/limited-purpose-licenses.json',
    './spatial/aquaculture-leases.json',
    './spatial/maine-towns.json',
    './spatial/nssp-closures.json',
    './spatial/suitability.json',
    './style.json',
    './bathysphere.png',
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
        caches.match(event.request)
              .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          r => {
            // if(!response || response.status !== 200 || response.type !== 'basic') {
            //   return response;
            // }
            // let responseToCache = response.clone();
            // caches.open(CACHE_NAME)
            //   .then(function(cache) {
            //     cache.put(event.request, responseToCache);
            //   });
            return r;
          }
        );
      })

    );
});
