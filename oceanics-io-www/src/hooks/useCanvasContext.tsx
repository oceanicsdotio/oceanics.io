import { useEffect, useState, useRef } from "react";
import type { MutableRefObject } from "react";



interface IRenderPipeLineStage {
  runtime: any;
  ctx: WebGLRenderingContext;
  uniforms: string[];
}
interface RenderStep {
  textures: any;
  attributes: any;
  framebuffer: [string, WebGLFramebuffer];
  parameters: any[];
  program: {
    program: WebGLProgram;
  };
  topology: any;
  viewport: [number, number, number, number];
}

/**
 * Name of the GLSL variable for particle positions
 */
const VERTEX_ARRAY_BUFFER = "a_index";

/**
 * Name of the GLSL variable for rectangle of two triangles
 */
const QUAD_ARRAY_BUFFER = "a_pos";

/**
 * Name of time variable in shader source code. The handle for the uniform
 * is hoisted to the program object during compilation.
 */
const CLOCK_UNIFORM = "u_time";

/**
 * Abstraction for binding array data into GPU memory
 */
class ArrayBuffer {
  buffer: WebGLBuffer | null = null;
  constructor(ctx: WebGLRenderingContext, data: any) {
    this.buffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(data), ctx.STATIC_DRAW);
  }
}

export const screenBuffer = (w: number, h: number) =>
  Object({
    data: new Uint8Array(w * h * 4),
    shape: [w, h],
  });

/**
 * Generate the array buffers and handles for double buffering.
 */
export const VertexArrayBuffers = (
  ctx: WebGLRenderingContext,
  vertexArray = null
) =>
  Object({
    quad: [
      new ArrayBuffer(ctx, [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]).buffer,
      QUAD_ARRAY_BUFFER,
      2,
    ],
    index: vertexArray
      ? [new ArrayBuffer(ctx, vertexArray).buffer, VERTEX_ARRAY_BUFFER, 1]
      : null,
  });

/**
 * Memoize warnings so that they do not print on every iteration
 * of the render loop
 */
const printedWarnings = {};

/**
 * Execute a shader program and all binding steps needed to make data
 * available to the hardware
 */
export const renderPipelineStage = (
  { runtime, ctx, uniforms }: IRenderPipeLineStage,
  {
    textures = [],
    attributes,
    framebuffer,
    parameters,
    program,
    topology,
    viewport,
  }: RenderStep
) => {
  ctx.viewport(...viewport);

  /**
   * Ensure any required framebuffer is attached before trying to load the
   * shader programs.
   */
  {
    const [handle, texture] = framebuffer;
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, handle);
    if (texture)
      ctx.framebufferTexture2D(
        ctx.FRAMEBUFFER,
        ctx.COLOR_ATTACHMENT0,
        ctx.TEXTURE_2D,
        texture,
        0
      );
  }
  /**
   * Attempt to use the program, and quit if there is a problem in the GLSL code.
   */
  try {
    ctx.useProgram(program.program);
  } catch (TypeError) {
    console.log("Error loading program", program);
    return;
  }

  /**
   * Load textures into memory.
   */
  (textures || []).forEach((texture: any) => {
    runtime.bind_texture(ctx, ...texture);
  });

  /**
   * Bind vertex attribute array buffers to hardware memory handles.
   */
  (attributes || [])
    .map(([buffer, handle, count]: [number, string, number]) => [
      buffer,
      ctx.getAttribLocation(program.program, handle),
      count,
    ])
    .forEach((attribute: [number, number, number]) => {
      runtime.bind_attribute(ctx, ...attribute);
    });

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
  (parameters || [])
    //@ts-ignore
    .map((key: string) => [key, ...uniforms[key], program[key]])
    .forEach(([key, type, value, handle]) => {
      try {
        const size = value.length || 1;
        //@ts-ignore
        ctx[`uniform${size}${type}`](handle, ...(size === 1 ? [value] : value));
      } catch {
        if (key in printedWarnings) return;
        //@ts-ignore
        printedWarnings[key] = true;
        console.warn(`${key} is not a uniform of the shader program.`);
      }
    });

  /**
   * Update clock for deterministic simulation components and psuedo random
   * number generation.
   */
  if (CLOCK_UNIFORM in program) {
    //@ts-ignore
    ctx[`uniform1f`](program[CLOCK_UNIFORM], performance.now());
  }

  /**
   * Draw the data to the target texture or screen buffer.
   */
  //@ts-ignore
  ctx.drawArrays(...topology);
};


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