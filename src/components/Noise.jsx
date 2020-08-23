import React, { useEffect, useState, useRef } from "react";
import { loadRuntime } from "../components/Canvas";
import { StyledCanvas } from "../components/Particles";
import { createTexture, ArrayBuffer, compileShaders, exec } from "../components/Lagrangian";


export default ({
    res = 100,
    opacity = 0.98 // how fast the particle trails fade on each frame
}) => {
    /*
    Use WebGL to calculate particle trajectories from velocity data. This example uses wind
    data to move particles around the globe. 

    The velocity field is static, but in the future the component will support pulling frames
    from video or gif formats. 
    */

    const ref = useRef(null);

    const [ready, setReady] = useState(false);
    const [assets, setAssets] = useState(null);
    const [runtime, setRuntime] = useState(null);
    const [programs, setPrograms] = useState(null);
    const [particles, setParticles] = useState(null);

    const shaders = {
        draw: ["noise-vertex", "noise-fragment"],
        screen: ["quad-vertex", "screen-fragment"]
    };

    useEffect(() => {
        /*
        Create a random distribution of particle positions encoded as 4-byte colors.

        This is the default behavior, but it is broken out as a effect so that additional logic
        can be applied, or initial positions can be loaded from a database or static file.
        
        */
        const count = res * res;
        setParticles(new Uint8Array(Array.from({ length: count * 4 }, () => Math.floor(Math.random() * 256))));
        console.log(`Prefetch ${count} particle positions.`);
    }, []);

    useEffect(loadRuntime(setRuntime), []);  // web assembly binaries

    useEffect(() => {
    
        if (!ref.current || !particles) return;

        const { width, height } = ref.current;
        const ctx = ref.current.getContext("webgl");
        const shape = [width, height];

        const textures = Object.fromEntries(Object.entries({
            screen: { data: new Uint8Array(width * height * 4), shape },
            back: { data: new Uint8Array(width * height * 4), shape },
            state: { data: particles, shape: [res, res] },
            previous: { data: particles, shape: [res, res] },
        }).map(x => createTexture(ctx)(x)));

        setAssets({
            textures,
            buffers: {
                quad: new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
                index: new ArrayBuffer(ctx, particles)
            },
            framebuffer: ctx.createFramebuffer()
        });

        

    }, [ref, particles]);

    useEffect(compileShaders(runtime, ref, assets, shaders, setPrograms, setReady), [runtime, assets]);

    useEffect(() => {

        let requestId;
        if (!runtime || !ref.current || !assets || !ready) return;

        const { width, height } = ref.current;
        const ctx = ref.current.getContext("webgl");

        if (!ctx) return;

        const world = [0, 0, width, height];
        const {
            textures,
            buffers: { quad, index },
            framebuffer
        } = assets;
        const { screen, draw } = programs;
        const triangles = [ctx.TRIANGLES, 6];
        const screenBuffer = [framebuffer, textures.screen];
        const quadBuffer = [
            [quad.buffer, "a_pos", 2]
        ];

        let { back, state } = textures;

        const uniforms = {
            "u_screen" : ["i", 2],
            "u_opacity": ["f", opacity],
            "u_particles": ["i", 1],
            "u_particles_res": ["f", res]
        };

        const steps = [{
            program: screen,
            components: {
                tex: [
                    [state, 1],
                    [back, 2]
                ],
                attrib: quadBuffer,
                uniforms: ["u_screen", "u_opacity"],
                framebuffer: screenBuffer
            },
            draw_as: triangles,
            viewport: world
        },{
            program: draw,
            components: {
                attrib: [[index.buffer, "a_index", 1]],
                uniforms: ["u_particles", "u_particles_res"],
                framebuffer: screenBuffer
            },
            draw_as: [ctx.POINTS, res * res],
            viewport: world
        },{
            program: screen,
            components: {
                tex: [[textures.screen, 2]],
                uniforms: ["u_opacity"],
                attrib: quadBuffer,
                framebuffer: [null, null]
            },
            draw_as: triangles,
            viewport: world,
            callback: () => [back, textures.screen] = [textures.screen, back]  // ! blend alternate frames
        }];

        (function render() {
            steps.map(x => exec(runtime, ctx, uniforms, x));
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [programs, ready]);

    return <StyledCanvas ref={ref} />
};