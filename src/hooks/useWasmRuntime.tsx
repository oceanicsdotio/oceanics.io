import { useEffect, useMemo, useState } from "react";

type ModuleType = typeof import("@oceanics-io/wasm");


export const useWasmRuntime = () => {
    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [ runtime, setRuntime ] = useState<ModuleType|null>(null);

    /**
     * Status flag, for convenience and sensible typing.
     */
    const ready = useMemo(() => !!runtime, [runtime]);

    /**
     * Dynamically load the WASM, add debugging, and save to React state.
     */
    useEffect(() => {
        try {
            (async () => {
                const wasm = await import("@oceanics-io/wasm");
                wasm.panic_hook();
                setRuntime(wasm);
            })()   
        } catch (err) {
            console.error("Unable to load WASM runtime")
        }
    }, []);

    return { 
        runtime, 
        status: {
            ready
        }
    }
}

export default useWasmRuntime;