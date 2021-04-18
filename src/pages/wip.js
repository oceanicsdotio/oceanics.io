import React, {useState, useEffect, useRef} from "react";

import Worker from "../hooks/useBathysphereApi.worker.js";


const parse = () => {

};

export default ({
    location, 
}) => {

    const [drifters, setDrifters] = useState(null);

    const [data, setData] = useState(null);

    useEffect(()=>{
        
        const start = performance.now();

        fetch("https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/drifters/drifters_2b61_77c4_c459.json")
            .then(response => response.json())
            .then(({table: {columnNames, columnTypes, columnUnits, rows}}) => {
                
                const fetchTime = performance.now() - start;

                const columns = Object.fromEntries(columnNames.map((name, ii)=>[name,{
                    type: columnTypes[ii],
                    unit: columnUnits[ii],
                    index: ii
                }]));

                const indexBy = columns["id"].index
                const latIndex = columns["latitude"].index
                const lonIndex = columns["longitude"].index

                const trajectories = rows.reduce((lookUp, current)=>{
                    const key = current[indexBy];
                    const item = [current[lonIndex], current[latIndex]];
                    if (key in lookUp) {
                        lookUp[key].push(item);
                    } else {
                        lookUp[key] = [item];
                    }
                    return lookUp
                }, {});

                setData({
                    columns, 
                    data: trajectories,
                    fetchTime,
                    processingTime: performance.now() - fetchTime,
                });
            });

    },[]);

    useEffect(()=>{
        if (!data) return;

        console.log(data);
    },[data]);

    return <p>{"hello"}</p>
};