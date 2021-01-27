import { useState, useEffect } from "react";
import useWasmRuntime from "../hooks/useWasmRuntime";
import {lichen} from "../palette";

/*
 * Time series data
 */
export default ({
    ref,
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
   

    
    const runtime = useWasmRuntime();
    const [stream, setStream] = useState(null);
    const style = {backgroundColor, streamColor, overlayColor, lineWidth, pointSize, fontSize, tickSize, labelPadding}; 
    
    useEffect(() => {
        if (runtime) setStream(new runtime.InteractiveDataStream(capacity));
    }, [runtime]);

    useEffect(() => {
       
        if (!runtime || !stream || ref === undefined) return;

        // use location based sunlight function
        const fcn = t => {
            let days = t / 5000.0 % 365.0;
            let hours = days % 1.0;
            let latitude = 46.0;
            return (runtime.photosynthetically_active_radiation(days, latitude, hours));
        };

        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            stream.update_cursor(clientX-left, clientY-top);
        });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            stream.push(time, fcn(time));
            stream.draw(ref.current, time, style);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [stream, ref]);

    return {runtime, dataStream: stream}

};