import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import style from "../data/map-style.yml";  // map style


/**
If the map element has not been created yet, create it with a custom style, and user
provided layer definitions. 

Generally these will be pre-fetched from static assets, but it can
also be sourced from an API or database.

only one map context please, need center to have been set.
*/
export default ({
    accessToken,
    center
}) => {

    const ref = useRef(null);
    const [map, setMap] = useState(null);  // MapboxGL Map instance
    const [cursor, setCursor] = useState(null);

    useEffect(() => {
       
        mapboxgl.accessToken = accessToken;

        const _map = new mapboxgl.Map({
            container: ref.current,
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
  
    return {map, ref, cursor};
};