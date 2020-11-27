import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import styled from "styled-components";
import {suitabilityHandler, licenseHandler, leaseHandler, nsspHandler, portHandler} from "../components/MapPopUp";
import {parseFeatureData} from "../bathysphere.js";
import "mapbox-gl/dist/mapbox-gl.css";

import useMapboxHighlightEvent from "../hooks/useMapBoxHighlightEvent";

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

    const [map, setMap] = useState(null);  // MapboxGL Map instance
    const [layerData, setLayerData] = useState(null);
    const [contextInfo, setContextInfo] = useState("");
    const container = useRef(null);  // the element that Map is going into, in this case a <div/>

    useMapboxHighlightEvent({
        ready: !!layerData, 
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
        if (map) return;
        mapboxgl.accessToken = accessToken;
        setMap(new mapboxgl.Map({
            container: container.current,
            style,
            center,
            zoom: 10,
            antialias: false,
        }));
    }, []);


    /*
    Provide cursor context information
    */
    useEffect(() => {
       
        if (!map) return;
        map.on('mousemove', ({lngLat: {lng, lat}}) => {
            setContextInfo(`Location: ${lng.toFixed(4)}, ${lat.toFixed(4)}`);
        });

    }, [map]);

    /**
    Asynchronously retrieve the geospatial data files and parse them.

    Skip this if the layer data has already been loaded, or if the map doesn't exist yet
    */
    useEffect(() => {
       
        if (layerData || !map) return;
        const layerMetadata = [];

        (async () => {
            const jobs = Object.values(layers.json).map(
                async ({render: {id, url=null, standard="geojson", ...render}, behind}) => {
                
                    const source = await fetch(url ? url : `/${id}.json`)
                        .then(async (r) => {
                            let textData = await r.text();
                            let jsonData = {};
                            try {
                                jsonData = JSON.parse(textData);
                            } catch {
                                console.log("Layer Error", r);
                            }
                            return jsonData;
                        })
                        .then(data => parseFeatureData({...data, standard}));

                    try {
                        map.addLayer({id, ...render, source});
                    } catch (err) {
                        console.log(source);
                    }
                    layerMetadata.push({id, behind});
                }
            );
            const _ = await Promise.all(jobs);  // resolve the queue
        })()
        setLayerData(layerMetadata);
    }, [map]);

    /**
    Swap layers to be in the correct order after they have all been created. 
    
    This is so that you can resolve them all asynchronously
    without worrying about the order of creation
    */
    useEffect(() => {
        (layerData || []).forEach(({ id, behind }) => {map.moveLayer(id, behind)});
    }, [layerData]);


    /* 
    Generate effect hooks for each layer that has an onclick event handler 
    */
    [
        [['ports', 'major-ports', 'navigation', 'wrecks'], portHandler],
        [['limited-purpose-licenses'], licenseHandler],
        [['aquaculture-leases'], leaseHandler],
        [['suitability'], suitabilityHandler],
        [['nssp-closures'], nsspHandler]
    ].forEach(([collections, callback])=>{
        collections.forEach(x => {
            useEffect(() => {
                if (layerData) map.on('click', x, (e) => {callback(e).addTo(map)});       
            }, [layerData]);
        })
    });

    return <div ref={container} className={className}/>
};

const MapContainer = styled(Map)`
    height: 100vh;
    width: 100%;
    padding: 0;
    margin: 0;
    overflow: hidden;
`;

export default MapContainer;