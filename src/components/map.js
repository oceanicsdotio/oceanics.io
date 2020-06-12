import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const styles = {
  width: "100vw",
  height: "100vh",
  position: "absolute"
};

const loadGeoJSON = async (map, layers) => {
  return await Promise.all(layers.map(async ({render, behind}) => {
      try {
        render.source = {
            'type': 'geojson',
            'data': await fetch("/" + render.id + ".json").then(r => r.json()),
            'generateId': true,
        };
      } catch {
        console.log("Error fetching /" + render.id + ".json");
        return {layer: null, behind: null};
      }
      map.addLayer(render);
      return {layer: render.id, behind};
  }));
};


const addFeatureEvent = (map) => {

  const popup = new map.Popup({
    closeButton: false,
    closeOnClick: true
  }); 

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
};


const addHighlightEvent = (map, layer) => {

  let featureId = null;

  map.on('mouseenter', layer, function(e) {
      featureId = e.features[0].id;
      map.setFeatureState({source: layer, id: featureId}, { hover: true});
  });

  map.on('mouseleave', layer, function() {
      map.setFeatureState({source: layer, id: featureId}, { hover: false});
      featureId = null;
  });
};


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

const Map = () => {
  const [map, setMap] = useState(null);
  const mapContainer = useRef(null);

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';
    const initializeMap = async ({ setMap, mapContainer }) => {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: await fetch("/style.json").then(r => r.json()),
        bearing: -30,
        center: [-69, 44],
        zoom: 7,
        antialias: true,
      });

      map.on("load", async () => {
        setMap(map);
        map.resize();

        console.log("Adding map onLoad event handler...");
        const layers = await fetch("/layers.json").then(r => r.json());
        console.log("Successfully loaded layers JSON manifest.");
        (await loadGeoJSON(map, layers.json)).map(({layer, behind}) => map.moveLayer(layer, behind));
        console.log("Successfully loaded GeoJSON layers.");
        layers.image.map(({render, behind}) => map.addLayer(render, behind));
        addFeatureEvent(map);
        addHighlightEvent(map, "nssp-closures");
        addHighlightEvent(map, "maine-towns");
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
    };

    if (!map) initializeMap({ setMap, mapContainer });
  }, [map]);

  return <div ref={el => (mapContainer.current = el)} style={styles} />;
};

export default Map;