import React from "react";
import useLagrangian from "../hooks/useLagrangianTest";
// import useGlslShaders from "../hooks/useGlslShaders";

const source = 
    "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png";


const metadataFile = 
    "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json";


export default ({features}) => {

    // const handle = useGlslShaders({
    //     shaders: {
    //         draw: ["noise-vertex", "noise-fragment"],
    //         screen: ["quad-vertex", "screen-fragment"]
    //     },
    //     fractal: true
    // });

    const { ref } = useLagrangian({
        source,
        metadataFile,
        res: 128,
        pointSize: 2.0
    });

    return <>
    <p>{
        features.length > 1 ? 
        `Shellfish sanitation areas (${features.length})` : 
        `Shellfish sanitation area`
    }</p>
    <canvas
        ref={ref}
        width={360}
        height={180}
    />
    {"Fish"}
    </>}