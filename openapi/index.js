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


const loadTileImage = (url, canvas) => {
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


const menu = () => {
    /*
    Generate an entity expansion menu from a database query.
    */
    const b = document.getElementById("bathysphere");
    const p = document.createElement("div");
    p.className = "menu";
    b.appendChild(p);

    const entries = ["Things", "Locations"];
    const links = entries.map(key => "localhost/api/" + key);
    let drop = document.createElement("select");
    drop.onchange = "";
    drop.name = "value";

    for (let ii = 0; ii < entries.length; ii++) {
        let option = document.createElement("option");
        option.appendChild(document.createTextNode(entries[ii]));
        option.value = links[ii];
        drop.appendChild(option);
    }

    let f = document.createElement("form");
    f.action = "/api/";
    f.method = "get";
    f.target = "_blank";  // do not refresh window
    f.appendChild(drop);
    b.appendChild(p);
    p.appendChild(document.createElement("li").appendChild(f));

};

let hoveredStateId =  null;
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


});

const drag = (text) => {
  //
  // let div = document.getElementById("card");

  let div = document.createElement("div");
  div.className = "card";


  let handle = document.createElement("div");
  handle.className = "cardheader";
  //
  // let content = document.createElement("p");
  // content.textContent = "Some descriptive information for you.";

  let pos1 = div.style.left;
  let pos2 = div.style.top;
  let pos3 = 0;
  let pos4 = 0;

  handle.onmousedown = (e) => {
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = () => {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    };
    document.onmousemove = (e) => {
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        div.style.top = (div.offsetTop - pos2) + "px";
        div.style.left = (div.offsetLeft - pos1) + "px";
      };
  };

  div.appendChild(handle);
  let content = document.createElement("p");
  content.textContent = text;
  div.appendChild(content);
  document.body.appendChild(div);

};


menu();