import { useState, useEffect, useRef } from "react";
import { ghost, lichen, shadow } from "../palette";


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
    font=`24px Arial`,
    shape: [
        width=25,
        height=25,
        depth=1
    ],
    gridColor=ghost,
    overlayColor=lichen,
    backgroundColor=shadow,
    caption=`Shipyard`,
    gridType=`hexagonal`,
    alpha=1.0,
    stencil=0,
    tickSize=10.0,
    labelPadding=2.0,
    fontSize=12.0,
    lineWidth=1.0,
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
     * Reference for canvas, passed back from the Hook to allow
     * drawing to arbitrary render targets while guarenteeing
     * that `ref` is defined.
     */
    const ref = useRef(null);

    /**
     * Rust-WASM runtime for numerical methods. 
     */
    const [ runtime, setRuntime ] = useState(null);

    /**
     * Dynamically load the WASM, add debugging, and save to React state,
     */
    useEffect(() => {
        try {
            (async () => {
                const runtime = await import('../wasm');
                runtime.panic_hook();
                setRuntime(runtime);
            })()   
        } catch (err) {
            console.log("Unable to load WASM runtime")
        }
    }, []);

    /**
     * Spatial discretization method.
     * 
     * Used primarily for visual reference. Rectangle, hex or triangulation.
     */
    const [ grid, setGrid ] = useState(null);
    

     /**
     * Hook creates data structure once the WASM runtime has loaded
     * successfully.
     * 
     * It uses the stencil to determine how many neighboring cells
     * to include in the area selected by the cursor.
     */
    useEffect(() => {
        if (!runtime) return;

        switch (gridType) {
            case "hexagonal": 
                setGrid(new runtime.HexagonalGrid(width));
                return;
            case "rectilinear":
                setGrid(new runtime.InteractiveGrid(...shape, stencil));
                return;
            default:
                return;
        }
    }, [ runtime ]);

    /**
     * Interactive canvas cursor object
     */
    const [ cursor, setCursor ] = useState(null);

    /**
     * Initialize the cursor effects interface. 
     * 
     * This provides visual feedback and 
     * validates that interaction is happening in the correct 
     * area of the HTML canvas. 
     */
    useEffect(() => {
        if (!runtime) return;
            setCursor(new runtime.SimpleCursor(0.0, 0.0)); // Create cursor
    }, [ runtime ]);

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
        if (runtime) setMesh(new runtime.InteractiveMesh(width, height, depth)); 
    }, [ runtime ]);

    
   
    /**
     * Generate a 2D or 3D mesh model. Currenlty this can only pull
     * from pre-program generators, but  in the future we will support
     * interactively building up models through a text-based and graphical
     * user interface. 
     * 
     * The model structure is populated on demand during the draw effect.
     */
    // useEffect(() => {
            
    //     if (!runtime) return;
    //     let assembly = new runtime.Shipyard();

    //     assembly.build_ship(16);
    //     // assembly.scale(0.35, 0.35, 0.35);
    //     assembly.scale(0.5, 0.5, 0.5);
    //     assembly.shift(0.0, 0.0, -0.4);

    //     setMesh(assembly); 
    // }, [runtime]);



    /**
     * Add a mouse event
     * listener to update the cursor position for interacting with objects within the 
     * canvas rendering context.
     */
    useEffect(() => {

        if ( 
            typeof ref === "undefined" || 
            !ref || 
            !ref.current || 
            !cursor
        ) return;

        function listener({clientX, clientY}){
            try {
                const {left, top} = ref.current.getBoundingClientRect();
                cursor.update(clientX-left, clientY-top);
            } catch (err) {
                ref.current.removeEventListener('mousemove', listener);
                console.log(`Unregistering mousemove events due to error: ${err}.`);
            }  
        };

        ref.current.addEventListener('mousemove', listener);
    }, [ ref, cursor ]);

    useEffect(() => {
        if ( 
            typeof ref === "undefined" || 
            !ref || 
            !ref.current
        ) return;

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        ).map(x => x * window.devicePixelRatio);

    }, [ ref ]);


    /**
     * Draw the grid if it has been created and the canvas reference
     * has been assigned to the DOM.
     */
    useEffect(() => {
        if (
            typeof ref === "undefined" || 
            !ref || 
            !ref.current || 
            !runtime
        ) return;
    
        const start = performance.now();
        const ctx = ref.current.getContext(`2d`);
        let requestId = null;
        let frames = 0;
        let previous;  // memoize time to use in smoothing real-time rotation 

        (function render() {
           
            const time = performance.now() - start;
            const elapsed = time - (previous || 0.0);
        
            runtime.clear_rect_blending(ctx, ref.current.width, ref.current.height, backgroundColor);

            // mesh.updateState(drag, bounce, timeConstant, collisionThreshold);

            if (grid)
                grid.draw(ctx, ref.current.width, ref.current.height, 0, 0, gridColor, lineWidth, alpha);

                // grid.draw(ref.current, time, {
                //     backgroundColor, 
                //     overlayColor, 
                //     gridColor,
                //     lineWidth, 
                //     fontSize, 
                //     tickSize, 
                //     labelPadding, 
                //     fade, 
                //     radius: 8,
                // });

            // mesh.draw(ref.current, time, style);            
            // mesh.rotate_in_place(-0.00005*elapsed, 0.0, 1.0, 0.0);
            // mesh.rotate_in_place(0.000025*elapsed, 1.0, 0.0, 0.0);
            // mesh.rotate_in_place(-0.0003*elapsed, 0.0, 0.0, 1.0);
            // const triangles = mesh.draw(ctx, ...shape, alpha, lineWidth*2.0, 0.0);

            if (cursor)
                cursor.draw(ctx, ref.current.width, ref.current.height, overlayColor, time, lineWidth);
           
            if (caption)
                runtime.draw_caption(ctx, caption, 0.0, ref.current.height, overlayColor, font);

            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
            previous = time;
        })();

        return () => cancelAnimationFrame(requestId);
    }, [ ref, runtime, grid, cursor ]);

    return { ref };
};





