
import React from "react";
import useRectilinearGrid from "../hooks/useRectilinearGrid";
import useTriangularMesh from "../hooks/useTriangularMesh";

export default () => {

    const grid = useRectilinearGrid({
        lineWidth: 1.0,
        boundingBox: [
            [-70.1, 44.0],
            [-69.7, 44.0],
            [-69.7, 43.6],
            [-70.1, 43.6]
        ]
    });


    return <canvas
        id={"render-target"}
        ref={grid.ref}
    />             
};
