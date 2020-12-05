import { useEffect, useState, useRef } from "react";

import { 
    useGlslShaders, 
    createTexture, 
    ArrayBuffer, 
    extractUniforms 
} from "../hooks/useGlslShaders";
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
    const [_type, count] = draw_as;
    const type = ctx[_type];

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

const doubleBufferedPipeline = (ref, assets, programs) => {

    const { width, height } = ref.current;
    
    const world = [0, 0, width, height];
    const {
        textures,
        buffers: { quad },
        framebuffer,
        uniforms
    } = assets;
    const { screen, draw } = programs;
    const triangles = ["TRIANGLES", 6];
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

/**
 * Make some noise
 */
export default ({
    opacity = 1.0 // how fast the image blends
}) => {
   
    const [assets, setAssets] = useState(null);
    const ref = useRef(null);

    const runtime = useWasmRuntime();
    const {programs} = useGlslShaders({
        ref, 
        shaders: {
            draw: ["noise-vertex", "noise-fragment"],
            screen: ["quad-vertex", "screen-fragment"]
        }
    });

    useEffect(() => {
    
        if (!ref || !ref.current) return;

        const ctx = ref.current.getContext("webgl");
        const { width, height } = ref.current;
        const shape = [width, height];
        const size = width * height * 4;

        setAssets({
            textures: 
                Object.fromEntries(Object.entries({
                    screen: { data: new Uint8Array(size), shape },
                    back: { data: new Uint8Array(size), shape }
                }).map(([k, v]) => [k, createTexture({ctx, ...v})])),
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


    useEffect(() => {

        let requestId;
        if (!runtime || !ref.current || !assets || !programs) return;
        const ctx = ref.current.getContext("webgl");
        if (!ctx) return;

        const steps = doubleBufferedPipeline(ref, assets, programs);
        (function render() {
            steps.forEach(x => exec(runtime, ctx, x));
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [programs]);

    return {ref};

};