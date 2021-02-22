import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import mapboxgl, { Popup, Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Container for MapboxGL feature content. Rendered client-side.
 */
import PopUpContent from "../components/PopUpContent";

/**
 * PopUp child JSX for Maine LPA data. Rendered client-side.
 */
import LicenseInformation from "../components/LicenseInformation";

/**
 * PopUp child for commercial aquaculture leases. Rendered client-side.
 */
import LeaseInformation from "../components/LeaseInformation";

/**
 * Popup for port and navigation information. Rendered client-side.
 */
import PortInformation from "../components/PortInformation";

/**
 * Oyster suitability popup, or any normalized probability distribution function
 */
import SuitabilityInformation from "../components/SuitabilityInformation";

/**
 * Shellfish sanitation area, should be generalized to "hazards" or similar.
 */
import NsspInformation from "../components/NsspInformation";

/**
 * Can't use graphql query because of differences in layer schema.
 */
import { geojson } from "../data/layers.yml";

/**
 * Map presentation and interaction defaults.
 */ 
import defaults from "../data/map-style.yml";  

/**
 * Dedicated Worker loader.
 */
import Worker from "./useMapbox.worker.js";

/**
 * Vertex array loader
 */
import useTriangularMesh from "./useTriangularMesh";

/**
 * Public Mapbox key for client side rendering. Cycle if abused. We have a API call limit
 * in place to prevent cost overages. 
 */
const mapBoxAccessToken = 
    'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

/**
 * Use the Geolocation API to retieve the location of the client,
 * and set the map center to those coordinates, and flag that the interface
 * should use the client location on refresh.
 * 
 * This will also trigger a greater initial zoom level.
 */
export const pulsingDot = ({
    size
}) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    
    return {
            
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),
        context: canvas.getContext('2d'),

        // get rendering context for the map canvas when layer is added to the map
        onAdd: () => {},

        // called once before every frame where the icon will be used
        render: function () {
            let duration = 1000;
            let time = (performance.now() % duration) / duration;

            let radius = size / 2;
            let ctx = this.context;

            ctx.clearRect(0, 0, size, size);
            ctx.beginPath();
            ctx.arc(
                radius,
                radius,
                radius * (0.7 * time + 0.3),
                0,
                Math.PI * 2
            );
            
            ctx.strokeStyle = 'orange';
            ctx.lineWidth = 2;
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
    }
};

/**
 * Create a lookup table, so that layer schemas can reference them by key.
 * 
 * There is some magic here, in that you still need to know the key. 
 */
