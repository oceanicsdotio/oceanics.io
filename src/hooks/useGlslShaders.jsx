import { useEffect, useState, useRef } from "react";

import noiseVertex from "raw-loader!../glsl/noise-vertex.glsl";
import noiseFragment from "raw-loader!../glsl/noise-fragment.glsl";
import quadVertex from "raw-loader!../glsl/quad-vertex.glsl";
import updateFragment from "raw-loader!../glsl/update-fragment-test.glsl";
import screenFragment from "raw-loader!../glsl/screen-fragment.glsl";
import drawVertex from "raw-loader!../glsl/draw-vertex-test.glsl";
import drawFragment from "raw-loader!../glsl/draw-fragment-test.glsl";

import Worker from "./useGlslShaders.worker.js";
import useWasmRuntime from "./useWasmRuntime";


/**
 * Abstraction for binding array data into GPU memory
 */
export class ArrayBuffer {
    constructor(ctx, data) {
        this.buffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(data), ctx.STATIC_DRAW);
    }
};


const screenBuffer = (w, h) => Object({ data: new Uint8Array(w * h * 4), shape: [w, h] })


export const extractUniforms = (keys, uniforms) => 
    keys.map(k => [k, uniforms[k]]);


/**
 * Name of the GLSL variable for particle positions
 */
const VERTEX_ARRAY_BUFFER = "a_index";


/**
 * Name of the GLSL variable for rectangle of two triangles
 */
const QUAD_ARRAY_BUFFER = "a_pos";


/**
 * Generate the array buffers and handles for double buffering.
 */
export const VertexArrayBuffers = (ctx, vertexArray=null) => Object({
    quad: [(new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1])).buffer, QUAD_ARRAY_BUFFER, 2],
    index: vertexArray ? [(new ArrayBuffer(ctx, vertexArray)).buffer, VERTEX_ARRAY_BUFFER, 1] : null
});


// memoize the shaders as they are loaded
const shaderSource = {
    "quad-vertex": quadVertex,
    "noise-vertex": noiseVertex,
    "noise-fragment": noiseFragment,
    "update-fragment": updateFragment,
    "screen-fragment": screenFragment,
    "draw-fragment": drawFragment,
    "draw-vertex": drawVertex
};


/**
 * Name of time variable in shader source code. The handle for the uniform
 * is hoisted to the program object during compilation.
 */
const CLOCK_UNIFORM = "u_time";


/**
 * Memoize warnings so that they do not print on every iteration
 * of the 
 */
const printedWarnings = {};

/**
 * Execute a shader program and all binding steps needed to make data
 * available to the hardware
 */
const renderPipelineStage = ({
    runtime, 
    ctx, 
    uniforms, 
},{
    textures=[],
    attributes=[],
    framebuffer: [
        handle=null, 
        texture=null
    ],
    parameters=[],
    program={},
    topology: [
        type, 
        count
    ],
    viewport,
    callback = null,
}) => {

    ctx.viewport(...viewport);
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, handle);

    

    /**
     * Ensure any required framebuffer is attached before trying to load the
     * shader programs.
     */
    if (texture)
        ctx.framebufferTexture2D(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.TEXTURE_2D, texture, 0); 
    
    /**
     * Attempt to use the program, and quit if there is a problem in the GLSL code.
     */
    try {
        ctx.useProgram(program.program);
    } catch (TypeError) {
        console.log("Error loading program", program)
        return;
    }

    /**
     * Load textures into meory
     */
    textures.forEach(([tex, slot]) => runtime.bind_texture(ctx, tex, slot));
    
    /**
     * Bind vertex attribute arraybuffers to hardware memory handles
     */
    attributes.forEach(([buffer, handle, numComponents]) => {
        ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
        ctx.enableVertexAttribArray(handle);
        ctx.vertexAttribPointer(handle, numComponents, ctx.FLOAT, false, 0, 0);
    });

    /**
     * Format and bind a value to each uniform variable in the context.
     * 
     * If someone supplies a variable name that is not part of the program,
     * then we warn them. Most likely case is that the shader itself has
     * changed.
     */ 
    parameters.forEach((key) => {
        const [type, value] = uniforms[key];
        const size = value.length || 1;
        if (key in program) {
            ctx[`uniform${size}${type}`](program[key], ...(size === 1 ? [value]: value));
        } else {
            const msg = `${key} is not a uniform of the shader program.`;
            if (key in printedWarnings) return;
            printedWarnings[key] = true;
            console.warn(msg);
        }
    });

    /**
     * Update clock for deterministic simulation components and psuedo random
     * number generation.
     */
    if (CLOCK_UNIFORM in program) 
        ctx[`uniform1f`](program[CLOCK_UNIFORM], performance.now());
    
    /**
     * Draw the data to the target texture or screen buffer.
     */
    ctx.drawArrays(type, 0, count);

    /**
     * Execute a callback function, currently intended to swap buffers between rendering
     * steps when using double buffering to/from textures for state and rendering targets.
     */
    if (callback) callback();
    
};


