import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas } from "../components/Canvas";
import styled from "styled-components";

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
    caption=`TriangularMesh`,
    alpha=1.0,
    lineWidth=1.0,
}) => {
    /*
    Triangles
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [mesh, setMesh] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    useEffect(() => {
        if (runtime) setMesh(new runtime.TriangularMesh(...shape)); // Create mesh
    }, [runtime]);


    useEffect(() => {
        /*
        Draw the mesh
        */

        if (!runtime || !mesh) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);

        (function render() {
            
            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            mesh.draw(ctx, ...shape, gridColor, alpha, lineWidth);
            runtime.draw_caption(ctx, caption, 0.0, shape[1], overlayColor, font);
            frames = runtime.draw_fps(ctx, frames, performance.now() - start, overlayColor);
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [mesh]);

    return <StyledCanvas ref={ref} />;
};