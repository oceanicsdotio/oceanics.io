/**
 * React friends.
 */
import { useState, useEffect } from "react";

/**
 * Dedicated worker loaders
 */
import Worker from "../workers/useBathysphereApi.worker.js";

/**
 * Handle async loading and error handling in a consistent way
 */
import useWorkers from "./useWorkers";

/**
 * Frontend Wasm Runtime
 */
import useWasmRuntime from "./useWasmRuntime";

/**
 * Hook encapsulates everything needed for background Rust/WASM
 */
export default () => {

    /**
     * Web worker reference for background tasks. 
     * 
     * This will be used to process raw data into MapBox layers,
     * and do any expensive topological or reducing operations. 
     */
    const worker = useWorkers(Worker);

    /**
     * Synchronous runtime.
     */
    const { runtime } = useWasmRuntime();

    /**
     * Information about the Rust-WASM runtime instance running inside
     * the worker. We'll use this to make sure that the worker is going
     * before we send in data to process. 
     */
    const [ status, setStatus ] = useState({ready: false});

     /**
      * Initialize the Worker scope runtime, and save the status to React
      * state. This will be used as a Hook reflow key. 
      */
    useEffect(()=>{
        if (worker.current)
            worker.current.initRuntime().then(setStatus);
    }, [ worker.current ]);

    return {
        status: status,
        worker: worker,
        runtime: runtime,
    }
}