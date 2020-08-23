import React, { useState, useEffect, useRef } from "react";
import { loadRuntime, targetHtmlCanvas } from "../components/Canvas";
import styled from "styled-components";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
`;

export default ({
    count=16, 
    font="24px Arial",
    fade=0.75,
    zero=0.9,
    stop=0.35,
    padding=0.0,
    radius=16,
    drag=0.001,
    bounce=0.5,
    particleColor="#FFFFFFFF",
    backgroundColor="#00000088",
    overlayColor="#77CCFFFF"
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
        if (runtime) setParticleSystem(new runtime.Group(count, zero, stop));
    }, [runtime]);


    useEffect(() => {
        /*
        If the WASM runtime is loaded and particle set has been created, 
        get the size of the displayed canvas
        and draw the data structure passed as a prop. 
        */
        if (!runtime || !particleSystem) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, "2d");

        (function render() {
            // solve the N-body forces, then draw scene
            particleSystem.update_links(padding, drag, bounce);
            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);
            particleSystem.draw(ctx, ...shape, fade, radius, particleColor);
            runtime.draw_caption(ctx, `N=${count}`, 0.0, shape[1], overlayColor, font);

            frames = runtime.draw_fps(ctx, frames, performance.now() - start, overlayColor);
            requestId = requestAnimationFrame(render);; 
        })()

        return () => cancelAnimationFrame(requestId);
    }, [particleSystem]);

    return <StyledCanvas ref={ref} />;
};