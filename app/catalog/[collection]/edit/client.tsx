"use client";
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  type FormEventHandler,
} from "react";
import style from "@catalog/page.module.css";
import { useSearchParams } from "next/navigation";
import { type NodeLike, IMutate} from "@catalog/[collection]/client"
import {ACTIONS, useWorkerFixtures} from "@catalog/client"

export function Edit<T extends NodeLike>({Form, title}: IMutate<T>) {
  const action = "Update"
  const query = useSearchParams();
  const uuid = query.get("uuid") ?? "";
  /**
   * Form handle, used to reset inputs on successful submission,
   * as reported through the worker message.
   */
  const formRef = useRef<HTMLFormElement | null>(null);
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  /**
   * Node or index data, if any.
   */
  const [collection, setCollection] = useState<T[]>([]);
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getEntity:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCollection(data.value);
          return;
        case ACTIONS.updateEntity:
          window.location.reload();
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        case ACTIONS.status:
          setMessage(data.message);
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

  const [initial, setInitial] = useState<T>({ uuid } as any);
  useEffect(() => {
    if (!worker.disabled) {
      worker.post({
        type: ACTIONS.getEntity,
        data: {
          query: {
            left: title,
            left_uuid: uuid,
          },
        },
      });
    }
  }, [worker.disabled]);
  useEffect(() => {
    if (!collection.length) return;
    const [node] = collection;
    setInitial(node);
  }, [collection]);
  return (
    <>
      <p>{message}</p>
      <Form 
        action={action}
        formRef={formRef}
        initial={initial as T}
        disabled={worker.disabled}
        onSubmit={onSubmit}
      />
      <button className={style.submit} onClick={onDelete}>
        Delete
      </button>
    </>
  );
}
