
import React from "react";
import styled from "styled-components";

import useTriangularMesh from "../hooks/useTriangularMesh";
import useLagrangian from "../hooks/useLagrangianTest";

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
    image-rendering: crisp-edges;
`;

export default () => {

    const handle = useLagrangian({
        source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png",
        metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json",
        res: 64
    });


    // const handle = useTriangularMesh({
    //     // name: "necofs_gom3_mesh"
    //     shape: [8, 8]
    // });
    
    return <Canvas
        id={"render-target"}
        ref={handle.ref}
    />       
};
