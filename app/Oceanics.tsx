"use client";
import React, { useEffect, useState, useRef } from "react";
import type { MiniMap } from "@oceanics-io/wasm";
import styles from "./layout.module.css";
import icons from "./icons.json";

/**
 * Dynamic interactive game board.
 */
export default function Oceanics({
  gridSize,
  backgroundColor,
  timeConstant,
  frameConstant,
  amplitude,
  phase
}: {
  /**
   * Integer height and width of grid subset. The number of tiles visible is the square of `gridSize`,
   * so scores are higher for larger.
   */
  gridSize: number;
  /**
   * color of animation loop blending
   */
  backgroundColor: string;
  timeConstant: number;
  frameConstant: number;
  amplitude: number
  phase: number
}) {
  /**
   * Ref for isometric view render target
   */
  const board = useRef<HTMLCanvasElement | null>(null);
  /**
   * Interactive elements handled in Rust/Wasm
   */
  const [interactive, setInteractive] = useState<MiniMap | null>(null);

  useEffect(() => {
    if (!board.current) return;
    const handle = board.current;
    [handle.width, handle.height] = ["width", "height"].map(
      (dim: string) =>
        parseInt(getComputedStyle(handle).getPropertyValue(dim).slice(0, -2)) *
        window.devicePixelRatio
    );
    const ctx = handle.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false; // disable interpolation
    (async function () {
      const { MiniMap, panic_hook } = await import("@oceanics-io/wasm");
      panic_hook();
      setInteractive(new MiniMap(gridSize, icons));
    })();
  }, [gridSize, board]);

  /**
   * Draw the visible area to the board canvas using the
   * tile set object. This is the main animation loop
   */
  useEffect(() => {
    if (!board.current || !interactive) return;
    const canvas = board.current;
    const ctx = canvas.getContext(`2d`) as CanvasRenderingContext2D;
    let requestId: number | null = null;
    const spriteSize = 32.0;
    (function render() {
      interactive.draw(
        ctx,
        performance.now(),
        canvas.width,
        canvas.height,
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
    phase
  ]);

  return (
    <div className={styles.oceanside}>
      <canvas ref={board} className={styles.board} />
    </div>
  );
}
