import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import styled from "styled-components";
import {suitabilityHandler, licenseHandler, leaseHandler, nsspHandler, portHandler} from "../components/MapPopUp";

import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';


const StyledPreformattedText = styled.pre`
    display: block;
    position: relative;
    padding: 0;
    width: fit-content;
    border: 1px solid;
    border-radius: 3px;
    color: orange;
    background-color: #00000044;
    z-index: 2;
`;

const StyledMapContainer = styled.div`
    position: relative;
    display: block;
    height: 200px;
    width: 100%;
    border: solid 1px #CCCCCC;
    padding: 0;
     
    &:hover {
        position: fixed;
        height: 75%;
        width: 100%;
        top: 50%;
        left: 50%;
        margin-right: -50%;
        transform: translate(-50%, -50%);
        animation: none;
        z-index: 1;
    }
`;

export default ({
    layers, 
    style,
    allowGeolocation=true
}) => {
    /*
    The Map component. 
    */
    const [useClientLocation, setUseClientLocation] = useState(false);
    const [clientLocation, setClientLocation] = useState(null);
    const [center, setCenter] = useState(null);
    const [map, setMap] = useState(null);  // MapboxGL Map instance
    const [layerData, setLayerData] = useState(null);
    const [animatedIcons, setAnimatedIcons] = useState(null);
    const container = useRef(null);  // the element that Map is going into, in this case a <div/>


    useEffect(() => {
        /*
        Use the Geolocation API to retieve the location of the client,
        and set the map center to those coordinates, and flag that the interface
        should use the client location on refresh.

        This will also trigger a greater initial zoom level.
        */
        const DEFAULT_CENTER = [-69, 44];

        if (allowGeolocation && navigator.geolocation) {
            const success = ({coords: {latitude, longitude}}) => {
                setUseClientLocation(true);
                setClientLocation([longitude, latitude]);
                setCenter([longitude, latitude]);
            };
            navigator.geolocation.getCurrentPosition(success, () => {setCenter(DEFAULT_CENTER)});
        } else {
            setCenter(DEFAULT_CENTER);  // not supported
        }
    }, []);


    useEffect(() => {
        /*
        If the map element has not been created yet, create it with a custom style, and user
        provided layer definitions. 

        Generally these will be pre-fetched from static assets, but it can
        also be sourced from an API or database.
        */
        if (map || !center) return;  // only one map context please, need center to have been set
       
        setMap(new mapboxgl.Map({
            container: container.current,
            style,
            center: center,
            zoom: useClientLocation ? 12 : 7,
            antialias: false,
        }));
    }, [center]);


    useEffect(() => {
        /*
        Provide cursor context information
        */
        if (!map) return;
        map.on('mousemove', ({lngLat: {lng, lat}}) => {
            document.getElementById('info').innerHTML = `Location: ${lng.toFixed(4)}, ${lat.toFixed(4)}`;
        });

    }, [map]);


    useEffect(() => {
        /*
        Expand the map when the mouse enters the element, and then shrink it again when
        it leaves.
        */
        if (map) ["mouseover", "mouseleave"].forEach(event => map.on(event, () => {map.resize()}));
    }, [map]);

    useEffect(() => {
        if (!map) return;

        const size = 64;
       
        setAnimatedIcons({
            pulsingDot: {
            
                width: size,
                height: size,
                data: new Uint8Array(size * size * 4),

                // get rendering context for the map canvas when layer is added to the map
                onAdd: function () {
                    var canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    this.context = canvas.getContext('2d');
                },

                // called once before every frame where the icon will be used
                render: function () {
                    var duration = 1000;
                    var time = (performance.now() % duration) / duration;

                    var radius = (size / 2) * 0.3;
                    var outerRadius = (size / 2) * 0.7 * time + radius;
                    var ctx = this.context;

                
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

                    map.triggerRepaint();
                    return true;
                }
            },
            waterLevel: {

                width: size,
                height: size,
                data: new Uint8Array(size * size * 4),

                // get rendering context for the map canvas when layer is added to the map
                onAdd: function () {
                    var canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    this.context = canvas.getContext('2d');
                    
                    ctx.clearRect(0, 0, size, size);
                    ctx.beginPath();
                    ctx.rect(0, 0, size, size);
                
                    ctx.strokeStyle = 'cyan';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // update this image's data with data from the canvas
                    
                },

                // called once before every frame where the icon will be used
                render: () => {
                    var ctx = this.context;
                    this.data = ctx.getImageData(
                        0,
                        0,
                        size,
                        size
                    ).data;
                }
            }
        });
    }, [map])

    // Formatting function, generic to all providers
    const Feature = (lon, lat, props) => Object({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [lon, lat]
        },
        properties: props
    });

    // Out ready for Mapbox as a Layer object description
    const GeoJsonLayer = ({features, properties=null, type="FeatureCollection"}) => Object({
        data: {
            features,
            properties, 
            type
        }, 
        type: "geojson", 
        generateId: true
    });

    useEffect(() => {
        /*
        Mark the client location
        */
        if (!clientLocation || !map || !animatedIcons) return;
        
        map.addImage('pulsing-dot', animatedIcons.pulsingDot, { pixelRatio: 2 });
    
        map.addLayer({
            id: 'home',
            type: 'symbol',
            source: GeoJsonLayer({
                features: [Feature(...clientLocation)]
            }),
            layout: {
                'icon-image': 'pulsing-dot'
            }
        });
    
    }, [clientLocation, map, animatedIcons]);

    const parseFeatureData = ({features, properties=null, standard="geojson"}) => 
        GeoJsonLayer((()=>{
            let feat = null;
            switch(standard) {
                // ESRI does things their own special way.
                case "esri":
                    feat = features.map(({geometry: {x, y}, attributes}) => Feature(x, y, attributes));
                    break;
                // NOAA also does things their own special way
                case "noaa":
                    feat = features.map(({data: [head], metadata: {lon, lat, ...metadata}}) => Feature(lon, lat, {...head, ...metadata}));
                    break;
                // Otherwise let us hope it is GeoJSON
                case "geojson":
                    feat = features;
                    break;
                default:
                    throw Error(`Unknown Spatial Standard: ${standard}`);
            };
            return {
                features: feat,
                properties
            }
        })());
    

    useEffect(() => {
        /*
        Asynchronously retrieve the geospatial data files and parse them.

        Skip this if the layer data has already been loaded, or if the map doesn't exist yet
         */
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

    useEffect(() => {
        // Fetch tide data from NOAA
        if (!map || !animatedIcons) return;
        const id = "tidal-stations";
        map.addImage(id, animatedIcons.waterLevel, { pixelRatio: 4 });
        const extent = [-71.190, 40.975, -63.598, 46.525];
        (async () => {
            const queue = await fetch("https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels")
                .then(r => r.json())
                .then(({stations}) => {
                    return stations.filter(({lat, lng}) => {
                        return lng >= extent[0] && lng <= extent[2] && lat >= extent[1] && lat <= extent[3];
                    }).map(({id})=>{
                        return fetch(`https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${id}&product=water_level&datum=mllw&units=metric&time_zone=lst_ldt&application=oceanics.io&format=json`).then(r => r.json())
                        }
                    );
                });
            
            const source = parseFeatureData({
                features: await Promise.all(queue), 
                standard: "noaa"
            });

            console.log(id, source);

            map.addLayer({
                id,
                type: 'symbol',
                source: source,
                layout: {
                    'icon-image': id
                }
            });     
        })();
    }, [map, animatedIcons]);

    useEffect(() => {
        /* 
        Swap layers to be in the correct order after they have all been created. 
        
        This is so that you can resolve them all asynchronously
        without worrying about the order of creation
        */
        (layerData || []).forEach(({ id, behind }) => {map.moveLayer(id, behind)});
    }, [layerData]);


    // Generate effect hooks for each layer that has an onclick event handler
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

    useEffect(() => {
        // Highlight closures on hover

        const addHighlightEvent = (map, featureSet, featureIds) => {
            /*
            Highlight layers
    
            When the cursor position intersects with the space
            defined by a feature set, set the hover state to true.
        
            When the cursor no longer intersects the shapes, stop
            highlighting the features. 
            */
            map.on('mousemove', featureSet, (e) => {
                if (e.features.length > 0) {
                    (featureIds || []).forEach(feature => {map.setFeatureState({ source: featureSet, id: feature }, { hover: false })});
                    featureIds = e.features.map(feature => feature.id);
                    (featureIds || []).forEach(feature => {map.setFeatureState({ source: featureSet, id: feature }, { hover: true })});
                }
            });
                
            map.on('mouseleave', featureSet, () => {
                (featureIds || []).forEach(feature => {map.setFeatureState({ source: featureSet, id: feature }, { hover: false })});
                featureIds = [];
            });
        };

        if (layerData) addHighlightEvent(map, "nssp-closures");
    }, [layerData]);

    return (<>
        <p>{"Hover for a bigger map."}</p>
        <StyledMapContainer ref={container} />
        <StyledPreformattedText id={"info"}></StyledPreformattedText>
    </>);
};