import { useState, useEffect, useRef } from "react";

import useWasmRuntime from "./useWasmRuntime";


/**
 * Event handler for mouse movement, returns the type and listener
 * function 
 * @param {*} canvas 
 * @param {*} data 
 */
const mouseMoveEventListener = (canvas, data) => {
    // recursive use error on line below when panic! in rust
    const eventType = 'mousemove';
    const listener = ({clientX, clientY}) => {
        try {
            const {left, top} = canvas.getBoundingClientRect();
            data.updateCursor(clientX-left, clientY-top);
        } catch (err) {
            canvas.removeEventListener(eventType, listener);
            console.log(`Unregistering '${eventType}' events due to error: ${err}.`);
        }  
    }

    console.log(`Registering '${eventType}' events.`)
    return [eventType, listener]
};

/**
 * Draw a square tessellated by triangles using the 2D context
 * of an HTML canvas. This is accomplished primarily in WASM,
 * called from the React Hook loop. 
 */
export default ({
    fontSize=12.0,
    shape=[32,32],
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#00000088`,
    lineWidth=1.0,
    labelPadding=2.0,
    tickSize=10.0,
    fade=1.0,
    // count=9,
    // zero=0.2,
    // radius=8.0,
    // drag=0.05,
    // bounce=0.95,
    // springConstant=0.2,
    // timeConstant=0.000001,
}) => {

    /**
     * Ref is passed out to be assigned to a canvas element. This ensures that `ref`
     * is defined.
     */
    const ref = useRef(null);

    /**
     * The Rust-WASM backend.
     */
    const runtime = useWasmRuntime();

    /**
     * Create handle for the mesh structure. 
     */
    const [ mesh, setMesh ] = useState(null);

    /**
     * Create the mesh structure in the Rust-WASM backend. 
     * 
     * This implementation uses a right-angle triangulation equal to subdividing
     * each element of a square grid in half.
     */
    useEffect(() => {
        if (runtime) setMesh(new runtime.InteractiveMesh(...shape)); 
    }, [ runtime ]);

    /**
     * If the `ref` has been assigned to a canvas target,
     * begin the render loop using the 2D context
     */
    useEffect(() => {

        if (!runtime || !mesh || !ref.current) return;

        ref.current.addEventListener(...mouseMoveEventListener(ref.current, mesh));

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        const style = {
            backgroundColor, 
            overlayColor, 
            lineWidth, 
            fontSize, 
            tickSize, 
            labelPadding, 
            fade, 
            radius: 8,
        };
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            // mesh.updateState(drag, bounce, timeConstant, collisionThreshold);
            mesh.draw(ref.current, time, style);
            requestId = requestAnimationFrame(render);
        })();

        return () => cancelAnimationFrame(requestId);
    }, [mesh]);


    return {
        mesh, 
        runtime, 
        ref
    };
};