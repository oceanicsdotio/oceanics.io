import { useEffect, useRef, useState, useCallback } from "react";
import type { MouseEvent } from "react";
import type { WorkerRef } from "../workers/shared";
import type { MapType, ModuleType } from "./useOceansideWorld";


interface IBoard {
    world: {
        map: MapType|null;
        size: number;
        grid: {
            size: number;
            tiles: number[][];
        };
        populateVisibleTiles: (action: any) => void;
    };
    backgroundColor?: string;
    worker: WorkerRef;
    runtime: ModuleType|null;
    tiles: {
        templates: any;
        icons: {
            slug: string;
        }[];
    };
}

const ACTION =  "parseIconSet";

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
    world,
    backgroundColor = "#220022FF",
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


    const [ready, setReady] = useState(false);

    const listener = useCallback(({data}: {data: any, type: string})=>{
        if (data.type !== ACTION || ready) return;
        data.data.forEach((x: any) => {
            world.map?.insertFeature(x);
        });
        setReady(true);
    }, [world.map, ready])

    /**
     * When we have a worker and the world map both ready,
     * then we can start sending messages to parse icon
     * data and do some calculations of, for example, the
     * probability distribution of features etc. 
     */
    useEffect(() => {
        if (!worker.current || !world.map) return;
        const action =  "parseIconSet";
        worker.current.addEventListener("message", listener, { passive: true });
        worker.current.postMessage({
            type: action,
            data: [icons, templates, world.size]
        });
    }, [ worker, world.map ]);

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