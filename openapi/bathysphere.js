mapboxgl.accessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

fetch("https://graph.oceanics.io/faas/postgres?observedProperties=osi&x=-69.89196944&y=43.77643055", {mode: "cors"})
    .then(r => console.log(r));

let map = window.map = new mapboxgl.Map({
    container: 'map',
    zoom: 7,
    center: [-69, 44.25],
    style: {
        "version": 8,
        "name": "Dark",
        "sources": {
            "mapbox": {
                "type": "vector",
                "url": "mapbox://mapbox.mapbox-streets-v8"
            }
        },
        "sprite": "mapbox://sprites/mapbox/dark-v10",
        "glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
        "layers": [
            {
                "id": "background",
                "type": "background",
                "paint": {"background-color": "#222"}
            }, {
                "id": "water",
                "source": "mapbox",
                "source-layer": "water",
                "type": "fill-extrusion",
                "paint": {
                    "fill-extrusion-color": "#050707",
                    "fill-extrusion-height": 50.0,
                    "fill-extrusion-base": 0.0,
                }
            }, {
                "id": "cities",
                "source": "mapbox",
                "source-layer": "place_label",
                "type": "symbol",
                "layout": {
                    "text-field": "{name_en}",
                    "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
                    "text-size": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        4, 9,
                        6, 12
                    ]
                },
                "paint": {
                    "text-color": "#969696",
                    "text-halo-width": 2,
                    "text-halo-color": "rgba(0, 0, 0, 0.85)"
                }
            }
        ]
    },
    antialias: true // MSAA antialiasing
});

map.on('load', async function() {


    map.addSource("overlay", {
        "type": "image",
        "url": "spatial/osi-composite-web.png",
        "coordinates": [
            [-70.7495, 44.1929],
            [-67.8952, 44.1929],
            [-67.8952, 42.2156],
            [-70.7495, 42.2156]
        ]
    });


    map.addSource('suitability', {
        'type': 'geojson',
        'data': await (await fetch("spatial/geojson-test.json")).json()
    });

    map.addSource('nssp-closures', {
        'type': 'geojson',
        'data': await (await fetch("spatial/nssp-closures.json")).json()
    });

    map.addSource('maine-towns', {
        'type': 'geojson',
        'data': await (await fetch("spatial/maine-towns.json")).json()
    });

    map.addSource('limited-purpose-licenses', {
        'type': 'geojson',
        'data': await (await fetch("spatial/limited-purpose-licenses.json")).json()
    });

    map.addSource('aquaculture-leases', {
        'type': 'geojson',
        'data': await (await fetch("spatial/aquaculture-leases.json")).json()
    });

    map.addLayer({
        'id': 'limited-purpose-licenses',
        'type': 'circle',
        'source': 'limited-purpose-licenses',
        "paint": {
            'circle-radius': {
                stops: [[8, 1], [12, 4], [16, 10]]
            },
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#0ff"
        },
    }, "cities");

    map.addLayer({
        'id': 'aggregation',
        'type': 'circle',
        'source': 'suitability',
        "paint": {
            'circle-radius': {
                stops: [[8, 2], [12, 8], [16, 20]]
            },
            "circle-color": "rgba(0,0,0,0)",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        },
    }, "limited-purpose-licenses");

    map.addLayer({
        'id': 'nssp-closures',
        'type': 'line',
        'source': 'nssp-closures',
        "paint": {
            "line-color": "#f0f",
            "line-opacity": 0.5,
        },
    }, "aggregation");


    map.addLayer({
        'id': 'aquaculture-leases',
        'type': 'line',
        'source': 'aquaculture-leases',
        "paint": {
            "line-color": "#00FF99",
            "line-opacity": 0.75,
        },
    }, "aggregation");


    map.addLayer({
        'id': 'maine-towns',
        'type': 'line',
        'source': 'maine-towns',
        "paint": {
            "line-color": "rgba(255,255,255,0.5)",
        },
    }, "aquaculture-leases");

    map.addLayer({
            "id": "osi-composite",
            "source": "overlay",
            "type": "raster",
            "paint": {
                "raster-opacity": 0.5
            }
    }, 'maine-towns');

    let popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: true
    });

    const parseSpecies = function (string) {
        const items = string
            .replace('and', ',')
            .replace(';', ',')
            .split(',')
            .map(s => '<li>'+s.trim()+'</li>')
            .join('');
        return '<ol>' + items + '</ol>'
    };


    map.on('mouseenter', 'limited-purpose-licenses', function(e) {
        map.getCanvas().style.cursor = 'pointer';
        let coordinates = e.features[0].geometry.coordinates.slice();
        let species = e.features[0].properties.species;
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        popup.setLngLat(coordinates)
             .setHTML(parseSpecies(species))
             .addTo(map);
    });

    map.on('mouseleave', 'limited-purpose-licenses', function() {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });

});