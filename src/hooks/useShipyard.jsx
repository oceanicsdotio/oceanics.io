import { useState, useEffect, useRef } from "react";

/**
 * Convenience functions
 */
import { targetHtmlCanvas, addMouseEvents, pathFromGridCell } from "../bathysphere";

/**
 * Rust/WASM runtime hook
 */
import useWasmRuntime from "./useWasmRuntime";


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
    
    /**
     * Reference for canvas, passed back from the Hook to allow
     * drawing to arbitrary render targets while guarenteeing
     * that `ref` is defined.
     */
    const ref = useRef(null);

    /**
     * Handle for using the grid data structure created in Web Assembly.
     */
    const [grid, setGrid] = useState(null);

    /**
     * Rust/Wasm Backend
     */
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
 * Draw a triangles using the 2D context
 * of an HTML canvas. 
 * 
 * This is accomplished primarily in WASM,
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
/*
 * Triangles
 */
export default ({
    ref,
    font=`16px Arial`,
    meshColor=`#AFFFD6FF`,
    overlayColor=`#77CCFFFF`,
    backgroundColor=`#000000CC`,
    alpha=0.25,
    lineWidth=0.1,
}) => {
   
    /**
     * Ref is passed out to be assigned to a canvas element. This ensures that `ref`
     * is defined.
     */
    const ref = useRef(null);

    /**
     * The Rust-WASM backend.
     */
    const runtime = useWasmRuntime(null);

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

   
    const [cursor, setCursor] = useState(null);

    useEffect(addMouseEvents(ref, cursor), [cursor]);  // track cursor when mouse interacts with canvas

    useEffect(() => {
        /*
        Generate a 2D or 3D mesh model. Currenlty this can only pull
        from pre-program generators, but  in the future we will support
        interactively building up models through a text-based and graphical
        user interface. 

        The model structure is populated on demand during the draw effect.
        */
        if (!runtime) return;
        let assembly = new runtime.Shipyard();

        assembly.build_ship(16);
        // assembly.scale(0.35, 0.35, 0.35);
        assembly.scale(0.5, 0.5, 0.5);
        assembly.shift(0.0, 0.0, -0.4);

        setMesh(
            assembly
        ); 
    }, [runtime]);

    useEffect(() => {
        /*
        Initialize the cursor effects interface. This provides visual feedback and 
        validates that interaction is happening in the correct area of the 
        HTML canvas. 
        */
        if (!runtime) return;
        setCursor(new runtime.SimpleCursor(0.0, 0.0)); // Create cursor
    }, [runtime]);

    useEffect(() => {
        /*
        First populate the mesh data structure with points and topology
        from preprogrammed routines.
        
        Then draw the mesh in an animation loop. 
        */

        if (!runtime || !mesh) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);    
        let previous;  // memoize time to use in smoothing real-time rotation 

        (function render() {
            const time = performance.now() - start;
            const elapsed = time - (previous || 0.0);

            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            
            mesh.rotate_in_place(-0.00005*elapsed, 0.0, 1.0, 0.0);
            mesh.rotate_in_place(0.000025*elapsed, 1.0, 0.0, 0.0);
            mesh.rotate_in_place(-0.0003*elapsed, 0.0, 0.0, 1.0);
               
            const triangles = mesh.draw(ctx, ...shape, alpha, lineWidth*2.0, 0.0);
            cursor.draw(ctx, ...shape, overlayColor, time, lineWidth);
            runtime.draw_caption(ctx, `Triangles=${triangles}`, 0.0, shape[1], overlayColor, font);

            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
            previous = time;

        })()

        return () => cancelAnimationFrame(requestId);
    }, [mesh]);


     /*
    First populate the mesh data structure with points and topology
    from preprogrammed routines.
    
    Then draw the mesh in an animation loop. 
    */

//    useEffect(() => {
       
//     if (!runtime) return;

//     let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);
//     let previous;  // memoize time to use in smoothing real-time rotation 

