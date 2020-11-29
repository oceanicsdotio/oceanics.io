import { useState, useEffect } from "react";
import useWasmRuntime from "../hooks/useWasmRuntime";


export default ({
    ref,
    shape=[32, 32, 1],
    gridColor=`#421F33FF`,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#00000066`,
    lineWidth=1.5,
    tickSize=10.0,
    fontSize=12.0,
    labelPadding=2.0,
    stencil=0,
}) => {
    /*
    Rectangles
    */
    const layers = 1;
    const runtime = useWasmRuntime();
    const [grid, setGrid] = useState(null);
    const style = {backgroundColor, gridColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding};

    useEffect(() => {if (runtime) setGrid(new runtime.InteractiveGrid(...shape, stencil));}, [runtime]);

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
            grid.unsafe_animate();
            grid.draw(ref.current, time, style);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [grid]);

    return {grid};
};