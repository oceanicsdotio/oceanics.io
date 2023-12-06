import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

// In-memory log truncation
const LIMIT = 10;

// Actual handler
const onMessageHandler = (
    name: string, 
    setValue: Dispatch<SetStateAction<string[]>>
) => ({data}: {data: string}) => {
    console.log(`Message from ${name} worker:`, data);
    setValue((prev: string[]) => [...prev.slice(0, LIMIT-1), data]);
}

/**
 * Lifecycle controller for web workers. You need to actually start
 * the worker with the source code loaded externally.
 * 
 * Webpack needs a static path at build time to make loadable chunks
 * from the worker script.
 * 
 * There is probably a more clever way to do this.
 */
const useWorker = (name: string, createWorker: () => Worker) => {

    const listening = useRef<boolean>(false);
    const worker = useRef<Worker|null>(null);
    const [messages, setMessages] = useState<string[]>([]);
    const listener = onMessageHandler(name, setMessages);

    // Init and start
    const start = () => {
        worker.current = createWorker();
        if (worker.current) {
            worker.current.addEventListener("message", listener, { passive: true });
            listening.current = true
            worker.current.postMessage({ type: "status" });
        } else {
            console.error(`${name} worker not ready`);
        }
        return worker.current
    }

    // Start if we get a worker on load. Clean up after.
    useEffect(() => {
        start()
        return () => {
            if (listening.current) worker.current?.removeEventListener("message", listener);
            if (worker.current) worker.current.terminate();
        }
    }, [])

    return {
        ref: worker,
        messages,
        start
    }
}

export default useWorker;
