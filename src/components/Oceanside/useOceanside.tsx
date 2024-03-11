import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { MouseEvent } from "react";
import { eventCoordinates } from "../../shared";
import type { EventLocation } from "../../shared";
import useWorker from "../../hooks/useWorker";
import type { MiniMap } from "@oceanics-io/wasm";
export type ModuleType = typeof import("@oceanics-io/wasm");

const ACTIONS = {
  parseIconSet: "parseIconSet"
}
const DEFAULT_BLENDING = "#000000FF";

export interface IWorldType {
  /**
   * Integer height and width of grid subset. The number of tiles visible is the square of `gridSize`,
   * so scores are higher for larger.
   */
  grid: {
    tiles?: number[][]
    size: number
  }
  /**
   * Pixel size of the canvas element
   */
  view: {
    size: number
  }
  /**
   * Integer height and width of global grid. The total number of tiles,
   * and therefore the probability of finding certain features, is the square of `worldSize`.
   */
  size: number
  /**
   * Fraction of tidal evolution. Each tile has an elevation value.
   * Tiles above `waterLevel` are always land, and therefore worth nothing.
   * Other wet tiles become mud depending on the tidal cycle and their elevation.
   */
  datum: number
  /**
   * color of animation loop blending
   */
  backgroundColor?: string
  /**
   * WASM package, already initialized
   */
  runtime: ModuleType | null
  /**
   * Rendering data
   */
  src: string
}

// This has to be defined in global scope to force Webpack to bundle the script. 
const createWorker = () => 
  new Worker(
    new URL("./Oceanside.worker.ts", import.meta.url), 
    { type: 'module' }
  );

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
export const useOceanside = ({
  grid,
  size,
  datum,
  runtime,
  src,
  backgroundColor = DEFAULT_BLENDING,
}: IWorldType) => {
  /**
   * Ref for clickable minimap that allows world navigation
   */
  const ref = useRef<HTMLCanvasElement | null>(null);

  /**
   * Dedicated background worker for number crunching and text
   * analysis.
   */
  const worker = useWorker(createWorker);

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
      console.error("Rendering Context is Null");
      return null;
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
  const populate = () => {
    if (!map) throw TypeError("MiniMap reference is Null");
    const diagonals = grid.size * 2 - 1;
    const build: number[][] = [];
    let count = 0;
    for (let row = 0; row < diagonals; row++) {
      build.push([]);
      const columns = row + (row < grid.size ? 1 : diagonals - 2 * row);
      for (let column = 0; column < columns; column++) {
        const col = columns - 1 - column; // reverse the order in the index
        build[row].push(map.insertTile(count++, row, col));
      }
      build[row] = build[row].reverse();
    }
    setTiles(build);
  };

  /**
   * When we get a message back from the worker that matches
   * a specific pattern, insert the populated feature types
   * into the map's probability table for world-building.
   */
  useEffect(() => {
    if (!map || !worker.ref.current) return;
    // start listener
    const remove = worker.listen(({ data }) => {
      switch (data.type) {
        case ACTIONS.parseIconSet:
          (data.data as any[]).forEach((x: unknown) => {
            map?.insertFeature(x);
          });
          populate();
          return;
        default:
          console.log(data.type, data.data);
          return;
      }
    });
    return remove;
  }, [worker.ref.current, map]);

  /**
   * When we have a worker ready, we can start sending
   * messages to parse icon data and do some calculations
   * of, for example, the feature probability distribution.
   *
   * We also need the map instance to exist, so that we can
   * insert the feature into the visualization.
   */
  useEffect(() => {
    if (!map || !worker.ref.current) return;
    worker.ref.current.postMessage({
      type: ACTIONS.parseIconSet,
      data: {src, size},
    });
  }, [worker.ref.current, map]);

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
        ) as unknown as [number, number];
        const ctx = canvas.getContext("2d");
        if (ctx) map?.updateView(ctx, ...xy);
      }
      // Clear generated tiles, but not world data
      map.clear();
      populate();
    },
    [map]
  );

  /**
   * Ref for isometric view render target
   */
  const board = useRef<HTMLCanvasElement | null>(null);

  /**
   * Draw the visible area to the board canvas using the
   * tile set object.
   */
  useEffect(() => {
    if (!board.current || !tiles.length || !runtime || !map) return;

    [board.current.width, board.current.height] = ["width", "height"]
      .map((dim: string) =>
        getComputedStyle(board.current as HTMLCanvasElement)
          .getPropertyValue(dim)
          .slice(0, -2)
      )
      .map((x: string) => parseInt(x) * window.devicePixelRatio);

    const ctx = board.current.getContext(`2d`);
    if (!ctx) return;

    let requestId: number | null = null;

    ctx.imageSmoothingEnabled = false; // disable interpolation

    (function render() {
      const { width, height } = board.current;
      runtime.clear_rect_blending(ctx, width, height, backgroundColor);

      if (!tiles.length)
        throw TypeError(`Length of tile coordinate map is zero.`);
      tiles.forEach((diagonal: number[], ii: number) => {
        if (!diagonal.length)
          throw TypeError(`Length of diagonal ${ii} is zero.`);
        diagonal.forEach((tile, jj) => {
          (map as MiniMap).drawTile(
            ctx,
            ii,
            jj,
            diagonal.length,
            performance.now(),
            width,
            tile
          );
        });
      });
      requestId = requestAnimationFrame(render);
    })();

    return () => {
      if (requestId) cancelAnimationFrame(requestId);
    };
  }, [map, tiles, runtime]);

  return {
    world: {
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
    },
    board: {
      canvas: {
        ref: board,
        onClick: (event: MouseEvent) => {
          try {
            console.log({ event });
          } catch (err) {
            console.error(err);
          }
        },
      },
    },
  };
};

export default useOceanside;
