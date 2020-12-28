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
export default ({
    map, 
    key, 
    extension,
    color="rgba(255,255,0,0.2)"
}) => {
  
    const [nextFragment, setNextFragment] = useState(null);
    /**
     *  Query for the first array fragment, and use metadata to loop through through the rest in the background
     * Use the paging metadata fromt he first reques to sync the rest of the data. All of this should be cached by the browser
     */
    useEffect(()=>{
        if (!map) return;

        const url = `${hostname}?prefix=MidcoastMaineMesh&key=${key}&extension=${extension}` + 
            (nextFragment ? `&start=${nextFragment[0]}&end=${nextFragment[1]}` : ``);
        
        // const controller = new AbortController();
        // const id = setTimeout(() => controller.abort(), timeout);
            
        fetch(
            url, 
            // {signal: controller.signal}
        )
            .then(response => response.json())
            .then(({dataUrl, next, key}) => {

                const id = `mesh-${key}`;

                if (map.getLayer(id)) return;

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

                const MAX_VALUE = 5200;
                const logNormal = (x, m=0, s=1.0) => {
                    return (1/s/x/Math.sqrt(2*Math.PI)*Math.exp(-1*(Math.log(x)-m)**2 / (2 * s**2)));
                };
            
                map.addLayer({
                    id,
                    type: "circle",
                    paint: {
                        "circle-radius":  {stops: [[0, 0.1], [22, 1]]},
                        "circle-stroke-width": 1,
                        "circle-stroke-color": [
                            "rgba",
                            ["*", 127, ["get", "q"]],
                            ["*", 127, ["get", "ln"]],
                            ["*", 127, ["-", 1, ["get", "q"]]],
                            0.5
                        ]
                    },
                    source: GeoJsonSource({
                        features: features.map(coordinates => Object({
                            geometry: {type: "Point", coordinates},
                            properties: {
                                q: (((100 + coordinates[2]) / MAX_VALUE) - 1)**2,
                                ln: logNormal((100 + coordinates[2]) / MAX_VALUE, 0.0, 1.5)
                            }
                        }))
                    })
                });
                setNextFragment(next);
            });

    },[map, nextFragment]);

};