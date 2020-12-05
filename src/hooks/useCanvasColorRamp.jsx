import {useEffect, useState} from "react";

/**
 * Create a temporary canvas element to paint a color
 * map to, then draw a gradient and extract a color
 * look up table from it.
 */
export default ({
    colors,
    shape = [16, 16]
}) => {

    const size = shape[0] * shape[1];
    const [texture, setTexture] =  useState(null);

    useEffect(()=>{
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = 1;
    
        let gradient = ctx.createLinearGradient(0, 0, size, 0);
        Object.entries(colors).forEach(([stop, color]) => {
            gradient.addColorStop(+stop, color)
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, 1);
        
        setTexture({
            filter: "LINEAR", 
            data: new Uint8Array(ctx.getImageData(0, 0, size, 1).data), shape 
        });
        
    },[]);

    return texture;
}