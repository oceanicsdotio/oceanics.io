import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas, addMouseEvents } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    fontSize=12.0,
    shape=[32,32],
    meshColor=`#EF5FA1CC`,
    overlayColor=`#CCCCCCFF`,
    backgroundColor=`#00000088`,
    lineWidth=1.0,
    labelPadding=2.0,
    tickSize=10.0
}) => {
    /*
    Triangles
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [mesh, setMesh] = useState(null);
    const style = [backgroundColor, meshColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding];

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    useEffect(() => {
        if (runtime) setMesh(new runtime.InteractiveMesh(...shape)); // Create mesh
    }, [runtime]);

    useEffect(() => {
        /*
        Draw the mesh
        */
        if (!runtime || !mesh) return;

        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            mesh.update_cursor(clientX-left, clientY-top);
        });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            mesh.draw(ref.current, ...style, time);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [mesh]);

    return <StyledCanvas ref={ref} />;
};