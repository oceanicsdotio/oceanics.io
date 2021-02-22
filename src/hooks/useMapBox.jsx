import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";


import mapboxgl, {Popup, Map} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import LicenseInformation from "../components/LicenseInformation";
import LeaseInformation from "../components/LeaseInformation";
import PortInformation from "../components/PortInformation";
import SuitabilityInformation from "../components/SuitabilityInformation";
import NsspInformation from "../components/NsspInformation";
import PopUpContent from "../components/PopUpContent";

import {geojson} from "../data/layers.yml";
import style from "../data/map-style.yml";  // map style'
import Worker from "./useMapbox.worker.js";


/**
 * Use the Geolocation API to retieve the location of the client,
 * and set the map center to those coordinates, and flag that the interface
 * should use the client location on refresh.
 * 
 * This will also trigger a greater initial zoom level.
 */
export const pulsingDot = ({
    size = 64
}) => Object({
            
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function () {
        let canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        this.context = canvas.getContext('2d');
    },

    // called once before every frame where the icon will be used
    render: function () {
        let duration = 1000;
        let time = (performance.now() % duration) / duration;

        let radius = (size / 2) * 0.3;
        let outerRadius = (size / 2) * 0.7 * time + radius;
        let ctx = this.context;

    
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.arc(
            size / 2,
            size / 2,
            outerRadius,
            0,
            Math.PI * 2
        );
        
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2 + 4 * (1 - time);
        ctx.stroke();

        // update this image's data with data from the canvas
        this.data = ctx.getImageData(
            0,
            0,
            size,
            size
        ).data;

        return true;
    }
});


/**
 * When a click event happens it may intersect with multiple features. 
 * 
 * The popup is rendered at their center.
 * 
 * 
 * Reduce many point features to a single set of coordinates at the
 * geometric center. Does NOT take into account geogrpah projection.
 * 
 * @param {*} param0 
 */
const multiFeatureReducer = ({features, lngLat: {lng}}) => {
   
    /**
     * Keep coordinates in (-180, 180)
     */
    const projected = features.map(({geometry: {coordinates}, ...props}) => {
        while (Math.abs(lng - coordinates[0]) > 180) 
            coordinates[0] += lng > coordinates[0] ? 360 : -360;
        return {
            ...props,
            coordinates
        }
    });

    return {
        props: {features: projected},
        coordinates: projected.reduce(([x, y], { coordinates }) => {
            let [Δx, Δy] = coordinates;
            return [x + Δx / cluster.length, y + Δy / cluster.length]
        }, [0, 0])
    }
}

/**
 * Don't waste the cycles on calculating polygon centers. Just use the click
 * location. 
 */
const polygonFeatureReducer = ({features, lngLat: {lng, lat}}) =>
    Object({
        props: {features},
        coordinates: [lng, lat]
    });

/**
 * Create a lookup table, so that layer schemas can reference them by key.
 * 
 * There is some magic here, in that you still need to know the key. 
 */
const popups = Object.fromEntries(Object.entries({
    port: [PortInformation, multiFeatureReducer],
    license: [LicenseInformation, multiFeatureReducer], 
    lease: [LeaseInformation, polygonFeatureReducer],
    nssp: [NsspInformation, polygonFeatureReducer], 
    suitability: [SuitabilityInformation, multiFeatureReducer],
}).map(
    ([key, [Component, reducer]]) => [key, event => {
        const { props, coordinates } = reducer(event);
        return {
            jsx: <Component {...props}/>,
            coordinates
        }
    }])
);


