/**
 * React friends.
 */
import { useEffect, useRef, useState } from "react";
import type {MutableRefObject} from "react"


type IImageData = {
    source?: string;
    metadataFile?: string;
    worker: MutableRefObject<SharedWorker|null>;
};

/**
 * Re-usable logic for loading remote image as data source for GPGPU
 * processing
 */
export const useImageDataTexture = ({
    source="",
    metadataFile="",
    worker
}: IImageData) => {

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
        if (!metadataFile || !worker.current) return
            
        worker.current.port.postMessage({
            type: "getPublicJsonData",
            data: metadataFile
        });

        // TODO: then(setMetadata)
    }, [ worker ]);


    /**
     * Container for handles to GPU interface
     */
    const [ imageData, setImageData ] = useState<HTMLImageElement|null>(null);

    /**
     * Use external data as a velocity field to force movement of particles
     */
    useEffect(()=>{
        if (!source) return;
    
        const img = new Image();
        img.addEventListener("load", () => {
            setImageData(img);
        }, {
            capture: true,
            once: true,
        });
        img.crossOrigin = source.includes(".") ? "" : null;
        img.src = source;

    }, [ ]);

    /**
     * Display the wind data in a secondary 2D HTML canvas, for debugging
     * and interpretation. 
     */
    useEffect(() => {
        if (!preview || !preview.current || !imageData) return;
        const canvas: HTMLCanvasElement = preview.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw TypeError("Canvas Rendering Context is Null");
        }
        ctx.drawImage(imageData, 0, 0, canvas.width, canvas.height);
    }, [ preview, imageData ]);

    /**
     * Terminate the worker once complete. For ling running App, this is necessary
     * because usually terminate on component unmount, and can crash browser if 
     * not cleaned up.
     */
    useEffect(() => {
        if (metadata && imageData && worker.current) worker.current.port.close();
    }, [ metadata, imageData ]);

    return {
        metadata,
        imageData,
        preview
    }
}

export default useImageDataTexture