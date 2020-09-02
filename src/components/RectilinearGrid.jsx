import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas, addMouseEvents } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    shape=[25,25,1],
    gridColor=`#444488FF`,
    overlayColor=`#77CCFFFF`,
    backgroundColor=`#00000088`,
    lineWidth=2.0,
    tickSize=10.0,
    fontSize=12.0,
    labelPadding=2.0,
}) => {
    /*
    Rectangles
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [grid, setGrid] = useState(null);
    const style = [backgroundColor, gridColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding];

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    useEffect(() => {
        // Create grid
        if (runtime) setGrid(new runtime.InteractiveGrid(...shape));
    }, [runtime]);

    useEffect(() => {
        /*
        Draw the grid
        */

        if (!runtime || !grid) return;

        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            grid.update_cursor(clientX-left, clientY-top);
        });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            grid.draw(ref.current, ...style, time);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [grid]);

    return <StyledCanvas ref={ref} />;
};