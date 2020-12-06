import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {popups} from "../components/MapPopUp";
import "mapbox-gl/dist/mapbox-gl.css";

import useMapBox from "../hooks/useMapBox";
import useMapboxHighlightEvent from "../hooks/useMapBoxHighlightEvent";
import useMapboxGeoJsonLayers from "../hooks/useMapboxGeoJsonLayers";



/**
 * The Map component. 
 */
const Map = ({
    layers, 
    accessToken,
    className,
    triggerResize = [],
    center = [-69, 44]
}) => {

    const {map, ref} = useMapBox({
        center, 
        accessToken
    });

   
     // useMapboxHighlightEvent({
    //     ready: "nssp-closures" in ready, 
    //     map, 
    //     source: "nssp-closures"
    // });

    /**
     * Hoist the resize function on map to the parent 
     * interface.
     */
    useEffect(()=>{
        if (!map) return;
        map.resize();
    }, triggerResize);

    /**
     * Swap layers to be in the correct order as they have are created. 
     * You can resolve them asynchronously without worrying 
     * about creation order.
     */
    useEffect(() => {
        if (!metadata) return;
        Object.entries(metadata).forEach(({id, behind}) => {
            map.moveLayer(id, behind)
        });
    }, [metadata]);

    /**
     * Asynchronously retrieve the geospatial data files and parse them.
     * Skip this if the layer data has already been loaded, 
     * or if the map doesn't exist yet
     */
    const {
        metadata
    } = useMapboxGeoJsonLayers({
        map,
        layers: 
            layers.geojson.map(
                ({popup, ...v})=>
                    Object({...v, popup: popup ? popups[popup] : null})
            )
            
    });
    
    return <div ref={ref} className={className}/>;
};

const MapContainer = styled(Map)`
    height: 100vh;
    width: 100%;
    padding: 0;
    margin: 0;
    display: ${({display})=>display};

    & > * {
        display: ${({display})=>display};
    }
`;

export default MapContainer;