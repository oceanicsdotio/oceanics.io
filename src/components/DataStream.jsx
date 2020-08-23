import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas, addMouseEvents } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    font=`24px Arial`,
    overlayColor=`#77CCFFFF`,
    backgroundColor=`#00000088`,
    caption=`DataStream`,
    alpha=1.0,
    lineWidth=2.0,
    pointSize=4.0
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
        setStream(new runtime.DataStream(500)); // Create mesh
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
        const fcn = x => Math.sin(x/800.0)**2 + Math.random()*0.05

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);

        (function render() {
            
            const time = performance.now() - start;
            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            stream.push(time, fcn(time));
            stream.draw(ctx, ...shape, "#FFFFFF", pointSize, lineWidth, alpha);
            cursor.draw(ctx, ...shape, overlayColor, time, lineWidth);
            
            runtime.draw_caption(ctx, caption, 0.0, shape[1], overlayColor, font);
            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [stream, cursor]);

    return <StyledCanvas ref={ref} />;
};