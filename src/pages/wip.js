import React from "react";

import useLagrangian from "../hooks/useLagrangianTest";

export default ({}) => {

    const {ref, message} = useLagrangian({
        source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png",
        metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json",
        res: 32,
        pointSize: 2.0
    });
    

    return <div>
        <canvas ref={ref}/>
        <p>{message}</p>
    </div>
}