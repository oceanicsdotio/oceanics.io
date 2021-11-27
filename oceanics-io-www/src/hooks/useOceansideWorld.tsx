import { useEffect, useState, useRef, useReducer } from "react";
import type {MiniMap} from "../../rust/pkg"
type ModuleType = typeof import("../../rust/pkg");
import {eventCoordinates} from "../workers/shared";

export interface IWorld {
    /**
     * Integer height and width of grid subset. The number of tiles visible is the square of `gridSize`, 
     * so scores are higher for larger.
     */
    grid: {size: number};
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
     * WASM package, already initialized
     */
    runtime: ModuleType|null;
};

type TilesType = (number[][]|null);

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
}: IWorld) => {

    /**
     * Ref for clickable minimap that allows world navigation
     */
    const nav = useRef<HTMLCanvasElement|null>(null);

    /**
     * MiniMap data structure from Rust-WebAssembly.
     */
    const [ map, setMap ] = useState<MiniMap|null>(null);
     
    /**
     * When the runtime loads for the first time, create a pixel map  
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
    useEffect(() => {
        if (!runtime || !nav.current) return;
        const canvas: HTMLCanvasElement = nav.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw TypeError("Rendering Context is Null");
    
        const offset = (size - grid.size) / 2;
        setMap(new runtime.MiniMap(
            offset, 
            offset/2, 
            size, 
            datum, 
            ctx, 
            grid.size
        )); 
    }, [ runtime ]);

    const reducer = (_: TilesType, action: any) => {
        if (!map) throw TypeError("MiniMap reference is Null");
        if (action && nav.current) {
            const canvas: HTMLCanvasElement = nav.current;
            const xy: [number, number] = eventCoordinates(action, nav.current).map((x: number) => x*size/128) as any;
            const ctx = canvas.getContext("2d");
            if (ctx) map.updateView(ctx,  ...xy);
        }
            
        const diagonals = grid.size * 2 - 1;
        const build: TilesType = [];
        let count = 0;

        // Clear the generated tiles, but not the world data
        map.clear();
    
        for (let row = 0; row < diagonals; row++) {
            build.push([]);
            const columns = (row + (row < grid.size ? 1 : diagonals - 2 * row));
            for (let column = 0; column < columns; column++) {
                let col = columns - 1 - column; // reverse the order in the index
                build[row].push(map.insertTile(count++, row, col));
            }
            build[row] = build[row].reverse();
        }
        return build
    }

    /**
     * Update currently visible tiles from map view.
     * 
     * The `useReducer` hook takes the old value as an input,
     * so we can diff the sets of tiles, and only generate or
     * retrieve the ones that are coming into view.
     */
    const [tiles, populateVisibleTiles] = useReducer(reducer, []);


    return {
        map,
        size,
        grid: {
            ...grid,
            tiles
        },
        ref: nav,
        onClick: populateVisibleTiles
    } 
};

export default useOceansideWorld;