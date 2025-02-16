"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import Markdown from "react-markdown";
import Link from "next/link";
import specification from "@app/../specification.json";
/**
 * Remove the free method of a type definition
 * generated by wasm_bindgen.
 */
export type Initial<T> = Omit<T, "free">;
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
export const ACTIONS = {
  getCollection: "getCollection",
  deleteEntity: "deleteEntity",
  createEntity: "createEntity",
  updateEntity: "updateEntity",
  getEntity: "getEntity",
  getIndex: "getIndex",
  getLinked: "getLinked",
  error: "error",
  status: "status",
  redirect: "redirect",
};
export function useWorkerFixtures() {
  /**
   * Ref to Web Worker.
   */
  const ref = useRef<Worker>(null);
  /**
   * Controls disabled until the worker is ready.
   */
  const [disabled, setDisabled] = useState(true);
  /**
   * On submission, we delegate the request to our background
   * worker, which will report on success/failure.
   */
  const post = useCallback((message: { type: string; data: any }) => {
    if (!ref.current) {
      console.error("! Worker isn't ready");
      return;
    }
    const user = localStorage.getItem("gotrue.user");
    if (typeof user === "undefined" || !user) {
      const err = "! You are not logged in";
      console.error(err);
      return;
    }
    ref.current.postMessage({ ...message, data: { ...message.data, user } });
  }, []);
  return {
    post,
    disabled,
    setDisabled,
    ref,
  };
}
type IndexData = {
  description: string
  href: string
  url: string
  content: string
  "@iot.count": number
}[]
/**
 * Link items for listing available collections.
 */
export default function ({}) {
  /**
   * Load worker once
   */
  const ref = useRef<Worker>(null);
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  /**
   * Index information.
   */
  const [index, setIndex] = useState<IndexData>([]);
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getIndex:
          setIndex(
            data.map((each: { name: string }) => {
              const { description } = (
                specification.components.schemas as {
                  [key: string]: { description?: string };
                }
              )[each.name];
              return {
                ...each,
                description,
              };
            })
          );
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
   * Load Web Worker on component mount
   */
  useEffect(() => {
    if (ref.current) return
    ref.current = new Worker(
      new URL("@catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    ref.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    ref.current.postMessage({
      type: ACTIONS.getIndex,
      data: {
        user: localStorage.getItem("gotrue.user")
      },
    });
    const handle = ref.current;
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [workerMessageHandler]);
  return (
    <>
      <p>{message}</p>
      {index.map(({ "@iot.count": count, content, href, description }, ind) => (
        <details key={href} name="exclusive" open={ind === 0}>
          <summary>
            <Link href={href} prefetch={false}>
              {content}
            </Link>
            <span>{` ✓ ${count}`}</span>
          </summary>
          <Markdown>{description}</Markdown>
        </details>
      ))}
    </>
  );
}
