import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import mapboxgl, { Popup, Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Container for MapboxGL feature content. Rendered client-side.
 */
import PopUpContent from "../components/PopUpContent";

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
 * Object storage hook
 */
import useObjectStorage from "./useObjectStorage";

/**
 * Public Mapbox key for client side rendering. Cycle if abused. We have a API call limit
 * in place to prevent cost overages. 
 */
const mapBoxAccessToken = 
    'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

/**
 * Storage target.
 */
const TARGET = "https://oceanicsdotio.nyc3.cdn.digitaloceanspaces.com";


/**
 * Point cloud prefix.
 */
const PREFIX = "MidcoastMaineMesh";



export const waterLevel = ({size}) => Object({

    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),

    // get rendering context for the map canvas when layer is added to the map
    onAdd: function () {
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        this.context = canvas.getContext('2d');
        
        // update this image's data with data from the canvas
        
    },

    // called once before every frame where the icon will be used
    render: function () {
        var ctx = this.context;
        ctx.clearRect(0, 0, size, size);
        ctx.beginPath();
        ctx.rect(0, 0, size, size);
    
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 3;
        ctx.stroke();

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

        const _map = new Map({container: ref.current, ...defaults});
        setMap(_map);

        return () => _map.remove();
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
            component=null,
            attribution=null, 
            ...layer
        }) => {
            // Guard against re-loading layers
            if (map.getLayer(id)) return;

            setChannelOrder([...channelOrder, [id, behind]]);

            worker.current.getData(url, standard).then(source => {

                if (attribution) source.attribution = attribution;
                
                map.addLayer({id, source, ...layer});
                
                if (!component) return;
                
                const onClick = ({features, lngLat: {lng, lat}}) => {

                    const reduce = (layer.type === "circle" || layer.type === "symbol");
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
                            <PopUpContent features={projected} component={component}/>, 
                            placeholder
                        );

                        (new Popup({
                            className: "map-popup",
                            closeButton: false,
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
     * Use the worker to create the point feature for the user location.
     */
    useEffect(() => {
        if (!map || !worker.current || !agentLocation) return;

        worker.current.userLocation([
            agentLocation.coords.longitude, 
            agentLocation.coords.latitude
        ]).then(source => {
            map.addLayer()
        });
    }, [ worker, agentLocation, map ]);

    /**
     * Pan to user location immediately.
     */
    useEffect(() => {
        if (map && agentLocation)
            map.panTo([agentLocation.coords.longitude, agentLocation.coords.latitude]);
    }, [ agentLocation, map ]);
    
    /**
     * Create home animation image
     */
    useEffect(() => {
        if (!map || map.hasImage("home")) return;
        map.addImage("home", pulsingDot({size: iconSize}));
    }, [ map ]);

    /**
     * Retrieve S3 file system meta data. The `null` target prevents any HTTP request
     * from happening.
     */ 
    const fs = useObjectStorage({target: `${TARGET}?prefix=${PREFIX}/necofs_gom3_mesh/nodes/`});

    /**
     * The queue is an array of remote data assets to fetch and process. 
     * 
     * Updating the queue triggers `useEffect` hooks depending on whether
     * visualization elements have been passed in or assigned externally.
     */
    const [ meshQueue, setMeshQueue ] = useState([]);


    /**
     * By default set the queue to the fragments listed in the response
     * from S3 object storage queries.
     */
    useEffect(()=>{
        if (fs) setMeshQueue(fs.objects.filter(x => !x.key.includes("undefined")));
    }, [ fs ]);


    /**
     * Request all NECOFS fragments sequentially. 
     * 
     * All of this should be cached by the browser
     */
    useEffect(()=>{
        if (!map || !worker.current || !meshQueue.length) return;

        const key = meshQueue[0].key;

        setMeshQueue(meshQueue.slice(1, meshQueue.length));

        if (map.getLayer(`mesh-${key}`)) return;

        worker.current
            .getFragment(TARGET, key, "UMass Dartmouth")
            .then(x => {map.addLayer(x)});
       
    }, [ map, worker, meshQueue ]);


    /**
     * Make sure to stop the worker
     */
    const [ processing, setProcessing ] = useState(false);


    /**
     * When queue is created, set status.
     * 
     * When queue is exhausted, shutdown worker. 
     */
    useEffect(() => {
        if (meshQueue) {
            setProcessing(true);
        } else if (processing) {
            console.log("Stopping Mesh Worker...");
            worker.current.terminate();
        }
    }, [ meshQueue ]);
    



    /* 
    * Fetch tide data from NOAA. 
    * Render a tide gauge animated icon at each position. 
    */
    // useEffect(() => {
        
    //     if (!map || !animatedIcons) return;
    //     const id = "tidal-stations";
    //     const extent = [-71.190, 40.975, -63.598, 46.525];

    //     map.addImage(id, animatedIcons.waterLevel, { pixelRatio: 4 });

    //     (async () => {
    //         const queue = await fetch("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels")
    //             .then(r => r.json())
    //             .then(({stations}) => {
    //                 return stations.filter(({lat, lng}) => {
    //                     return lng >= extent[0] && lng <= extent[2] && lat >= extent[1] && lat <= extent[3];
    //                 }).map(({id})=>{
    //                     return fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${id}&product=water_level&datum=mllw&units=metric&time_zone=lst_ldt&application=oceanics.io&format=json`).then(r => r.json())
    //                     }
    //                 );
    //             });
            
    //         map.addLayer({
    //             id,
    //             type: 'symbol',
    //             source: parseFeatureData({
    //                 features: await Promise.all(queue), 
    //                 standard: "noaa"
    //             }),
    //             layout: {
    //                 'icon-image': id
    //             }
    //         });     
    // })();
    // }, [map, animatedIcons]);
  
    return { ref };
};