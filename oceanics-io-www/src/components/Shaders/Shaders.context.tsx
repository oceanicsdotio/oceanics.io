import { createContext, useContext, useEffect, useState } from "react";
import type {ReactNode} from "react";
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

/**
 * IFF the canvas context is WebGL and we need shaders, fetch the GLSL code and compile the
 * shaders as programs.
 *
 * This is executed only once, after the WASM runtime is loaded.
 */
const useShaders = () => {
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
     * Shaders currently in use will have a defined source map. The
     * dispatch method is passed on to allow triggering effects.
     */
    const [programSourceMap, setProgramSourceMap] = useState<ProgramSourceMap|null>(null);
    /**
     * Compile our programs when we have the program source
     * map. The program data will contain references to 
     * all of the GPU uniforms and attributes. 
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
      extractUniforms: (keys: string[], uniforms: any) =>
        keys.map((k) => [k, uniforms[k]]),
      setUniforms,
      uniforms,
      programSourceMap,
      setProgramSourceMap,
      ...context
    };
  };

/**
 * The context that will be used by children. No data
 * are initially set.
 */
const ShaderContext = createContext({
    shaders: {} as any
});

/**
 * Called from the child component instead of wrapping
 * in a Consumer tag.
 */
export const useShaderContext = () => {
    return useContext(ShaderContext);
}

/**
 * Wraps components that will call useShaderContext to
 * get GL program references. 
 */
export const ShaderProvider = ({children}: {children: ReactNode}) => {
    const shaders = useShaders();
    return (
        <ShaderContext.Provider value={{shaders}}>
            {children}
        </ShaderContext.Provider>
    )
}

export default ShaderProvider;
