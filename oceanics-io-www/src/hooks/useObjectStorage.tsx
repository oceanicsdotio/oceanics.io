/**
 * React friends.
 */
import { useEffect, useState } from "react";

/**
 * Dedicated Worker loader
 */
import type {FileSystem, WorkerRef} from "../workers/shared";
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
    worker.current.postMessage({
      type: "index",
      url: target
    })
  }, [worker]);

  return fileSystem;
};

export default useObjectStorage;