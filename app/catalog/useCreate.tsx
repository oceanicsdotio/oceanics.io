"use client";
import { type FormEventHandler, useEffect, useRef, useState } from "react";
/**
 * Web worker messages handled in this context.
 * The shared worker may understand/send other types.
 */
const ACTIONS = {
  createEntity: "createEntity",
  error: "error",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function useCreate({left}: {left: string}) {
  /**
   * Web Worker.
   */
  const worker = useRef<Worker | null>(null);
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const create = useRef<HTMLFormElement | null>(null)
  /**
   * Controls disabled until the worker is ready.
   */
  const [disabled, setDisabled] = useState(true);
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading")
  /**
   * Load Web Worker and perform startup on component mount.
   */
  useEffect(() => {
    worker.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        case ACTIONS.createEntity:
          console.log("@client", data.type, data.data);
          if (data.data) {
            create.current?.reset();
            setMessage("✓ Created 1")
          } else {
            setMessage("! Something Went Wrong")
          }
          return;
        case ACTIONS.error:
          console.error("@client", data.type, data.data);
          setMessage("! Something Went Wrong")
          return;
        default:
          console.warn("@client", data.type, data.data);
          return;
      }
    };
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const handle = worker.current;
    setDisabled(false);
    setMessage("✓ Ready");
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const onSubmit = (callback: any): FormEventHandler => (event) => {
    event.preventDefault();
    const user = localStorage.getItem("gotrue.user");
    worker.current?.postMessage({
      type: ACTIONS.createEntity,
      data: {
        query: { left },
        user,
        body: JSON.stringify(callback()),
      },
    });
    setMessage("↻ Working");
    window.scrollTo({top: 0, behavior: "smooth"});
  };

  return {
    worker,
    message,
    disabled,
    onSubmit,
    create
  }
}
