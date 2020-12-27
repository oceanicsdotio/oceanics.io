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
export default ({map}) => {

    /**
     * Query for the first array fragment, and use metadata to loop through through the rest in the background
     */
    const [nextFragment, setNextFragment] = useState(null);
    useEffect(()=>{
        if (!map) return;
        fetch(`${hostname}?prefix=MidcoastMaineMesh&key=mesh_nodes`)
            .then(response => response.json())
            .then(({dataUrl, next, ...metadata}) => {
               
                const nodes = new Float32Array(Uint8Array.from(
                    window.atob(dataUrl.split("base64,").pop()), c => c.charCodeAt(0)
                ).buffer);

                setNextFragment(next);

                const {features} = nodes.reduce(
                    (acc, cur)=>{
                        acc.count = (acc.count + 1 )% 3;
                        if (!acc.count) acc.features.push([]); 
                        acc.features[acc.features.length].push(cur);
                        return acc;
                    },
                    {count: 0, features: []}
                );

                map.addLayer({
                    ...layer, 
                    id,
                    source: GeoJsonSource({
                        features
                    })
                });
                
                console.log("MeshQuery", {next, metadata});
            }
        )
    }, [map]);

    /**
     * Use the paging metadata fromt he first reques to sync the rest of the data. All of this should be cached by the browser
     */
    
    useEffect(()=>{

        if (!nextFragment) return;
        const [start, end] = nextFragment;
        const url = `${hostname}?prefix=MidcoastMaineMesh&key=mesh_nodes&start=${start}&end=${end}`;

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 3000);
            
        fetch(url, {signal: controller.signal})
            .then(response => response.json())
            .then(({dataUrl, next, ...metadata}) => {
               
                clearTimeout(id);

                const nodes = new Float32Array(Uint8Array.from(
                    window.atob(dataUrl.split("base64,").pop()), c => c.charCodeAt(0)
                ).buffer);

                setNextFragment(next);
                setMeshNodes([...meshNodes, ...nodes])

                console.log("MeshQuery", {next, metadata});
            });

    },[nextFragment]);

    return {meshNodes};
};