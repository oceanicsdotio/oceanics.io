"use client";
import {
  useEffect,
  useState,
  useRef,
  type MutableRefObject,
} from "react";
import type { InteractiveMesh } from "@oceanics/app";
/**
 * Visualization interface wrapper as custom hook
 */
export function useWebAssembly() {
    /**
     * Preview 2D render target.
     */
    const ref: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
    /**
     * Keep reference to the WASM constructor
     */
    const [wasm, setWasm] = useState<{
      InteractiveMesh: typeof InteractiveMesh;
    } | null>(null);
    /**
     * Runtime will be passed back to calling Hook or Component.
     * The WASM runtime contains all of the draw functions that
     * target the GL context.
     */
    const [interactive, setInteractive] = useState<InteractiveMesh | null>(null);
    /**
     * Load WASM runtime and save just the method handles
     * we need locally. Not sure if this saves us anything,
     * but seems like a clean idea.
     */
    useEffect(() => {
      (async () => {
        const wasm = await import("@oceanics/app");
        const { panic_hook, InteractiveMesh } = wasm;
        panic_hook();
        setWasm({ InteractiveMesh });
      })();
    }, []);
    /**
     * Once we have the WASM instance, create and
     * save the control and data structure.
     */
    useEffect(() => {
      if (!wasm) return;
      const { InteractiveMesh } = wasm;
      const data = new InteractiveMesh(10, 10);
      setInteractive(data);
    }, [wasm]);
    return {
      ref,
      interactive,
    };
  }