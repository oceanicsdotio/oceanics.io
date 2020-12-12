import { useState, useRef, useEffect } from "react";
import useWasmRuntime from "../hooks/useWasmRuntime";


/**
 * Create a 3D gridded data structure using the Rust-WebAssembly
 * middleware, and return it along with a `ref` to provide to
 * a canvas element to trigger the visualization loop.
 * 
 * @param {[int]} shape - Number of cells in each of the 
 *  3 spatial dimensions
 * @param {int} stencil - Number of surrounding cells to 
 *  select with the cursor
 * @param {Object} style - Style parameters for the rendering loop
 */
export default ({
    name="rectilinear-grid",
    shape=[32, 32, 1],
    stencil=0,
    boundingBox=null,
    gridColor=`#421F33FF`,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#00000066`,
    lineWidth=1.5,
    tickSize=10.0,
    fontSize=12.0,
    labelPadding=2.0,
}) => {
    
    const ref = useRef(null);
    const [grid, setGrid] = useState(null);
    const runtime = useWasmRuntime();

    /**
     * Hook creates data structure once the WASM runtime has loaded
     * successfully.
     * 
     * It uses the stencil to determine how many neighboring cells
     * to include in the area selected by the cursor.
     */
    useEffect(() => {
        if (!runtime) return;
        setGrid(new runtime.InteractiveGrid(...shape, stencil));
    }, [runtime]);

    /**
     * Draw the grid if it has been created and the canvas reference
     * has been assigned to the DOM.
     */
    useEffect(() => {
        if (
            typeof ref === "undefined" || 
            !ref || 
            !ref.current || 
            !grid
        ) return;

        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            grid.update_cursor(clientX-left, clientY-top);
        });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const style = {
            backgroundColor, 
            gridColor, 
            overlayColor, 
            lineWidth, 
            fontSize, 
            tickSize, 
            labelPadding
        };

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            // grid.unsafe_animate();
            grid.draw(ref.current, time, style);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [grid, ref]);

    return {
        grid, 
        ref,
        mapbox: {
            source: [name, {
                type: "canvas", 
                canvas: name,
                animate: true,
                coordinates: boundingBox
            }],
            layer: {
                type: "raster", 
                id: name,
                source: name,
                paint: {
                    "raster-resampling": "nearest"
                }
            }
        }
    };
};