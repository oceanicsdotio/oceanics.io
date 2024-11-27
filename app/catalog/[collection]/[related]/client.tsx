"use client";
import React, { useEffect, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ACTIONS, useWorkerFixtures } from "@catalog/client";
import { type NodeLike } from "@catalog/[collection]/client";
function fromKey(collection: string) {
  return collection
    .split(/\.?(?=[A-Z])/)
    .join("_")
    .toLowerCase();
}
type Schema = {
  properties: Object;
  title: string;
  description: string;
};
type ILinked = {
  collection: Schema;
  related: Schema;
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export function Linked<T extends NodeLike>({ collection, related }: ILinked) {
  const query = useSearchParams();
  /**
   * Status message to understand what is going on in the background.
   */
  const [message, setMessage] = useState("↻ Loading");
  /**
   * Node or index data, if any.
   */
  const [linked, setLinked] = useState<T[]>([]);
  /**
   * Process web worker messages.
   */
  const workerMessageHandler = useCallback(
    ({ data: { data, type } }: MessageEvent) => {
      switch (type) {
        case ACTIONS.getLinked:
          window.scrollTo({ top: 0, behavior: "smooth" });
          setLinked(data.value);
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
    const left_uuid = query.get("uuid");
    worker.ref.current = new Worker(
      new URL("@catalog/[collection]/[related]/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    worker.ref.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    worker.post({
      type: ACTIONS.getLinked,
      data: {
        query: {
          left: collection.title,
          left_uuid: left_uuid,
          right: related.title,
          limit: 10,
          offset: 0,
        },
      },
    });
    const handle = worker.ref.current;
    worker.setDisabled(false);
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, []);
  return (
    <>
      <p>{message}</p>
      <div>
        {linked.map(({ uuid, ...rest }) => {
          const _right = fromKey(related.title);
          const _left = fromKey(collection.title);
          const href = `/catalog/${_right}/${_left}?uuid=${uuid}`;
          return (
            <p key={uuid}>
              <a href={href}>{rest.name ?? uuid}</a>
            </p>
          );
        })}
      </div>
    </>
  );
}
