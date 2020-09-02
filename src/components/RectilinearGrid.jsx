import React, { useState, useEffect, useRef } from "react";
import { loadRuntime } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
    cursor: none;
`;

export default ({
    shape=[32,32,1],
    gridColor=`#421F33FF`,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#00000066`,
    lineWidth=1.5,
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

    useEffect(() => {if (runtime) setGrid(new runtime.InteractiveGrid(...shape, 1));}, [runtime]);

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