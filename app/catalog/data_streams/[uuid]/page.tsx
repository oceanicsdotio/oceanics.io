"use client";
import Link from "next/link";
import layout from "@app/layout.module.css";
import React, { useState, useEffect, useRef } from "react";
import type { InteractiveDataStream, DataStreamStyle } from "@oceanics/app";
import styles from "@catalog/page.module.css";
import { usePathname } from "next/navigation";
/**
 * Buffer of visible/stored observations.
 */
let capacity = 100;
/**
 * Number of bins to use in histogram.
 */
let bins = 10;
/**
 * System time scalar
 */
let timeConstant = 1 / capacity;
/**
 * Show histogram instead of series
 */
let summary = false;
/**
 * Drawing style type is from WASM, but we have to leave
 * out bound methods.
 */
let draw: Omit<DataStreamStyle, "free"> = {
  streamColor: "lightblue",
  overlayColor: "lightblue",
  backgroundColor: "#11002299",
  lineWidth: 2,
  pointSize: 4,
  tickSize: 8,
  fontSize: 24,
  labelPadding: 8,
};
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "DataStreams";
/**
 * Web worker messages that are explicitly handled in this
 * context. The shared worker understands/sends others.
 */
const MESSAGES = {
  error: "error",
  entity: "entity",
};

export default function Page({}) {
  /**
   * Render target
   */
  const canvas = useRef<HTMLCanvasElement | null>(null);
  /**
   * The data stream structure.
   */
  const [interactive, setInteractive] = useState<InteractiveDataStream | null>(
    null
  );
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
  let [dataStream, setDataStream] = useState<any>({});
  /**
   * Summary message displaying load state.
   */
  let [message, setMessage] = useState("↻ Searching");
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
    const workerMessageHandler = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.entity:
          setDataStream(data.data.value[0]);
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

    (async () => {
      const { InteractiveDataStream, panic_hook } = await import(
        "@oceanics/app"
      );
      panic_hook();
      let data = new InteractiveDataStream(capacity, bins, {
        uuid: "example",
        name: "Example",
      });
      setInteractive(data);
    })();
    // Cancel listener on unmount
    return () => {
      handle.removeEventListener("message", workerMessageHandler);
    };
  }, [uuid]);
  /**
   * Draw as time series. Or, Draw as histogram.
   */
  useEffect(() => {
    if (!interactive || !canvas.current) return;
    const handle = canvas.current;
    handle.addEventListener("mousemove", ({ clientX, clientY }) => {
      const { left, top } = handle.getBoundingClientRect();
      interactive.update_cursor(clientX - left, clientY - top);
    });

    [handle.width, handle.height] = ["width", "height"].map((dim) =>
      Number(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2))
    );
    const start = performance.now();
    let requestId: number | null = null;
    (function render() {
      const phenomenonTime = timeConstant * (performance.now() - start);
      const result = Math.sin(phenomenonTime);
      interactive.pushObservation({ phenomenonTime, result }, -1.0, 1.0);
      interactive.draw(handle, draw, summary);
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [interactive, canvas]);
  /**
   * Client component
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
      <p>{dataStream.name}</p>
      <div>
        <canvas className={styles.canvas} ref={canvas} />
      </div>
    </>
  );
}
