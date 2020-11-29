import { useEffect } from "react";
import { targetHtmlCanvas, pathFromGridCell } from "../bathysphere";
import useWasmRuntime from "./useWasmRuntime";


export default ({
    ref,
    overlayColor=`#77CCFFFF`,
    backgroundColor=`#000000CC`,
}) => {
   
    const runtime = useWasmRuntime();

    useEffect(() => {
        /*
        First populate the mesh data structure with points and topology
        from preprogrammed routines.
        
        Then draw the mesh in an animation loop. 
        */

        if (!runtime) return;

        let {start, ctx, shape, requestId, frames} = targetHtmlCanvas(ref, `2d`);
        let previous;  // memoize time to use in smoothing real-time rotation 

        (function render() {
            const time = performance.now() - start;
            const elapsed = time - (previous || 0.0);
            runtime.clear_rect_blending(ctx, ...shape, backgroundColor);

            ctx.lineWidth = 3.0;
            let moorings;
            let mooringSpacing = [80, 300];
            const mooringSize = 10;
            const rr = 0.5*mooringSize;

            {
                // Draw moorings
                ctx.strokeStyle = "#FF0000FF";
                moorings = pathFromGridCell({upperLeft: [0, 0], width: mooringSpacing[0], height: mooringSpacing[1]});

                moorings.forEach(([x, y]) => {
                    const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});

                    ctx.beginPath();
                    ctx.moveTo(...pts[0]);
                    pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
                    ctx.closePath();
                    ctx.stroke();
                });  
            }

            const raftWidth = 40;
            const nRafts = 4;
            const scopes = [5, raftWidth, 5];

            {   
                // Draw rafts
                
                const origin = mooringSpacing.map(dim => dim*0.5);
                const topLeftX = origin[0] - 0.5*raftWidth;
                const topLeftY = origin[1] - 0.5*(scopes.reduce((a,b)=>a+b,0) + nRafts*raftWidth);

                let yoffset = 0.0;
                let prev = null;
                for (let jj=0; jj<nRafts; jj++) {
                    if (jj)
                        yoffset += scopes[jj-1];
                    
                    ctx.strokeStyle = "#FFAA00FF";
                    const pts = pathFromGridCell({upperLeft: [topLeftX, topLeftY + jj*raftWidth + yoffset], width: raftWidth, height: raftWidth});

                    ctx.beginPath();
                    ctx.moveTo(...pts[0]);
                    pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
                    ctx.closePath();
                    ctx.stroke();

                    
                    if (prev) {
                        ctx.strokeStyle = "#FF0000FF";
                        ctx.beginPath();
                        ctx.moveTo(...prev[3]);
                        ctx.lineTo(...pts[0]);

                        ctx.moveTo(...prev[2]);
                        ctx.lineTo(...pts[1]);
                        ctx.stroke();
                    }

                    if (jj==0) {
                        ctx.strokeStyle = "#FF0000FF";
                        ctx.beginPath();
                        ctx.moveTo(...moorings[0]);
                        ctx.lineTo(...pts[0]);

                        ctx.moveTo(...moorings[1]);
                        ctx.lineTo(...pts[1]);
                        ctx.stroke();
                    }

                    if (jj==nRafts-1) {
                        ctx.strokeStyle = "#FF0000FF";
                        ctx.beginPath();
                        ctx.moveTo(...moorings[2]);
                        ctx.lineTo(...pts[2]);

                        ctx.moveTo(...moorings[3]);
                        ctx.lineTo(...pts[3]);
                        ctx.stroke();
                    }


                    prev = pts
                }  
            }

            {
                const xoffset = 140;
                const yoffset = 50;
                const lineSpace = [20, 500];

                // Draw moorings
                ctx.strokeStyle = "#FF0000FF";
                for (let ii=0; ii<12; ii++) {
                    const xx = xoffset + ii*lineSpace[0];
                    
                    [[xx, yoffset],[xx, yoffset+lineSpace[1]]].forEach(([x, y]) => {
                        const pts = pathFromGridCell({upperLeft: [x-rr, y-rr], width: mooringSize, height: mooringSize});
    
                        ctx.beginPath();
                        ctx.moveTo(...pts[0]);
                        pts.slice(1, pts.length).map(pt => ctx.lineTo(...pt));
                        ctx.closePath();
                        ctx.stroke();
                    }); 
                }
            }

            frames = runtime.draw_fps(ctx, frames, time, overlayColor);
            requestId = requestAnimationFrame(render);
            previous = time;
        })();

        return () => cancelAnimationFrame(requestId);
    }, [runtime]);

    return {runtime};
};