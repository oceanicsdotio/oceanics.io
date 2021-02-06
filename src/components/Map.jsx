import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import {Popup} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import useMapBox from "../hooks/useMapBox";
import useMapboxGeoJsonLayers from "../hooks/useMapboxGeoJsonLayers";
import useTriangularMesh from "../hooks/useTriangularMesh";
import useGeolocationApi from "../hooks/useGeolocationApi";


import LicenseInformation from "./LicenseInformation";
import LeaseInformation from "./LeaseInformation";
import PortInformation from "./PortInformation";
import SuitabilityInformation from "./SuitabilityInformation";
import NsspInformation from "./NsspInformation";

export const PopUpContent = styled.div`

    background: #101010AA;
    font-family: inherit;
    font-size: larger;
    height: fit-content;
    width: fit-content;
    margin: 0;
    padding: 0;
    overflow: hidden;

    & > canvas {
        width: 200px;
        height: 75px;
        display: block;
        border-bottom: 1px solid ${({fg="#ccc"})=>fg};
    }

    & > div {
        overflow-y: scroll;
        max-height: 300px;
        height: fit-content;

        & > ul {
            padding: 0;

            & > li {
                color: #CCCCCCFF;
                margin: 0;
                padding: 0;
                display: block;
            }
        }
    }
`;

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
 * The Map component. 
 */
const Map = ({
    layers: {
        geojson=null,
        canvas=null
    }, 
    accessToken,
    className,
    triggerResize = [],
    center = [-69, 44]
}) => {

    const {map, ref} = useMapBox({
        center, 
        accessToken
    });

    /** 
     * Highlight layers
     * 
     * When the cursor position intersects with the space
     * defined by a feature set, set the hover state to true.
     * When the cursor no longer intersects the shapes, stop
     * highlighting the features. 
     */
    useEffect(() => {
        
        const featureIds = [];
        if (!map || !featureIds) return;

        map.on('mousemove', source, (e) => {
            if (e.features.length > 0) {
                (featureIds || []).forEach(id => {map.setFeatureState({ source, id }, { hover: false })});
                featureIds = e.features.map(feature => feature.id);
                (featureIds || []).forEach(id => {map.setFeatureState({ source, id }, { hover: true })});
            }
        });
            
        map.on('mouseleave', source, () => {
            (featureIds || []).forEach(id => {map.setFeatureState({ source, id }, { hover: false })});
            featureIds = [];
        });
        
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
        setGeoJsonLayers(geojson.map(({id, popup, ...layer})=>Object({
            id,
            ...layer,
            onClick: popup ? handlers[id] : undefined
        })));
    },[handlers]);

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


        // var i = 0;
        // var timer = window.setInterval(function () {
        // if (i < coordinates.length) {
        //     data.features[0].geometry.coordinates.push(
        //     coordinates[i]
        // );
        // map.getSource(layerId).setData(data);
        console.log(layer);
        map.panTo(layer.data.features[0].geometry.coordinates);
        // i++;
        // } else {
        // window.clearInterval(timer);
        // }
        // }, 10);

    }, [layer, icon, map]);

    useTriangularMesh({
        map,
        name: "necofs_gom3_mesh", 
        extension: "nc",
        attribution: "UMass Dartmouth"
    });

    useTriangularMesh({
        map,
        name: "midcoast_nodes", 
        extension: "csv",
        attribution: "UMaine"
    });

    /**
     * Use an HTML5 Canvas element as a raster data source.
     * Requires a MapBox map instance, canvas with id prop
     * and the geo rectangle to render to.
     */
    useEffect(() => {
        if (!map || !canvas) return;
        canvas.forEach(({source: [id, args], layer}) => {
            if (map.getLayer(id)) return;
            map.addSource(id, args);
            map.addLayer(layer);
        });
    }, [map]);
   
    
    return <div ref={ref} className={className}/>;
};


/**
 * Styled version of the Map component
 */
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