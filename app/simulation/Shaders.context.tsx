import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import type {
  ReactNode,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from "react";
import useWasmRuntime from "../../src/hooks/useWasmRuntime";

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

// Mapping of program name to shader names
export type ProgramSourceMap = { [key: string]: [string, string] };

// WASM bindings
type WasmPackage =
  typeof import("@oceanics-io/wasm");

// Convenience type for string key value store
type Lookup = { [key: string]: string };

// GPU buffer references
export type BufferTriple = [WebGLBuffer | null, string, number];

// Single program handles
interface ProgramEntry {
  program: WebGLProgram;
  [k: string]: WebGLUniformLocation | null;
}

// Lookup of GPU bound programs by name
interface ProgramInfo {
  [k: string]: ProgramEntry;
}
interface UniformInfo {
  [key: string]: ["i" | "f", [number, number] | number];
}

// Inputs to create texture
export type TextureOptions = {
      filter: "LINEAR" | "NEAREST";
      data: Uint8Array;
      shape: [number, number];
    };

// Optional texture type for useRef
type TextureRef = { [key: string]: WebGLTexture | null };

export interface IRenderStage {
  textures: [WebGLTexture, number][];
  attributes: any;
  framebuffer: [WebGLFramebuffer | null, WebGLTexture | null];
  parameters: string[];
  program: ProgramEntry;
  topology: [number, number, number];
  viewport: [number, number, number, number];
  callback?: () => void;
}
export interface IRenderPipeLineStage extends IRenderStage {
  runtime: WasmPackage;
  webgl: WebGLRenderingContext;
  uniforms: UniformInfo;
}
/**
 * Data passed back from the useShader hook.
 */
interface ShaderHooks {
  /**
   * Mutable ref to give to a canvas element
   */
  ref: MutableRefObject<HTMLCanvasElement | null>;
  /**
   * Compiled GPU program information
   */
  programs: ProgramInfo | null;
  /**
   * WASM runtime loaded on mount.
   */
  runtime: WasmPackage | null;
  /**
   * Rendering context created on binding ref to a canvas.
   */
  webgl: WebGLRenderingContext | null;
  /**
   * Update the values in GPU memory
   */
  setUniforms: Dispatch<SetStateAction<UniformInfo | null>>;
  /**
   * References to uniform values in GPU memory
   */
  uniforms: UniformInfo | null;
  /**
   * Program names and vertex/fragment shader mappings
   */
  programSourceMap: ProgramSourceMap | null;
  /**
   * Setting the program source from the child will compile the
   * GPU programs needed in the rendering pipeline
   */
  setProgramSourceMap: Dispatch<SetStateAction<ProgramSourceMap | null>>;
  /**
   * Create  texture in the webgl context if it is present. Will throw
   * and error otherwise.
   */
  createTexture: (name: string, options: TextureOptions) => void;
  /**
   * Framebuffer reference to target rendering.
   */
  framebuffer: WebGLFramebuffer | null;
  /**
   * rendering steps
   */
  pipeline: any[];
  /**
   * set rending pipeline externally
   */
  setPipeline: Dispatch<SetStateAction<any[]>>;
  /**
   * Texture lookup.
   */
  textures: TextureRef;
  setTextures: Dispatch<SetStateAction<TextureRef>>;
}

/**
 * Name of time variable in shader source code. The handle for the uniform
 * is hoisted to the program object during compilation.
 */
const CLOCK_UNIFORM = "u_time";

/**
 * Abstraction for binding array data into GPU memory
 */
export class ArrayBuffer {
  buffer: WebGLBuffer | null = null;
  constructor(webgl: WebGLRenderingContext, data: any) {
    this.buffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, this.buffer);
    webgl.bufferData(
      webgl.ARRAY_BUFFER,
      new Float32Array(data),
      webgl.STATIC_DRAW
    );
  }

  static triple = (
    webgl: WebGLRenderingContext,
    data: any,
    name: string,
    order: 1 | 2
  ): BufferTriple => {
    const { buffer } = new ArrayBuffer(webgl, data);
    return [buffer, name, order];
  };
}

