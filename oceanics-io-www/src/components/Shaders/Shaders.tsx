import React, { useEffect } from "react";
import { useContext } from "react";
import { ShaderContext } from "./Shaders.context";
import type {ProgramSourceMap} from "./useShaders";

export interface IShaders {
    source: ProgramSourceMap
}

const Shaders = ({source}: IShaders) => {
    const {shaders} = useContext(ShaderContext);
    useEffect(() => {
        shaders.setProgramSourceMap(source);
    }, []);
    useEffect(() => {
        console.log("programs", shaders.programs)
    }, [shaders.programs])
    return <canvas ref={shaders.ref}/>
}

Shaders.displayName = "Shaders";
export default Shaders;