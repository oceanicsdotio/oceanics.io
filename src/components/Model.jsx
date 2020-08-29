import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas, addMouseEvents } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    font=`16px Arial`,
    meshColor=`#AFFFD6FF`,
    overlayColor=`#77CCFFFF`,
    backgroundColor=`#000000CC`,
    alpha=0.25,
    lineWidth=0.1,
}) => {
    /*
    Triangles
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [mesh, setMesh] = useState(null);
    const [cursor, setCursor] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries
    useEffect(addMouseEvents(ref, cursor), [cursor]);  // track cursor when mouse interacts with canvas

    useEffect(() => {
        /*
        Generate a 2D or 3D mesh model. Currenlty this can only pull
        from pre-program generators, but  in the future we will support
        interactively building up models through a text-based and graphical
        user interface. 

        The model structure is populated on demand during the draw effect.
        */
        if (!runtime) return;
        let assembly = new runtime.Shipyard();

        assembly.build_ship(16);
        // assembly.scale(0.35, 0.35, 0.35);
        assembly.scale(0.5, 0.5, 0.5);
        assembly.shift(0.0, 0.0, -0.4);

        setMesh(
            assembly
        ); 
    }, [runtime]);

    useEffect(() => {
        /*
        Initialize the cursor effects interface. This provides visual feedback and 
        validates that interaction is happening in the correct area of the 
        HTML canvas. 
        */
        if (!runtime) return;
        setCursor(new runtime.SimpleCursor(0.0, 0.0)); // Create cursor
    }, [runtime]);

    useEffect(() => {
        /*
        First populate the mesh data structure with points and topology
        from preprogrammed routines.
        
        Then draw the mesh in an animation loop. 
        */

        if (!runtime || !mesh) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);

        // try {
        //     mesh.sphere(24);
        // } catch (err) {
        //     console.log(`There was a problem populating mesh:`, {mesh});
        // }
        
        let previous;

        (function render() {
            const time = performance.now() - start;

            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            let elapsed = (time-(previous||0.0));
            
            mesh.rotate_in_place(-0.00005*elapsed, 0.0, 1.0, 0.0);
            mesh.rotate_in_place(0.000025*elapsed, 1.0, 0.0, 0.0);
            mesh.rotate_in_place(-0.0003*elapsed, 0.0, 0.0, 1.0);
               
            let triangles = mesh.draw(ctx, ...shape, alpha, lineWidth*2.0, 0.0);

            // mesh.rotate_in_place(-0.00015*(elapsed+10.0), 0.0, 1.0, 0.0);
            // mesh.rotate_in_place(0.0001*(elapsed+10.0), 1.0, 0.0, 0.0);
            // mesh.rotate_in_place(-0.0003*(elapsed+10.0), 0.0, 0.0, 1.0);

            // triangles = mesh.draw_edges(ctx, ...shape, `#FFFFFFFF`, 1.0, lineWidth, 0.0);

            cursor.draw(ctx, ...shape, overlayColor, time, lineWidth);
            runtime.draw_caption(ctx, `Triangles=${triangles}`, 0.0, shape[1], overlayColor, font);
            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);

            previous = time;

        })()

        return () => cancelAnimationFrame(requestId);
    }, [mesh]);

    return <StyledCanvas ref={ref} />;
};