/**
 * Memoize warnings so that they do not print on every iteration
 * of the render loop
 */
const printedWarnings: { [key: string]: boolean } = {};

/**
 * Execute a shader program and all binding steps needed to make data
 * available to the hardware
 */
export const renderPipelineStage = ({
  runtime,
  webgl,
  uniforms,
  textures = [],
  attributes,
  framebuffer,
  parameters,
  program,
  topology,
  viewport,
}: IRenderPipeLineStage) => {
  webgl.viewport(...viewport);
  /**
   * Ensure any required framebuffer is attached before trying to load the
   * shader programs.
   */
  {
    const [handle, texture] = framebuffer;
    webgl.bindFramebuffer(webgl.FRAMEBUFFER, handle);
    if (texture)
      webgl.framebufferTexture2D(
        webgl.FRAMEBUFFER,
        webgl.COLOR_ATTACHMENT0,
        webgl.TEXTURE_2D,
        texture,
        0
      );
  }
  /**
   * Attempt to use the program, and quit if there is a problem in the GLSL code.
   */
  try {
    webgl.useProgram(program.program);
  } catch (TypeError) {
    console.error("Error loading program", program);
    return;
  }

  /**
   * Load textures into memory.
   */
  textures.forEach((texture: [WebGLTexture, number]) => {
    runtime.bind_texture(webgl, ...texture);
  });

  /**
   * Bind vertex attribute array buffers to hardware memory handles.
   */
  attributes
    .map(([buffer, handle, count]: [number, string, number]) => [
      buffer,
      webgl.getAttribLocation(program.program, handle),
      count,
    ])
    .forEach((attribute: [number, number, number]) => {
      runtime.bind_attribute(webgl, ...attribute);
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
  parameters.forEach(([key]) => {
    const [type, value] = uniforms[key];
    const handle = program[key];
    const size: 1 | 2 = typeof value === "number" ? 1 : 2;
    try {
      if (size === 2) {
        const setUniform = webgl[`uniform${size}${type}`];
        setUniform(handle, ...(value as [number, number]));
      } else if (size === 1) {
        const setUniform = webgl[`uniform${size}${type}`];
        setUniform(handle, value as number);
      }
    } catch {
      if (key in printedWarnings) return;
      printedWarnings[key] = true;
      console.error(`${key} is not a uniform of the shader program.`);
    }
  });

  /**
   * Update clock for deterministic simulation components and psuedo random
   * number generation.
   */
  if (CLOCK_UNIFORM in program) {
    webgl.uniform1f(program[CLOCK_UNIFORM], performance.now());
  }

  /**
   * Draw the data to the target texture or screen buffer.
   */
  webgl.drawArrays(...topology);
};

/**
 * Create a map of GPU attribute names and addresses.
 * These are used to mount and update values. They
 * normally have a name prefixed with `a_` by glsl
 * convention, but this may not always be true.
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

/**
 * Create a map of uniform names and addresses. These can
 * be used to update the values for the simulation and
 * visualization steps. The variable names are often but
 * not always prefixed with`u_` by glsl convention.
 */
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
): [string, ProgramEntry] => {
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
 * IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the
 * shaders as programs.
 *
 * This is executed only once, after the WASM runtime is loaded.
 */
const useShaders = (): ShaderHooks => {
  /**
   * Hold our programs in a hash map by name. This allows
   * us to swap out programs and change rendering style
   * while keeping data constant.
   */
  const [programs, setPrograms] = useState<ProgramInfo | null>(null);
  /**
   * Shaders currently in use will have a defined source map. The
   * dispatch method is passed on to allow triggering effects.
   */
  const [programSourceMap, setProgramSourceMap] =
    useState<ProgramSourceMap | null>(null);
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
   * Uniforms are non-texture values applied to each fragment.
   */
  const [uniforms, setUniforms] = useState<UniformInfo | null>(null);
  /**
   * Runtime will be passed back to calling Hook or Component.
   * The WASM runtime contains all of the draw functions that
   * target the GL context.
   */
  const { runtime } = useWasmRuntime();
  /**
   * Canvas ref to get a WebGL context from once it has been
   * assigned to a valid element.
   */
  const ref: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
  /**
   * Guaranteed to be a WebGL context, for typechecking purposes.
   */
  const [webgl, setWebgl] = useState<WebGLRenderingContext | null>(null);
  /**
   * Save framebuffer reference. This should be constant, but needs
   * a valid WebGL constant.
   */
  const [framebuffer, setFramebuffer] = useState<WebGLFramebuffer | null>(null);
  /**
   * Use rendering pipeline as an effect-triggering state update.
   */
  const [pipeline, setPipeline] = useState<any>([]);
  /**
   * Lookup of texture locations my name. Current and previous
   * state is swapped after every render pass.
   */
  const [textures, setTextures] = useState<{
    [key: string]: WebGLTexture | null;
  }>({});
  /**
   * Check whether we have a valid context.
   */
  useEffect(() => {
    if (!ref || !ref.current) {
      if (webgl) setWebgl(null);
      return;
    }
    const ctx = ref.current.getContext("webgl");
    if (!ctx) {
      throw TypeError("No Rendering Context");
    }
    setWebgl(ctx);
  }, [ref.current]);
  /**
   * Save reference to the frame buffer
   */
  useEffect(() => {
    if (webgl) setFramebuffer(webgl.createFramebuffer());
  }, [webgl]);
  /**
   * Compile our programs when we have the program source
   * map. The program data will contain references to
   * all of the GPU uniforms and attributes.
   */
  useEffect(() => {
    if (!programSourceMap || !webgl || !runtime) return;
    const compile = ([name, [vertex, fragment]]: [string, [string, string]]): [
      string,
      WebGLProgram
    ] => {
      const program = runtime.create_program(
        webgl,
        shaderSource[vertex],
        shaderSource[fragment]
      );
      return [name, program];
    };
    const programData = Object.entries(programSourceMap)
      .map(compile)
      .map(getActiveParams.bind(null, webgl));
    setPrograms(Object.fromEntries(programData));
  }, [programSourceMap, webgl, runtime]);

  /**
   * Bind current webgl instance to createTexture
   */
  const _createTexture = useCallback(
    (name: string, { data, shape, filter }: TextureOptions) => {
      if (!webgl) return;
      const texture = webgl.createTexture();
      const _filter = filter === "NEAREST" ? webgl.NEAREST : webgl.LINEAR;
      webgl.bindTexture(webgl.TEXTURE_2D, texture);
      webgl.texImage2D(
        webgl.TEXTURE_2D,
        0,
        webgl.RGBA,
        ...shape,
        0,
        webgl.RGBA,
        webgl.UNSIGNED_BYTE,
        data
      );
      [
        [webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE],
        [webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE],
        [webgl.TEXTURE_MIN_FILTER, _filter],
        [webgl.TEXTURE_MAG_FILTER, _filter],
      ].forEach((each) => {
        webgl.texParameteri.bind(webgl.TEXTURE_2D, ...each);
      });
      webgl.bindTexture(webgl.TEXTURE_2D, null); // prevent accidental use
      setTextures({
        ...textures,
        [name]: texture,
      });
    },
    [webgl]
  );
  /**
   * Pass back useful state and actions to parent Component or Hook.
   */
  return {
    ref,
    programs,
    runtime,
    webgl,
    setUniforms,
    uniforms,
    programSourceMap,
    setProgramSourceMap,
    createTexture: _createTexture,
    framebuffer,
    pipeline,
    setPipeline,
    textures,
    setTextures,
  };
};

/**
 * The context that will be used by children. No data
 * are initially set.
 */
const ShaderContext = createContext({
  shaders: {} as ShaderHooks,
});

/**
 * Called from the child component instead of wrapping
 * in a Consumer tag.
 */
export const useShaderContext = () => {
  return useContext(ShaderContext);
};

/**
 * Wraps components that will call useShaderContext to
 * get GL program references.
 */
export const ShaderProvider = ({ children }: { children: ReactNode }) => {
  const shaders = useShaders();
  return (
    <ShaderContext.Provider value={{ shaders }}>
      {children}
    </ShaderContext.Provider>
  );
};

export default ShaderProvider;
