import {useEffect, useRef} from 'react';


const preprocessImageData = ({data, width, height}) => {

    const BLOCK = data.length/(width*height);  // Image data may be stored without alpha channel
    const linearIndex = (ii, jj) => (jj * width + ii) * BLOCK;
    const getPixelRGB = (ii, jj) => {
        const index = linearIndex(ii, jj);
        return data.slice(index, index + BLOCK);
    }

    let histogram = {};
    for (let ii = 0; ii < width; ii+=1) {
        for (let jj = 0; jj < height; jj+=1) {
            const rgb = getPixelRGB(ii, jj);                
            histogram[rgb] = rgb in histogram ? histogram[rgb] + 1 : 1;
        }
    }

    return {
        data,
        width,
        height,
        linearIndex: linearIndex,
        axes: {
            x: {
                ticks: [],
                label: "",
                extent: [0, width],
                origin: null,
            },
            y: {
                ticks: [],
                label: "",
                extent: [0, height],
                origin: null,
            }
        },
        functions: [],
        histogram,
        blockLength: BLOCK,
        getPixelRGB: getPixelRGB,
        getPixelMasked: (ii, jj) => {
            const [r, g, b] = getPixelRGB(ii, jj);
            if (r === 0 && g === 0 && b === 0) {    
                return [r, g, b, 1];
            } else {
                const fg = 255*Math.round((r+g+b)/(255*3)); // foreground color
                return [fg, fg, fg, (255-fg)/255];
            }
        }
    }
};




