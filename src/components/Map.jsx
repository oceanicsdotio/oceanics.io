import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import {popups, PopUpContent} from "./MapPopUp";
import {Popup} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import useMapBox from "../hooks/useMapBox";
import useMapboxHighlightEvent from "../hooks/useMapBoxHighlightEvent";
import useMapboxGeoJsonLayers from "../hooks/useMapboxGeoJsonLayers";
import useTriangularMesh from "../hooks/useTriangularMesh";
import useGeolocationApi from "../hooks/useGeolocationApi";


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

    
   
     // useMapboxHighlightEvent({
    //     ready: "nssp-closures" in ready, 
    //     map, 
    //     source: "nssp-closures"
    // });


    const [handlers, setHandlers] = useState(null);
    useEffect(()=>{
        if (!map) return;

        setHandlers(Object.fromEntries(
            geojson
            // .filter(item => "popup" in item && item.popup in popups)
            .map(({id, popup=null}) => 
                [id, (event) => {
                    if (!popup) {
                        console.log("Non-interactive", {id});
                        return;
                    }

                    console.log("Popup", {id, popup});
                    const [
                        {
                            jsx, 
                            coordinates, 
                            closeButton=true, 
                            closeOnClick=true
                        }, 
                        placeholder
                    ] = [
                        popups[popup](event), 
                        document.createElement('div')
                    ];
    
                    ReactDOM.render(<PopUpContent children={jsx}/>, placeholder);
                
                    (new Popup({
                        className: "map-popup",
                        closeButton,
                        closeOnClick
                    })
                        .setLngLat(coordinates)
                        .setDOMContent(placeholder)
                    ).addTo(map);
                }
            ]))
        );
    },[map]);

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

    useGeolocationApi({});

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