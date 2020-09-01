import React, { useState, useEffect, useRef } from "react";
import { loadRuntime } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 100px;
    cursor: none;
`;

export default ({
    streamColor=`#BBCC8888`,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#001010CC`,
    lineWidth=2.0,
    pointSize=2.0,
    capacity=500,
    tickSize=10.0,
    fontSize=12.0,
    labelPadding=2.0,
}) => {
    /*
    Time series data
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [stream, setStream] = useState(null);
    const style = [backgroundColor, streamColor, overlayColor, lineWidth, pointSize, fontSize, tickSize, labelPadding]; 

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries
    
    useEffect(() => {
        if (runtime) {setStream(new runtime.InteractiveDataStream(capacity))};
    }, [runtime]);

    useEffect(() => {
       
        if (!runtime || !stream) return;

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

        let requestId = null;
        const start = performance.now();

        (function render() {
            const time = performance.now() - start;
            stream.push(time, fcn(time));
            stream.draw(ref.current, ...style, time);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [stream]);

    return <StyledCanvas ref={ref} />;
};