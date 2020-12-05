import { useState, useEffect } from "react";


/**
Import the WebAssembly module and set the runtime of the Component.
*/
export default () => {
    
    const [runtime, setRuntime] = useState(null);

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
