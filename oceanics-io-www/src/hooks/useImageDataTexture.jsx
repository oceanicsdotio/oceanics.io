/**
 * React friends.
 */
import { useEffect, useRef, useState } from "react";


import useWasmWorkers from "./useWasmWorkers";

/**
 * Re-usable logic for loading remote image as data source for GPGPU
 * processing
 */
export default ({
    source=null,
    metadataFile=null
}) => {

    /**
     * Load worker
     */
    const { worker } = useWasmWorkers();

    /**
     * Exported ref to draw textures to a secondary HTML canvas component
     */
    const preview = useRef(null);

    /**
     * Interpreting image formatted velocity data requires having
     * information about the range. 
     */
    const [ metadata, setMetadata ] = useState(null);

    /**
     * Fetch the metadata file. 
     */
    useEffect(() => {
        if (metadataFile && worker.current)
            worker.current.getPublicJsonData(metadataFile).then(setMetadata);
    }, [ worker ]);


    /**
     * Container for handles to GPU interface
     */
    const [ imageData, setImageData ] = useState(null);

    /**
     * Use external data as a velocity field to force movement of particles
     */
    useEffect(()=>{
        if (!source) return;
    
        const img = new Image();
        img.addEventListener('load', () => {
            setImageData(img);
        }, {
            capture: true,
            once: true,
        });
        img.crossOrigin = source.includes(".") ? "" : undefined;
        img.src = source;

    }, [ ]);

    /**
     * Display the wind data in a secondary 2D HTML canvas, for debugging
     * and interpretation. 
     */
    useEffect(() => {
        if (!preview || !preview.current || !imageData) return;
        preview.current.getContext("2d").drawImage(imageData, 0, 0, preview.current.width, preview.current.height);
    }, [ preview, imageData ]);

    /**
     * Terminate the worker once complete. For ling running App, this is necessary
     * because usually terminate on component unmount, and can crash browser if 
     * not cleaned up.
     */
    useEffect(() => {
        if (metadata && imageData && worker.current) worker.current.terminate();
    }, [ metadata, imageData ]);

    return {
        metadata,
        imageData,
        preview
    }
}