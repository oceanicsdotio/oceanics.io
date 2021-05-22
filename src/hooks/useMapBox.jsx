

import { useRef, useEffect, useState } from "react";


import mapboxgl, { Popup, Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";


/**
 * Map presentation and interaction defaults.
 */ 
 import defaults from "../data/map-style.yml";  


/**
 * If the map element has not been created yet, create it with a custom style, and user
 * provided layer definitions. 
 * 
 * Generally these will be pre-fetched from static assets, but it can
 * also be sourced from an API or database.
 * 
 * Only one map context please, need center to have been set.
*/
export default ({expand}) => {

    /**
     * MapBox container reference.
     */
    const ref = useRef(null);

    /**
     * MapBoxGL Map instance is saved to React state. 
     */
    const [ map, setMap ] = useState(null);

    /**
     * Create the MapBoxGL instance.
     * 
     * Don't do any work if `ref` has not been assigned to an element. 
     */
    useEffect(() => {
        if (!ref.current) return;
        mapboxgl.accessToken = mapBoxAccessToken;

        const _map = new Map({container: ref.current, ...defaults});
        setMap(_map);

        return () => {_map.remove()};
    }, [ ref ]);


    const [ zoomLevel, setZoomLevel ] = useState(null);

     /**
     * Add a zoom handler to the map
     */
      useEffect(() => {
        if (map) map.on('zoom', () => {setZoomLevel(map.getZoom())});
    }, [ map ]);

    /**
     * Location of cursor in geospatial coordinates, updated onMouseMove.
     */
    const [ cursor, setCursor ] = useState(null);

    /**
     * Add a mouse move handler to the map
     */
    useEffect(() => {
        if (map) map.on('mousemove', ({lngLat}) => {setCursor(lngLat)});
    }, [ map ]);

   


    return {
        map: map,
        ref: ref,
        cursor: cursor,
        zoom: zoomLevel
    }
}

