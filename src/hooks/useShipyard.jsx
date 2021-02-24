import { useState, useEffect, useRef } from "react";

/**
 * Convenience functions
 */
import { targetHtmlCanvas, addMouseEvents } from "../bathysphere";

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
    ref,
    font=`24px Arial`,
    shape: [
        width=25,
        height=25
    ],
    gridColor=`#EF5FA1FF`,
    overlayColor=`#AFFFD6FF`,
    backgroundColor=`#00000088`,
    caption=`HexagonalGrid`,
    alpha=1.0,
    lineWidth=1.0,
    shape=[32, 32, 1],
    stencil=0,
    tickSize=10.0,
    labelPadding=2.0,
    fontSize=12.0,
    lineWidth=1.0,
    fade=1.0,
    font=`16px Arial`,
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
    const [grid, setGrid] = useState(null);
    

    /**
     * Create a data structure for tessellating space. 
     * 
     * Used for background to spatial views
     */
    useEffect(() => {
        if (!runtime || caption !== "HexagonalGrid") return;
        setGrid(new runtime.HexagonalGrid(width)); 
    }, [runtime]);


    /**
     * Hook creates data structure once the WASM runtime has loaded
     * successfully.
     * 
     * It uses the stencil to determine how many neighboring cells
     * to include in the area selected by the cursor.
     */
    useEffect(() => {
        if (!runtime || caption !== "RectilinearGrid") return;
        setGrid(new runtime.InteractiveGrid(...shape, stencil));
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
     * track cursor when on canvas
     */ 
    useEffect(addMouseEvents(ref, cursor), [cursor]);  

    /**
     * Draw the mesh
     */
    useEffect(() => {
        

        if (!runtime || !grid || !cursor) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);

        (function render() {

            const time = performance.now() - start;
            
            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            grid.draw(ctx, ...shape, 0, 0, gridColor, lineWidth, alpha);

            cursor.draw(ctx, ...shape, overlayColor, time, lineWidth);

            runtime.draw_caption(ctx, caption, 0.0, shape[1], overlayColor, font);
            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [grid, cursor]);


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
     * Generate a 2D or 3D mesh model. Currenlty this can only pull
     * from pre-program generators, but  in the future we will support
     * interactively building up models through a text-based and graphical
     * user interface. 
     * 
     * The model structure is populated on demand during the draw effect.
     */
    useEffect(() => {
            
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


    /**
     * Draw the grid if it has been created and the canvas reference
     * has been assigned to the DOM.
     */
    useEffect(() => {
        if (
            typeof ref === "undefined" || 
            !ref || 
            !ref.current || 
            !grid || 
            !mesh || 
            !runtime
        ) return;

        ref.current.addEventListener(...mouseMoveEventListener(ref.current, mesh));
        // ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
        //     const {left, top} = ref.current.getBoundingClientRect();
        //     grid.update_cursor(clientX-left, clientY-top);
        // });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        let {start, ctx, requestId, frames} = targetHtmlCanvas(ref, `2d`);    
        let previous;  // memoize time to use in smoothing real-time rotation 

        const style = {
            backgroundColor, 
            overlayColor, 
            gridColor,
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
        
            // runtime.clear_rect_blending(ctx, ...shape, backgroundColor);

            // mesh.updateState(drag, bounce, timeConstant, collisionThreshold);
            grid.draw(ref.current, time, style);
            // mesh.draw(ref.current, time, style);

            // const elapsed = time - (previous || 0.0);
            // mesh.rotate_in_place(-0.00005*elapsed, 0.0, 1.0, 0.0);
            // mesh.rotate_in_place(0.000025*elapsed, 1.0, 0.0, 0.0);
            // mesh.rotate_in_place(-0.0003*elapsed, 0.0, 0.0, 1.0);
               
            // const triangles = mesh.draw(ctx, ...shape, alpha, lineWidth*2.0, 0.0);
            // cursor.draw(ctx, ...shape, overlayColor, time, lineWidth);
            // runtime.draw_caption(ctx, `Triangles=${triangles}`, 0.0, shape[1], overlayColor, font);

            frames = runtime.draw_fps(ctx, frames, time, overlayColor);

            requestId = requestAnimationFrame(render);
            previous = time;
        })();

        return () => cancelAnimationFrame(requestId);
    }, [ grid, ref, mesh ]);

    return { ref };
};