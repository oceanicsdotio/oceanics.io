import { useState, useEffect, useRef } from "react";

import { lichen } from "../palette";

import Worker from "./useDataStream.worker.js";

/*
 * Time series data
 */
export default ({
    streamColor=lichen,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#001010CC`,
    lineWidth=1.5,
    pointSize=2.0,
    capacity=500,
    tickSize=10.0,
    fontSize=12.0,
    labelPadding=2.0,
}) => {

    /**
     * Reference to pass to target canvas
     */
    const ref = useRef(null);

    /**
     * Background worker
     */
    const worker = useRef(null);

    /**
     * Load worker
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);
   
     /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [runtime, setRuntime] = useState(null);

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
     * The data stream structure. 
     */
    const [ dataStream, setStream ] = useState(null);

    /**
     * Create the data stream once the runtime has loaded. 
     */
    useEffect(() => {
        if (runtime) setStream(new runtime.InteractiveDataStream(capacity));
    }, [ runtime ]);

    /**
     * Run the animation loop.
     */
    useEffect(() => {
        if (!runtime || !dataStream || ref === undefined) return;

        // use location based sunlight function
        const fcn = t => {
            let days = t / 5000.0 % 365.0;
            let hours = days % 1.0;
            let latitude = 46.0;
            return (runtime.photosynthetically_active_radiation(days, latitude, hours));
        };

        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            dataStream.update_cursor(clientX-left, clientY-top);
        });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            dataStream.push(time, fcn(time));
            dataStream.draw(ref.current, time, {backgroundColor, streamColor, overlayColor, lineWidth, pointSize, fontSize, tickSize, labelPadding});
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [ dataStream, ref ]);

    return {
        ref,
        runtime, 
        dataStream
    }
};