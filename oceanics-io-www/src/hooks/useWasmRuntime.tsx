/**
 * React and friends.
 */
import { useEffect, useMemo, useState } from "react";

// https://stackoverflow.com/questions/52112948/whats-the-return-type-of-a-dynamic-import
type ModuleType = typeof import("oceanics-io-wasm-www");

/**
 * Basic single-threaded runtime.
 * 
 * You can't supply the import path externally, because webpack needs at least the
 * root path to pre-build all the needed chunks. Hence the string concatenation, to force
 * bundling the Rust directory which may eventually contain more than one crate.
 * 
 * See https://github.com/webpack/webpack/issues/6680 for related issues and 
 * alternate resolution methods. 
 */
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
                const wasm = await import("oceanics-io-wasm-www");
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