/**
 * If the map element has not been created yet, create it with a custom style, and user
 * provided layer definitions. 
 * 
 * Generally these will be pre-fetched from static assets, but it can
 * also be sourced from an API or database.
 * 
 * Only one map context please, need center to have been set.
*/
export default ({
    accessToken,
    center,
    triggerResize
}) => {
    /**
     * Mapbox container reference.
     */
    const ref = useRef(null);

    /**
     * MapboxGL Map instance
     */
    const [map, setMap] = useState(null);  

    /**
     * Location of cursor in geospatial coordinates
     */
    const [cursor, setCursor] = useState(null);

    /**
     * Web worker reference for background tasks.
     */
    const worker = useRef(null);

    /**
     * Instantiate the web worker, lazy load style
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    /**
     * Create the map instance.
     */
    useEffect(() => {
       
        mapboxgl.accessToken = accessToken;

        setMap(new Map({
            container: ref.current,
            style,
            center,
            zoom: 10,
            antialias: false,
            pitchWithRotate: false,
            dragRotate: false,
            touchZoomRotate: false
        }));
    }, []);

    /**
     * Add a mouse move handler to the map
     */
    useEffect(() => {
        if (map)
            map.on('mousemove', ({lngLat}) => {setCursor(lngLat)});
    }, [ map ]);

    /**
     * Popup handlers
     */
    const [ handlers, setHandlers ] = useState(null);

    /**
     * Load the popup handlers if a map element exists. 
     */
    useEffect(() => {
        if (!map) return;

        setHandlers(Object.fromEntries(
            geojson.map(({id, popup=null}) => [
                id, 
                event => {
                    if (!popup) return;
                    const placeholder = document.createElement('div');
                    const { jsx, coordinates } = popups[popup](event);
                        
                    ReactDOM.render(<PopUpContent children={jsx}/>, placeholder);
                
                    (new Popup({
                        className: "map-popup",
                        closeButton: true,
                        closeOnClick: true
                    })
                        .setLngLat(coordinates)
                        .setDOMContent(placeholder)
                    ).addTo(map);
                }
            ]))
        );
    }, [ map ]);


    /**
     * Data sets to queue and build layers from.
     */
    const [geoJsonLayers, setGeoJsonLayers] = useState(null);

    /**
     * Create a react state object from the layers
     */
    useEffect(()=>{
        if (!handlers) return;

        setGeoJsonLayers((geojson || []).map(({id, popup, ...layer})=>Object({
            id,
            ...layer,
            onClick: popup ? handlers[id] : undefined
        })));
    }, [ handlers ]);

    /**
     * Hoist the resize function on map to the parent 
     * interface.
     */
    useEffect(()=>{
        if (map) map.resize();
    }, triggerResize);

    /**
     * Swap layers to be in the correct order as they are created. 
     * 
     * Nice because you can resolve them asynchronously without worrying 
     * about creation order.
     */
    useEffect(() => {
        (geoJsonLayers || [])
            .filter(({behind}) => typeof behind !== "undefined")
            .forEach(({id, behind}) => {
                if (map.getLayer(id) && map.getLayer(behind)) 
                    map.moveLayer(id, behind);
            });
    }, [ geoJsonLayers ]);

   
    /**
     * Task the web worker with loading and transforming data to add
     * to the MapBox instance as a GeoJSON layer. 
     */
    useEffect(() => {
        if (!map || !geoJsonLayers || !worker.current) return;
       
        geoJsonLayers.forEach(({
            id,
            behind,
            standard="geojson",
            url=null,
            onClick=null, 
            ...layer
        }) => {
            // Guard against re-loading layers
            if (map.getLayer(id)) return;
            worker.current.getData(url, standard).then(source => {
                map.addLayer({id, source, ...layer});
                if (onClick) map.on('click', id, onClick);
            }).catch(err => {
                console.log(`Error loading ${id}`, err);
            });
        }); 

    }, [map, geoJsonLayers, worker]);


    /**
     * Prompt the user to share location and use it for context
     * purposes, such as getting local tide information.
     * 
     * Should be moved up to App context.
     */
    
    /**
     * Icon is the sprite for the object
     */
    const [ icon ] = useState(["pulsing-dot", pulsingDot({})]);

    /**
     * User location
     */
    const [ location, setLocation ] = useState(null);
    
    /**
     * Get the user location and 
     */
    useEffect(() => {
    
        if (!navigator.geolocation) return null;

        navigator.geolocation.getCurrentPosition(
            setLocation, 
            () => { console.log("Error getting client location.") },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }, []);

    /**
     * Layer is the MapBox formatted layer object
     */
    const [ layer, setLayer ] = useState(null);
    
    /**
     * Use the worker to create the point feature for the user location
     */
    useEffect(() => {
        if (!worker.current || !location) return;

        const {longitude, latitude} = location.coords;
        worker.current.userLocation([longitude, latitude]).then(setLayer);
        
    }, [ worker, location ]);

    /**
     * Pan to user location immediately.
     */
    useEffect(() => {
        if (map && location)
            map.panTo([location.coords.longitude, location.coords.latitude]);
    }, [ location, map ]);

    /**
     * Add user location layer. 
     */
    useEffect(() => {
    
        if (!layer || !icon || !map) return;
      
        const layerId = "home";

        map.addImage(...icon);

        map.addSource(layerId, layer);

        map.addLayer({
            id: layerId,
            type: 'symbol',
            source: layerId,
            layout: { 'icon-image': icon[0] }
        });
    }, [layer, icon, map]);
    
  
    return {map, ref, cursor};
};