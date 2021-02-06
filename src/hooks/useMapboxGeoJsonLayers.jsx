import {useEffect, useState, useRef} from "react";
import Worker from "./useMapboxGeoJsonLayers.worker.js";


/**
 * Asynchronously retrieve geospatial data files and parse them in the background using a web worker.
 *
 * Skip loadingif the layer data has already been loaded, or if the map doesn't exist yet.
 */
export default ({
    map,
    layers
}) => {

    /**
     * Metadata for setting the rednering order of the layers.
     */
    const [metadata, setMetadata] = useState([]);


    /**
     * Extract the rendering order of the layers.
     */
    useEffect(()=>{
        if (!layers) return;
        setMetadata(
            layers
                .map(({behind, id}) => Object({behind, id}))
                .filter(({behind}) => typeof behind !== undefined)
        );
    },[layers]);

    
    /**
     * Web worker reference for background tasks.
     */
    const worker = useRef(null);


    /**
     * Instantiate the web worker, lazy load style
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    
    /**
     * Task the web worker with loading and transforming data to add
     * to the MapBox instance as a GeoJSON layer. 
     */
    useEffect(() => {
        if (!map || !layers || !worker.current) return;
       
        layers.forEach(({
            id,
            behind,
            standard="geojson",
            url=null,
            onClick=null, 
            ...layer
        }) => {
            // Guard against re-loading layers
            if (map.getLayer(id)) return;
            worker.current.getData(url, standard).then(source => {
                map.addLayer({id, source, ...layer});
                if (onClick) map.on('click', id, onClick);
            }).catch(err => {
                console.log(`Error loading ${id}`, err);
            });
        }); 

        return () => {worker.current.terminate()};
        
    }, [map, layers, worker]);


    return {metadata};
};