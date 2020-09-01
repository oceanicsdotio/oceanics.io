import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas, addMouseEvents } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 100px;
`;

export default ({
    font=`12px Arial`,
    streamColor=`#DDDD66FF`,
    overlayColor=`#DFDFCDFF`,
    backgroundColor=`#001714CC`,
    lineWidth=2.0,
    pointSize=2.0,
    capacity=1000
}) => {
    /*
    Triangles
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [stream, setStream] = useState(null);
    const [cursor, setCursor] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries
    
    useEffect(() => {
        if (!runtime) return;
        setStream(new runtime.DataStream(capacity));
    }, [runtime]);

    useEffect(() => {
        if (!runtime) return;
        setCursor(new runtime.SimpleCursor(0.0, 0.0)); // Create cursor
    }, [runtime]);

    useEffect(addMouseEvents(ref, cursor), [cursor]);  // track cursor when on canvas

    useEffect(() => {
        /*
        Draw the mesh
        */

        if (!runtime || !stream || !cursor) return;
        // const fcn = x => Math.sin(x/800.0)**2 + Math.random()*0.05;

        let light = new runtime.Light();
        const fcn = t => {
            let days = t / 5000.0 % 365.0;
            let hours = days % 1.0;
            return (light.photosynthetically_active_radiation(days, 46.0, hours));
        };

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);
        

        (function render() {
            
            const time = performance.now() - start;
            stream.push(time, fcn(time));

            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            stream.draw_as_points(ctx, ...shape, streamColor, pointSize);
            stream.draw_mean_line(ctx, ...shape, streamColor, lineWidth);
            stream.draw_axes(ctx, ...shape, overlayColor, 2.0, 5.0)

            cursor.draw(ctx, ...shape, overlayColor, time, 1.0, `${cursor.x},${cursor.y}`);
            
            runtime.draw_caption(ctx, `DataStream (${stream.size()}/${capacity})`, 5.0, shape[1]-5.0, overlayColor, font);
            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [stream, cursor]);

    return <StyledCanvas ref={ref} />;
};