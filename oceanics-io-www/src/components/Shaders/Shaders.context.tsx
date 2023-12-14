import { createContext, useContext } from "react";
import type {ReactNode} from "react";
import useShaders from "./useShaders";

export const ShaderContext = createContext({
    shaders: {} as any
});

export const useShaderContext = () => {
    return useContext(ShaderContext);
}

export const ShaderProvider = ({children}: {children: ReactNode}) => {
    const shaders = useShaders();
    return (
        <ShaderContext.Provider value={{shaders}}>
            {children}
        </ShaderContext.Provider>
    )
}

export default ShaderProvider
