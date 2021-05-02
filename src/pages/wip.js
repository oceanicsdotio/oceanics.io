import React, {useState, useEffect, useReducer, useRef} from "react";
import styled from "styled-components";
import Worker from "../hooks/useObjectStorage.worker.js";

// import useOceanside from "../hooks/useOceanside";


const Canvas = styled.canvas`
    width: 360px;
    height: 180px;
    border: 1px solid white;
`;

/**
 * Combines some requirements from NOAA and GOMLF with NASA and E84. 
 * 
 * Data Sources
 * - Student Drifter Data (json)
 * 
 * Pull trajectory data and reduce to mask
 * 
 */
export default () => {

    /**
     * React state for number of processors. 
     * 
     * This will be our trigger
     */
    const [ job, setJob ] = useState(null);

    /**
     * Reference to pass to target canvas
     */
    const ref = useRef(null);

    /**
     * Web worker reference for background tasks. 
     */
    const worker = useRef(null);

    /**
     * Figure out how many workers we can have.
     */
    useEffect(() => {
        setJob({
            start: performance.now(),
            concurrency: 1,
            source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/grace/test/nodes/mtvx6o"
        });
    }, []);

    /**
     * Instantiate the web worker, lazy-load style.
     */
    useEffect(() => {
        worker.current = new Worker();
        return () => worker.current.terminate();
    }, []);


    /**
     * Do some calculations when the data and jobs are ready.
     * 
     */
     useEffect(() => {

        if (!ref || !ref.current || !job) return;

        // Pixel perfect, on Retina display at least
        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        // Mock Fragment shader with Context2D API
        const ctx = ref.current.getContext('2d');
        const imageData = ctx.createImageData(360, 180);
        const [ minValue, maxValue ] = [0, 1]; 
        const range = maxValue - minValue;
        
        for (let ii = 0; ii < imageData.data.length/4; ii++) {

            const value = (Math.random() - minValue) / range * 255;
        
            imageData.data[ii*4 + 0] = 255;
            imageData.data[ii*4 + 1] = 255;
            imageData.data[ii*4 + 2] = 255;
            imageData.data[ii*4 + 3] = 255;
        }
        
        // Draw image data to canvas
        ctx.putImageData(imageData, 0, 0);

    }, [ ref, job ]);


    return <div>
        {logs.map((status, ii) => <p key={ii}>{status}</p>)}
        <Canvas ref={ref}/>
    </div>
};