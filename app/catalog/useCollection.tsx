import { useEffect, useState, useRef, useCallback, type FormEventHandler } from "react";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const ACTIONS = {
  getCollection: "getCollection",
  deleteEntity: "deleteEntity",
  createEntity: "createEntity",
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
   * Node data, if any.
   */
  const [collection, setCollection] = useState<any[]>([]);
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const create = useRef<HTMLFormElement | null>(null);
  /**
   * Controls disabled until the worker is ready.
   */
  const [disabled, setDisabled] = useState(true);
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
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
        case ACTIONS.createEntity:
          console.log("@client", data.type, data.data);
          if (data.data) {
            create.current?.reset();
            setMessage("✓ Created 1");
          } else {
            setMessage("! Something Went Wrong");
          }
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
    setDisabled(false);
    // setMessage("✓ Ready");
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmitCreate =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      const user = localStorage.getItem("gotrue.user");
      worker.current?.postMessage({
        type: ACTIONS.createEntity,
        data: {
          query: { left: query.left },
          user,
          body: JSON.stringify(callback()),
        },
      });
      setMessage("↻ Working");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
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
    disabled,
    onSubmit: onSubmitCreate,
    create,
  };
}
