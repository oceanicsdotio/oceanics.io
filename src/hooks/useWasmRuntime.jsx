import { useState, useEffect } from "react";


export default () => {
    
    const [runtime, setRuntime] = useState(null);

    /*
    Import the WebAssembly module and set the runtime of the Component.
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
