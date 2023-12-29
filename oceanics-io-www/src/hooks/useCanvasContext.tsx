import { useEffect, useState, useRef } from "react";
import type { MutableRefObject } from "react";



export const useCanvasContext = (contextType: "2d" | "webgl") => {
    /**
     * Canvas ref to get a WebGL context from once it has been
     * assigned to a valid element. 
     */
    const ref: MutableRefObject<HTMLCanvasElement | null> = useRef(null);
    /**
     * Whenever we need WebGL context, make sure we have an up 
     * to date instance. We can then use this to gate certain Hooks.
     */
    const [validContext, setValidContext] = useState<RenderingContext | null>(null);
    /**
     * Check whether we have a valid context.
     */
    useEffect(() => {
        if (!ref || !ref.current) {
            if (validContext) setValidContext(null);
            return;
        } 
        const ctx = ref.current.getContext(contextType);
        if (!ctx) {
            throw TypeError("No Rendering Context")
        }
        setValidContext(ctx);
    }, [ref.current]);

    return {
        ref,
        validContext
    }
}

export default useCanvasContext;
