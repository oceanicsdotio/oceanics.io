// import init, { mouse_move, modify_canvas } from 'wasm/bathysphere.js';
mapboxgl.accessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

//
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./service-worker.js').then(function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}


const loadGeoJSON = async (map, layers) => {
    return await Promise.all(layers.map(async ({render, behind}) => {
        render.source = {
            'type': 'geojson',
            'data': await fetch("spatial/" + render.id + ".json").then(r => r.json()),
            'generateId': true,
        };
        map.addLayer(render);
        return {layer: render.id, behind}
    }));
};

const addFeatureEvent = (mapbox) => {

    mapbox.on('mouseenter', 'limited-purpose-licenses', function(e) {
        mapbox.getCanvas().style.cursor = 'pointer';
        let coordinates = e.features[0].geometry.coordinates.slice();
        let species = e.features[0].properties.species;
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        popup.setLngLat(coordinates)
             .setHTML(parseSpecies(species))
             .addTo(map);
    });

    mapbox.on('mouseleave', 'limited-purpose-licenses', function() {
        mapbox.getCanvas().style.cursor = '';
        popup.remove();
    });
};


const addHighlightEvent = (mapbox, layer) => {

    let featureId = null;

    mapbox.on('mouseenter', layer, function(e) {
        featureId = e.features[0].id;
        map.setFeatureState({source: layer, id: featureId}, { hover: true});
    });

    mapbox.on('mouseleave', layer, function() {
        map.setFeatureState({source: layer, id: featureId}, { hover: false});
        featureId = null;
    });
};


const popup = new mapboxgl.Popup({
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

let hoveredStateId =  null;
let radius = 0;

fetch("style.json")
.then(r => r.json())
.then(style => {
    window.map = new mapboxgl.Map({
        container: 'map',
        zoom: 7,
        bearing: 45,
        center: [-69, 44.25],
        style: style,
        antialias: true
    });
    return window.map
})
.then(map => {
    map.on('load', async () => {
        const layers = await fetch("layers.json").then(r => r.json());
        (await loadGeoJSON(map, layers.json)).map(({layer, behind}) => map.moveLayer(layer, behind));
        layers.image.map(({render, behind}) => map.addLayer(render, behind));
        addFeatureEvent(map);
        addHighlightEvent(map, "nssp-closures");
        addHighlightEvent(map, "maine-towns");
    });
    return map;
})
.then(map => {
    setInterval(() => {
        const period = 64;
        let base = radius/16 ;
        radius = (++radius)%period;
        map.setPaintProperty(
            'limited-purpose-licenses',
            'circle-radius', {
                "stops": [[base, 1], [base, 10]]
            });
    }, 10);
});
