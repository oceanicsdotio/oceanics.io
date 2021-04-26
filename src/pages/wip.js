import React, {useState, useEffect, useReducer, useRef} from "react";
import styled from "styled-components";
import Worker from "../hooks/useObjectStorage.worker.js";


const Canvas = styled.canvas`
    width: 720px;
    height: 360px;
    border: 1px solid white;
`;

/**
 * Combines some requirements from NOAA and GOMLF with NASA and E84. 
 * 
 * Data Sources
 * - Student Drifter Data (json)
 * - NASA GRACE Tellus (nc)
 * 
 * Pull trajectory data and reduce to mask
 * 
 * Pull NASA data and chunk it. 
 * 
 * Metadata from `ncdump -h` and `netcdfjs` in `src/grace-node.js`.
 * 
 */
export default () => {

    /**
     * The actual data to insert into WASM runtime
     */
    const [ asset, setAsset ] = useState(null);

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
     * Let's display logs in browser instead of console
     */
    const [ logs, dispatchLogs ] = useReducer((accumulator, current) => [
        ...accumulator, current
    ], ["Please wait just a moment..."]); 

    /**
     * Runtime will be passed to calling Hook or Component. 
     */
    const [ runtime, setRuntime ] = useState(null);

    /**
     * Dynamically load the WASM, add debugging, and save to React state,
     */
    useEffect(() => {
        try {
            (async () => {
                const runtime = await import('../wasm');
                runtime.panic_hook();
                setRuntime(runtime);
            })()   
        } catch (err) {
            dispatchLogs(`Unable to load WASM runtime: ${err.message}`)
        }
    }, []);

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
     * Fetch the binary buffer image data.
     */
    useEffect(()=>{
        if (!job || !worker.current) return;

        worker.current
            .fetchImageBuffer(job.source)
            .then(setAsset)
            .catch(err => {
                dispatchLogs(err.message);
            })
    }, [ job, worker ]);

    // Tell us runtime is ready
    useEffect(() => {

        if (!runtime) return;

        const elapsed = (performance.now() - job.start) / 1000;

        dispatchLogs(`WASM runtime ready in ${elapsed.toFixed(2)} seconds.`);

    }, [ runtime ]);

    /**
     * Do some calculations when the data and jobs are ready.
     */
    useEffect(() => {

        if (!asset || !job) return;

        const elapsed = (performance.now() - job.start) / 1000;

        dispatchLogs(`Workers and data ready in ${elapsed.toFixed(2)} seconds.`);

    }, [ asset, job ]);



    /**
     * Do some calculations when the data and jobs are ready.
     * 
     */
     useEffect(() => {

        if (!ref || !ref.current || !asset || !job || !runtime) return;

        // Pixel perfect, on Retina display at least
        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        // Mock a Fragment shader with Context2D API

        const ctx = ref.current.getContext('2d');
        const imageData = ctx.createImageData(720, 360);
        const [ minValue, maxValue ] = [-1747.25, 720.36]; 
        const range = maxValue - minValue;
        
        for (let ii = 0; ii < imageData.data.length/4; ii++) {

            const value = (asset[ii] - minValue) / range * 255;
        
            imageData.data[ii*4 + 0] = value;
            imageData.data[ii*4 + 1] = value;
            imageData.data[ii*4 + 2] = value;
            imageData.data[ii*4 + 3] = 255;
        }
        
        // Draw image data to the canvas
        ctx.putImageData(imageData, 0, 0);

        // Log it
        const elapsed = (performance.now() - job.start) / 1000;
        dispatchLogs(`Canvas GL context ready in ${elapsed.toFixed(2)} seconds.`);

        dispatchLogs(`Uh oh!`);

    }, [ ref, asset, job, runtime ]);


    return <div>
        {logs.map((status, ii) => <p key={ii}>{status}</p>)}
        <Canvas ref={ref}/>
    </div>
};