export const renderPipeline = (
    runtime, 
    ctx, 
    uniforms,
    pipeline
) => {
    const args = {runtime, ctx, uniforms};
    pipeline.forEach(step => renderPipelineStage(args, step));
};


export const createTexture = ({ 
    ctx, 
    filter = "NEAREST", 
    data, 
    shape = [null, null] 
}) => {

    let texture = ctx.createTexture();
    const args = data instanceof Uint8Array ? [...shape, 0] : [];

    ctx.bindTexture(ctx.TEXTURE_2D, texture);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ...args, ctx.RGBA, ctx.UNSIGNED_BYTE, data);
    
    [
        [ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE],
        [ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE],
        [ctx.TEXTURE_MIN_FILTER, ctx[filter]],
        [ctx.TEXTURE_MAG_FILTER, ctx[filter]]
    ].forEach(
        ([a, b]) => { ctx.texParameteri(ctx.TEXTURE_2D, a, b) }
    );
    ctx.bindTexture(ctx.TEXTURE_2D, null);  // prevent accidental use

    return texture
};


/**
IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the 
shaders as programs.

This is executed only once, after the WASM runtime is loaded. 
*/
export const useGlslShaders = ({ 
    shaders,
    fractal=true
}) => {
   
    const [assets, setAssets] = useState(null);
    const [programs, setPrograms] = useState(null);
    const runtime = useWasmRuntime();

    const ref = useRef(null);
    const secondary = useRef(null);
    
    const worker = useRef(null);

    /**
     * Create worker
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    const validContext = () => 
        (typeof ref === "undefined" || !ref || !ref.current) ? false : ref.current.getContext("webgl");


    useEffect(() => {
        const ctx = validContext();
        if (!ctx || !runtime) return;
       
        (async () => {
            
            const compiled = Object.fromEntries(await Promise.all(Object.entries(shaders).map(async ([programName, pair]) => {
    
                let [vs, fs] = pair.map(async (file) => {
                    if (!(file in shaderSource)) shaderSource[file] = await runtime.fetch_text(`/${file}.glsl`)
                    return shaderSource[file];
                });
                const program = runtime.create_program(ctx, await vs, await fs);
                let wrapper = { program };

                [
                    ["ATTRIBUTES", "Attrib"], 
                    ["UNIFORMS", "Uniform"]
                ].forEach(
                    ([key, fcn])=>{
                        for (let ii = 0; ii < ctx.getProgramParameter(program, ctx[`ACTIVE_${key}`]); ii++) {
                            const { name } = ctx[`getActive${fcn}`](program, ii);
                            wrapper[name] = ctx[`get${fcn}Location`](program, name);
                        }
                    }
                );

                return [programName, wrapper];
            })));
    
            setPrograms(compiled);
        })();
    }, [runtime, ref]);

    const [pipeline, setPipeline] = useState(null);

    useEffect(() => {

        const ctx = validContext();
        if (!runtime || !ctx || !assets || !pipeline) return;
        let requestId;
        
        (function render() {
            renderPipeline(runtime, ctx, assets.uniforms, pipeline);
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [runtime, assets, pipeline, ref ]);


    useEffect(() => {
        const ctx = validContext();
        if (!fractal || !ctx) return;

        const { width, height } = ref.current;

        setAssets({
            textures: 
                Object.fromEntries(Object.entries({
                    screen: screenBuffer(width, height),
                    back: screenBuffer(width, height)
                }).map(([k, v]) => [k, createTexture({ctx, ...v})])),
            buffers: VertexArrayBuffers(ctx),
            framebuffer: ctx.createFramebuffer(),
            uniforms: {
                "u_screen" : ["i", 2],
                "u_opacity": ["f", 1.0]
            }
        });

    }, [ref]);


    useEffect(() => {

        const ctx = validContext();

        if (!fractal || !runtime || !ctx || !assets || !programs) return;
        
        const viewport = [0, 0, ref.current.width, ref.current.height];
    
        setPipeline([
            {
                program: programs.screen,
                textures: [
                    [assets.textures.state, 1],
                    [assets.textures.back, 2]
                ],
                parameters: ["u_screen", "u_opacity"],
                attributes: [assets.buffers.quad],
                framebuffer: [assets.framebuffer, assets.textures.screen],
                topology: [ctx.TRIANGLES, 6],
                viewport
            },
            {
                program: programs.draw,
                attributes: [assets.buffers.quad],
                framebuffer: [assets.framebuffer, assets.textures.screen],
                topology: [ctx.TRIANGLES, 6],
                viewport
            },
            {
                program: programs.screen,
                textures: [[assets.textures.screen, 2]],
                parameters: ["u_opacity"],
                attributes: [assets.buffers.quad],
                framebuffer: [null, null],
                topology: [ctx.TRIANGLES, 6],
                viewport
            }
        ]);
    }, [programs]);

    return {
        ref,
        programs,
        runtime,
        validContext,
        VertexArrayBuffers,
        createTexture,
        renderPipeline,
        renderPipelineStage,
        extractUniforms,
        setAssets,
        setPipeline,
        assets,
        secondary
    }
};

export default useGlslShaders;

