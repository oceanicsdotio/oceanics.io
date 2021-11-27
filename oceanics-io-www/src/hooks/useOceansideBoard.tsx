import { useEffect, useRef } from "react";
import type {MouseEvent} from "react";
import type {MutableRefObject} from "react";
import type {MiniMap} from "../../rust/pkg";
import type {WorkerRef} from "../workers/shared";

type ModuleType = typeof import("../../rust/pkg");


interface IBoard {
    map: MiniMap|null;
    grid: {
        size: number;
        tiles: number[][];
    };
    worldSize: number;
    backgroundColor?: string;
    worker: WorkerRef;
    nav: MutableRefObject<HTMLCanvasElement|null>;
    runtime: ModuleType|null;
    tiles: {
        templates: any;
        icons: {
            slug: string;
        }[];
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
 * 
 * @param {Object} args - Arguments object
 * @param {number} args.gridSize - Integer height and width of grid subset. The number of tiles visible is the square of `gridSize`, so scores are higher for larger.
 * @param {number} args.worldSize - Integer height and width of global grid. The total number of tiles, and therefore the probability of finding certain features, is the square of `worldSize`. 
 * @param {number} args.waterLevel - Fraction of tidal evolution. Each tile has an elevation value. Tiles above `waterLevel` are always land, and therfore worth nothing. Other wet tiles become mud depending on the tidal cycle and their elevation.
 * @param {String} args.backgroundColor - color of animation loop blending
 */
export const useOceansideBoard = ({
    map,
    grid, 
    worldSize,
    backgroundColor = "#000000FF",
    worker,
    runtime,
    tiles: {
        templates,
        icons,
    },
}: IBoard) => {

    /**
     * Ref for isometric view render target
     */
    const board = useRef<HTMLCanvasElement|null>(null);

    useEffect(() => {
        console.log({icons, templates, worldSize});
        (async () => {
            if (!worker.current || !map) return;
            // worker.current.postMessage({
            //     type: "parseIconSet",
            //     data: {nodes, templates, worldSize}
            // });
            // TODO: this...
            // iconSet.forEach((x) => {map.insertFeature(x)});
            // populateVisibleTiles(map, null);  
        })();
    }, [ worker, map ]);

    /**
     * Draw the visible area to the board canvas using the 
     * tile set object. 
     */
    useEffect(() => {
        if (
            !board || 
            !board.current || 
            !(grid.tiles??false) || 
            !worker.current ||
            !runtime ||
            !map
        ) return;

        [board.current.width, board.current.height] = ["width", "height"].map(
            (dim: string) => getComputedStyle(board.current as HTMLCanvasElement).getPropertyValue(dim).slice(0, -2)
        ).map((x: string) => parseInt(x) * window.devicePixelRatio);

        const ctx = board.current.getContext(`2d`);
        if (!ctx) return;

        let requestId: number|null = null;
      
        ctx.imageSmoothingEnabled = false;  // disable interpolation
    
        (function render() {
            const { width, height } = board.current;
            runtime.clear_rect_blending(ctx, width, height, backgroundColor);
            grid.tiles.forEach((diagonal: number[], ii: number) => {
                diagonal.forEach((tile, jj) => {
                    map.drawTile(ctx, ii, jj, diagonal.length, performance.now(), width, tile);
                });
            });
            requestId = requestAnimationFrame(render);
        })();

        return () => { if (requestId) cancelAnimationFrame(requestId) };
    }, [ grid.tiles, worker ]);

    
    return {
        ref: board,
        onClick: (event: MouseEvent) => {
            try {
                console.log({event})
                // takeAnActionOrWait(event);
            } catch (err) {
                console.error(err);
            }
        }
    } 
};

export default useOceansideBoard;