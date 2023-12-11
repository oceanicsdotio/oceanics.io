import { useState, useEffect } from "react";
import useCanvasContext from "../components/CanvasContext/useCanvasContext";

type IColorMap = {
    width: number;
    height: number;
    colors: string[];
};

/**
 * Paints a color-map to a hidden canvas and then samples it as 
 * a lookup table for speed calculations.
 * 
 * The recommended size is 16 x 16, but we require input so that
 * we don't set defaults that need to be passed out.
 * 
 * This is one way to implement fast lookups of piece-wise functions.
 */
export default ({
    width,
    height,
    colors,
}: IColorMap) => {

    /**
     * Calculate size from dimensions. Using linear ramp,
     * but will be stored in GPU as 2D
     */
    const size = width * height;

    /**
     * Hold reference to temporary canvas element. 
     * 
     * This is available for specific use cases that reuse
     * the canvas. 
     */
    const {ref, validContext} = useCanvasContext("2d");

    /**
     * Create a temporary canvas element to paint a color
     * map to. This will be an orphan, and we need to make
     * sure it gets cleaned up.
     */
    useEffect(() => {
        ref.current = document.createElement('canvas');
        [ ref.current.width, ref.current.height ] = [ size, 1 ];
    }, []);

    /**
     * State for data to be passed to WebGL
    }, [ validContext ]);
     */
    const [ texture, setTexture ] =  useState<Uint8Array|null>(null);

    /**
     * Then draw a gradient and extract a color
     * look up table from it.
     * 
     * Fires once when canvas is set. 
     */
    useEffect(() => {
        if (!validContext) return;
        const ctx = validContext as CanvasRenderingContext2D;
        
        // Create `CanvasGradient` and add color stops
        ctx.fillStyle = ctx.createLinearGradient(0, 0, size, 0);
        colors.forEach(([offset, color]) => { 
            (ctx.fillStyle as CanvasGradient).addColorStop(parseFloat(offset), color) 
        });

        // Draw to temp canvas
        ctx.fillRect(0, 0, size, 1);
        
        // Extract regularly interpolated data
        const buffer = ctx.getImageData(0, 0, size, 1).data;
        setTexture(new Uint8Array(buffer));
    }, [ validContext ]);

    /**
     * Clean up. Remove canvas and delete state.
     * 
     * This hook fires once when texture is set. 
     */
    useEffect(() => {
        if (!texture || !ref.current) return;
        ref.current.remove();
        ref.current = null;
    }, [ texture ]);

    return {
        texture,
        canvas: ref.current
    }
}
