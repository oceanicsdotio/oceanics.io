/**
 * React friends.
 */
import { useEffect, useState } from "react";

/**
 * Dedicated Worker loader
 */
import Worker from "../workers/useObjectStorage.worker.js";
import useWorkers from "./useWorkers";

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
    const worker = useWorkers(Worker);

    /**
     * Get the asset metadata from object storage service
     */
    useEffect(() => {
        if (!target || !worker.current) return;
        worker.current.getFileSystem(target).then(setFileSystem)       
    }, [ worker ]);

    return fileSystem;
};