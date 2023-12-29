import React, { useEffect } from "react";
import { useShaderContext } from "./Shaders.context";
import type { ProgramSourceMap } from "./Shaders.context";

export interface IShaders {
    /**
     * Map of program name to vertex and fragment source
     * names.
     */
    source: ProgramSourceMap;
}

/**
 * Shaders component exists as a child of the ShadersProvider.
 * Need to inject context at this level to be used in stories
 * and other components. HTML is just a canvas that takes
 * a ref. Assigning the ref this is needed to get a WebGL context 
 * and start loading and compiling shader source code. 
 */
const Shaders = ({source}: IShaders) => {
    /**
     * All WebGL related setup is relegated to the context
     * provider.
     */
    const {shaders} = useShaderContext();
    /**
     * Set the program source map triggers hooks that will 
     * compile the shader program and return information
     * about how to bind real data to the textures and arrays. 
     */
    useEffect(() => {
        shaders.setProgramSourceMap(source);
    }, []);
    /**
     * Debugging level report on the compiled program. 
     */
    useEffect(() => {
        if (shaders.programs)
            console.debug("programs", shaders.programs)
    }, [shaders.programs]);
    /**
     * Result is a bare canvas element
     */
    return <canvas ref={shaders.ref}/>
}

Shaders.displayName = "Shaders";

export default Shaders;
