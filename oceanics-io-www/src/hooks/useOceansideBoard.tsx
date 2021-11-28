import { useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import type { WorkerRef } from "../workers/shared";
import type { MapType, ModuleType } from "./useOceansideWorld";


interface IBoard {
    world: {
        map: MapType|null;
        grid: {
            tiles: number[][];
        };
    };
    backgroundColor?: string;
    worker: WorkerRef;
    runtime: ModuleType|null;
};

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
 * @param {String} args.backgroundColor - color of animation loop blending
 */
export const useOceansideBoard = ({
    world,
    backgroundColor = "#000000FF",
    worker,
    runtime
}: IBoard) => {

    /**
     * Ref for isometric view render target
     */
    const board = useRef<HTMLCanvasElement|null>(null);

    /**
     * Draw the visible area to the board canvas using the 
     * tile set object. 
     */
    useEffect(() => {
        if (
            !board.current || 
            !world.grid.tiles.length || 
            !worker.current ||
            !runtime ||
            !world.map
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

            if (!world.grid.tiles.length) throw TypeError(`Length of tile coordinate map is zero.`)
            world.grid.tiles.forEach((diagonal: number[], ii: number) => {
                if (!diagonal.length) throw TypeError(`Length of diagonal ${ii} is zero.`)
                diagonal.forEach((tile, jj) => {
                    (world.map as MapType).drawTile(ctx, ii, jj, diagonal.length, performance.now(), width, tile);
                });
            });
            requestId = requestAnimationFrame(render);
        })();

        return () => { if (requestId) cancelAnimationFrame(requestId) };
    }, [ world.map, world.grid.tiles, worker, runtime ]);

    
    return {
        canvas: {
            ref: board,
            onClick: (event: MouseEvent) => {
                try {
                    console.log({event})
                } catch (err) {
                    console.error(err);
                }
            }
        }   
    } 
};

export default useOceansideBoard;