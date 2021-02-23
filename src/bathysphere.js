/*
 * Rotate a path of any number of points about the origin.
 * You need to translate first to the desired origin, and then translate back 
 * once the rotation is complete.
 * 
 * Not as flexible as quaternion rotation.
 */
export const rotatePath = (pts, angle) => {
   
    let [s, c] = [Math.sin, Math.cos].map(fcn => fcn(angle));
    return pts.map(([xx, yy]) => [(xx * c - yy * s), (xx * s + yy * c)]);
}


/*
 * Translate x and scale y, rotate CCW, scale points.
 * Points must be in the canvas coordinate reference frame. 
 * The width is the width of the canvas drawing area, and 
 * gridSize is the number of squares per side of the world.
 */
export const inverse = (points, width, gridSize) => {
   
    return rotatePath(points.map(([x,y])=> [
            x - (Math.floor(0.5*gridSize) + 1.25)*width/gridSize/Math.sqrt(2), 
            2*y 
        ]
), -Math.PI/4).map(pt => pt.map(dim => dim*Math.sqrt(2)))};




/**
 * Convenience method that generates the variables needed
 * for common animation loops. 
 */
export const targetHtmlCanvas = (ref, context) => {
    

    [ref.current.width, ref.current.height] = ["width", "height"].map(
        dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
    ).map(x => x * window.devicePixelRatio);

    return {
        start: performance.now(),
        ctx: ref.current.getContext(context),
        shape: [ref.current.width, ref.current.height],
        requestId: null,
        frames: 0,
        cursor: null
    }
};


/**
 * If the WASM runtime has been loaded, get the canvas reference and add a mouse event
 * listener to update the cursor position for interacting with objects within the 
 * canvas rendering context.
 */
export const addMouseEvents = (ref, cursor) => {
   
    return () => {
        if (!ref.current || !cursor || cursor === undefined) return;
        
        ref.current.addEventListener('mousemove', ({clientX, clientY}) => {
            const {left, top} = ref.current.getBoundingClientRect();
            try {
                cursor.update(clientX-left, clientY-top);
            } catch (err) {
                console.log("Cursor error");
            }
        });
    }
}