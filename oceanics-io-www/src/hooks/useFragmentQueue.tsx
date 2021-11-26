/**
 * React friends
 */
import { useState, useEffect } from "react";
import type {Map} from "mapbox-gl"
import type {FileObject, WorkerRef} from "../workers/shared";
/**
 * Object storage hook
 */
import useObjectStorage from "./useObjectStorage";

/**
 * Storage target.
 */
const TARGET = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com";

/**
 * Point cloud prefix.
 */
const PREFIX = "MidcoastMaineMesh";

type IFragmentQueue = {
    worker: WorkerRef;
    map: Map|null;
}

/**
 * Encapsulate big data queued loading
 */
export const useFragmentQueue = ({
    worker,
    map
}: IFragmentQueue) => {
    /**
     * Retrieve S3 file system meta data. The `null` target prevents any HTTP request
     * from happening.
     */ 
    const fs = useObjectStorage(`${TARGET}?prefix=${PREFIX}/necofs_gom3_mesh/nodes/`, worker);
   
    /**
     * The queue is an array of remote data assets to fetch and process. 
     * 
     * Updating the queue triggers `useEffect` hooks depending on whether
     * visualization elements have been passed in or assigned externally.
     */
     const [ queue, setQueue ] = useState<FileObject[]>([]);

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
         if (!map || !worker.current || !queue.length) return;
 
         const key = queue[0].key;
 
         setQueue(queue.slice(1, queue.length));
 
         if (map.getLayer(`mesh-${key}`)) return;
 
         worker.current.postMessage({
             type: "getFragment",
             data: [TARGET, key, "UMass Dartmouth"]
         })

         // then listen .then((x) => {map.addLayer(x)});
        
     }, [ map, worker, queue ]);
}

export default useFragmentQueue