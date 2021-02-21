import React from "react";
import styled from "styled-components";

import useMapBox from "../hooks/useMapBox";
import useTriangularMesh from "../hooks/useTriangularMesh";

/**
 * The Map component is a `<div>` that gets passed the MapBox `ref`. 
 */
const Map = ({
    accessToken,
    className,
    triggerResize = [],
    center = [-69, 44]
}) => {

    /**
     * Custom Hook that handles event cascades for loading and parsing data
     * into MapBox sources and layers.
     */
    const { map, ref } = useMapBox({
        center, 
        accessToken, 
        triggerResize
    });

    /**
     * Add a mesh instance to the map.
     */
    useTriangularMesh({
        map,
        name: "necofs_gom3_mesh", 
        extension: "nc",
        attribution: "UMass Dartmouth"
    });

    // useTriangularMesh({
    //     map,
    //     name: "midcoast_nodes", 
    //     extension: "csv",
    //     attribution: "UMaine"
    // });

    return <div ref={ref} className={className}/>;
};


/**
 * Styled version of the Map component for the main Application in `pages/app.js`.
 */
const MapContainer = styled(Map)`
    height: 100vh;
    width: 100%;
    padding: 0;
    margin: 0;
`;

export default MapContainer;