import React, {useState, useEffect, useReducer, useRef} from "react";
import styled from "styled-components";
import Worker from "../hooks/useBathysphereApi.worker.js";


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
 * Pull NASA data and chunk it. Metadata from `ncdump -h`
 * 
 * 
 */
export default () => {

    // const [ drifters, setDrifters ] = useState(null);

    const [ asset, setAsset ] = useState(null);

    /**
     * React state for number of processors. 
     * 
     * We will want to be able to provide a control to terminate
     * or start them.
     * 
     * This will be our trigger
     */
    const [ workers, setWorkers ] = useState(null);

    /**
     * Figure out how many workers we can have.
     */
    useEffect(() => {
        setWorkers({
            start: performance.now(),
            concurrency: Math.max(navigator.hardwareConcurrency - 1, 1)
        });
    }, []);

    /**
     * Fetch the binary buffer image data. Time it.
     */
    useEffect(()=>{

        const url = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/grace/test/nodes/mtvx6o";

        fetch(url)
            .then(response => response.blob())
            .then(blob => (new Promise(resolve => {
                    var reader = new FileReader();
                    reader.onloadend = () => {resolve(reader.result)};
                    reader.readAsArrayBuffer(blob);
                })))
            .then(array => {
                setAsset(new Float32Array(array));
            })
            .catch(err => {
                console.log({error: err.message});
            })
    }, []);


    const [ logs, dispatchLogs ] = useReducer((accumulator, current) => [
        ...accumulator, current
    ], ["Please wait just a moment..."]); 

    /**
     * Do some calculations when the data and jobs are ready.
     */
    useEffect(() => {

        if (!asset || !workers) return;

        const elapsed = (performance.now() - workers.start) / 1000;

        dispatchLogs(`Workers and data ready in ${elapsed.toFixed(2)} seconds.`);

    }, [ asset, workers ]);


    const ref = useRef(null);

    /**
     * Do some calculations when the data and jobs are ready.
     */
     useEffect(() => {

        if (!ref || !ref.current) return;

        [ref.current.width, ref.current.height] = ["width", "height"].map(
            dim => getComputedStyle(ref.current).getPropertyValue(dim).slice(0, -2)
        );

        const elapsed = (performance.now() - workers.start) / 1000;

        dispatchLogs(`Canvas GL context ready in ${elapsed.toFixed(2)} seconds.`);

    }, [ ref ]);

    // useEffect(()=>{
        
    //     const start = performance.now();

    //     fetch("https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/drifters/drifters_2b61_77c4_c459.json")
    //         .then(response => response.json())
    //         .then(({table: {columnNames, columnTypes, columnUnits, rows}}) => {
                
    //             const fetchTime = performance.now() - start;

    //             const columns = Object.fromEntries(columnNames.map((name, ii)=>[name,{
    //                 type: columnTypes[ii],
    //                 unit: columnUnits[ii],
    //                 index: ii
    //             }]));

    //             const indexBy = columns["id"].index
    //             const latIndex = columns["latitude"].index
    //             const lonIndex = columns["longitude"].index

    //             const trajectories = rows.reduce((lookUp, current)=>{
    //                 const key = current[indexBy];
    //                 const item = [current[lonIndex], current[latIndex]];
    //                 if (key in lookUp) {
    //                     lookUp[key].push(item);
    //                 } else {
    //                     lookUp[key] = [item];
    //                 }
    //                 return lookUp
    //             }, {});

    //             setData({
    //                 columns, 
    //                 data: trajectories,
    //                 fetchTime,
    //                 processingTime: performance.now() - fetchTime,
    //             });
    //         });

    // },[processors]);

    /**
     * Animation loop serves as our scheduler, will attempt 60 ops per second,
     * and scale back. 
     * 
     * Importantly, only runs when browser tab is active. Effortless pausing
     * of background function
     */
    useEffect(() => {
        if (!ref.current) return;

        let requestId = null;

        (function render() {
            requestId = requestAnimationFrame(render);
        })()

        return () => cancelAnimationFrame(requestId);
    }, [ ref ]);


    return <div>
        {logs.map((status, ii) => <p key={ii}>{status}</p>)}
        <Canvas ref={ref.current}/>
    </div>
};