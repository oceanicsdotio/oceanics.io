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
    lineWidth=1.0,
    fontSize=16.0,
    tickSize=10.0,
    labelPadding=5.0,
    particleColor="#FFFFFFFF",
    backgroundColor="#000000FF",
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
    const style = {backgroundColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding};


    useEffect(loadRuntime(setRuntime), []);  // load WASM binaries

    useEffect(() => {
        /*
        Create particle system and initialize spring forces
        */
        if (runtime) setParticleSystem(new runtime.InteractiveGroup(count, zero, stop));
    }, [runtime]);


    useEffect(() => {
        /*
        Animate the particle system
        */
        if (!runtime || !particleSystem) return;

        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            particleSystem.update_cursor(clientX-left, clientY-top);
        });

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            particleSystem.draw(ref.current, time, style);
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [particleSystem]);

    return <StyledCanvas ref={ref} />;
};