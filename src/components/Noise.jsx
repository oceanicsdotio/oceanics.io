import React, { useEffect, useState, useRef } from "react";
import { StyledCanvas } from "../components/Particles";
import { createTexture, ArrayBuffer, compileShaders, extractUniforms } from "../components/Lagrangian";
import useWasmRuntime from "../hooks/useWasmRuntime";

const exec = (
    runtime, 
    ctx, 
    {
        uniforms={},
        tex=[],
        attrib=[],
        framebuffer=[null, null],
        program={},
        draw_as,
        viewport,
        callback = null
    }
    
) => {

    const [handle, fb_tex] = framebuffer;
    const [type, count] = draw_as;

    ctx.viewport(...viewport);
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, handle);
    if (fb_tex) {
        ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, fb_tex, 0); 
    }
    try {
        ctx.useProgram(program.program);
    } catch (TypeError) {
        console.log("Error loading program", program)
        return;
    }

    tex.forEach(([tex, slot]) => runtime.bind_texture(ctx, tex, slot));
    attrib.forEach(([buffer, handle, numComponents]) => {
        ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
        ctx.enableVertexAttribArray(handle);
        ctx.vertexAttribPointer(handle, numComponents, ctx.FLOAT, false, 0, 0);
    });

    // Format and bind a value to each uniform variable in the context
    Object.entries(uniforms).forEach(([_, [key, [type, value]]]) => {
        const size = value.length || 1;
        if (key in program) {
            ctx[`uniform${size}${type}`](program[key], ...(size === 1 ? [value]: value));
        } else {
            throw Error(`${key} is not a uniform of the shader program.`);
        }
    });

    if ("u_time" in program) {
        ctx[`uniform1f`](program["u_time"], performance.now());
    }

    ctx.drawArrays(type, 0, count);
    if (callback) callback();

};

const doubleBufferedPipeline = (ref, ctx, assets, programs) => {

    const { width, height } = ref.current;
    
    const world = [0, 0, width, height];
    const {
        textures,
        buffers: { quad },
        framebuffer,
        uniforms
    } = assets;
    const { screen, draw } = programs;
    const triangles = [ctx.TRIANGLES, 6];
    const screenBuffer = [framebuffer, textures.screen];
    const quadBuffer = [
        [quad.buffer, "a_pos", 2]
    ];

    let { back, state } = textures;
    
    return [{
        program: screen,
        tex: [
            [state, 1],
            [back, 2]
        ],
        attrib: quadBuffer,
        uniforms: extractUniforms(["u_screen", "u_opacity"], uniforms),
        framebuffer: screenBuffer,
        draw_as: triangles,
        viewport: world
    },{
        program: draw,
        attrib: quadBuffer,
        framebuffer: screenBuffer,
        draw_as: triangles,
        viewport: world
    },{
        program: screen,
        tex: [[textures.screen, 2]],
        uniforms: extractUniforms(["u_opacity"], uniforms),
        attrib: quadBuffer,
        framebuffer: [null, null],
        draw_as: triangles,
        viewport: world,
        callback: () => [back, textures.screen] = [textures.screen, back]  // ! blend alternate frames
    }];
};

export default ({
    opacity = 1.0 // how fast the image blends
}) => {
    /*
    Make some noise
    */

    const ref = useRef(null);

    const [ready, setReady] = useState(false);
    const [assets, setAssets] = useState(null);
    const runtime = useWasmRuntime();
    const [programs, setPrograms] = useState(null);

    const shaders = {
        draw: ["noise-vertex", "noise-fragment"],
        screen: ["quad-vertex", "screen-fragment"]
    };

    useEffect(() => {
    
        if (!ref.current) return;
        const ctx = ref.current.getContext("webgl");
        const { width, height } = ref.current;
        const shape = [width, height];

        setAssets({
            textures: Object.fromEntries(Object.entries({
                screen: { data: new Uint8Array(width * height * 4), shape },
                back: { data: new Uint8Array(width * height * 4), shape }
            }).map(x => createTexture(ctx)(x))),
            buffers: {
                quad: new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
            },
            framebuffer: ctx.createFramebuffer(),
            uniforms: {
                "u_screen" : ["i", 2],
                "u_opacity": ["f", opacity]
            }
        });

    }, [ref]);

    useEffect(compileShaders(runtime, ref, assets, shaders, setPrograms, setReady), [runtime, assets]);

    useEffect(() => {

        let requestId;
        if (!runtime || !ref.current || !assets || !ready) return;
        const ctx = ref.current.getContext("webgl");
        if (!ctx) return;

        const steps = doubleBufferedPipeline(ref, ctx, assets, programs);
        (function render() {
            steps.forEach(x => exec(runtime, ctx, x));
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [programs, ready]);

    return <StyledCanvas ref={ref}/>
};