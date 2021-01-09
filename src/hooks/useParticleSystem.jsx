import { useState, useEffect, useRef } from "react";
import useWasmRuntime from "./useWasmRuntime";


export default ({
    count=9,
    zero=0.2,
    radius=8.0,
    drag=0.05,
    bounce=0.95,
    springConstant=0.2,
    timeConstant=0.000001,
    collisionThreshold=0.001,
    fade=0.7,
    lineWidth=1.0,
    fontSize=16.0,
    tickSize=10.0,
    labelPadding=5.0,
    particleColor="#FFFFFFFF",
    backgroundColor="#00000033",
    overlayColor="#77CCFFFF",
}) => {
    /*
    Particles component creates a Canvas element and data structure representing
    a fully connected network of N particles.

    Default behavior is to be a passive spring system. The properties and rules interact
    and can create complex emergent behaviors depending on their configuration.

    Spring physics are handled by Rust/WASM.
    */

    const ref = useRef(null);
    const runtime = useWasmRuntime();
    const [particleSystem, setParticleSystem] = useState(null);
    const style = {backgroundColor, overlayColor, lineWidth, fontSize, tickSize, labelPadding, fade, radius, particleColor, radius};

    useEffect(() => {
        /*
        Create particle system and initialize spring forces
        */
        if (runtime) setParticleSystem(new runtime.InteractiveGroup(count, zero, springConstant, 0.0));
    }, [runtime]);

    const mouseMoveEventListener = (canvas, data) => {
        // recursive use error on line below when panic! in rust
        const eventType = 'mousemove';
        const listener = ({clientX, clientY}) => {
            try {
                const {left, top} = canvas.getBoundingClientRect();
                data.updateCursor(clientX-left, clientY-top);
            } catch (err) {
                canvas.removeEventListener(eventType, listener);
                console.log(`Unregistering '${eventType}' events due to error: ${err}.`);
            }  
        }

        console.log(`Registering '${eventType}' events.`)
        return [eventType, listener]
    };

    useEffect(() => {
        /*
        Animate the particle system
        */
        if (!runtime || !particleSystem) return;
        const canvas = ref.current;

        canvas.addEventListener(...mouseMoveEventListener(ref.current, particleSystem));

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const start = performance.now();
        let requestId = null;

        (function render() {
            const time = performance.now() - start;
            
            particleSystem.updateState(drag, bounce, timeConstant, collisionThreshold);
            particleSystem.draw(canvas, time, collisionThreshold, style);
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [particleSystem]);
};