import { useState, useEffect } from "react";

/**
Import the WebAssembly module and set the runtime of the Component.
*/
export default () => {
    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [runtime, setRuntime] = useState(null);

    /**
     * Dynamically load the WASM, add debugging, and save to React state,
     */
    useEffect(() => {
        try {
            (async () => {
                const runtime = await import('../wasm');
                runtime.panic_hook();
                setRuntime(runtime);
            })()   
        } catch (err) {
            console.log("Unable to load WASM runtime")
        }
    }, []);

    return runtime;
}
