"use client";
import React, { useEffect, useState, useRef } from "react";
import type { MiniMap, PrismCursor } from "@oceanics-io/wasm";
import styles from "./layout.module.css";
import icons from "./icons.json";

// Mouse click coordinates
type EventLocation = { clientX: number; clientY: number };
type Points = [number, number][];

// Get click coords from an event
const eventCoordinates = (
  { clientX, clientY }: EventLocation,
  canvas: HTMLCanvasElement
): [number, number] => {
  // Short hand for element reference frame
  const { left, top } = canvas.getBoundingClientRect();
  return [clientX - left, clientY - top];
};

/*
 * Rotate a path of any number of points about the origin.
 * You need to translate first to the desired origin, and then translate back
 * once the rotation is complete.
 *
 * Not as flexible as quaternion rotation.
 */
const rotatePath = (pts: Points, angle: number): Points => {
  const [s, c] = [Math.sin, Math.cos].map((fcn) => fcn(angle));
  return pts.map(([xx, yy]) => [xx * c - yy * s, xx * s + yy * c]);
};

/*
 * Translate x and scale y, rotate CCW, scale points.
 * Points must be in the canvas coordinate reference frame.
 * The width is the width of the canvas drawing area, and
 * gridSize is the number of squares per side of the world.
 */
const inverse = (points: Points, width: number, gridSize: number): Points => {
  return rotatePath(
    points.map(([x, y]) => [
      x -
        ((Math.floor(0.5 * gridSize) + 1.25) * width) / gridSize / Math.sqrt(2),
      2 * y,
    ]),
    -Math.PI / 4
  ).map(([x, y]) => [x * Math.sqrt(2), y * Math.sqrt(2)]);
};

interface IOceanics {
  /**
   * Integer height and width of grid subset. The number of tiles visible is the square of `gridSize`,
   * so scores are higher for larger.
   */
  gridSize: number;
  /**
   * Integer height and width of global grid. The total number of tiles,
   * and therefore the probability of finding certain features, is the square of `worldSize`.
   */
  worldSize: number;
  /**
   * Fraction of tidal evolution. Each tile has an elevation value.
   * Tiles above `waterLevel` are always land, and therefore worth nothing.
   * Other wet tiles become mud depending on the tidal cycle and their elevation.
   */
  waterLevel: number;
  /**
   * color of animation loop blending
   */
  backgroundColor: string;
}

/**
 * Dynamic interactive game board.
 */
