import {useEffect, useState} from "react";
import {GeoJsonSource} from "./useMapboxGeoJsonLayers";


const hostname = "https://www.oceanics.io/api/mesh-nodes";


/**
 * Highlight layers
 * When the cursor position intersects with the space
 * defined by a feature set, set the hover state to true.
 * 
 * When the cursor no longer intersects the shapes, stop
 * highlighting the features. 
 */
export default ({map, timeout=3000}) => {
  
    const [nextFragment, setNextFragment] = useState(null);
    /**
     *  Query for the first array fragment, and use metadata to loop through through the rest in the background
     * Use the paging metadata fromt he first reques to sync the rest of the data. All of this should be cached by the browser
     */
    useEffect(()=>{
        if (!map) return;

        const url = `${hostname}?prefix=MidcoastMaineMesh&key=mesh_nodes` + 
            (nextFragment ? `&start=${nextFragment[0]}&end=${nextFragment[1]}` : ``);
        
        // const controller = new AbortController();
        // const id = setTimeout(() => controller.abort(), timeout);
            
        fetch(
            url, 
            // {signal: controller.signal}
        )
            .then(response => response.json())
            .then(({dataUrl, next, key}) => {
                // clearTimeout(id);
                const nodes = new Float32Array(Uint8Array.from(
                    window.atob(dataUrl.split("base64,").pop()), c => c.charCodeAt(0)
                ).buffer);
            
            
                const {features} = nodes.reduce(
                    (acc, cur)=>{
                        if (!acc.count) acc.features.push([]); 
                        acc.features[acc.features.length-1].push(cur);
                        acc.count = (acc.count + 1 ) % 3;
                        return acc;
                    },
                    {count: 0, features: []}
                );

                const id = `midcoast-maine-mesh-${key.split("/").pop()}`;
                if (map.getLayer(id)) return;
                
                map.addLayer({
                    id,
                    type: "circle",
                    paint: {
                        "circle-radius":  {stops: [[0, 0.1], [22, 1]]},
                        "circle-stroke-width": 1,
                        "circle-stroke-color": "rgba(255,255,0,0.4)",
                    },
                    source: GeoJsonSource({
                        features: features.map(coordinates => Object({geometry: {type: "Point", coordinates}}))
                    })
                });

            
                setNextFragment(next);
            });

    },[map, nextFragment]);

};