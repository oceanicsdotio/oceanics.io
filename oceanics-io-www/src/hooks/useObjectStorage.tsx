/**
 * React friends.
 */
import { useEffect, useState } from "react";

/**
 * Dedicated Worker loader
 */
import type {FileSystem} from "../workers/shared";
import type {WorkerRef} from "../utils";
/**
 * The `useObjectStorage` hook provides a directory like structure
 * that describes assets in an S3-compatible storage service. 
 */
export const useObjectStorage = (
  target: string,
  worker: WorkerRef
) => {

  /**
   * Memoize the metadata for the assets in object storage
   */
  const [fileSystem, setFileSystem] = useState<FileSystem|null>(null);

  /**
   * Get the asset metadata from object storage service
   */
  useEffect(() => {
    if (!target || !worker.current) return;
    const message = {
      type: "index",
      url: target
    }
    worker.current.postMessage(message)
  }, [worker.current]);

  return fileSystem;
};

export default useObjectStorage;