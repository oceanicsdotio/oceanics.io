import {useRef, useState} from "react";
import type {Dispatch, SetStateAction} from "react";

const useSharedWorkerState = (name: string) => {
    const ref = useRef<SharedWorker|null>();
    const [messages, setMessages] = useState<String[]>([]);

    const onMessageHandler = (name: string, setValue: Dispatch<SetStateAction<any[]>>) => ({data}: any) => {
        console.log(`Message from ${name} worker:`, data);
        setValue((prev: any[]) => [...prev, data]);
    }

    const start = (worker: SharedWorker) => {
        ref.current = worker;
        if (ref.current) {
            ref.current.port.onmessage = onMessageHandler(name, setMessages);
            ref.current.port.postMessage({ type: "status" });
        } else {
            console.error(`${name} worker not ready`);
        }
        return ref.current
    }

    return {
        ref,
        messages,
        start
    }
}


export default useSharedWorkerState;