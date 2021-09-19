/**
 * React friends.
 */
import { MutableRefObject } from "hoist-non-react-statics/node_modules/@types/react";
import { useEffect, useState, useRef } from "react";

/**
 * Dedicated Worker loader
 */
import ObjectStorageWorker from "worker-loader!../workers/useObjectStorage.worker.ts";
import type {FileSystem} from "../workers/useObjectStorage.worker";
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
  const [fileSystem, setFileSystem] = useState<FileSystem|null>(null);

  /**
   * Instantiate web worker reference for background tasks.
   */
  const worker: MutableRefObject<ObjectStorageWorker|null> = useRef(null);

  /**
   * Create worker, and terminate it when the component unmounts.
   * 
   * I suspect that this was contributing to performance degradation in
   * long running sessions. 
   */
  useEffect(() => {
    if (!ObjectStorageWorker) {
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
    //@ts-ignore
    worker.current.getFileSystem(target).then(setFileSystem)
  }, [worker]);

  return fileSystem;
};