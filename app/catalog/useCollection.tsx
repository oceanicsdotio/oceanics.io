import { deleteEntity } from "@oceanics/app";
import { useEffect, useState, useRef, useCallback } from "react";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getCollection: "getCollection",
  deleteEntity: "deleteEntity",
  error: "error",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function useCollection({
    left
}: {
    left: string
}) {
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node data.
   */
  let [collection, setCollection] = useState<any[]>([]);
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("↻ Searching");
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(({ data: {data, type} }: MessageEvent) => {
    switch (type) {
      case ACTIONS.getCollection:
        setCollection(data.value);
        setMessage(`✓ Found ${data.value.length}`);
        return;
      case ACTIONS.error:
        console.error("worker", type, data);
        return;
      default:
        console.warn("client", type, data);
        return;
    }
  }, []);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(new URL("@catalog/worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user = localStorage.getItem("gotrue.user");
    if (typeof user !== "undefined") {
      worker.current.postMessage({
        type: ACTIONS.getCollection,
        data: {
          left,
          user,
        },
      });
    } else {
      console.error("User is not logged in.");
    }
    const handle = worker.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [workerMessageHandler, left]);
    /**
   * Delete a resource
   */
    const onDelete = (uuid: string) => {
      const user = localStorage.getItem("gotrue.user");
      worker.current?.postMessage({
        type: ACTIONS.deleteEntity,
        data: {
          left,
          left_uuid: uuid,
          user,
        },
      });
    };
  /**
   * Client Component
   */
  return {
    collection,
    message,
    worker,
    onDelete
  };
}
