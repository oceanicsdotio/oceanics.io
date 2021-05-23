import React from "react";

import useLagrangian from "../hooks/useLagrangian";

export default ({}) => {

    const {ref, message, preview} = useLagrangian({
        source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png",
        metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json",
        res: 8,
        pointSize: 2.0
    });
    

    return <div>
        <canvas ref={ref}/>
        <p>{message}</p>

        <canvas ref={preview}/>
        <p>{"Preview"}</p>
    </div>
}