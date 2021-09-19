/**
 * React friends.
 */
import { useEffect, useState, useRef } from "react";

/**
 * Dedicated Worker loader
 */
import ObjectStorageWorker from "worker-loader!../workers/useObjectStorage.worker.js";

/**
 * The `useObjectStorage` hook provides a directory like structure
 * that describes assets in an S3-compatible storage service. 
 */
export default (
  target: string
) => {

  /**
   * Memoize the metadata for the assets in object storage
   */
  const [fileSystem, setFileSystem] = useState(null);

  /**
   * Instantiate web worker reference for background tasks.
   */
  const worker: any = useRef(null);

  /**
   * Create worker, and terminate it when the component unmounts.
   * 
   * I suspect that this was contributing to performance degradation in
   * long running sessions. 
   */
  useEffect(() => {
    if (!Worker) {
      console.log("Cannot create workers, no loader provided")
      return
    }
    worker.current = new ObjectStorageWorker();
    return () => {
      if (worker.current) worker.current.terminate();
    }
  }, []);

  /**
   * Get the asset metadata from object storage service
   */
  useEffect(() => {
    if (!target || !worker.current) return;
    worker.current.getFileSystem(target).then(setFileSystem)
  }, [worker]);

  return fileSystem;
};