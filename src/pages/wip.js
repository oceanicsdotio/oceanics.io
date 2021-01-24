import React from "react";
import styled from "styled-components";
import useLagrangian from "../hooks/useLagrangianTest";
import useFractalNoise from "../hooks/useFractalNoise";

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
    image-rendering: crisp-edges;
`;

export default () => {
    const handle = useFractalNoise({});
    // const handle = useLagrangian({
    //     source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png",
    //     metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json",
    //     res: 256,
    //     pointSize: 2.0
    // });

    return <Canvas
        id={"render-target"}
        ref={handle.ref}
        width={800}
        height={500}
    />       
};
