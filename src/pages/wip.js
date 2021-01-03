
import React from "react";
import styled from "styled-components";

import useRectilinearGrid from "../hooks/useRectilinearGrid";
import useTriangularMesh from "../hooks/useTriangularMesh";
import useLagrangian from "../hooks/useLagrangian";
import useShipyard from "../hooks/useShipyard";

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
`;

export default () => {

    // const handle = useLagrangian({
    //     source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png",
    //     metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json"
    // });

    const handle = useShipyard({});
    
    return <Canvas
        id={"render-target"}
        ref={handle.ref}
    />             
};
