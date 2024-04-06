"use client";
import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import layout from "@app/layout.module.css";
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "FeaturesOfInterest";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker understands/sends others.
 */
const MESSAGES = {
  error: "error",
  entity: "entity",
};
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page() {
  const path = usePathname();
  const uuid = path
    .split("/")
    .filter((some) => some)
    .pop();
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node data.
   */
  let [featureOfInterest, setFeatureOfInterest] = useState<any>({});
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("↻ Searching");
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(
      new URL("@app/catalog/worker.ts", import.meta.url),
      {
        type: "module",
      }
    );
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.entity:
          setFeatureOfInterest(data.data.value[0]);
          setMessage(`✓ Found ${data.data.value.length}`);
          return;
        case MESSAGES.error:
          console.error(data.type, data.data);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    };
    worker.current.addEventListener("message", workerMessageHandler, {
      passive: true,
    });
    const user_data = localStorage.getItem("gotrue.user");
    if (typeof user_data !== "undefined") {
      worker.current.postMessage({
        type: MESSAGES.entity,
        data: {
          left,
          left_uuid: uuid,
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
  }, [uuid]);
  /**
   * Client Component
   */
  return (
    <>
      <>
        {"/"}
        <Link className={layout.link} style={{ display: "inline" }} href={path}>
          {uuid}
        </Link>
      </>
      <p>{message}</p>
      <p>{featureOfInterest.name}</p>
    </>
  );
}
