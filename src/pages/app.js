/**
 * React and friends.
 */
import React, { useState, useEffect, useRef } from "react";

/**
 * Component-level styling.
 */
import styled from "styled-components";

/**
 * Predefined colors.
 */
import { ghost, orange, charcoal, pink } from "../palette";

/**
 * Fetch site data.
 */
import { useStaticQuery, graphql, navigate } from "gatsby";

/**
 * SEO headers.
 */
import SEO from "../components/SEO";  

/**
 * Form for login and in app navigation
 */
import Form from "../components/Form";

/**
 * Use bathysphere client
 */
import useBathysphereApi from "../hooks/useBathysphereApi";


/**
The key is the Entity subclass. 
The props are the properties of the collection itself.

1. check that there is data stored in React state.
2. if not return an empty list
3. serialize the items, if any, and create a table within the outer list. 

 * The Storage component provides and interface to view
 * S3 object storage assets. 
 * The catalog page is like a landing page to the api.
* Assets are files, usually remote, in this case stored in 
 * S3 object storage. 
 * In S3 storage objects are grouped by prefix. In our system
 * this is interpreted as thematic or topological collections.
 * This is somewhat analogous to the STAC specificiation.
Routes from here correspond to entities and 
collections in the graph database.
 */
const Catalog = ({className}) => {
   
    /**
     * List of collections to build selection from
     */ 
    const { login } = useBathysphereApi();
    
    return <div className={className}>
        <Form 
            id={"register-dialog"}
            fields={[{
                type: "email",
                id: "email",
                placeholder: "name@example.com",
                required: true
            }]}
            actions={[{
                value: "Login",
                type: "button",
                onClick: login
            }]}
        />
    </div> 
}; 

/**
 * Styled version of the Single day calendar view
 */
const StyledCatalog = styled(Catalog)`

    display: ${({display})=>display};
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    overflow-x: hidden;

    width: auto;
    min-height: 100vh;
    bottom: 0;
    margin: 0.5rem;
    padding: 0;

    & h2 {
        display: block;
        font-size: larger;
        font-family: inherit;
        width: fit-content;
        margin: auto;
        padding: 0;

        & button {
            background: none;
            color: ${pink};
            border: none;
            font-size: large;
            cursor: pointer;
            margin: 0.5rem;
            font-family: inherit;
        }
    }
`;


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
import Worker from "../hooks/useBathysphereApi.worker.js";

/**
 * Object storage hook
 */
import useObjectStorage from "../hooks/useObjectStorage";

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
 * Logical combinator to calculate visibility and style of columns.
 */
const columnSize = ({expand, mobile, column}) => {
    if (column === 0) {
        return !expand ? 1 : 0;
    } else if (column === 1) {
        return (expand || !mobile) ? 6 : 0;
    } else if (column === 2) {
        return !expand ? 3 : 0;
    }
};

/**
 * Query for icons and info
 */
const staticQuery = graphql`
    query {
        oceanside: allOceansideYaml(sort: {
            order: ASC,
            fields: [queryString]
        }
        filter: {
            name: {ne: "Land"}
        }) {
            tiles: nodes {
                name
                data
                description
                becomes,
                queryString,
                dialog
            }
        }
        icons: allFile(filter: { 
            sourceInstanceName: { eq: "assets" },
            extension: {in: ["gif"]}
        }) {
            icons: nodes {
                relativePath
                publicURL
            }
        }
    }`


/**
 * Vectro graphic icon for toggle between folded/unfolded view.
 * 
 * 
 * @param {*} param0 
 * @returns 
 */
