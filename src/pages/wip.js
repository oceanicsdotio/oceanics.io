
import React from "react";
import styled from "styled-components";

import useOceanside from "../hooks/useOceanside";
import useTriangularMesh from "../hooks/useTriangularMesh";
// import useLagrangian from "../hooks/useLagrangian";

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
`;

export default () => {

    // const handle = useLagrangian({
    //     source: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.png",
    //     metadataFile: "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com/bathysphere/geospatial/wind.json"
    // });

    const handle = useOceanside({});

    // const handle = useTriangularMesh({
    //     // name: "necofs_gom3_mesh"
    // });
    
    return <><Canvas
        id={"render-target"}
        ref={handle.board.ref}
    />    
    <canvas ref={handle.nav.ref}></canvas>
    </>         
};