const popups = {
    port: PortInformation,
    license: LicenseInformation,
    lease: LeaseInformation,
    nssp: NsspInformation, 
    suitability: SuitabilityInformation
};

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
    accessToken = mapBoxAccessToken,
    triggerResize = [],
    geolocationSettings: {
        enableHighAccuracy = true,
        timeout = 5000,
        maximumAge = 0, 
        iconSize = 32,
    }
}) => {
    /**
     * Web worker reference for background tasks. 
     * 
     * This will be used to process raw data into MapBox layers,
     * and do any expensive topological or reducing operations. 
     */
    const worker = useRef(null);

    /**
     * Instantiate the web worker, lazy-load style.
     */
    useEffect(() => {
        worker.current = new Worker();
    }, []);

    /**
     * MapboxGL Map instance is saved to React state. 
     */
    const [ map, setMap ] = useState(null);

    /**
     * Mapbox container reference.
     */
    const ref = useRef(null);

    /**
     * Create the MapBoxGL instance.
     * 
     * Don't do any work if `ref` has not been assigned to an element. 
     */
    useEffect(() => {
        if (!ref.current) return;
        mapboxgl.accessToken = accessToken;
        setMap(new Map({container: ref.current, ...defaults}));
    }, [ ref ]);

    /**
     * Hoist the resize function on map to the parent 
     * interface.
     */
    useEffect(()=>{
        if (map) map.resize();
    }, triggerResize);

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

    /**
     * Data sets to queue and build layers from.
     */
    const [queue, setQueue] = useState([]);

    /**
    * When a click event happens it may intersect with multiple features. 
    * 
    * The popup is rendered at their center.
    * 
    * 
    * Reduce many point features to a single set of coordinates at the
    * geometric center. Does NOT take into account geogrpah projection.
    * 
    * Don't waste the cycles on calculating polygon centers. Just use the click
    * location. 
    */
    useEffect(()=>{
        if (map) setQueue(geojson);
    }, [ map ]);


    /**
     * Reorder data sets as they are added.
     */
    const [ channelOrder, setChannelOrder ] = useState([]);


    /**
     * Task the web worker with loading and transforming data to add
     * to the MapBox instance as a GeoJSON layer. 
     */
    useEffect(() => {
        if (!map || !queue || !worker.current) return;

        queue.forEach(({
            id,
            behind,
            standard="geojson",
            url=null,
            popup=null, 
            ...layer
        }) => {
            // Guard against re-loading layers
            if (map.getLayer(id)) return;

            setChannelOrder([...channelOrder, [id, behind]]);

            worker.current.getData(url, standard).then(source => {
                
                map.addLayer({id, source, ...layer});
                
                if (!popup) return;
                
                const onClick = ({features, lngLat: {lng, lat}}) => {

                    const reduce = (layer.type === "circle" || layer.type === "symbol");
                    const Component = popups[popup];
        
                    const projected = reduce ? features.map(({geometry: {coordinates}, ...props}) => {
                        while (Math.abs(lng - coordinates[0]) > 180) 
                            coordinates[0] += lng > coordinates[0] ? 360 : -360;
                        return {
                            ...props,
                            coordinates
                        }
                    }) : features;
    
                    worker.current.reduceVertexArray(
                        reduce ? projected : [{coordinates: [lng, lat]}]
                    ).then(coords => {

                        const placeholder = document.createElement('div');

                        ReactDOM.render(
                            <PopUpContent>
                                <Component features={projected}/>
                            </PopUpContent>, 
                            placeholder
                        );

                        (new Popup({
                            className: "map-popup",
                            closeButton: true,
                            closeOnClick: true
                        })
                            .setLngLat(coords.slice(0, 2))
                            .setDOMContent(placeholder)
                        ).addTo(map)
                    });    
                }
                
                map.on('click', id, onClick);

            }).catch(err => {
                console.log(`Error loading ${id}`, err);
            });
        }); 

    }, [ queue, worker ]);

    /**
     * Swap layers to be in the correct order as they are created. Will
     * only trigger once both layers exist.
     * 
     * Nice because you can resolve them asynchronously without worrying 
     * about creation order.
     */
    useEffect(() => {    
        channelOrder.forEach(([back, front]) => {
            if (map.getLayer(back) && map.getLayer(front)) map.moveLayer(back, front)
        });
    }, [ channelOrder ]);

    /**
     * Prompt the user to share location and use it for context
     * purposes, such as getting local tide information.
     * 
     * Should be moved up to App context.
     */
    
    /**
     * Icon is the sprite for the object.
     */
    const [ icon ] = useState(["pulsing-dot", pulsingDot({size: iconSize})]);

    /**
     * User location to be obtained from Geolocation API.
     */
    const [ agentLocation, setAgentLocation ] = useState(null);
    
    /**
     * Get the user location and 
     */
    useEffect(() => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            setAgentLocation, 
            () => { console.log("Error getting client location.") },
            {
                enableHighAccuracy,
                timeout,
                maximumAge
            }
        );
    }, []);

    /**
     * Layer is the MapBox formatted layer object
     */
    const [ layer, setLayer ] = useState(null);
    
    /**
     * Use the worker to create the point feature for the user location.
     */
    useEffect(() => {
        if (worker.current && agentLocation)
            worker.current
                .userLocation([agentLocation.coords.longitude, agentLocation.coords.latitude])
                .then(setLayer);
    }, [ worker, agentLocation ]);

    /**
     * Pan to user location immediately.
     */
    useEffect(() => {
        if (map && agentLocation)
            map.panTo([agentLocation.coords.longitude, agentLocation.coords.latitude]);
    }, [ agentLocation, map ]);

    /**
     * Add user location layer. 
     */
    useEffect(() => {
    
        if (!layer || !icon || !map) return;
      
        map.addImage(...icon);
        map.addLayer({
            id: "home",
            type: 'symbol',
            source: layer,
            layout: { 'icon-image': icon[0] }
        });
    }, [layer, icon, map]);

    /**
     * Add a mesh instance to the map.
     */
    useTriangularMesh({
        map,
        name: "necofs_gom3_mesh", 
        extension: "nc",
        attribution: "UMass Dartmouth"
    });

    // useTriangularMesh({
    //     map,
    //     name: "midcoast_nodes", 
    //     extension: "csv",
    //     attribution: "UMaine"
    // });
    
  
    return {map, ref, cursor};
};