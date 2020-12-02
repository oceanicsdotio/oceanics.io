import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {popups} from "../components/MapPopUp";
import "mapbox-gl/dist/mapbox-gl.css";

import useMapBox from "../hooks/useMapBox";
import useMapboxHighlightEvent from "../hooks/useMapBoxHighlightEvent";
import useMapboxGeoJsonSource from "../hooks/useMapboxGeoJsonSource";

import defaultStyle from "../../static/style.yml";  // map style
import defaultLayers from "../../static/layers.yml";  // map layers


/*
The Map component. 
*/
const Map = ({
    layers=defaultLayers, 
    style=defaultStyle,
    accessToken,
    className,
    center = [-69, 44]
}) => {

    const ref = useRef(null);
    const {map} = useMapBox({ref, center, accessToken, style});
    const [ready, setReady] = useState({});
   

    useMapboxHighlightEvent({
        ready: "nssp-closures" in ready, 
        map, 
        source: "nssp-closures"
    });


    /**
    Swap layers to be in the correct order as they have are created. 
    
    This is so that you can resolve them all asynchronously
    without worrying about the order of creation
    */
    useEffect(() => {
        Object.entries(ready).forEach(([id, behind]) => {
            map.moveLayer(id, behind)
        });
    }, [ready]);

    
    /**
     * Asynchronously retrieve the geospatial data files and parse them.

        Skip this if the layer data has already been loaded, or if the map doesn't exist yet
    
    */

    layers.json.forEach(({popup=null, behind, render}) => {
        return useMapboxGeoJsonSource({
            render,
            map,
            popup: popup ? popups[popup] : null
        })
    });
       
    return <div ref={ref} className={className}/>
};

const MapContainer = styled(Map)`
    height: 100vh;
    width: 100%;
    padding: 0;
    margin: 0;
    display: ${({display})=>display};
`;

export default MapContainer;