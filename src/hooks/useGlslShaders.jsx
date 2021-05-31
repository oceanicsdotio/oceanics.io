/**
 * React friends.
 */
import { useEffect, useState, useRef, useMemo } from "react";

import useWasmRuntime from "./useWasmRuntime";

/**
 * Pre-import all shaders. This is a bit fragile.
 */
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

/**
 * 
 * @param {*} w Texture width
 * @param {*} h Texture height
 * @returns 
 */
const screenBuffer = (w, h) => Object({ 
    data: new Uint8Array(w * h * 4), 
    shape: [w, h] 
})

/**
 * Helper function to extract values from a hash map.
 * 
 * @param {*} keys 
 * @param {*} uniforms 
 * @returns 
 */
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
export const renderPipelineStage = ({
    runtime, 
    ctx, 
    uniforms, 
},{
    textures=null,
    attributes=null,
    framebuffer: [
        handle=null, 
        texture=null
    ],
    parameters=null,
    program,
    topology: [
        type, 
        count
    ],
    viewport
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
     * Load textures into memory.
     */
    (textures||[]).forEach(
        texture => {runtime.bind_texture(ctx, ...texture)}
    );
    
    /**
     * Bind vertex attribute array buffers to hardware memory handles.
     */
    (attributes||[]).map(
        ([buffer, handle, count]) => [buffer, ctx.getAttribLocation(program.program, handle), count]
    ).forEach(
        attribute => {runtime.bind_attribute(ctx, ...attribute)}
    );

    /**
     * Format and bind a value to each uniform variable in the context.
     * 
     * If someone supplies a variable name that is not part of the program,
     * then we warn them. Most likely case is that the shader itself has
     * changed.
     * 
     * Access constructor by standard name, if there is no size wrap as array and
     * attach to string key. 
     */ 
    (parameters||[]).forEach(key => {
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
 * IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the 
 * shaders as programs.
 *
 * This is executed only once, after the WASM runtime is loaded. 
 */
export default ({ 
    shaders
}) => {
   
    const [assets, setAssets] = useState(null);
    const [programs, setPrograms] = useState(null);


    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const { runtime } = useWasmRuntime();


    const ref = useRef(null);

    const [validContext, setValidContext] = useState(null);

    useEffect(() => {
        setValidContext((typeof ref === "undefined" || !ref || !ref.current) ? null : ref.current.getContext("webgl"));
    }, [ref]);
    
    useEffect(() => {
        if (!validContext || !runtime) return;
       
        const compiled = Object.fromEntries(Object.entries(shaders).map(([programName, pair]) => {

            const program = runtime.create_program(validContext, ...pair.map(file => shaderSource[file]));
            let wrapper = { program };

            [
                ["ATTRIBUTES", "Attrib"], 
                ["UNIFORMS", "Uniform"]
            ].forEach(
                ([key, fcn])=>{
                    for (let ii = 0; ii < validContext.getProgramParameter(program, validContext[`ACTIVE_${key}`]); ii++) {
                        const { name } = validContext[`getActive${fcn}`](program, ii);
                        wrapper[name] = validContext[`get${fcn}Location`](program, name);
                    }
                }
            );

            return [programName, wrapper];
        }));

        setPrograms(compiled);
       
    }, [runtime, validContext]);

 
    return {
        ref,
        programs,
        runtime,
        validContext,
        VertexArrayBuffers,
        createTexture,
        extractUniforms,
        setAssets,
        assets,
    }
};