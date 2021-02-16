


const size = 64;
export const pulsingDot = (map) => Object({
            
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function () {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        this.context = canvas.getContext('2d');
    },

    // called once before every frame where the icon will be used
    render: function () {
        var duration = 1000;
        var time = (performance.now() % duration) / duration;

        var radius = (size / 2) * 0.3;
        var outerRadius = (size / 2) * 0.7 * time + radius;
        var ctx = this.context;

    
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(
            size / 2,
            size / 2,
            outerRadius,
            0,
            Math.PI * 2
        );
        
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2 + 4 * (1 - time);
        ctx.stroke();

        // update this image's data with data from the canvas
        this.data = ctx.getImageData(
            0,
            0,
            size,
            size
        ).data;

        map.triggerRepaint();
        return true;
    }
});

export const waterLevel = (map) => Object({

    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function () {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        this.context = canvas.getContext('2d');
        
        // update this image's data with data from the canvas
        
    },

    // called once before every frame where the icon will be used
    render: function () {
        var ctx = this.context;
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
    
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 3;
        ctx.stroke();

        this.data = ctx.getImageData(
            0,
            0,
            size,
            size
        ).data;
        map.triggerRepaint();
        return true;
        
    }
});


/*
Rotate a path of any number of points about the origin.

You need to translate first to the desired origin, and then translate back once the rotation is complete.

Not as flexible as quaternion rotation.
*/
export const rotatePath = (pts, angle) => {
   
    let [s, c] = [Math.sin, Math.cos].map(fcn => fcn(angle));
    return pts.map(([xx, yy]) => [(xx * c - yy * s), (xx * s + yy * c)]);
}


/*
Translate x and scale y, rotate CCW, scale points.

Points must be in the canvas coordinate reference frame. 
The width is the width of the canvas drawing area, and 
gridSize is the number of squares per side of the world.
*/
export const inverse = (points, width, gridSize) => {
   
    return rotatePath(points.map(([x,y])=> [
            x - (Math.floor(0.5*gridSize) + 1.25)*width/gridSize/Math.sqrt(2), 
            2*y 
        ]
), -Math.PI/4).map(pt => pt.map(dim => dim*Math.sqrt(2)))};


export const eventCoordinates = ({clientX, clientY}, canvas) => {
    // Short hand for element reference frame
    const {left, top} = canvas.getBoundingClientRect();
    return [clientX - left, clientY - top]
}


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