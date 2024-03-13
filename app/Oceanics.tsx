"use client";
import React, { useEffect, useRef, useMemo, useState } from "react";
import useOceanics, { type IWorldType } from "./useOceanics";
import styles from "./layout.module.css";
type ModuleType = typeof import("@oceanics-io/wasm");


export const useWasmRuntime = () => {
    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [ runtime, setRuntime ] = useState<ModuleType|null>(null);

    /**
     * Status flag, for convenience and sensible typing.
     */
    const ready = useMemo(() => !!runtime, [runtime]);

    /**
     * Dynamically load the WASM, add debugging, and save to React state.
     */
    useEffect(() => {
        try {
            (async () => {
                const wasm = await import("@oceanics-io/wasm");
                wasm.panic_hook();
                setRuntime(wasm);
            })()   
        } catch (err) {
            console.error("Unable to load WASM runtime")
        }
    }, []);

    return { 
        runtime, 
        status: {
            ready
        }
    }
}

/**
 * Dynamic interactive game board
 */
export default function Oceanics(props: Omit<IWorldType, "worker">) {
  // Main thread web assembly runtime.
  const { runtime } = useWasmRuntime();
  const worker = useRef<Worker>();
  useEffect(() => {
    worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
  }, [])

  /**
   * Synthetic terrain with digital elevation map and
   * probability table of feature types for world-building.
   */
  const { world, board } = useOceanics({ ...props, worker, runtime });

  return (
    <div className={styles.oceanside}>
      <canvas {...world.canvas} className={styles.world} />
      <canvas {...board.canvas} className={styles.board} />
    </div>
  );
}