export default function Oceanics({
  gridSize,
  worldSize,
  waterLevel,
  backgroundColor
}: IOceanics) {
  /**
   * Ref for clickable minimap that allows world navigation
   */
  const world = useRef<HTMLCanvasElement | null>(null);
  /**
   * Ref for isometric view render target
   */
  const board = useRef<HTMLCanvasElement | null>(null);
  /**
   * Interactive elements handled in Rust/Wasm
   */
  const [interactive, setInteractive] = useState<{
    map: MiniMap;
    cursor: PrismCursor;
    clear: typeof import("@oceanics-io/wasm").clear_rect_blending;
    tiles: number[][];
  } | null>(null);

  /**
   * Dynamically load the WASM, add debugging,
   * and save to React state.
   *
   * Get and start the worker as well. We need to have
   * both to do anything useful.
   *
   * When the runtime loads, create a pixel map
   * instance and draw the generated world to the canvas,
   * then save the map reference to react state.
   *
   * Build the tile set from the random Feature table,
   * or leave space for land.
   *
   * Create the probability table by accumulative discrete
   * probabilities, and save the object that will be query for
   * tile selections to react state.
   *
   * The same data structure will hold the selected tiles.
   *
   * When we have a worker ready, we can start sending
   * messages to parse icon data and do some calculations
   * of, for example, the feature probability distribution.
   *
   * We also need the map instance to exist, so that we can
   * insert the feature into the visualization.
   */
  useEffect(() => {
    if (!board.current || !world.current) return;
    const handle = board.current;
    const worldRef = world.current;
    [board.current.width, board.current.height] = ["width", "height"]
      .map((dim: string) =>
        getComputedStyle(handle).getPropertyValue(dim).slice(0, -2)
      )
      .map((x: string) => parseInt(x) * window.devicePixelRatio);
    const ctx = board.current.getContext("2d");
    const worldCtx = world.current.getContext("2d");
    if (!ctx || !worldCtx) return;
    ctx.imageSmoothingEnabled = false; // disable interpolation

    let cursor: PrismCursor | undefined | null;
    const onMouseMove = (event: MouseEvent) => {
      const xy = eventCoordinates(event, handle);
      cursor?.update(...xy);
    };
    board.current.addEventListener("mousemove", onMouseMove);

    (async function () {
      const {PrismCursor, MiniMap, panic_hook, clear_rect_blending: clear} = await import("@oceanics-io/wasm");
      panic_hook();
      cursor = new PrismCursor(
        0.0,
        0.0,
        window.devicePixelRatio,
        gridSize
      );
      const map = new MiniMap(worldSize, waterLevel, worldCtx, gridSize, icons);

      const diagonals = gridSize * 2 - 1;
      const tiles: number[][] = [];
      let count = 0;
      for (let row = 0; row < diagonals; row++) {
        tiles.push([]);
        const columns = row + (row < gridSize ? 1 : diagonals - 2 * row);
        for (let column = 0; column < columns; column++) {
          const col = columns - 1 - column; // reverse the order in the index
          tiles[row].push(map.insertTile(count++, row, col));
        }
        tiles[row] = tiles[row].reverse();
      }
      setInteractive({
        map,
        cursor,
        clear,
        tiles,
      });
    })();

    return () => {
      handle.addEventListener("mousemove", onMouseMove);
    };
  }, [gridSize, waterLevel, worldSize, board]);

  /**
   * Draw the visible area to the board canvas using the
   * tile set object. This is the main animation loop
   */
  useEffect(() => {
    if (!board.current || !interactive) return;
    const canvas = board.current;
    const ctx = canvas.getContext(`2d`) as CanvasRenderingContext2D;
    let requestId: number | null = null;
    (function render() {
      interactive.clear(
        ctx,
        canvas.width,
        canvas.height,
        backgroundColor
      );
      interactive.tiles.forEach((diagonal: number[], ii: number) => {
        diagonal.forEach((_, jj) => {
          interactive.map.drawTile(
            ctx,
            ii,
            jj,
            diagonal.length,
            performance.now(),
            canvas.width
          );
        });
      });

      // const Δx = 1;
      // const Δy = 1;
      // const cellSize = canvas.width / gridSize;
      // const [x, y]: [number, number] = [
      //   interactive.cursor.x(),
      //   interactive.cursor.y(),
      // ];

      // const [inverted] = inverse(
      //   [[x * cellSize, y * cellSize]],
      //   canvas.width,
      //   gridSize
      // ).map((pt) => pt.map((x) => x / cellSize));

      // [
      //   { upperLeft: [x, y], color: "#ffffffff" },
      //   { upperLeft: inverted, color: "#ffffffff" },
      // ].map(({ color, upperLeft }) => {
      //   const [x, y] = upperLeft.map((dim) => Math.floor(dim));
      //   const cellA: [number, number][] = [
      //     [x, y],
      //     [x + Δx, y],
      //     [x + Δx, y + Δy],
      //     [x, y + Δy],
      //   ].map(([x, y]) => [x * cellSize, y * cellSize]);

      //   const cellB: [number, number][] = rotatePath(
      //     cellA.map(([x, y]) => [x / Math.sqrt(2), y / Math.sqrt(2)]),
      //     Math.PI / 4
      //   ).map(([x, y]) => [
      //     x + ((Math.floor(0.5 * gridSize) + 1.25) * cellSize) / Math.sqrt(2),
      //     0.5 * y,
      //   ]);

      //   ctx.strokeStyle = color;
      //   ctx.lineWidth = 2.0;

      //   [cellA, cellB].forEach((cell) => {
      //     ctx.beginPath();
      //     ctx.moveTo(...cell[0]);
      //     cell.slice(1, 4).forEach((pt) => ctx.lineTo(...pt));
      //     ctx.closePath();
      //     ctx.stroke();
      //   });

      //   ctx.beginPath();
      //   for (let ii = 0; ii < 4; ii++) {
      //     ctx.moveTo(...cellA[ii]);
      //     ctx.lineTo(...cellB[ii]);
      //   }
      //   ctx.stroke();
      // });

      requestId = requestAnimationFrame(render);
    })();
    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [interactive, backgroundColor, gridSize]);

  return (
    <div className={styles.oceanside}>
      <canvas ref={board} className={styles.board} />
      <canvas ref={world} className={styles.world} />
    </div>
  );
}