export default () => {
    
    const target = useRef(null);

    useEffect(()=>{
        /* 
        Extract image data and use it to draw a replacement image on the auxiliary canvas.

        The images can be parsed in several ways based on the properties of the figures.

        * The arrow glyphs terminating lines are not the same, meaning these are inferred, not restyled.
        * There are 3 contiguous regions: the plot and 2 labels
        * 

        1. Preprocess pixel values to black and white, or color bins - OK
        2. Partition foreground and background - OK
        3. Use ray casting to sample for grid lines - HACK
        4. Subtract grid
        5. Create bounding boxes for remainining regions (assumed to be text nodes)
        6. Run tesseract OCR on text regions - SKIP
        7. Convert text to braille - HACK
        8. Draw all components back to canvas restyled

        To be able to redraw, we need to locate the axes, the grid lines, plotted lines, and labels.
        */
        if (!opRefs || !target.current) return;

        const imageFilter = "img_p1_3"
        const queue = opRefs["paintImageXObject"].filter(([key])=>key.includes(imageFilter));
        
        const pdfImageData = {};  // Here, hold my beer.

        const extractAxis = (imageContext, axis) => {

            const {width, height, getPixelMasked} = imageContext;
            const threshold = 0.5;  // TODO: determine from data instead of harcode
            const isX = axis==="x";
            const majorDim = isX ? width : height;
            const minorDim = isX ? height : width;

            let maxCount = { cells: 0, ii: 0 };
            let maxDelta = { cells: 0, ii: 0 };
            let minDelta = { cells: 0, ii: 0 };
            
            let previous = 0;

            for (let ii = 0; ii < majorDim; ii++) {
                /*
                Scan each column and count foreground pixels to detect features. Need to determine X extent and max
                height (X origin) while iterating
                */
                let cells = 0;
                let start = 0;
                let end = 0;
                
                for (let jj = 0; jj < minorDim; jj++) {
                    const alpha = getPixelMasked(...(isX ? [ii, jj] : [jj, ii]))[3];
                    if (alpha) {
                        cells += 1;
                        if (!start) start = jj;
                        end = jj;
                    };
                }
                
                const extent = end - start;
                const delta = extent - previous;

                if (cells > maxCount.cells) maxCount = {cells, ii};
                if (cells > minorDim*threshold) imageContext.axes[axis].ticks.push(ii);
                if (delta > maxDelta.cells) maxDelta = {cells: delta, ii};
                if (delta < minDelta.cells) minDelta = {cells: delta, ii};

                previous = extent;
            }

            imageContext.axes[axis].origin = maxCount.ii;
            imageContext.axes[axis].extent = [maxDelta.ii, minDelta.ii];
        }
       
        queue.forEach(([key])=>{
            page.objs.get(key, img=>{

                const {width, height, getPixelMasked} = pdfImageData[key] = preprocessImageData(img);
               
                // Calculate histogram of pixel colors
                const ctx = target.current.getContext("2d");
                target.current.width = width;
                target.current.height = height;
                
                extractAxis(pdfImageData[key], "x");
                extractAxis(pdfImageData[key], "y"); 

                // Overdraw the dotted grid lines and axis hashes
                for (let ii = 0; ii < 2; ii++) {

                    const orderedAxes = (!ii) ? ["x", "y"] : ["y", "x"];
                    const [primary, {extent: [start, end], origin}] = orderedAxes.map(dim => pdfImageData[key].axes[dim]);

                    primary.ticks.forEach((tick) => {
                        if (Math.abs(tick - primary.origin) < 5) return;

                        for (let jj = start; jj < end; jj++) {
                            const coords = (!ii) ? [tick, jj] : [jj, tick];
                            if ((jj - start) % 4 === 0) {
                                ctx.fillStyle = `rgba(0,0,0,1.0)`;
                                ctx.fillRect(...coords, 1, 1);
                            } else {
                                ctx.clearRect(...coords, 1, 1);
                            }
                        }

                        ctx.strokeStyle = `rgba(0,0,0,1.0)`;
                        ctx.beginPath();
                        ctx.moveTo(...((ii) ? [origin - 10, tick] : [tick, origin - 10]));
                        ctx.lineTo(...((ii) ? [origin + 10, tick] : [tick, origin + 10]));
                        ctx.stroke();
                    });
                }

                // Draw axes
                const offset = 5;
                for (let ii = 0; ii < 2; ii++) {
                    const orderedAxes = (!ii) ? ["x", "y"] : ["y", "x"];
                    
                    const arrow = 3;
                    const fontSize = 20;
                    const [{extent: [start, end]}, {origin}] = orderedAxes.map(dim => pdfImageData[key].axes[dim]);

                    ctx.fillStyle = `rgba(0,0,0,1.0)`;
                    ctx.strokeStyle = `rgba(0,0,0,1.0)`;
                    ctx.globalAlpha = 1.0;

                    // Draw axis line
                    ctx.beginPath();
                    ctx.moveTo(...((!ii) ? [start - offset, origin] : [origin, start - offset]));
                    ctx.lineTo(...((!ii) ? [end + offset, origin] : [origin, end + offset]));
                    ctx.stroke();

                    // Draw arrows
                    ctx.beginPath();
                    ctx.moveTo(...((!ii) ? [end + offset*2, origin] : [origin, end + offset*2]));
                    ctx.lineTo(...((!ii) ? [end + offset, origin + arrow] : [origin + arrow, end + offset]));
                    ctx.lineTo(...((!ii) ? [end + offset, origin - arrow] : [origin - arrow, end + offset]));
                    ctx.closePath();
                    ctx.fill();

                    // Problem in this logic for the TOP Y arrow
                    ctx.beginPath();
                    ctx.moveTo(...((!ii) ? [start - offset*2, origin] : [origin, start - offset*2]));
                    ctx.lineTo(...((!ii) ? [start - offset, origin + arrow] : [origin + arrow, start - offset*2]));
                    ctx.lineTo(...((!ii) ? [start - offset, origin - arrow] : [origin - arrow, start - offset*2]));
                    ctx.closePath();
                    ctx.fill();

                    // Should use Tesseract and convert, but... tired and late
                    ctx.font = `${fontSize}px serif`;
                    if (ii) ctx.fillText("\u2830\u283d", origin - 0.5*ctx.measureText("\u2830\u283d").width, fontSize);
                    else ctx.fillText("\u2830\u282d", width-ctx.measureText("\u2830\u282d").width, origin + 0.5*fontSize);
                }

                // Draw the data line, and erase anything in it's shadow
                const fcn = (x) => 2 * x; // determine the finction empirically from the pixel data
                const [start, end] = pdfImageData[key].axes.x.extent;
                for (let ii = start; ii < end; ii++ ) {
                    let xAdjusted =  ii - pdfImageData[key].axes.x.origin;
                    let vExtent = pdfImageData[key].axes.y.extent;

                    for (let jj = vExtent[0] - 2* offset; jj < vExtent[1] + 2*offset; jj++) {
                        let yAdjusted = -1*(jj - pdfImageData[key].axes.y.origin);
                        let distance = Math.abs(fcn(xAdjusted) - yAdjusted);
                        if (distance < 2.5) {
                            ctx.fillRect(ii, jj, 1, 1);
                        } else if (distance < 7) {
                            ctx.clearRect(ii, jj, 1, 1);
                        } 
                    }
                }
            });
        });
    },[opRefs]);
    
}