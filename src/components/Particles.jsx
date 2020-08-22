import React, { useState, useEffect, useRef } from "react";
import { loadRuntime } from "../components/Canvas";
import styled from "styled-components";


export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    count=24, 
    font="24px Arial",
    fade=1.0,
    zero=0.2,
    padding=0.0,
    radius=10,
    drag=0.001,
    bounce=0.2 
}) => {
    /*
    Particles component creates a Canvas element and data structure representing
    a fully connected network of N particles.

    Default behavior is to be a passive spring system. The properties and rules interact
    and can create complex emergent behaviors depending on their configuration.

    Spring physics are handled by a Rust/WASM library.
    */

    const ref = useRef(null);
    const [runtime, setRuntime] = useState(null);
    const [particleSystem, setParticleSystem] = useState(null);

    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    useEffect(() => {
        /*
        Create particle system and initialize spring forces
        */
        if (runtime) setParticleSystem(new runtime.Group(count));
    }, [runtime]);


    useEffect(() => {
        /*
        If the WASM runtime is loaded and particle set has been created, 
        get the size of the displayed canvas
        and draw the data structure passed as a prop. 
        */

        if (!runtime || !particleSystem) return;

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        let requestId;
        let lastRender = null;
        let frames = 0;

        const start = performance.now();
        const ctx = ref.current.getContext("2d");
        const shape = [ref.current.width, ref.current.height, 200];
        const overlayColor = "#77CCFF";
        
        (function render() {
            
            particleSystem.update_links();
            let ts = performance.now();

            runtime.clear_rect_blending(ctx, ...shape.slice(0, 2), `#000000CC`);
            particleSystem.draw(ctx, ...shape.slice(0, 2), fade, radius, "#FFFFFF");
            runtime.draw_caption(ctx, `N=${count}`, 0.0, ref.current.height, overlayColor, font);

            frames = runtime.draw_fps(ctx, frames, ts - start, overlayColor);
            requestId = requestAnimationFrame(render);
            lastRender = ts;
        
            
        })()

        return () => cancelAnimationFrame(requestId);
    }, [particleSystem]);

    return <StyledCanvas ref={ref} />;
};