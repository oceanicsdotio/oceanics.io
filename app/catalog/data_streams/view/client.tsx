"use client";
import React, { useState, useEffect, useRef } from "react";
import { Initial, useGetCollection } from "@catalog/client";
import openapi from "@app/../specification.json";
import style from "@catalog/page.module.css";
import type {
  InteractiveDataStream,
  DataStreamStyle,
  DataStreams,
} from "@oceanics/app";
/**
 * Properties from OpenAPI schema
 */
const schema = openapi.components.schemas.DataStreams;
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
let draw: Initial<DataStreamStyle> = {
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
 * Display an index of all or some subset of the
 * available nodes in the database. This is used 
 * wherever you need to fetch and render all
 * or a subset of `DataStreams`.
 */
export default function({}) {
 /**
   * Retrieve node data using Web Worker. Redirect if there are
   * no nodes of the given type.
   */
 const { message, collection } = useGetCollection(schema.title);
  /**
   * Keep reference to the WASM constructor
   */
  const [wasm, setWasm] = useState<{
    InteractiveDataStream: typeof InteractiveDataStream;
  } | null>(null);
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
   * Current data source. Only supports streaming one
   * at a time for now.
   */
  const [source, setSource] = useState<Initial<DataStreams> | null>(null);
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
      interactive.draw(handle, draw, false);
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [interactive, canvas, play]);
  /**
   * Load Web Worker on component mount
   */
  useEffect(() => {
    if (!wasm) return;
    const { InteractiveDataStream } = wasm;
    const data = new InteractiveDataStream(capacity, bins, source);
    setInteractive(data);
  }, [wasm, source]);
  useEffect(()=>{
    if (!collection.length) return
    setSource(collection[0] as any);
  },[collection])
  /**
   * UI Restart Controller
   */
  function onRestart() {
    if (!wasm) return;
    const { InteractiveDataStream } = wasm;
    const data = new InteractiveDataStream(capacity, bins, source);
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
   * Client Component
   */
  return (
    <div>
      <p>{message}</p>
      <div>
        <button onClick={onPlay} disabled={play || !source}>
          Play
        </button>
        <button onClick={onPause} disabled={!play}>
          Pause
        </button>
        <button onClick={onRestart} disabled={!clock.start}>
          Restart
        </button>
      </div>
      <div>
        <canvas className={style.canvas} ref={canvas} />
      </div>
    </div>
  );
}
