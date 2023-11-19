// @ts-nocheck
/**
 * React friends.
 */
import { useEffect, useState } from "react";

/**
 * Rust WASM runtime, used for numerical methods.
 */
import useWasmRuntime from "./useWasmRuntime";
import useCanvasContext from "../hooks/useCanvasContext";

/**
 * Pre-import all shaders. This is a bit fragile.
 */
import noiseVertex from "../glsl/noise-vertex.glsl";
import noiseFragment from "../glsl/noise-fragment.glsl";
import quadVertex from "../glsl/quad-vertex.glsl";
import updateFragment from "../glsl/update-fragment-test.glsl";
import screenFragment from "../glsl/screen-fragment.glsl";
import drawVertex from "../glsl/draw-vertex-test.glsl";
import drawFragment from "../glsl/draw-fragment-test.glsl";

/**
 * Abstraction for binding array data into GPU memory
 */
export class ArrayBuffer {
  buffer: WebGLBuffer | null = null;
  constructor(ctx: WebGL2RenderingContext, data: any) {
    this.buffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, this.buffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(data), ctx.STATIC_DRAW);
  }
}

/**
 *
 * @param {*} w Texture width
 * @param {*} h Texture height
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const screenBuffer = (w: number, h: number) =>
  Object({
    data: new Uint8Array(w * h * 4),
    shape: [w, h],
  });

/**
 * Helper function to extract values from a hash map.
 */
export const extractUniforms = (keys: string[], uniforms: any) =>
  keys.map((k) => [k, uniforms[k]]);

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
export const VertexArrayBuffers = (
  ctx: WebGL2RenderingContext,
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

// memoize the shaders as they are loaded
const shaderSource: {[key: string]: string} = {
  "quad-vertex": quadVertex,
  "noise-vertex": noiseVertex,
  "noise-fragment": noiseFragment,
  "update-fragment": updateFragment,
  "screen-fragment": screenFragment,
  "draw-fragment": drawFragment,
  "draw-vertex": drawVertex,
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

type IRenderPipeLineStage = {
  runtime: any;
  ctx: WebGL2RenderingContext;
  uniforms: string[];
};
type RenderStep = {
  textures: any;
  attributes: any;
  framebuffer: [string, WebGLFramebuffer];
  parameters: any[];
  program: {
    program: WebGLProgram;
  };
  topology: any;
  viewport: [number, number, number, number];
};

/**
 * Execute a shader program and all binding steps needed to make data
 * available to the hardware
 */
export const renderPipelineStage = (
  { runtime, ctx, uniforms }: IRenderPipeLineStage,
  {
    textures,
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
  (textures || []).forEach((texture) => {
    runtime.bind_texture(ctx, ...texture);
  });

  /**
   * Bind vertex attribute array buffers to hardware memory handles.
   */
  (attributes || [])
    .map(([buffer, handle, count]) => [
      buffer,
      ctx.getAttribLocation(program.program, handle),
      count,
    ])
    .forEach((attribute) => {
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
    .map((key: string) => [key, ...uniforms[key], program[key]])
    .forEach(([key, type, value, handle]) => {
      try {
        const size = value.length || 1;
        ctx[`uniform${size}${type}`](handle, ...(size === 1 ? [value] : value));
      } catch {
        if (key in printedWarnings) return;
        printedWarnings[key] = true;
        console.warn(`${key} is not a uniform of the shader program.`);
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
  ctx.drawArrays(...topology);
};

type TextureOptions = {
  filter: string;
  data: any;
  shape: number[];
};
/**
 * Create a new texture
 *
 * @param {*} ctx valid WebGL context
 * @param {*} param1 args
 * @returns
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
    [ctx.TEXTURE_MIN_FILTER, ctx[filter]],
    [ctx.TEXTURE_MAG_FILTER, ctx[filter]],
  ].forEach(([handle, value]) => {
    texParameteri(handle, value);
  });

  bindTexture(null); // prevent accidental use

  return texture;
};

type Shader = string;
type IGlslShaders = {
  shaders: Shader[];
};

/**
 * IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the
 * shaders as programs.
 *
 * This is executed only once, after the WASM runtime is loaded.
 */
export const useGlslShaders = ({ shaders }: IGlslShaders) => {
  /**
   * Hold our programs in a hash map by name
   */
  const [programs, setPrograms] = useState(null);

  /**
   * Runtime will be passed to calling Hook or Component.
   */
  const { runtime } = useWasmRuntime();

  /**
   * Canvas ref to get a WebGL context from once it has been
   * assigned to a valid element.
   * Whenever we need WebGL context, make sure we have an up to date instance.
   * We can then use this to gate certain Hooks.
   */
  const { validContext, ref } = useCanvasContext("webgl");

  /**
   * Compile our programs
   */
  useEffect(() => {
    if (!validContext || !runtime) return;

    const compile = ([name, pair]: [string, [string, string]]) => [
      name,
      runtime.create_program(
        validContext as WebGLRenderingContext,
        ...(pair.map((file: string): string => shaderSource[file] as string) as [string, string])
      ),
    ];

    const extract = ([name, program]: [string, any]) => [
      name,
      program,
      Object.fromEntries(
        [
          ["ATTRIBUTES", "Attrib"],
          ["UNIFORMS", "Uniform"],
        ]
          .map(([key, fcn]) => [
            fcn,
            validContext.getProgramParameter(
              program,
              validContext[`ACTIVE_${key}`]
            ),
          ])
          .flatMap(([fcn, count]) =>
            Array(Array(count).keys())
              .map((ii) => validContext[`getActive${fcn}`](program, ii))
              .map(({ name }) => [
                name,
                validContext[`get${fcn}Location`](program, name),
              ])
          )
      ),
    ];

    const form = ([name, program, wrapper]) => [name, { ...wrapper, program }];

    setPrograms(
      Object.fromEntries(
        Object.entries(shaders).map(compile).map(extract).map(form)
      )
    );
  }, [runtime, validContext]);

  /**
   * State for function
   */
  const [newTexture, setNewTexture] = useState(null);

  /**
   * Create our texture function
   */
  useEffect(() => {
    if (validContext)
      setNewTexture(() => createTexture.bind(null, validContext));
  }, [validContext]);

  /**
   * Uniforms are non-texture values applied to each fragment.
   */
  const [uniforms, setUniforms] = useState(null);

  /**
   * Package up our runtime for easy access. Will pass this to
   * stage functions.
   */
  const [runtimeContext, setRuntimeContext] = useState(null);

  /**
   * Save the runtime information
   */
  useEffect(() => {
    if (!runtime || !validContext || !uniforms) return;
    setRuntimeContext({ runtime, ctx: validContext, uniforms });
  }, [runtime, validContext, uniforms]);

  /**
   * Pass back to parent Component or Hook.
   */
  return {
    ref,
    programs,
    runtime,
    runtimeContext,
    validContext,
    VertexArrayBuffers,
    createTexture: newTexture,
    extractUniforms,
    setUniforms,
  };
};

export default useGlslShaders;
