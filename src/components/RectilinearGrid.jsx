import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    font="24px Arial",
    shape=[25,25],
    gridColor="#FF00FFFF",
    overlayColor="#77CCFFFF",
    backgroundColor=`#00000088`,
    caption=`RectilinearGrid`,
}) => {
    /*
    Rectangles
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [grid, setGrid] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    useEffect(() => {
        /*
        Create grid
        */
        if (runtime) setGrid(new runtime.RectilinearGrid(...shape));
    }, [runtime]);


    useEffect(() => {
        /*
        Draw the grid
        */

        if (!runtime || !grid) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, "2d");

        (function render() {
            
            runtime.clear_rect_blending(ctx, ...shape.slice(0, 2), backgroundColor);
            grid.animation_frame(ctx, ...shape.slice(0, 2), frames, performance.now() - start, gridColor);
            runtime.draw_caption(ctx, caption, 0.0, shape[1], overlayColor, font);
            frames = runtime.draw_fps(ctx, frames, performance.now() - start, overlayColor);
            requestId = requestAnimationFrame(render);; 
        })()

        return () => cancelAnimationFrame(requestId);
    }, [grid]);

    return <StyledCanvas ref={ref} />;
};