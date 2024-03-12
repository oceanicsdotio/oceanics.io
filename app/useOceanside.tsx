import {
  useEffect,
  useState,
  useRef,
  useReducer,
  useCallback,
  useMemo,
  type MouseEvent,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
import {
  eventCoordinates,
  type EventLocation,
  rotatePath,
  inverse,
} from "../src/shared";
import type { MiniMap, PrismCursor } from "@oceanics-io/wasm";
export type ModuleType = typeof import("@oceanics-io/wasm");

import { lichen, orange } from "../src/palette";

const ACTIONS = {
  parseIconSet: "parseIconSet",
};
const DEFAULT_BLENDING = "#000000FF";

enum KeyEvents {
  KeyUp = "keyup",
  KeyDown = "keydown",
}

export interface IWorldType {
  worker: MutableRefObject<Worker | undefined>;
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
  /**
   * color of animation loop blending
   */
  backgroundColor?: string;
  /**
   * WASM package, already initialized
   */
  runtime: ModuleType | null;
  /**
   * Rendering data
   */
  src: string;
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
export const useOceanside = ({
  worker,
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

   // Start if we get a worker on load.
   useEffect(() => {
    if (typeof worker.current === "undefined") return;
    let handle: Worker = worker.current;
    handle.postMessage({ type: "status" });
    return () => {
      handle.terminate();
    };
  }, [worker]);

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
  }, [runtime, datum, grid.size, size]);

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
        const col = columns - 1 - column; // reverse the order in the index
        build[row].push(map.insertTile(count++, row, col));
      }
      build[row] = build[row].reverse();
    }
    setTiles(build);
  }, [map, grid.size]);

  /**
   * When we get a message back from the worker that matches
   * a specific pattern, insert the populated feature types
   * into the map's probability table for world-building.
   */
  useEffect(() => {
    if (!map || !worker.current) return;
    let handle: Worker = worker.current
    let callback = ({ data }) => {
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
    };
    // start listener

    handle.addEventListener("message", callback, { passive: true });
    return () => {
      handle.removeEventListener("message", callback);
    };
  }, [worker, map, populate]);

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
    worker.current.postMessage({
      type: ACTIONS.parseIconSet,
      data: { src, size },
    });
  }, [worker, map, size, src]);

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
    [map, populate]
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
  }, [map, tiles, runtime, backgroundColor]);

  /**
   * Canvas reference.
   */
  const overlay = useRef<HTMLCanvasElement | null>(null);

  /**
   * Complex cursor handled in Rust
   */
  const [cursor, setCursor] = useState<PrismCursor | null>(null);

  /**
   * When runtime loads, create a cursor instance.
   */
  useEffect(() => {
    if (!runtime) return;
    setCursor(
      new runtime.PrismCursor(0.0, 0.0, window.devicePixelRatio, grid.size)
    );
  }, [runtime, grid.size]);

  /**
   * Clamp custom cursor to the discrete grid.
   */
  const [clamp, setClamp] = useState(false);

  /**
   * Toggle the key state when it is pressed and released.
   * There is technically no need for the default case.
   *
   * The initial value of the state is taken from the second
   * arg to `useReducer`.
   *
   *Add and remove keypress listeners as necessary. These
   * will call the `setKeys` method generated by `useReducer`
   * to logicaly update the array of pressed keys.
   */
  const [keys, setKeys] = useReducer(
    (
      state: { [index: string]: string | boolean },
      { type, key }: { type: string; key: string }
    ) => {
      switch (type) {
        case "keydown":
          return { ...state, [key]: true };
        case "keyup":
          return { ...state, [key]: false };
        default:
          return state;
      }
    },
    ["Shift", "C"].reduce((acc, key) => {
      return {
        ...acc,
        [key.toLowerCase()]: false,
      };
    }, {})
  );

  useEffect(() => {
    const listeners = [KeyEvents.KeyUp, KeyEvents.KeyDown].map(
      (type: KeyEvents) => {
        const listen = (event: KeyboardEvent<Element>) => {
          const symbol = event.key.toLowerCase();
          if (event.repeat) return;
          if (keys[symbol] === (KeyEvents.KeyUp === type))
            setKeys({ type, key: symbol });
        };
        //@ts-ignore
        document.addEventListener(type, listen, true);
        return [type, listen];
      }
    );

    return () => {
      listeners.forEach(([type, listen]) =>
        //@ts-ignore
        document.removeEventListener(type, listen, true)
      );
    };
  }, [keys]);

  useEffect(() => {
    if (Object.values(keys).every((x) => x)) setClamp(!clamp);
  }, [keys, clamp]);

  //
  useEffect(() => {
    if (!overlay || !overlay.current || !cursor) return;
    const canvas: HTMLCanvasElement = overlay.current;
    canvas.addEventListener("mousemove", (event) => {
      const xy = eventCoordinates(event, canvas);
      cursor.update(...xy);
    });
  }, [cursor, overlay]);

  /**
   * Draw the visible area to the board canvas using the
   * tile set object.
   */
  useEffect(() => {
    if (!overlay || !overlay.current || !cursor || !runtime) return;

    const canvas: HTMLCanvasElement = overlay.current;
    const ctx = canvas.getContext(`2d`);
    if (!ctx) throw TypeError("Rendering Context is Null");

    [canvas.width, canvas.height] = ["width", "height"]
      .map((dim) => getComputedStyle(canvas).getPropertyValue(dim).slice(0, -2))
      .map((x) => Number(x) * window.devicePixelRatio);
    const { width, height } = canvas;

    runtime.clear_rect_blending(ctx, width, height, backgroundColor);

    const Δx = 1;
    const Δy = 1;
    const [x, y]: [number, number] = [cursor.x(), cursor.y()];

    const cellSize = width / grid.size;
    const [inverted] = inverse(
      [[x * cellSize, y * cellSize]],
      width,
      grid.size
    ).map((pt) => pt.map((x) => x / cellSize));

    [
      { upperLeft: [x, y], color: orange },
      { upperLeft: inverted, color: lichen },
    ].map(({ color, upperLeft }) => {
      const [x, y] = upperLeft.map((dim) => (clamp ? Math.floor(dim) : dim));

      const cellA: [number, number][] = [
        [x, y],
        [x + Δx, y],
        [x + Δx, y + Δy],
        [x, y + Δy],
      ].map(([x, y]) => [x * cellSize, y * cellSize]);

      const cellB: [number, number][] = rotatePath(
        cellA.map(([x, y]) => [x / Math.sqrt(2), y / Math.sqrt(2)]),
        Math.PI / 4
      ).map(([x, y]) => [
        x + ((Math.floor(0.5 * grid.size) + 1.25) * cellSize) / Math.sqrt(2),
        0.5 * y,
      ]);

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.0;

      [cellA, cellB].forEach((cell) => {
        ctx.beginPath();
        ctx.moveTo(...cell[0]);
        cell.slice(1, 4).forEach((pt) => ctx.lineTo(...pt));
        ctx.closePath();
        ctx.stroke();
      });

      ctx.beginPath();
      for (let ii = 0; ii < 4; ii++) {
        ctx.moveTo(...cellA[ii]);
        ctx.lineTo(...cellB[ii]);
      }
      ctx.stroke();
    });
  }, [clamp, cursor, grid.size, runtime, backgroundColor]);

  return {
    overlay: {
      canvas: {
        ref,
      },
    },
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
