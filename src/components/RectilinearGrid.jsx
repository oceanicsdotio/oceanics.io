import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas, addMouseEvents } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    font="24px Arial",
    shape=[25,25],
    gridColor=`#EF5FA1FF`,
    overlayColor=`#77CCFFFF`,
    backgroundColor=`#00000088`,
    caption=`RectilinearGrid`,
    lineWidth=2.0
}) => {
    /*
    Rectangles
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [grid, setGrid] = useState(null);
    const [cursor, setCursor] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    useEffect(() => {
        // Create grid
        if (runtime) setGrid(new runtime.RectilinearGrid(...shape));
    }, [runtime]);

    useEffect(() => {
        if (!runtime) return;
        setCursor(new runtime.SimpleCursor(0.0, 0.0)); // Create cursor
    }, [runtime]);

    useEffect(addMouseEvents(ref, cursor), [cursor]);  // track cursor when on canvas


    useEffect(() => {
        /*
        Draw the grid
        */

        if (!runtime || !grid) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, "2d");

        (function render() {

            let time = performance.now() - start
            
            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            grid.animation_frame(ctx, ...shape, frames, gridColor);
            cursor.draw(ctx, ...shape, overlayColor, time, lineWidth);
            runtime.draw_caption(ctx, caption, 0.0, shape[1], overlayColor, font);
            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [grid]);

    return <StyledCanvas ref={ref} />;
};