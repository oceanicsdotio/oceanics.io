"use client";
import React, { useEffect, useRef } from "react";
import useOceanside, { type IWorldType } from "./useOceanside";
import useWasmRuntime from "../src/hooks/useWasmRuntime";
import styles from "./index.module.css";

/**
 * Dynamic interactive game board
 */
export default function Oceanside(props: Omit<IWorldType, "worker">) {
  // Main thread web assembly runtime.
  const { runtime } = useWasmRuntime();
  const worker = useRef<Worker>();
  useEffect(() => {
    worker.current = new Worker(new URL("./Oceanside.worker.ts", import.meta.url), {
      type: "module",
    });
  }, [])

  /**
   * Synthetic terrain with digital elevation map and
   * probability table of feature types for world-building.
   */
  const { world, board } = useOceanside({ ...props, worker, runtime });

  return (
    <div className={styles.oceanside}>
      <canvas {...world.canvas} className={styles.world} />
      <canvas {...board.canvas} className={styles.board} />
    </div>
  );
}
