"use client";
import React, { useEffect, useState, useRef } from "react";
import type { MiniMap } from "@oceanics-io/wasm";
import styles from "./layout.module.css";
import icons from "./icons.json";

/**
 * Main page animation.
 */
export default function Oceanics({
  gridSize,
  backgroundColor,
  timeConstant,
  frameConstant,
  amplitude,
  phase,
}: {
  /**
   * Integer height and width of grid.
   */
  gridSize: number
  /**
   * Animation loop blending
   */
  backgroundColor: string
  /**
   * Speed of tidal/wave animation
   */
  timeConstant: number;
  /**
   * Speed of the sprite keyframe animation
   */
  frameConstant: number;
  /**
   * Amplitude of vertical displacement in animation
   */
  amplitude: number;
  /**
   * Phase multiplier to increase number of periods
   * in the animation.
   */
  phase: number;
}) {
  /**
   * Ref for isometric view render target.
   */
  const board = useRef<HTMLCanvasElement | null>(null);
  /**
   * Interactive elements handled in Rust/Wasm.
   */
  const [interactive, setInteractive] = useState<{
    /**
     * Data and rendering container
     */
    map: MiniMap;
    /**
     * Canvas context to draw to
     */
    target: CanvasRenderingContext2D;
  } | null>(null);
  /**
   * Load wasm runtime asynchronously if we have a
   * valid rendering target.
   */
  useEffect(() => {
    if (!board.current) return;
    const target = board.current.getContext("2d");
    if (!target) return;
    (async function () {
      const { MiniMap } = await import("@oceanics-io/wasm");
      setInteractive({
        target,
        map: new MiniMap(gridSize, icons)
      });
    })();
  }, [gridSize, board]);
  /**
   * Draw the visible area to the board canvas using the
   * tile set object. This is the main animation loop
   */
  useEffect(() => {
    if (!board.current || !interactive) return;
    let requestId: number | null = null;
    let canvas = board.current;
    const spriteSize = 32.0;
    interactive.target.imageSmoothingEnabled = false;
    (function render() {
      [canvas.width, canvas.height] = ["width", "height"].map(
        (dim: string) =>
          parseInt(getComputedStyle(canvas).getPropertyValue(dim).slice(0, -2)) *
          window.devicePixelRatio
      );
      interactive.map.draw(
        interactive.target,
        performance.now(),
        board.current.width,
        board.current.height,
        backgroundColor,
        spriteSize,
        timeConstant,
        frameConstant,
        amplitude,
        phase
      );
      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [
    interactive,
    backgroundColor,
    gridSize,
    board,
    frameConstant,
    timeConstant,
    amplitude,
    phase,
  ]);
  return (
    <div className={styles.oceanside}>
      <canvas ref={board} className={styles.board} />
    </div>
  );
}
