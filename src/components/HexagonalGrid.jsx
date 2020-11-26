import React, { useState, useEffect, useRef } from "react";
import { targetHtmlCanvas, addMouseEvents } from "./Canvas";
import styled from "styled-components";
import useWasmRuntime from "../hooks/useWasmRuntime";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    font=`24px Arial`,
    shape=[25,25],
    gridColor=`#EF5FA1FF`,
    overlayColor=`#77CCFFFF`,
    backgroundColor=`#00000088`,
    caption=`HexagonalGrid`,
    alpha=1.0,
    lineWidth=1.0,
}) => {
    /*
    Triangles
    */

    const ref = useRef(null);
    const runtime = useWasmRuntime();
    const [grid, setGrid] = useState(null);
    const [cursor, setCursor] = useState(null);

    useEffect(() => {
        if (runtime) setGrid(new runtime.HexagonalGrid(shape[0])); // Create mesh
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

    return <StyledCanvas ref={ref} />;
};