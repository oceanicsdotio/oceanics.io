/**
 * React friends.
 */
 import { useEffect, useState, useReducer } from "react";

 import useWasmRuntime from "./useWasmRuntime";
 

 
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
 
/**
 * Convenience method for determining if there is
 * and available WebGL context.
 * 
 * @returns 
 */
const validContext = (ref) => 
    (typeof ref === "undefined" || !ref || !ref.current) ? false : ref.current.getContext("webgl");
 
/**
 * IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the 
 * shaders as programs.
 * 
 * This is executed only once, after the WASM runtime is loaded. 
 */
export default ({
    ref,
    programs, 
    assets
}) => {
    
    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const { runtime } = useWasmRuntime();

    /**
     * Stages to run
     */
    const [ pipeline, setPipeline ] = useState(null);

    /**
     * Basically, we execute some number of tasks in series,
     * in a loop. These are either simulation steps, bookkeeping,
     * or IO. 
     * 
     * They are likely to be shader programs, so that JavaScript
     * is not entirely aware of their status or contents. 
     * 
     * These are saved as state and referenced by stage number, 
     * and called repeatedly.
     */
    const [ task, dispatchTask ] = useReducer((prev, inc=1) => {

        const next = (prev.stage + inc) % programs.length;

        return {
            stage: next,
            cycle: cycle + (+(next < prev.stage))
        }
    }, { stage: 0, cycle: 0 });


    useEffect(() => {

        const ctx = validContext();
        if (!runtime || !ctx || !assets || !pipeline) return;
        
        let requestId;
        
        (function render() {
            renderPipeline(runtime, ctx, assets.uniforms, pipeline);
            requestId = requestAnimationFrame(render);
        })()
        return () => cancelAnimationFrame(requestId);
    }, [ runtime, assets, pipeline, ref ]);


    useEffect(() => {

        const ctx = validContext();

        if (!runtime || !ctx || !assets || !programs) return;
        
        const viewport = [0, 0, ref.current.width, ref.current.height];
    
        setPipeline([{
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
        }, {
            program: programs.draw,
            attributes: [assets.buffers.quad],
            framebuffer: [assets.framebuffer, assets.textures.screen],
            topology: [ctx.TRIANGLES, 6],
            viewport
        }, {
            program: programs.screen,
            textures: [[assets.textures.screen, 2]],
            parameters: ["u_opacity"],
            attributes: [assets.buffers.quad],
            framebuffer: [null, null],
            topology: [ctx.TRIANGLES, 6],
            viewport
        }]);
    }, [ programs, assets ]);

    /**
     * Whenever task updates, fire a processing event
     */
    useEffect(() => {
        if (!task || !pipeline) return;
        
    }, [ task, pipeline ]);

    return {
        renderPipeline,
        renderPipelineStage,
        pipeline
    }
};
