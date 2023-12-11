import { useEffect, useState, useRef } from "react";
import type { MutableRefObject } from "react";


export default (contextType: string) => {
    /**
     * Canvas ref to get a WebGL context from once it has been
     * assigned to a valid element. 
     */
    const ref: MutableRefObject<HTMLCanvasElement | null> = useRef(null);

    /**
     * Whenever we need WebGL context, make sure we have an up to date instance.
     * 
     * We can then use this to gate certain Hooks.
     */
    const [validContext, setValidContext] = useState<RenderingContext | null>(null);

    /**
     * Check whether we have a valid WebGL context.
     */
    useEffect(() => {
        if (typeof ref === "undefined" || !ref || !ref.current) {
            setValidContext(null);
        } else {
            const canvas: HTMLCanvasElement = ref.current;
            const ctx: RenderingContext | null = canvas.getContext(contextType);
            if (!ctx) {
                throw TypeError("No Rendering Context")
            }
            setValidContext(ctx);
        }
    }, [ref, contextType]);

    return {
        ref,
        validContext
    }
}