// function render() {
//     const time = performance.now() - start;
//     const elapsed = time - (previous || 0.0);
//     runtime.clear_rect_blending(ctx, ...shape, backgroundColor);

//     ctx.lineWidth = 3.0;
//     let moorings;
//     let mooringSpacing = [80, 300];
//     const mooringSize = 10;
//     const rr = 0.5*mooringSize;

//     {
//         // Draw moorings
//         ctx.strokeStyle = "#FF0000FF";
//         moorings = pathFromGridCell({upperLeft: [0, 0], width: mooringSpacing[0], height: mooringSpacing[1]});

//         moorings.forEach(([x, y]) => {
//             const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});

//             ctx.beginPath();
//             ctx.moveTo(...pts[0]);
//             pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//             ctx.closePath();
//             ctx.stroke();
//         });  
//     }

//     const raftWidth = 40;
//     const nRafts = 4;
//     const scopes = [5, raftWidth, 5];

//     {   
//         // Draw rafts
        
//         const origin = mooringSpacing.map(dim => dim*0.5);
//         const topLeftX = origin[0] - 0.5*raftWidth;
//         const topLeftY = origin[1] - 0.5*(scopes.reduce((a,b)=>a+b,0) + nRafts*raftWidth);

//         let yoffset = 0.0;
//         let prev = null;
//         for (let jj=0; jj<nRafts; jj++) {
//             if (jj)
//                 yoffset += scopes[jj-1];
            
//             ctx.strokeStyle = "#FFAA00FF";
//             const pts = pathFromGridCell({upperLeft: [topLeftX, topLeftY + jj*raftWidth + yoffset], width: raftWidth, height: raftWidth});

//             ctx.beginPath();
//             ctx.moveTo(...pts[0]);
//             pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//             ctx.closePath();
//             ctx.stroke();

            
//             if (prev) {
//                 ctx.strokeStyle = "#FF0000FF";
//                 ctx.beginPath();
//                 ctx.moveTo(...prev[3]);
//                 ctx.lineTo(...pts[0]);

//                 ctx.moveTo(...prev[2]);
//                 ctx.lineTo(...pts[1]);
//                 ctx.stroke();
//             }

//             if (jj==0) {
//                 ctx.strokeStyle = "#FF0000FF";
//                 ctx.beginPath();
//                 ctx.moveTo(...moorings[0]);
//                 ctx.lineTo(...pts[0]);

//                 ctx.moveTo(...moorings[1]);
//                 ctx.lineTo(...pts[1]);
//                 ctx.stroke();
//             }

//             if (jj==nRafts-1) {
//                 ctx.strokeStyle = "#FF0000FF";
//                 ctx.beginPath();
//                 ctx.moveTo(...moorings[2]);
//                 ctx.lineTo(...pts[2]);

//                 ctx.moveTo(...moorings[3]);
//                 ctx.lineTo(...pts[3]);
//                 ctx.stroke();
//             }


//             prev = pts
//         }  
//     }

//     {
//         const xoffset = 140;
//         const yoffset = 50;
//         const lineSpace = [20, 500];

//         // Draw moorings
//         ctx.strokeStyle = "#FF0000FF";
//         for (let ii=0; ii<12; ii++) {
//             const xx = xoffset + ii*lineSpace[0];
            
//             [[xx, yoffset],[xx, yoffset+lineSpace[1]]].forEach(([x, y]) => {
//                 const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});

//                 ctx.beginPath();
//                 ctx.moveTo(...pts[0]);
//                 pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//                 ctx.closePath();
//                 ctx.stroke();
//             }); 
//         }
//     }

// }