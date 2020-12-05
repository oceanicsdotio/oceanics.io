import { useEffect, useState } from "react";

import useWasmRuntime from "./useWasmRuntime";

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

        const shaderSource = {};  // memoize the shaders as they are loaded
    
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
    }, [runtime]);

    return {programs}

};

export default useGlslShaders;


export const extractUniforms = (keys, uniforms) => 
    keys.map(k => [k, uniforms[k]]);



export const createTexture = () => {
    return ([k, { ctx, filter = "NEAREST", data, shape = [null, null] }]) => {

        let texture = ctx.createTexture();

        const textureType = ctx.TEXTURE_2D;
        const args = data instanceof Uint8Array ? [...shape, 0] : [];

        ctx.bindTexture(textureType, texture);
        const textureArgs = [textureType, 0, ctx.RGBA, ...args, ctx.RGBA, ctx.UNSIGNED_BYTE, data];

        try {
            ctx.texImage2D(...textureArgs);
        } catch (err) {
            throw TypeError;
        }

        [
            [ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE],
            [ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE],
            [ctx.TEXTURE_MIN_FILTER, ctx[filter]],
            [ctx.TEXTURE_MAG_FILTER, ctx[filter]]
        ].forEach(
            ([a, b]) => { ctx.texParameteri(textureType, a, b) }
        );
        ctx.bindTexture(textureType, null);  // prevent accidental use

        return [k, texture]
    }
};


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