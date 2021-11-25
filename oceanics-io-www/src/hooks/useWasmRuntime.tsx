/**
 * React and friends.
 */
import { useEffect, useState } from "react";

// const RELATIVE_PATH = '../../rust/pkg';

/**
 * Basic single-threaded runtime
 */
export const useWasmRuntime = (path: string) => {
    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [ runtime, setRuntime ] = useState<any>(null);

    /**
     * Dynamically load the WASM, add debugging, and save to React state,
     */
    useEffect(() => {
        try {
            (async () => {
                const runtime = await import(path);
                runtime.panic_hook();
                setRuntime(runtime);
            })()   
        } catch (err) {
            console.error("Unable to load WASM runtime")
        }
    }, []);

    return { runtime }
}

export default useWasmRuntime;