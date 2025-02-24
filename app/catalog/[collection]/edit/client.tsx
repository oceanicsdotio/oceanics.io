"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type FormEventHandler,
  useReducer,
} from "react";
import layout from "@app/layout.module.css";
import client from "@catalog/client.module.css";
import { useSearchParams } from "next/navigation";
import { type NodeLike, IMutate } from "@catalog/[collection]/client";
import { ACTIONS, messageQueueReducer, useWorkerFixtures } from "@catalog/client";
export function Edit<T extends NodeLike>({ Form, title }: IMutate<T>) {
  const query = useSearchParams();
  const uuid = query.get("uuid") ?? "";
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const formRef = useRef<HTMLFormElement>(null);
  /**
   * Status message to understand what is going on in the background.
   */
  const [messages, appendToQueue] = useReducer(messageQueueReducer, []);
  /**
   * Node data, if any.
   */
  const [initial, setInitial] = useState<T>({ uuid } as T);
  const [exists, setExists] = useState(false);
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getEntity:
          setInitial(data.value);
          setExists(true);
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        case ACTIONS.status:
          window.scrollTo({ top: 0, behavior: "smooth" });
          appendToQueue(data.message);
          return;
        default:
          console.warn("@client", type, data);
          return;
      }
    },
    []
  );
  /**
   * Ref to Web Worker.
   */
  const worker = useWorkerFixtures();
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.ref.current = new Worker(
      new URL("@catalog/[collection]/edit/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.ref.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    worker.post({
      type: ACTIONS.getEntity,
      data: {
        query: {
          left: title,
          left_uuid: uuid,
        },
      },
    });
    const handle = worker.ref.current;
    worker.setDisabled(false);
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  /**
   * Delete a resource
   */
  const onDelete = () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete this node and its relationships?"
    );
    if (!confirmation) return;
    worker.post({
      type: ACTIONS.deleteEntity,
      data: {
        query: {
          left: title,
          left_uuid: uuid,
        },
      },
    });
  };
  /**
   * Update allowed parameters
   */
  const onSubmit =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      const { uuid, ...data } = callback();
      worker.post({
        type: ACTIONS.updateEntity,
        data: {
          query: { left: title, left_uuid: uuid },
          body: JSON.stringify(data),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  return (
    <>
      <div className={client.messages}>
        {messages.toReversed().map((message: string) => <div>{message}</div>)}
      </div>
      <Form
        action={"Save"}
        formRef={formRef}
        initial={initial as T}
        disabled={worker.disabled||!exists}
        onSubmit={onSubmit}
      />
      <button
        className={layout.submit}
        onClick={onDelete}
        disabled={worker.disabled||!exists}
      >
        Delete
      </button>
    </>
  );
}
