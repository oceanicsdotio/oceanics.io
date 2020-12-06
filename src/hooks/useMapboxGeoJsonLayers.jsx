import {useEffect, useState} from "react";


// Formatting function, generic to all providers
const Features = ({
    features,
    standard
}) => {
    switch(standard) {
        // ESRI does things their own special way.
        case "esri":
            return features
                .map(({
                    geometry: {x, y}, 
                    attributes
                }) => 
                    Object({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [x, y]
                        },
                        properties: attributes
                    }));
        // NOAA also does things their own special way
        case "noaa":
            return features
                .filter(x => "data" in x && "metadata" in x)
                .map(({
                    data: [head], 
                    metadata: {lon, lat, ...metadata}
                }) => 
                    Object({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [lon, lat]
                        },
                        properties: {...head, ...metadata}
                    }));
        // Otherwise let us hope it is GeoJSON and catch it up the stack
        default:
            return features;
    };
};

// Out ready for Mapbox as a Layer object description
const GeoJsonSource = ({
    features,
    standard,
    properties=null
}) => 
    Object({
        type: "geojson", 
        generateId: true,
        data: {
            type: "FeatureCollection",
            features: Features({
                features, 
                standard
            }),
            properties,
        }, 
    });

/**
Asynchronously retrieve the geospatial data files and parse them.

Skip this if the layer data has already been loaded, or if the map doesn't exist yet
*/

export default ({
    map,
    layers,
}) => {

    const [metadata, setMetadata] = useState([]);
    
    useEffect(() => {
        if (!map) return;
        const results = [];

        layers.forEach(({
            id,
            standard="geojson",
            url=null, 
            behind=null,
            popup=null, 
            ...layer
        }) => {
            fetch(url ? url : `/${id}.json`)
                .then(response => response.text())
                .then(text => JSON.parse(text))
                .then(({features}) => {
                    map.addLayer({
                        ...layer, 
                        id,
                        source: GeoJsonSource({
                            features, 
                            standard
                        })
                    });
                    results.push({id, behind});
            
                    if (popup) {
                        map.on('click', id, (e) => {popup(e).addTo(map)})
                    };   
                })
                .catch(err => {
                    console.log(`Error loading ${id}`, err);
                }); 
        }); 
        
        setMetadata(results);

    }, [map]);

    return {metadata};
};