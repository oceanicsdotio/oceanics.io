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
export default function useCollection(query: {
  left: string
  limit: number
  offset: number
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
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getCollection:
          setMessage(`✓ Found ${data.value.length}`);
          setCollection(data.value);
          window.scrollTo({top: 0, behavior: "smooth"});
          return;
        case ACTIONS.deleteEntity:
          setMessage(`✓ Deleted 1`);
          setCollection((previous: any[]) => {
            return previous.filter((each) => each.uuid !== data.uuid);
          });
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        default:
          console.warn("@client", type, data);
          return;
      }
    },
    []
  );
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user = localStorage.getItem("gotrue.user");
    if (typeof user !== "undefined") {
      worker.current.postMessage({
        type: ACTIONS.getCollection,
        data: {
          query,
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
  }, []);
  /**
   * Delete a resource
   */
  const onDelete = (left_uuid: string) => {
    if (!left_uuid) {
      console.warn("UUID is undefined during delete operation")
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to delete this node and its relationships?"
      )
    ) {
      return;
    }
    const user = localStorage.getItem("gotrue.user");
    worker.current?.postMessage({
      type: ACTIONS.deleteEntity,
      data: {
        query,
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
    onDelete,
  };
}
