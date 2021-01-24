import { useEffect, useState } from "react";

import useWasmRuntime from "./useWasmRuntime";
import noiseVertex from "raw-loader!../glsl/noise-vertex.glsl";
import noiseFragment from "raw-loader!../glsl/noise-fragment.glsl";
import quadVertex from "raw-loader!../glsl/quad-vertex.glsl";
import updateFragment from "raw-loader!../glsl/update-fragment-test.glsl";
import screenFragment from "raw-loader!../glsl/screen-fragment.glsl";
import drawVertex from "raw-loader!../glsl/draw-vertex-test.glsl";
import drawFragment from "raw-loader!../glsl/draw-fragment-test.glsl";

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
 * Returns falsey value if there is no graphics context available,
 * otherwise return the context handle.
 */
const validContext = (ref) => () => 
    (!ref || !ref.current) ? false : ref.current.getContext("webgl");
    


/**
 * Name of time variable in shader source code. The handle for the uniform
 * is hoisted to the program object during compilation.
 */
const CLOCK_UNIFORM = "u_time";



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
     */ 
    parameters.forEach((key) => {
        const [type, value] = uniforms[key];
        const size = value.length || 1;
        if (key in program) {
            ctx[`uniform${size}${type}`](program[key], ...(size === 1 ? [value]: value));
        } else {
            throw Error(`${key} is not a uniform of the shader program.`);
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
    const textureArgs = [ctx.TEXTURE_2D, 0, ctx.RGBA, ...args, ctx.RGBA, ctx.UNSIGNED_BYTE, data];

    try {
        ctx.texImage2D(...textureArgs);
    } catch (err) {
        throw err;
    }

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
    ref, 
    shaders,
    callback=null
}) => {
   
    const [programs, setPrograms] = useState(null);
    const runtime = useWasmRuntime();

    useEffect(() => {

        if (!runtime || typeof ref === "undefined" || !ref.current) return;
        const ctx = ref.current.getContext("webgl");
        if (!ctx) return;

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

    return {
        programs,
        runtime,
        validContext: validContext(ref),
        VertexArrayBuffers,
        createTexture,
        renderPipeline,
        renderPipelineStage,
        extractUniforms
    }

};

export default useGlslShaders;
