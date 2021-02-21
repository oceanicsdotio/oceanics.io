import { useEffect, useState, useRef } from "react";

import mapboxgl, {Popup} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import style from "../data/map-style.yml";  // map style'

import ReactDOM from "react-dom";
import "mapbox-gl/dist/mapbox-gl.css";

import {geojson} from "../data/layers.yml";

import useMapboxGeoJsonLayers from "../hooks/useMapboxGeoJsonLayers";
import useGeolocationApi from "../hooks/useGeolocationApi";

import LicenseInformation from "../components/LicenseInformation";
import LeaseInformation from "../components/LeaseInformation";
import PortInformation from "../components/PortInformation";
import SuitabilityInformation from "../components/SuitabilityInformation";
import NsspInformation from "../components/NsspInformation";
import PopUpContent from "../components/PopUpContent";

/**
 * Build the handler and component to render
 * @param {*} Component 
 * @param {*} parser 
 */
const composeHandler = (Component, parser) => (event) => {

    const { props, coordinates } = parser(event);

    return {
        jsx: <Component {...props}/>,
        coordinates
    }
};

/**
 * Reduce many point features to a single set of coordinates at the
 * geometric center. Does NOT take into account geogrpah projection.
 */
const getGeographicCenter = cluster => cluster.reduce(([x, y], { coordinates }) => {
    let [Δx, Δy] = coordinates;
    return [x + Δx / cluster.length, y + Δy / cluster.length]
}, [0, 0]);

/**
 * Keep coordinates in (-180, 180)
 * 
 * @param {*} cluster 
 * @param {*} lng 
 */
const wrapLng = (cluster, lng) => cluster.map(({geometry: {coordinates}, ...props}) => {
    while (Math.abs(lng - coordinates[0]) > 180) 
        coordinates[0] += lng > coordinates[0] ? 360 : -360;
    return {
        ...props,
        coordinates
    }
});

/**
 * When a click event happens it may intersect with multiple features. 
 * 
 * The popup is rendered at their center.
 * 
 * @param {*} param0 
 */
const multiFeatureReducer = ({features, lngLat: {lng}}) => {
   
    const projected = wrapLng(features, lng);

    return {
        props: {features: projected},
        coordinates: getGeographicCenter(projected)
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
    ([key, [component, reducer]]) => [key, composeHandler(component, reducer)])
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
            pitchWithRotate: false,
            dragRotate: false,
            touchZoomRotate: false
        })

        _map.on('mousemove', ({lngLat: {lng, lat}}) => {
            setCursor({lng, lat});
        });

        setMap(_map);
    }, []);

    /**
     * Popup handlers
     */
    const [handlers, setHandlers] = useState(null);

    /**
     * Load the popup handlers if a map element exists. 
     */
    useEffect(()=>{
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
    },[ map ]);


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
    }, [ metadata ]);

    /**
     * Asynchronously retrieve the geospatial data files and parse them.
     * Skip this if the layer data has already been loaded, 
     * or if the map doesn't exist yet
     */
    const {metadata} = useMapboxGeoJsonLayers({
        map,
        layers: geoJsonLayers
    });

    /**
     * Prompt the user to share location and use it for context
     * purposes, such as getting local tide information.
     * 
     * Should be moved up to App context.
     */
    const {layer, icon} = useGeolocationApi({});

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

        map.panTo(layer.data.features[0].geometry.coordinates);
      
    }, [layer, icon, map]);
    
  
    return {map, ref, cursor};
};