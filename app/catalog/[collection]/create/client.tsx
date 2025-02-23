"use client";
import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type FormEventHandler,
  useReducer,
} from "react";
import { v7 as uuid7 } from "uuid";
import { NodeLike, IMutate} from "@catalog/[collection]/client"
import {ACTIONS, MessageQueue, messageQueueReducer, useWorkerFixtures} from "@catalog/client"

export function Create<T extends NodeLike>({ title, Form }: IMutate<T>) {
  const action = "Create";
  const formRef = useRef<HTMLFormElement>(null);
  /**
   * Status message to understand what is going on in the background.
   */
  const [messages, appendToQueue] = useReducer(messageQueueReducer, []);
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.createEntity:
          window.location.reload();
          return;
        case ACTIONS.error:
          console.error("@worker", type, data);
          return;
        case ACTIONS.status:
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
      new URL("@catalog/[collection]/create/worker.ts", import.meta.url),
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

  const onSubmit =
    (callback: any): FormEventHandler =>
    (event) => {
      event.preventDefault();
      worker.post({
        type: ACTIONS.createEntity,
        data: {
          query: { left: title },
          body: JSON.stringify(callback()),
        },
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

  const [initial] = useState<{ uuid: string }>({
    uuid: uuid7(),
  });
  return (
    <>
      <MessageQueue messages={messages} />
      <Form
        action={action}
        formRef={formRef}
        initial={initial as T}
        disabled={worker.disabled}
        onSubmit={onSubmit}
      />
    </>
  );
}