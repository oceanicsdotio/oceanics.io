import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

export type Listener = (args: { data: { data: unknown, type: string, message?: string}}) => void;

// In-memory log truncation
const LIMIT = 10;

// Actual handler
const onMessageHandler = (
    setValue: Dispatch<SetStateAction<string[]>>
) => ({data}: {data: string}) => {
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
const useWorker = (createWorker: () => Worker) => {

    const listening = useRef<boolean>(false);
    const worker = useRef<Worker>(createWorker());
    const [, setMessages] = useState<string[]>([]);
    const listener = onMessageHandler(setMessages);

    // Init and start only once
    const start = () => {
        worker.current?.addEventListener("message", listener, { passive: true });
        listening.current = true
        worker.current?.postMessage({ type: "status" });
    }

    // Remove listener and kill worker.
    const terminate = () => {
        if (!worker.current) return;
        if (listening.current) worker.current.removeEventListener("message", listener);
        worker.current.terminate();
    }

    // Add external event listener.
    const listen = (callback: Listener) => {
        worker.current?.addEventListener("message", callback, { passive: true });
        return () => {
            worker.current?.removeEventListener("message", callback);
        };
    }

    // Shorthand to send a message, or silently fail
    const post = (message: {type: string, data: any}) => {
        worker.current?.postMessage(message);
    }

    // Start if we get a worker on load.
    useEffect(() => {
        start();
        return terminate;
    }, [])

    return {
        ref: worker,
        terminate,
        listen,
        post
    }
}

export default useWorker;
