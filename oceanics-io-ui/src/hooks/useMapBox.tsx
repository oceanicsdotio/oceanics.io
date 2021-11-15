/**
 * React friends
 */
import { useRef, useEffect, useState } from "react";
import type {MutableRefObject} from "react";

/**
 * Mapbox instance and the object constructor
 */
import { Map } from "mapbox-gl";

type HookProps = {
    accessToken: string;
    defaults: {
        zoom: number;
    };
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
    accessToken,
    defaults
}: HookProps) => {

    /**
     * MapBox container reference.
     */
    const ref: MutableRefObject<HTMLDivElement|null> = useRef(null);

    /**
     * MapBoxGL Map instance is saved to React state. 
     */
    const [map, setMap] = useState<Map>();

    /**
     * Resize on load.
     */
    useEffect(() => {
        if (map) map.resize();
    }, []);

    /**
     * Create the MapBoxGL instance.
     * 
     * Don't do any work if `ref` has not been assigned to an element, and be sure to remove when component
     * unmounts to clean up workers.
     */
    useEffect(() => {
        if (!ref.current) return;
        const handle: Map = new Map({
            accessToken,
            container: ref.current, 
            ...defaults
        });
        setMap(handle);

        return () => { handle.remove() };
    }, [ref]);


    const [zoom, setZoom] = useState<number>(defaults.zoom);

    /**
    * Add a zoom handler to the map
    */
    useEffect(() => {
        if (typeof map !== "undefined") map.on('zoom', () => { setZoom(map.getZoom()) });
    }, [map]);

    /**
     * Location of cursor in geospatial coordinates, updated onMouseMove.
     */
    const [cursor, setCursor] = useState<{ lng: number, lat: number }>();

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