import { useEffect, useState } from "react";
import useWasmRuntime from "../../hooks/useWasmRuntime";
import useCanvasContext from "../../hooks/useCanvasContext";

/**
 * Pre-import all shaders. This is a bit fragile.
 */
import noiseVertex from "../../glsl/noise-vertex.glsl";
import noiseFragment from "../../glsl/noise-fragment.glsl";
import quadVertex from "../../glsl/quad-vertex.glsl";
import updateFragment from "../../glsl/update-fragment-test.glsl";
import screenFragment from "../../glsl/screen-fragment.glsl";
import drawVertex from "../../glsl/draw-vertex-test.glsl";
import drawFragment from "../../glsl/draw-fragment-test.glsl";

export type ProgramSourceMap = {[key: string]: [string, string]};
type Lookup = { [key: string]: string };
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

/**
 * IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the
 * shaders as programs.
 *
 * This is executed only once, after the WASM runtime is loaded.
 */
export const useShaders = () => {
  /**
   * Hold our programs in a hash map by name. This allows
   * us to swap out programs and change rendering style
   * while keeping data constant.
   */
  const [programs, setPrograms] = useState(null);
  /**
   * Runtime will be passed back to calling Hook or Component.
   * The WASM runtime contains all of the draw functions that
   * target the GL context.
   */
  const { runtime } = useWasmRuntime();
  /**
   * Canvas ref to get a WebGL context from once it has been
   * assigned to a valid element. Whenever we need WebGL context,
   * make sure we have an up to date instance.
   */
  const { ref, webgl, ...context } = useCanvasContext("webgl");
  /**
   * Uniforms are non-texture values applied to each fragment.
   */
  const [uniforms, setUniforms] = useState(null);
  /**
   * Store by name for lookup when re-compiling and making
   * swap-able. 
   */
  const [shaderSource] = useState<Lookup>({
    "quad-vertex": quadVertex,
    "noise-vertex": noiseVertex,
    "noise-fragment": noiseFragment,
    "update-fragment": updateFragment,
    "screen-fragment": screenFragment,
    "draw-fragment": drawFragment,
    "draw-vertex": drawVertex,
  });
  /**
   * Shaders currently in use.
   */
  const [programSourceMap, setProgramSourceMap] = useState<ProgramSourceMap|null>(null);
  /**
   * Compile our programs when we have the program source
   * map
   */
  useEffect(() => {
    if (!programSourceMap || !webgl || !runtime ) return;
    const compile = ([name, [vertex, fragment]]: [string, [string, string]]): [string, WebGLProgram] => {
      const program = runtime.create_program(webgl, shaderSource[vertex], shaderSource[fragment]);
      return [ name, program ];
    };
    const programData = Object.entries(programSourceMap)
      .map(compile)
      .map(context.getActiveParams);
    setPrograms(Object.fromEntries(programData));
  }, [programSourceMap, webgl, runtime]);

  /**
   * Pass back useful state and actions to parent Component or Hook.
   */
  return {
    ref,
    programs,
    runtime,
    webgl,
    VertexArrayBuffers,
    extractUniforms: (keys: string[], uniforms: any) =>
      keys.map((k) => [k, uniforms[k]]),
    setUniforms,
    uniforms,
    programSourceMap,
    setProgramSourceMap,
    ...context
  };
};

export default useShaders;
