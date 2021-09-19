/**
 * React friends.
 */
import { useEffect, useRef } from "react";

/**
 * Generic hook for loading and cleaning up workers.
 */
export default (
    Worker: WebpackWorker
) => {
    /**
     * Instantiate web worker reference for background tasks.
     */
    const worker = useRef(null);

    /**
     * Create worker, and terminate it when the component unmounts.
     * 
     * I suspect that this was contributing to performance degradation in
     * long running sessions. 
     */
    useEffect(() => {
        if (!Worker) {
            console.log("Cannot create workers, no loader provided")
            return
        }
        worker.current = new Worker();
        return () => { 
            if (worker.current) worker.current.terminate();
        }
    }, []);

    return worker
}