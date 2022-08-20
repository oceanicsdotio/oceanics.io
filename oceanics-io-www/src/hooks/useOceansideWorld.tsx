import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";

import { eventCoordinates } from "../utils";
import type { EventLocation, ModuleType } from "../utils";
import type { MiniMap } from "oceanics-io-www-wasm";

/**
 * Messaging passing type
 */
const ACTION = "parseIconSet";

export interface IWorldType {
  /**
   * Integer height and width of grid subset. The number of tiles visible is the square of `gridSize`,
   * so scores are higher for larger.
   */
  grid: {
    tiles?: number[][];
    size: number;
  };
  /**
   * Pixel size of the canvas element
   */
  view: {
    size: number;
  };
  /**
   * Integer height and width of global grid. The total number of tiles,
   * and therefore the probability of finding certain features, is the square of `worldSize`.
   */
  size: number;
  /**
   * Fraction of tidal evolution. Each tile has an elevation value.
   * Tiles above `waterLevel` are always land, and therefore worth nothing.
   * Other wet tiles become mud depending on the tidal cycle and their elevation.
   */
  datum: number;
}

export interface IWorld extends IWorldType {
  /**
   * WASM package, already initialized
   */
  runtime: ModuleType | null;
  worker: MutableRefObject<Worker | null>;
  icons: {
    sources: any;
    templates: any;
  };
}

/**
 * The `Oceanside` hook provides all of the functionality to
 * embed the game/visualization engine in any React app.
 *
 * The interface consists of two canvases. One canvas displays
 * the navigation minimap, and the other is where the animated
 * game tiles are rendered.
 *
 * A text block displays the current datetime and score.
 *
 * Tile asset references are used to pre-load all of the
 * sprite data for animations.
 */
export const useOceansideWorld = ({
  grid,
  size,
  datum,
  runtime,
  worker,
  icons,
}: IWorld) => {
  /**
   * Ref for clickable minimap that allows world navigation
   */
  const ref = useRef<HTMLCanvasElement | null>(null);

  /**
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
   */
  const map = useMemo<MiniMap | null>(() => {
    if (!runtime || !ref.current) return null;
    const ctx = ref.current.getContext("2d");
    if (!ctx) {
      console.error("Rendering Context is Null")
      return null
    }
    const offset = (size - grid.size) / 2;
    return new runtime.MiniMap(offset, offset / 2, size, datum, ctx, grid.size);
  }, [runtime, ref.current]);

  /**
   * Currently visible tiles from map view.
   */
  const [tiles, setTiles] = useState<number[][]>([]);

  /**
   * Populate the register of currently visible tiles.
   */
  const populate = useCallback(() => {
    if (!map) throw TypeError("MiniMap reference is Null");
    const diagonals = grid.size * 2 - 1;
    const build: number[][] = [];
    let count = 0;
    for (let row = 0; row < diagonals; row++) {
      build.push([]);
      const columns = row + (row < grid.size ? 1 : diagonals - 2 * row);
      for (let column = 0; column < columns; column++) {
        let col = columns - 1 - column; // reverse the order in the index
        build[row].push(map.insertTile(count++, row, col));
      }
      build[row] = build[row].reverse();
    }
    setTiles(build);
  }, [map, grid]);

  /**
   * When we get a message back from the worker that matches
   * a specific pattern, insert the populated feature types
   * into the map's probability table for world-building.
   */
  const listener = useCallback(
    ({ data }: { data: any; type: string }) => {
      if (data.type !== ACTION) return;
      data.data.forEach((x: any) => {
        map?.insertFeature(x);
      });
      populate();
    },
    [populate, map]
  );

  /**
   * When we have a worker ready, we can start sending 
   * messages to parse icon data and do some calculations 
   * of, for example, the feature probability distribution.
   * 
   * We also need the map instance to exist, so that we can
   * insert the feature into the visualization.
   */
  useEffect(() => {
    if (!map || !worker.current) return;
    worker.current.addEventListener("message", listener, { passive: true });
    worker.current.postMessage({
      type: ACTION,
      data: [icons.sources, icons.templates, size],
    });
    return () => {
      worker.current?.removeEventListener("message", listener);
      worker.current?.terminate();
    };
  }, [worker.current, map]);

  /**
   * Re-populate the currently visible tiles when a mouse event fires
   * on the canvas.
   */
  const onClick = useCallback(
    (action: null | EventLocation) => {
      if (!map) throw TypeError("MiniMap reference is Null");
      if (action && ref.current) {
        const canvas: HTMLCanvasElement = ref.current;
        const xy: [number, number] = eventCoordinates(action, ref.current).map(
          (x: number) => x / 4
        ) as any;
        const ctx = canvas.getContext("2d");
        if (ctx) map?.updateView(ctx, ...xy);
      }
      // Clear generated tiles, but not world data
      map.clear();
      populate();
    },
    [map]
  );

  return {
    canvas: {
      width: size,
      height: size,
      ref,
      onClick,
    },
    map,
    grid: {
      ...grid,
      tiles,
    },
  };
};

export default useOceansideWorld;
