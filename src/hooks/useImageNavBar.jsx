import { useEffect, useState, useRef } from "react";

/**
 * Dedicated worker loader.
 */
import Worker from "./useBathysphereApi.worker.js";



/**
 * The catalog page is like a landing page to the api.
 * 
 * Routes from here correspond to entities and 
 * collections in the graph database.
 * 
 * If access token is set in React state, use it to get the catalog index from Bathysphere
 */
export default ({
    icons, 
    tiles
}) => {

    /**
     * Web worker reference for fetching and auth.
     */
    const worker = useRef(null);

    /**
     * Create worker. Must be inside Hook, or webpack will protest.
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    /**
     * Sorted items to render in interface
     */
    const [sorted, setSorted] = useState([]);

    /**
     * Use Web worker to do sorting
     */
    useEffect(()=>{
        if (worker.current)
            worker.current.sorted({icons, tiles}).then(setSorted);
    }, [ worker ]);
    
    return {
        navigate: event => {
            event.persist();
            worker.current.locationHash(event.target.value).then(hash => {
                location.hash = hash;
            });
        },
        sorted
    };
};
