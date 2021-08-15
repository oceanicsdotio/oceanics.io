/**
 * React friends
 */
import { useRef, useEffect, useState, LegacyRef } from "react";

/**
 * Mapbox instance and the object constructor
 */
import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type HookProps = {
    expand: boolean;
    accessToken: string;
    defaults: object;
}

/**
 * If the map element has not been created yet, create it with a custom style, and user
 * provided layer definitions. 
 * 
 * Generally these will be pre-fetched from static assets, but it can
 * also be sourced from an API or database.
 * 
 * Only one map context please, need center to have been set.
*/
const useMapBox = ({
    expand,
    accessToken,
    defaults
}: HookProps) => {

    /**
     * MapBox container reference.
     */
    const ref: LegacyRef<HTMLDivElement> = useRef(null);

    /**
     * MapBoxGL Map instance is saved to React state. 
     */
    const [map, setMap] = useState<Map | null>(null);

    /**
     * Hoist the resize function on map to the parent 
     * interface.
     */
    useEffect(() => {
        if (map) map.resize();
    }, [expand]);

    /**
     * Create the MapBoxGL instance.
     * 
     * Don't do any work if `ref` has not been assigned to an element. 
     */
    useEffect(() => {
        if (!ref.current) return;
        mapboxgl.accessToken = accessToken;

        const handle: Map = new Map({ container: ref.current, ...defaults });
        setMap(handle);

        return () => { handle.remove() };
    }, [ref]);


    const [zoom, setZoom] = useState<number | null>(null);

    /**
    * Add a zoom handler to the map
    */
    useEffect(() => {
        if (map) map.on('zoom', () => { setZoom(map.getZoom()) });
    }, [map]);

    /**
     * Location of cursor in geospatial coordinates, updated onMouseMove.
     */
    const [cursor, setCursor] = useState<{ lng: number, lat: number } | null>(null);

    /**
     * Add a mouse move handler to the map
     */
    useEffect(() => {
        if (map) map.on('mousemove', ({ lngLat }) => { setCursor(lngLat) });
    }, [map]);


    return {
        map,
        ref,
        cursor,
        zoom
    }
}

export default useMapBox;