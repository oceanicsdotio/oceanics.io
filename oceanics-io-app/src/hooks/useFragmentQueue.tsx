/**
 * React friends
 */
import { useState, useEffect } from "react";

/**
 * Object storage hook
 */
import useObjectStorage from "../hooks/useObjectStorage";

/**
 * Storage target.
 */
const TARGET = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com";

/**
 * Point cloud prefix.
 */
const PREFIX = "MidcoastMaineMesh";

type IFragmentQueue = {
    worker: any;
    map: any;
}

/**
 * Encapsulate big data queued loading
 */
export default ({
    worker,
    map
}) => {


    /**
     * Retrieve S3 file system meta data. The `null` target prevents any HTTP request
     * from happening.
     */ 
    const fs = useObjectStorage({target: `${TARGET}?prefix=${PREFIX}/necofs_gom3_mesh/nodes/`});
 
   
    /**
     * The queue is an array of remote data assets to fetch and process. 
     * 
     * Updating the queue triggers `useEffect` hooks depending on whether
     * visualization elements have been passed in or assigned externally.
     */
     const [ queue, setQueue ] = useState([]);


     /**
      * By default set the queue to the fragments listed in the response
      * from S3 object storage queries.
      */
     useEffect(()=>{
         if (fs) setQueue(fs.objects.filter(x => !x.key.includes("undefined")));
     }, [ fs ]);
 
 
     /**
      * Request all NECOFS fragments sequentially. 
      * 
      * All of this should be cached by the browser
      */
     useEffect(()=>{
         if (!map || !worker.current || !meshQueue.length) return;
 
         const key = meshQueue[0].key;
 
         setMeshQueue(meshQueue.slice(1, meshQueue.length));
 
         if (map.getLayer(`mesh-${key}`)) return;
 
         worker.current
             .getFragment(TARGET, key, "UMass Dartmouth")
             .then(x => {map.addLayer(x)});
        
     }, [ map, worker, meshQueue ]);
}