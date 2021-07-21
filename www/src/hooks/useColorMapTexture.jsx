/**
 * React friends.
 */
import { useState, useEffect } from "react";

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
 }) => {

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
    const [ canvas, setCanvas ] = useState(null);

    /**
     * Create a temporary canvas element to paint a color
     * map to. This will be an orphan, and we need to make
     * sure it gets cleaned up.
     */
    useEffect(() => {
        const _canvas = document.createElement('canvas');
        [ _canvas.width, _canvas.height ] = [ size, 1 ];
        setCanvas(_canvas);
    }, []);

    /**
     * State for data to be passed to WebGL
     */
    const [ texture, setTexture ] =  useState(null);

    /**
     * Then draw a gradient and extract a color
     * look up table from it.
     * 
     * Fires once when canvas is set. 
     */
    useEffect(() => {
        if (!canvas) return; 

        // 2D context reference
        const ctx = canvas.getContext('2d');
       
        // Create `CanvasGradient` and add color stops
        ctx.fillStyle = ctx.createLinearGradient(0, 0, size, 0);
        colors.forEach(pair => { ctx.fillStyle.addColorStop(...pair) });

        // Draw to temp canvas
        ctx.fillRect(0, 0, size, 1);
        
        // Extract regularly interpolated data
        setTexture(new Uint8Array(ctx.getImageData(0, 0, size, 1).data));
        
    }, [ canvas ]);

    /**
     * Clean up. Remove canvas and delete state.
     * 
     * This hook fires once when texture is set. 
     */
    useEffect(() => {
        if (!texture) return;

        canvas.remove();
        setCanvas(null);
    }, [ texture ]);

    return {
        texture: texture,
        canvas: canvas
    }
 }
