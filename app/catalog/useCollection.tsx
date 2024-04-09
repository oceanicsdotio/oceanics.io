import { useEffect, useState, useRef, useCallback } from "react";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getCollection: "getCollection",
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
    const user_data = localStorage.getItem("gotrue.user");
    if (typeof user_data !== "undefined") {
      worker.current.postMessage({
        type: ACTIONS.getCollection,
        data: {
          left,
          user: user_data,
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
   * Client Component
   */
  return {
    collection,
    message
  };
}
