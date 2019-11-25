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


const mouse_events = (elementId, type="mousemove") => {
    let canvas = document.getElementById(elementId);
    canvas.addEventListener(type,  (event) => {
          const extent = canvas.getBoundingClientRect();
          mouse_move(event.clientX, event.clientY)
    });
};


const loadTileImageasync = (url, canvas) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener('load', function() {
      let can = document.getElementById(canvas);
      let ctx = can.getContext('2d');
      ctx.drawImage(img, 0,0, can.width, can.height);
      modify_canvas(can, ctx);
    }, false);
    img.src = url;
};

const runWASM = async () => {
    await init();
    console.log("Running...");
};


const loadGeoJSON = async (map, layers) => {
    return await Promise.all(layers.map(async ({render, behind}) => {
        render.source = {
            'type': 'geojson',
            'data': await fetch("spatial/" + render.id + ".json").then(r => r.json())
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
    });
});

