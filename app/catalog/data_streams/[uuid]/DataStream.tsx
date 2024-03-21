"use client";
import React, { useState, useEffect, useRef } from "react";
import type { InteractiveDataStream, DataStreamStyle } from "@oceanics/app";
import styles from "./DataStream.module.css";
/**
 * Interface for main React component
 */
interface IDataStream {
  /**
   * Buffer of visible/stored observations.
   */
  capacity: number;
  /**
   * Number of bins to use in histogram.
   */
  bins: number;
  /**
   * System time scalar
   */
  timeConstant: number;
  /**
   * Show histogram instead of series
   */
  summary: boolean;
  /**
   * Drawing style type is from WASM, but we have to leave
   * out bound methods.
   */
  draw: Omit<DataStreamStyle, "free">;
}
/*
 * Time series data container. Uses a synchronous WASM runtime
 * to draw to canvas and do various transformations of the data.
 */
const DataStream = ({
  capacity,
  bins,
  timeConstant,
  summary,
  draw,
}: IDataStream) => {
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
   * Run startup procedure
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
  }, [capacity, bins]);
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
  }, [interactive, canvas, draw, timeConstant, summary]);

  return (
    <div>
      <canvas className={styles.canvas} ref={canvas} />
    </div>
  );
};
export default DataStream;
