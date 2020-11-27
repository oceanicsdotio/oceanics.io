import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import styled from "styled-components";
import {suitabilityHandler, licenseHandler, leaseHandler, nsspHandler, portHandler} from "../components/MapPopUp";
import {parseFeatureData} from "../bathysphere.js";
import "mapbox-gl/dist/mapbox-gl.css";

import useMapboxHighlightEvent from "../hooks/useMapBoxHighlightEvent";
import useMapboxGeoJsonSource from "../hooks/useMapboxGeoJsonSource";

const popups = {
    port: portHandler,
    license: licenseHandler,
    lease: leaseHandler,
    suitability: suitabilityHandler,
    nssp: nsspHandler
};

/*
The Map component. 
*/
const Map = ({
    layers, 
    style,
    accessToken,
    className,
    center = [-69, 44]
}) => {

    const container = useRef(null);

    const [map, setMap] = useState(null);  // MapboxGL Map instance
    const [ready, setReady] = useState({});
    const [cursor, setCursor] = useState(null);


    useMapboxHighlightEvent({
        ready: "nssp-closures" in ready, 
        map, 
        source: "nssp-closures"
    });

    useEffect(() => {
        /*
        If the map element has not been created yet, create it with a custom style, and user
        provided layer definitions. 

        Generally these will be pre-fetched from static assets, but it can
        also be sourced from an API or database.

        only one map context please, need center to have been set.
        */
        mapboxgl.accessToken = accessToken;

        const _map = new mapboxgl.Map({
            container: container.current,
            style,
            center,
            zoom: 10,
            antialias: false,
        })

        _map.on('mousemove', ({lngLat: {lng, lat}}) => {
            setCursor({lng, lat});
        });

        setMap(_map);
    }, []);
  

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

    layers.json.map(({popup=null, behind, render}) => {
        return useMapboxGeoJsonSource({
            render,
            map,
            popup: popup ? popups[popup] : null
        })
    });
       
    return <div ref={container} className={className}/>
};

const MapContainer = styled(Map)`
    height: 100vh;
    width: 100%;
    padding: 0;
    margin: 0;
`;

export default MapContainer;