"use client";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "HistoricalLocations";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker may understand/send other types.
 */
const MESSAGES = {
  collection: "collection",
  error: "error"
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Locations({}) {
  /**
   * Ref to Web Worker.
   */
  const worker = useRef<Worker>();
  /**
   * Node data.
   */
  let [locations, setLocations] = useState<any[]>([]);
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("Loading...");
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    worker.current = new Worker(new URL("../worker.ts", import.meta.url), {
      type: "module",
    });
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.collection:
          setLocations(data.data.value);
          setMessage(`We found ${data.data.value.length} matching nodes:`)
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
        type: MESSAGES.collection,
        data: {
          left,
          user: user_data
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
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      {locations.map((each: { uuid: string; name: string }) => {
        let href = `/catalog/historical_locations/${each.uuid}`;
        return (<p key={each.uuid}><Link href={href}>{each.name??each.uuid}</Link></p>)
      })}
    </div>
  );
}