//     (function render() {
//         const time = performance.now() - start;
//         const elapsed = time - (previous || 0.0);
//         runtime.clear_rect_blending(ctx, ...shape, backgroundColor);

//         ctx.lineWidth = 3.0;
//         let moorings;
//         let mooringSpacing = [80, 300];
//         const mooringSize = 10;
//         const rr = 0.5*mooringSize;

//         {
//             // Draw moorings
//             ctx.strokeStyle = "#FF0000FF";
//             moorings = pathFromGridCell({upperLeft: [0, 0], width: mooringSpacing[0], height: mooringSpacing[1]});

//             moorings.forEach(([x, y]) => {
//                 const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});

//                 ctx.beginPath();
//                 ctx.moveTo(...pts[0]);
//                 pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//                 ctx.closePath();
//                 ctx.stroke();
//             });  
//         }

//         const raftWidth = 40;
//         const nRafts = 4;
//         const scopes = [5, raftWidth, 5];

//         {   
//             // Draw rafts
            
//             const origin = mooringSpacing.map(dim => dim*0.5);
//             const topLeftX = origin[0] - 0.5*raftWidth;
//             const topLeftY = origin[1] - 0.5*(scopes.reduce((a,b)=>a+b,0) + nRafts*raftWidth);

//             let yoffset = 0.0;
//             let prev = null;
//             for (let jj=0; jj<nRafts; jj++) {
//                 if (jj)
//                     yoffset += scopes[jj-1];
                
//                 ctx.strokeStyle = "#FFAA00FF";
//                 const pts = pathFromGridCell({upperLeft: [topLeftX, topLeftY + jj*raftWidth + yoffset], width: raftWidth, height: raftWidth});

//                 ctx.beginPath();
//                 ctx.moveTo(...pts[0]);
//                 pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//                 ctx.closePath();
//                 ctx.stroke();

                
//                 if (prev) {
//                     ctx.strokeStyle = "#FF0000FF";
//                     ctx.beginPath();
//                     ctx.moveTo(...prev[3]);
//                     ctx.lineTo(...pts[0]);

//                     ctx.moveTo(...prev[2]);
//                     ctx.lineTo(...pts[1]);
//                     ctx.stroke();
//                 }

//                 if (jj==0) {
//                     ctx.strokeStyle = "#FF0000FF";
//                     ctx.beginPath();
//                     ctx.moveTo(...moorings[0]);
//                     ctx.lineTo(...pts[0]);

//                     ctx.moveTo(...moorings[1]);
//                     ctx.lineTo(...pts[1]);
//                     ctx.stroke();
//                 }

//                 if (jj==nRafts-1) {
//                     ctx.strokeStyle = "#FF0000FF";
//                     ctx.beginPath();
//                     ctx.moveTo(...moorings[2]);
//                     ctx.lineTo(...pts[2]);

//                     ctx.moveTo(...moorings[3]);
//                     ctx.lineTo(...pts[3]);
//                     ctx.stroke();
//                 }


//                 prev = pts
//             }  
//         }

//         {
//             const xoffset = 140;
//             const yoffset = 50;
//             const lineSpace = [20, 500];

//             // Draw moorings
//             ctx.strokeStyle = "#FF0000FF";
//             for (let ii=0; ii<12; ii++) {
//                 const xx = xoffset + ii*lineSpace[0];
                
//                 [[xx, yoffset],[xx, yoffset+lineSpace[1]]].forEach(([x, y]) => {
//                     const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});

//                     ctx.beginPath();
//                     ctx.moveTo(...pts[0]);
//                     pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//                     ctx.closePath();
//                     ctx.stroke();
//                 }); 
//             }
//         }

//         frames = runtime.draw_fps(ctx, frames, time, overlayColor);
//         requestId = requestAnimationFrame(render);
//         previous = time;
//     })();

    return () => cancelAnimationFrame(requestId);
}, [runtime]);


    return {mesh, runtime};
};