const Trifold = ({
    display, 
    onClick, 
    className,
    stroke
}) => {

    const presentation = {
        stroke,
        fill: "none",
        strokeWidth: 15,
        strokeLinejoin: "bevel"
    }

    return <svg 
        className={className}
        display={display}
        viewBox={"0 0 225 300"}
        onClick={onClick}
    >
        <g>    
            <polygon {...{
                ...presentation,
                points: "125,300 125,100 0,50 0,250"
            }}/>

            <polygon {...{
                ...presentation,
                points: "225,50 100,0 100,50"
            }}/>

            <polygon {...{
                ...presentation,
                points: "125,100 125,250 225,250 225,50 0,50"
            }}/>
        </g>
    </svg>
    };


/**
 * Styled version of the trifold component.
 */
const StyledTrifold = styled(Trifold)`
    width: 32px;
    height: 32px; 
    cursor: pointer;
    margin: 16px;
    top: 0;
    right: 0;
`;


/**
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
 const TileInformation = ({
    tile: {
        publicURL, 
        anchorHash,
        queryString
    }, 
    className
}) =>
    <div className={className}>
        <a id={anchorHash}/>
        <img 
            src={publicURL}
            onClick={()=>{
                const newLocation = queryString ? `/app/?agent=${queryString}` : `/app/`
                navigate(newLocation);
            }}
        />
    </div>;


/**
 * Styled version of the basic TileInfo that makes the 
 * rendering context use crisp edges and a fixed size icon
 */
const StyledTileInformation = styled(TileInformation)`

    padding: 0 32px 0 8px;
    
    & img {
        image-rendering: crisp-edges;
        width: 96px;
        filter: grayscale(${({tile: {grayscale}})=>!!grayscale*100}%);
        cursor: pointer;
    }
`;


/**
 * App component is the container for the grid/column
 * view of interface elements, depending on whether the user is
 * on desktop or mobile.
 * 
 * There is no tablet specific view at this time. 
 */
const App = styled.div`
    display: grid;
    grid-gap: 0;
    grid-template-columns: ${
        props=>
            `auto ${columnSize({...props, column: 1})}fr ${columnSize({...props, column: 2})}fr`
        };
    grid-auto-rows: minmax(5rem, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: clip;
`;

/**
 * The Pane component holds one or more Mini-Apps.
 */
const Pane = styled.div`
    display: ${({display})=>display};
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    overflow-x: hidden;
    overflow-y: ${({column})=>column!==1?undefined:"hidden"};
    min-height: 100vh;
    bottom: 0;
    background-color: ${charcoal};

    & .logo {
        width: 100%;
        image-rendering: crisp-edges;
    }
`;

/**
 * Styled div the main Map.
 */
const StyledMap = styled.div`
    height: 100vh;
    width: 100%;
    border: 1px dashed ${ghost};
    border-top: none;
    border-bottom: none;
`;


const Control = styled.div`
    display: flex;
    flex-flow: column;
    position: absolute;
    margin: 0;
    top: 0;
    left: 0;
`;

const geolocationSettings = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
}

/**
 * Page component rendered by GatsbyJS.
 */
