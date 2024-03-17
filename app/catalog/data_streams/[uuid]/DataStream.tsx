"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import type { InteractiveDataStream } from "@oceanics/app";
import style from "./DataStream.module.css";
/**
 * Data structure passed back from the worker
 */
interface HistogramResult {
  /**
   * Total number of observations.
   */
  total: number;
  /**
   * Maximum value of observations. Used to set
   * the height of visualization canvas axis.
   */
  max: number;
}
/**
 * Known worker messages on this side of the fence.
 */
const MESSAGES = {
  status: "status",
  error: "error",
  reduce: "reduce",
};
/**
 * Interface for the React componenet
 */
interface IDataStream {
  /**
   * Hex color for the time series
   */
  streamColor: string;
  /**
   * Hex color for figure elements
   */
  overlayColor: string;
  /**
   * Hex color for background blending
   */
  backgroundColor: string;
  /**
   * How thick to draw the time series line
   */
  lineWidth: number;
  /**
   * How large to draw the points
   */
  pointSize: number;
  /**
   * Buffer of observations visible at once
   */
  capacity: number;
  /**
   * Axis tick length
   */
  tickSize: number;
  /**
   * Canvas-drawn text size
   */
  fontSize: number;
  /**
   * Space between ticks and text labels
   */
  labelPadding: number;
}

/*
 * Time series data container. Uses a synchronous WASM runtime
 * to draw to canvas and do various transformations of the data.
 */
const DataStream = ({ capacity, ...props }: IDataStream) => {
  /**
   * Bin size is known, since the bins are precalculated.
   */
  const COUNT = 100;
  /**
   * Bin size from bin count.
   */
  const Δw = 1.0 / COUNT;
  /**
   * Canvas element
   */
  const canvas = useRef<HTMLCanvasElement | null>(null);
  /**
   * Web Worker.
   */
  const worker = useRef<Worker | null>(null);
  /**
   * The data stream structure.
   */
  const [interactive, setInteractive] = useState<{
    data: InteractiveDataStream;
  } | null>(null);
  /**
   * Message displayed with the histogram
   */
  const [message, setMessage] = useState<string>();
  /**
   * Histogram bins
   */
  const [histogram, setHistogram] = useState<[number, number][]>([]);
  /**
   * Summary stats include max and total. Set asynchonously by
   * result of web worker calculation.
   */
  const [statistics, setStatistics] = useState<HistogramResult>({
    total: 0,
    max: 0,
  });
  /**
   * Run startup procedure
   */
  useEffect(() => {
    let handle = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    const callback = ({ data }: any) => {
      switch (data.type) {
        case MESSAGES.status:
          console.log(data.type, data.data);
          return;
        case MESSAGES.reduce:
          console.log(data.type, data.data);
          let statistics = data.data as HistogramResult;
          setStatistics(statistics);
          setMessage(`N=${statistics.total}`);
          return;
        case MESSAGES.error:
          console.error(data.message, data.type, data.data);
          return;
        default:
          console.warn(data.type, data.data);
          return;
      }
    };
    handle.addEventListener("message", callback, { passive: true });
    handle.postMessage({
      type: MESSAGES.reduce,
      histogram,
    });
    (async () => {
      const { InteractiveDataStream, panic_hook } = await import(
        "@oceanics/app"
      );
      panic_hook();
      let data = new InteractiveDataStream(capacity, {});
      setInteractive({
        data,
      });
    })();
    worker.current = handle;
    return () => {
      handle.removeEventListener("message", callback);
      handle.terminate();
    };
  }, [capacity, histogram, statistics]);

  /*
   * Draw as histogram.
   */
  useEffect(() => {
    if (!statistics || !canvas.current || !histogram) return;
    const handle = canvas.current;
    const ctx = handle.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = props.streamColor;
    histogram.forEach(([x, n]: [number, number]) => {
      ctx.fillRect(
        handle.width * (x - Δw),
        handle.height,
        handle.width * Δw,
        (handle.height * -n) / statistics.max
      );
    });
  }, [histogram, props.streamColor, statistics, Δw]);
  /**
   * Draw as time series.
   */
  useEffect(() => {
    if (!interactive || !canvas.current) return;
    const handle = canvas.current;
    handle.addEventListener("mousemove", ({ clientX, clientY }) => {
      const { left, top } = handle.getBoundingClientRect();
      interactive.data.update_cursor(clientX - left, clientY - top);
    });

    [handle.width, handle.height] = ["width", "height"].map((dim) =>
      Number(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2))
    );
    const start = performance.now();
    let requestId: number | null = null;

    (function render() {
      const phenomenonTime = performance.now() - start;
      // use location based sunlight function
      const days = (phenomenonTime / 5000.0) % 365.0;
      const hours = days % 1.0;
      // const latitude = 46.0;
      const result = Math.sin(hours);

      interactive.data.push({
        phenomenonTime,
        result,
      });
      interactive.data.draw(handle, phenomenonTime, props);
      requestId = requestAnimationFrame(render);
    })();

    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [interactive, canvas, props]);

  return (
    <div>
      <Suspense fallback={<label>Calculating...</label>}>
        <label>{message}</label>
      </Suspense>
      <canvas className={style.canvas} ref={canvas} />
    </div>
  );
};
export default DataStream;
