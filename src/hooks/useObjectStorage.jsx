import {useEffect, useState, useRef} from "react";
import Worker from "./useObjectStorage.worker.js";

/**
 * The `useObjectStorage` hook provides a directory like structure
 * that describes assets in an S3-compatible storage service. 
 */
export default ({
    target
}) => {

    /**
     * Memoize the metadata for the assets in object storage
     */
    const [ fileSystem, setFileSystem ] = useState(null);

    /**
     * Web worker reference for background tasks.
     */
    const worker = useRef(null);

    /**
     * Instantiate the web worker
     */
    useEffect(() => {
        if (!worker.current) worker.current = new Worker();
    }, []);
    
    /**
     * Get the asset metadata from object storage service
     */
    useEffect(() => {
        if (!target || !worker.current) return;
        worker.current
            .getFileSystem(target)
            .then(setFileSystem)
            .catch(err => {console.log(err)});        
    }, []);

    return fileSystem;
};