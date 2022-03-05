/**
 * React friends.
 */
import { useState, useEffect, useRef } from "react";
import { lichen, ghost } from "oceanics-io-ui/build/palette";

/**
 * Synchronous front-end WASM Runtime
 */
import useWasmRuntime from "./useWasmRuntime";
import type { InteractiveDataStream } from "oceanics-io-wasm";

/*
 * Time series data
 */
export const useDataStream = ({
    streamColor = lichen,
    overlayColor = ghost,
    backgroundColor = "#202020FF",
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
    const ref = useRef<HTMLCanvasElement|null>(null);

    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const { runtime } = useWasmRuntime();

    /**
     * The data stream structure. 
     */
    const [ dataStream, setStream ] = useState<InteractiveDataStream|null>(null);

    /**
     * Create the data stream once the runtime has loaded. 
     */
    useEffect(() => {
        if (runtime) setStream(new runtime.InteractiveDataStream(capacity));
    }, [ runtime, capacity ]);

    /**
     * Label for user interface.
     */
    const [ message, setMessage ] = useState<string>("Loading...");

    /**
     * Run the animation loop.
     */
    useEffect(() => {
        if (!runtime || !dataStream || !ref.current) return;
        const canvas: HTMLCanvasElement = ref.current;

        // use location based sunlight function
        const fcn = (t: number) => {
            let days = t / 5000.0 % 365.0;
            let hours = days % 1.0;
            let latitude = 46.0;
            return runtime.photosynthetically_active_radiation(days, latitude, hours);
        };

        canvas.addEventListener("mousemove", ({clientX, clientY}) => {
            const {left, top} = canvas.getBoundingClientRect();
            dataStream.update_cursor(clientX-left, clientY-top);
        });

        [canvas.width, canvas.height] = ["width", "height"].map(
            dim => Number(getComputedStyle(canvas).getPropertyValue(dim).slice(0, -2))
        );

        const start = performance.now();
        let requestId: number|null = null;

        (function render() {
            const time = performance.now() - start;
            dataStream.push(time, fcn(time));
            dataStream.draw(canvas, time, {backgroundColor, streamColor, overlayColor, lineWidth, pointSize, fontSize, tickSize, labelPadding});
            setMessage(`Light (N=${dataStream.size()})`);
            requestId = requestAnimationFrame(render);

        })()

        return () => {if (requestId) cancelAnimationFrame(requestId)};
    }, [ dataStream, ref ]);

    return {
        ref,
        runtime, 
        dataStream,
        message
    }
};


export default useDataStream;