"use client";
import { useEffect, useState, useRef, type MutableRefObject } from "react";
import type { InteractiveMesh, MeshStyle } from "@oceanics/app";
import { type Initial } from "@app/catalog/client";
import style from "@catalog/page.module.css";
/**
 * Visualization interface wrapper as custom hook
 */
function useWebAssembly() {
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
/**
 * Interactive visualization viewport
 */
export default function () {
  const { ref, interactive } = useWebAssembly();
  const meshStyle: Initial<MeshStyle> = {
    backgroundColor: "#11002299",
    overlayColor: "lightblue",
    lineWidth: 0.5,
    fontSize: 24,
    tickSize: 10,
    fade: 0.6,
    labelPadding: 10,
    radius: 5
  }
  useEffect(() => {
    if (!interactive || !ref.current) return;
    const handle = ref.current;
    [handle.width, handle.height] = ["width", "height"].map((dim) =>
      Number(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2))
    );
    let requestId: number | null = null;
    (function render() {
      const elapsed = performance.now();
      interactive.draw(handle, elapsed, meshStyle);
      interactive.rotate(0.01, 0.5, 0.5, 0.5);
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [interactive]);
  return <canvas className={style.canvas} ref={ref}></canvas>;
}
