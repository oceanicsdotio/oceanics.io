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


// function render() {
//     const time = performance.now() - start;
//     const elapsed = time - (previous || 0.0);
//     runtime.clear_rect_blending(ctx, ...shape, backgroundColor);

//     ctx.lineWidth = 3.0;
//     let moorings;
//     let mooringSpacing = [80, 300];
//     const mooringSize = 10;
//     const rr = 0.5*mooringSize;

//     {
//         // Draw moorings
//         ctx.strokeStyle = "#FF0000FF";
//         moorings = pathFromGridCell({upperLeft: [0, 0], width: mooringSpacing[0], height: mooringSpacing[1]});

//         moorings.forEach(([x, y]) => {
//             const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});

//             ctx.beginPath();
//             ctx.moveTo(...pts[0]);
//             pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//             ctx.closePath();
//             ctx.stroke();
//         });  
//     }

//     const raftWidth = 40;
//     const nRafts = 4;
//     const scopes = [5, raftWidth, 5];

//     {   
//         // Draw rafts
        
//         const origin = mooringSpacing.map(dim => dim*0.5);
//         const topLeftX = origin[0] - 0.5*raftWidth;
//         const topLeftY = origin[1] - 0.5*(scopes.reduce((a,b)=>a+b,0) + nRafts*raftWidth);

//         let yoffset = 0.0;
//         let prev = null;
//         for (let jj=0; jj<nRafts; jj++) {
//             if (jj)
//                 yoffset += scopes[jj-1];
            
//             ctx.strokeStyle = "#FFAA00FF";
//             const pts = pathFromGridCell({upperLeft: [topLeftX, topLeftY + jj*raftWidth + yoffset], width: raftWidth, height: raftWidth});

//             ctx.beginPath();
//             ctx.moveTo(...pts[0]);
//             pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//             ctx.closePath();
//             ctx.stroke();

            
//             if (prev) {
//                 ctx.strokeStyle = "#FF0000FF";
//                 ctx.beginPath();
//                 ctx.moveTo(...prev[3]);
//                 ctx.lineTo(...pts[0]);

//                 ctx.moveTo(...prev[2]);
//                 ctx.lineTo(...pts[1]);
//                 ctx.stroke();
//             }

//             if (jj==0) {
//                 ctx.strokeStyle = "#FF0000FF";
//                 ctx.beginPath();
//                 ctx.moveTo(...moorings[0]);
//                 ctx.lineTo(...pts[0]);

//                 ctx.moveTo(...moorings[1]);
//                 ctx.lineTo(...pts[1]);
//                 ctx.stroke();
//             }

//             if (jj==nRafts-1) {
//                 ctx.strokeStyle = "#FF0000FF";
//                 ctx.beginPath();
//                 ctx.moveTo(...moorings[2]);
//                 ctx.lineTo(...pts[2]);

//                 ctx.moveTo(...moorings[3]);
//                 ctx.lineTo(...pts[3]);
//                 ctx.stroke();
//             }


//             prev = pts
//         }  
//     }

//     {
//         const xoffset = 140;
//         const yoffset = 50;
//         const lineSpace = [20, 500];

//         // Draw moorings
//         ctx.strokeStyle = "#FF0000FF";
//         for (let ii=0; ii<12; ii++) {
//             const xx = xoffset + ii*lineSpace[0];
            
//             [[xx, yoffset],[xx, yoffset+lineSpace[1]]].forEach(([x, y]) => {
//                 const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});

//                 ctx.beginPath();
//                 ctx.moveTo(...pts[0]);
//                 pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
//                 ctx.closePath();
//                 ctx.stroke();
//             }); 
//         }
//     }

// }