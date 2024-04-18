"use client";
import React, { useState, useEffect, useRef } from "react";
import { getLinkedCollections } from "@catalog/page";
import useCollection from "@catalog/useCollection";
import specification from "@app/../specification.json";
import Markdown from "react-markdown";
import Link from "next/link";
import type {
  InteractiveDataStream,
  DataStreamStyle,
  DataStreams,
} from "@oceanics/app";
import styles from "@catalog/page.module.css";

const { properties, description, title: left } =
  specification.components.schemas.DataStreams;
const links = getLinkedCollections(properties);

type WasmInteraction = {
  InteractiveDataStream: typeof InteractiveDataStream;
} | null;
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
 * Full information for a single node. Because we are using
 * static rendering, can have dynamic per entity route,
 * and have to fallback on query strings and client side
 * rendering.
 */
function DataStream({
  dataStream,
  wasm,
  onDelete,
}: {
  dataStream: DataStreams;
  wasm: WasmInteraction;
  onDelete: (uuid: string) => void;
}) {
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
   * Show histogram instead of series
   */
  const [summary, setSummary] = useState(false);
  /**
   * Show additional metadata
   */
  const [detailLevel, setDetailLevel] = useState(0);
  /**
   * User controlled playback
   */
  const [play, setPlay] = useState(false);
  /**
   * Time keeping for pausing playback with
   * simulated signals.
   */
  const [clock, setClock] = useState<{
    offset: number;
    start: number | null;
    stop: number | null;
  }>({
    offset: 0,
    start: null,
    stop: null,
  });
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    if (!wasm) return;
    const { InteractiveDataStream } = wasm;
    const data = new InteractiveDataStream(capacity, bins, dataStream);
    setInteractive(data);
  }, [wasm, dataStream]);
  /**
   * UI Restart Controller
   */
  function onRestart() {
    if (!wasm) return;
    const { InteractiveDataStream } = wasm;
    const data = new InteractiveDataStream(capacity, bins, dataStream);
    setInteractive(data);
    setPlay(true);
    setClock({
      stop: null,
      start: performance.now(),
      offset: 0,
    });
  }
  /**
   * UI Play Controller
   */
  function onPlay() {
    if (play) return;
    setPlay(true);
    setClock((prev) => {
      return {
        ...prev,
        start: prev.start ? prev.start : performance.now(),
        offset: prev.stop ? prev.offset + (performance.now() - prev.stop) : 0,
      };
    });
  }
  /**
   * UI Pause Controller
   */
  function onPause() {
    if (!clock.start || !play) return;
    setPlay(false);
    setClock((prev) => {
      return {
        ...prev,
        stop: performance.now(),
      };
    });
  }
  /**
   * Increment detail level
   */
  function onDetails() {
    setDetailLevel(prev => (prev + 1) % 2);
  }
  /**
   * Switch between histogram and time series view
   */
  function onSummary() {
    setSummary(prev => !prev);
  }
  /**
   * Draw as time series. Or, Draw as histogram.
   */
  useEffect(() => {
    if (!interactive || !canvas.current || !play || !clock.start) return;
    const handle = canvas.current;
    handle.addEventListener("mousemove", ({ clientX, clientY }) => {
      const { left, top } = handle.getBoundingClientRect();
      interactive.update_cursor(clientX - left, clientY - top);
    });
    [handle.width, handle.height] = ["width", "height"].map((dim) =>
      Number(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2))
    );
    let requestId: number | null = null;
    (function render() {
      if (!play) return;
      const elapsed = performance.now() - clock.offset - clock.start;
      const phenomenonTime = timeConstant * elapsed;
      const result = Math.sin(phenomenonTime);
      interactive.pushObservation({ phenomenonTime, result }, -1.0, 1.0);
      interactive.draw(handle, draw, summary);
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [interactive, canvas, play]);
  /**
   * Client component
   */
  return (
    <div>
      <p>
        <Link
          href={`/.netlify/functions/entity/?left=${left}&left_uuid=${dataStream.uuid}`}
        >
          {dataStream.name}
        </Link>
      </p>
      <div>
        <canvas className={styles.canvas} ref={canvas} />
      </div>
      {detailLevel > 0 && (
        <div>
          <label>uuid</label>
          <p>{dataStream.uuid}</p>
          <label>name</label>
          <p>{dataStream.name}</p>
          <label>description</label>
          <p>{dataStream.description}</p>
          <label>unit of measurement</label>
          <p>{dataStream.unitOfMeasurement??
          "n/a"}</p>
          <label>observation type</label>
          <p>{dataStream.observationType??"n/a"}</p>
          <label>phenomenon time</label>
          <p>n/a</p>
          <label>result time</label>
          <p>n/a</p>
        </div>
      )}
      <button onClick={onDetails}>Details</button>
      <button onClick={onSummary}>Summary</button>
      <button onClick={onPlay}>Play</button>
      <button onClick={onPause}>Pause</button>
      <button onClick={onRestart}>Restart</button>
      <button onClick={onDelete.bind(undefined, dataStream.uuid ?? "")}>
        Delete
      </button>
    </div>
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
  const { collection, message, onDelete } = useCollection({ left });
  /**
   * Keep reference to the WASM constructor
   */
  const [wasm, setWasm] = useState<WasmInteraction>(null);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    (async () => {
      const { InteractiveDataStream, panic_hook } = await import(
        "@oceanics/app"
      );
      panic_hook();
      setWasm({ InteractiveDataStream });
    })();
  }, []);
  /**
   * Client Component
   */
  return (
    <div>
      <Markdown>{description}</Markdown>
      <p>
        You can link <code>DataStreams</code> to {links}.
      </p>
      <p>{message}</p>
      {collection.map((dataStream) => {
        return (
          <DataStream
            key={dataStream.uuid}
            dataStream={dataStream}
            wasm={wasm}
            onDelete={onDelete}
          ></DataStream>
        );
      })}
    </div>
  );
}
