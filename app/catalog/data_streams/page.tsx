"use client";
import React, { useState, useEffect, useRef } from "react";
import { getLinkedCollections } from "@catalog/page";
import useCollection from "../useCollection";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
const { properties, description } =
  specification.components.schemas.DataStreams;
const links = getLinkedCollections(properties);
import type { InteractiveDataStream, DataStreamStyle } from "@oceanics/app";
import styles from "@catalog/page.module.css";
/**
 * Pascal case disambiguation for API matching and queries.
 */
const left = "DataStreams";
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
function DataStream({dataStream}: {dataStream: any}) {
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
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
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
  }, [dataStream.uuid]);
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
      <p>{dataStream.name}</p>
      <div>
        <canvas className={styles.canvas} ref={canvas} />
      </div>
    </>
  );
}
/**
 * Display an index of all or some subset of the
 * available nodes in the database.
 */
export default function Page({}) {
  /**
   * Retrieve node data use Web Worker.
   */
  const { collection, message } = useCollection({ left });
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can link <code>DataStreams</code> to {links}
      </p>
      <p>{message}</p>
      {collection.map((each: { uuid: string; name: string }) => {
        return (
          <DataStream key={each.uuid} dataStream={each}></DataStream>
        );
      })}
    </div>
  );
}
