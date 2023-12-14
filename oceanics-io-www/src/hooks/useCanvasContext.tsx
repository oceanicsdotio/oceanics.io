import { useEffect, useState, useRef } from "react";
import type { MutableRefObject } from "react";

type TextureOptions = {
    filter: string;
    data: any;
    shape: number[];
};


  

/**
 * Create a
 */
const getActiveAttributes = (
    context: WebGLRenderingContext,
    program: WebGLProgram
  ) => {
    const count: number = context.getProgramParameter(
      program,
      context.ACTIVE_ATTRIBUTES
    );
    const offsets: number[] = Array(...Array(count).keys());
    const attributes = offsets
      .map(context.getActiveAttrib.bind(context, program))
      .filter((each) => !!each) as WebGLActiveInfo[];
    return Object.fromEntries(
      attributes.map(({ name }: WebGLActiveInfo) => {
        return [name, context.getAttribLocation(program, name)];
      })
    );
  };
  
  const getActiveUniforms = (
    context: WebGLRenderingContext,
    program: WebGLProgram
  ) => {
    const count: number = context.getProgramParameter(
      program,
      context.ACTIVE_UNIFORMS
    );
    const offsets: number[] = Array(...Array(count).keys());
    const uniforms = offsets
      .map(context.getActiveUniform.bind(context, program))
      .filter((each) => !!each) as WebGLActiveInfo[];
    return Object.fromEntries(
      uniforms.map(({ name }: WebGLActiveInfo) => {
        return [name, context.getUniformLocation(program, name)];
      })
    );
  };
  
  const getActiveParams = (
    context: WebGLRenderingContext,
    [name, program]: [string, WebGLProgram]
  ) => {
    return [
      name,
      {
        program,
        ...getActiveUniforms(context, program),
        ...getActiveAttributes(context, program),
      },
    ];
  };



/**
 * Create a new texture
 */
export const createTexture = (
    ctx: WebGLRenderingContext,
    { filter, data, shape }: TextureOptions
  ) => {
    const args: number[] = data instanceof Uint8Array ? [...shape, 0] : [];
    const bindTexture = ctx.bindTexture.bind(ctx, ctx.TEXTURE_2D);
    const texParameteri = ctx.texParameteri.bind(ctx, ctx.TEXTURE_2D);
    const texture = ctx.createTexture();
    bindTexture(texture);
    ctx.texImage2D(
      ctx.TEXTURE_2D,
      0,
      ctx.RGBA,
      //@ts-ignore
      ...args,
      ctx.RGBA,
      ctx.UNSIGNED_BYTE,
      data
    );
  
    [
      [ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE],
      [ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE],
      //@ts-ignore
      [ctx.TEXTURE_MIN_FILTER, ctx[filter]],
      //@ts-ignore
      [ctx.TEXTURE_MAG_FILTER, ctx[filter]],
    ].forEach(([handle, value]) => {
      texParameteri(handle, value);
    });
    bindTexture(null); // prevent accidental use
    return texture;
  };
  

export default (contextType: "2d" | "webgl") => {
    /**
     * Canvas ref to get a WebGL context from once it has been
     * assigned to a valid element. 
     */
    const ref: MutableRefObject<HTMLCanvasElement | null> = useRef(null);

    /**
     * Whenever we need WebGL context, make sure we have an up to date instance.
     * 
     * We can then use this to gate certain Hooks.
     */
    const [validContext, setValidContext] = useState<RenderingContext | null>(null);

    const [webgl, setWebgl] = useState<WebGLRenderingContext|null>(null);

    /**
     * Check whether we have a valid WebGL context.
     */
    useEffect(() => {
        if (!ref || !ref.current) {
            if (validContext) setValidContext(null);
            return;
        } 
        const ctx = ref.current.getContext(contextType);
        if (!ctx) {
            throw TypeError("No Rendering Context")
        }
        setValidContext(ctx);
        if (contextType === "webgl" ) {
            setWebgl(ctx as WebGLRenderingContext);
        }
    }, [ref.current]);

    const _getActiveParams = (args: [string, WebGLProgram]) => {
        if (!webgl) {
            throw TypeError("No WebGL Rendering Context")
        }
        return getActiveParams(webgl, args)
    }
    
   const _createTexture = (args: TextureOptions) => {
        if (!webgl) {
            throw TypeError("No WebGL Rendering Context")
        }
        return createTexture(webgl, args)

   }

    return {
        ref,
        validContext,
        webgl,
        getActiveParams: _getActiveParams,
        createTexture: _createTexture
    }
}