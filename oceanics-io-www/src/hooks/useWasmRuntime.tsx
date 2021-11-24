/**
 * React friends.
 */
import { useEffect, useState } from "react";

/**
 * Basic single-threaded runtime
 */
export default () => {
    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [ runtime, setRuntime ] = useState(null);

    /**
     * Dynamically load the WASM, add debugging, and save to React state,
     */
    useEffect(() => {
        try {
            (async () => {
                //@ts-ignore
                const runtime = await import('../wasm');
                runtime.panic_hook();
                setRuntime(runtime);
            })()   
        } catch (err) {
            console.error("Unable to load WASM runtime")
        }
    }, []);

    return {
        runtime: runtime
    }
}