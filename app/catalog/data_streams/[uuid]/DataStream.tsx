"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import type { InteractiveDataStream } from "@oceanics/app";
import style from "./DataStream.module.css";
/**
 * Interface for the React component
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
  binSize: number;
}
/*
 * Time series data container. Uses a synchronous WASM runtime
 * to draw to canvas and do various transformations of the data.
 */
const DataStream = ({ capacity, binSize=100, ...props }: IDataStream) => {  
  const canvas = useRef<HTMLCanvasElement | null>(null);
  /**
   * The data stream structure.
   */
  const [interactive, setInteractive] = useState<InteractiveDataStream | null>(null);
  /**
   * Message displayed as label.
   */
  const [message, setMessage] = useState<string>();
  /**
   * Run startup procedure
   */
  useEffect(() => {
    (async () => {
      const { InteractiveDataStream } = await import(
        "@oceanics/app"
      );
      let data = new InteractiveDataStream(capacity, {}, binSize);
      setInteractive(data);
    })();
  }, [capacity, binSize]);
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
    setMessage(`N=${interactive.size()}`);

    (function render() {
      const phenomenonTime = performance.now() - start;
      const days = (phenomenonTime / 5000.0) % 365.0;
      const hours = days % 1.0;
      const result = Math.sin(hours);
      interactive.push({
        phenomenonTime,
        result,
      });
      interactive.draw(handle, phenomenonTime, props, false);
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
