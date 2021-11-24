import { useEffect, useState, useRef } from "react";


import useWasmRuntime from "./useWasmRuntime";

type IOceansideWorld = {
    gridSize: number;
    worldSize: number;
    waterLevel: number;
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
export default ({
    gridSize, 
    worldSize, 
    waterLevel,
}: IOceansideWorld) => {

    /**
     * Ref for clickable minimap that allows world navigation
     */
    const nav = useRef(null);

    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const {runtime} = useWasmRuntime();

    /**
     * MiniMap data structure from Rust-WebAssembly.
     */
    const [ map, setMap ] = useState(null);
     
    /**
     * When the runtime loads for the first time, create a pixel map  
     * instance and draw the generated world to the canvas, 
     * then save the map reference to react state.
     * 
     * Build the tileset from the random Feature table, 
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
        if (!ctx) {
            throw TypeError("Rendering Context is Null");
        }

        const offset = (worldSize - gridSize) / 2;
       //@ts-ignore
        setMap(new runtime.MiniMap(
            offset, 
            offset/2, 
            worldSize, 
            waterLevel, 
            ctx, 
            gridSize
        )); 

    }, [ runtime ]);


    return {
        map,
        ref: nav,
        onClick: (event: Event) => {
            //@ts-ignore
            runtime.populateVisibleTiles(map, event);
        }
    } 
};