const AppPage = ({
    location: {
        search
    }
}) => {


/**
 * If the map element has not been created yet, create it with a custom style, and user
 * provided layer definitions. 
 * 
 * Generally these will be pre-fetched from static assets, but it can
 * also be sourced from an API or database.
 * 
 * Only one map context please, need center to have been set.
*/

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

        return () => worker.current.terminate();
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
        mapboxgl.accessToken = mapBoxAccessToken;

        const _map = new Map({container: ref.current, ...defaults});
        setMap(_map);

        return _map.remove;
    }, [ ref ]);

    /**
     * Hoist the resize function on map to the parent 
     * interface.
     */
    useEffect(()=>{
        if (map) map.resize();
    }, [expand]);

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
    const [ queue, setQueue ] = useState([]);

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
     * Information about the Rust-WASM runtime instance running inside
     * the worker. We'll use this to make sure that the worker is going
     * before we send in data to process. 
     */
    const [ runtimeStatus, setRuntimeStatus ] = useState({ready: false});

    /**
     * Initialize the Worker scope runtime, and save the status to React
     * state. This will be used as a Hook reflow key. 
     */
    useEffect(()=>{
        if (worker.current)
            worker.current.initRuntime().then(setRuntimeStatus);
    }, [ worker.current ]);


    /**
     * Reorder data sets as they are added.
     */
    const [ channelOrder, setChannelOrder ] = useState([]);


    /**
     * Task the web worker with loading and transforming data to add
     * to the MapBox instance as a GeoJSON layer. 
     */
    useEffect(() => {
        if (!map || !queue || !worker.current || !runtimeStatus.ready) return;

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

    }, [ queue, worker.current, runtimeStatus ]);

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
            geolocationSettings
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
            map.addLayer(source);
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
        map.addImage("home", pulsingDot({size: 32}));
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
  

    /**
     * Boolean indicating whether the device is a small mobile,
     * or full size desktop.
     */
    const [ mobile, setMobile ] = useState(false);

    /**
     * "Guess" the type of device based on known user agent string.
     * 
     * This is disclosed in the website privacy policy. 
     */
    useEffect(() => {
        const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
            
        setMobile(Boolean(
            userAgent.match(
                /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
            )
        ));
          
    }, [ ]);

    /**
     * Set map full screen
     */
    const [ expand, setExpand ] = useState(false);

    /**
     * Assume that on mobile the user will want to see the map
     * rather than our loading Jenk.
     */
    useEffect(()=>{
        setExpand(mobile);
    },[ mobile ]);


 
    /**
     * Get icon static data
     */
    const {
        oceanside: {tiles},
        icons: {icons}
    } = useStaticQuery(staticQuery);


    /**
     * React state to hold parsed query string parameters.
     */
    const [ query, setQuery] = useState({
        agent: null,
    });

    /**
     * When page loads or the search string changes,
     * parse the query string. 
     */
    useEffect(() => {
        if (!search) return;

        setQuery(
            Object.fromEntries(search
                .slice(1, search.length)
                .split("&")
                .map(item => item.split("=")))
        );

    }, [ search ]);

    
    /**
    * Sorted items to render in interface
    */
    const [ sorted, setSorted ] = useState([]);

    /**
    * Use Web worker to do sorting
    */
    useEffect(()=>{
        if (worker.current)
            worker.current.sorted({icons, tiles}).then(setSorted);
    }, [ worker ]);
     

    return <App {...{mobile, expand}}>
        <SEO title={"Blue computing"} />
        <Pane 
            row={0} 
            column={0}
            display={!columnSize({expand, mobile, column: 0}) ? "none" : undefined}
        >
            <img 
                src={"/dagan-mad.gif"} 
                className={"logo"}
            />

            {sorted.map(tile => 
                <StyledTileInformation
                    key={tile.anchorHash} 
                    tile={tile}
                />
            )}
        </Pane>
        <Pane 
            row={0} 
            column={1}
            display={!columnSize({expand, mobile, column: 1}) ? "none" : undefined}
        >
            <div>
            <StyledMap ref={ref}/>      
            <Control>
                <StyledTrifold 
                    onClick={() => {setExpand(!expand)}}
                    stroke={orange}
                /> 
            </Control>
            </div>
        </Pane>
        <Pane 
            display={!columnSize({expand, mobile, column: 2}) ? "none" : undefined}
            row={0} 
            column={2}
        >
            <StyledCatalog storage={{}} graph={{}}/> 
        </Pane>
    </App> 
};

/**
 * Styled version of page exported by default.
 */
export default styled(AppPage)`

    display: grid;
    grid-gap: 0;
    grid-template-columns: ${
        props=>
            `${columnSize({...props, column: 0})}fr ${columnSize({...props, column: 1})}fr`
        };
    grid-auto-rows: minmax(5rem, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: clip;

    & canvas {
        image-rendering: crisp-edges;
        width: 90%;
        margin: auto;
    }

`;
