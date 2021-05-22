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
import { ghost, charcoal, pink, grey } from "../palette";

/**
 * Fetch site data.
 */
import { useStaticQuery, graphql } from "gatsby";

/**
 * SEO headers.
 */
import SEO from "../components/SEO"; 

/**
 * This is the per item element for layers
 */
import LayerCard from "../components/LayerCard";

/**
 * Detect mobile, and location
 */
import useDetectClient from "../hooks/useDetectClient";


import ReactDOM from "react-dom";
import mapboxgl, { Popup, Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

/**
 * Container for MapboxGL feature content. Rendered client-side.
 */
import PopUpContent from "../components/PopUpContent";
import Catalog from "../components/Catalog";

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
import useWasmWorkers from "../hooks/useWasmWorkers";

import useFragmentQueue from "../hooks/useFragmentQueue";
import useQueryString from "../hooks/useQueryString";



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



import TileInformation from "../components/TileInformation";


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

    const { worker, status } = useWasmWorkers();

    /**
     * MapBoxGL Map instance is saved to React state. 
     */
    const [ map, setMap ] = useState(null);

    /**
     * MapBox container reference.
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

        return () => {_map.remove()};
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

    const [ zoom, setZoomLevel ] = useState(null);

    /**
     * Add a mouse move handler to the map
     */
     useEffect(() => {
        if (map) map.on('zoom', () => {setZoomLevel(map.getZoom())});
    }, [ map ]);

    /**
     * Data sets to queue and build layers from.
     */
    const [ queue, setQueue ] = useState([]);


    /**
     * Reorder data sets as they are added.
     */
    const [ channelOrder, setChannelOrder ] = useState([]);


    /**
     * Task the web worker with loading and transforming data to add
     * to the MapBox instance as a GeoJSON layer. 
     */
    useEffect(() => {
        if (!map || !queue || !worker.current || !status.ready) return;


        const callback = (id, source, layer, onClick) => {
            map.addLayer({id, source, ...layer});
            if (onClick) map.on('click', id, onClick);
        }

        queue.filter(x => !map.getLayer(x)).forEach(({
            id,
            behind,
            standard="geojson",
            url=null,
            component=null,
            attribution=null, 
            ...layer
        }) => {
           
            setChannelOrder([...channelOrder, [id, behind]]);

            worker.current.getData(url, standard).then(source => {

                if (attribution) source.attribution = attribution;
                    
                const onClick = !component ? null : ({features, lngLat: {lng, lat}}) => {

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
                
                callback(id, source, layer, onClick);

            }).catch(err => {
                console.log(`Error loading ${id}`, err);
            });
        }); 

    }, [ queue, worker.current, status ]);

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
     * Use the worker to create the point feature for the user location.
     */
    useEffect(() => {
        if (!map || !worker.current || !location) return;

        worker.current.userLocation([
            location.coords.longitude, 
            location.coords.latitude
        ]).then(source => {
            map.addLayer(source);
        });
    }, [ worker, location, map ]);

    /**
     * Pan to user location immediately.
     */
    useEffect(() => {
        if (map && location)
            map.panTo([location.coords.longitude, location.coords.latitude]);
    }, [ location, map ]);
    
    /**
     * Create home animation image
     */
    useEffect(() => {
        if (!map || map.hasImage("home")) return;
        map.addImage("home", pulsingDot({size: 32}));
    }, [ map ]);


    const { mobile, location } = useDetectClient();

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
    }, [ mobile ]);


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
    const { query } = useQueryString({
        search,
        defaults: {
            agent: null
        }
    });
    
    /**
    * Sorted items to render in interface
    */
    const [ sorted, setSorted ] = useState([]);

    /**
    * Use Web worker to do sorting
    */
    useEffect(()=>{
        if (worker.current) worker.current.sorted({icons, tiles}).then(setSorted);
    }, [ worker ]);
     

    return <App {...{mobile, expand}}>
        <SEO title={"Blue computing"} />
        <Pane 
            row={0} 
            column={0}
            display={!columnSize({expand, mobile, column: 0}) ? "none" : undefined}
        >
            <img className={"logo"} src={"/dagan-mad.gif"}/>
            {sorted.map(tile => <TileInformation key={tile.anchorHash} tile={tile}/>)}
        </Pane>
        <Pane 
            row={0} 
            column={1}
            display={!columnSize({expand, mobile, column: 1}) ? "none" : undefined}
        >
            <StyledMap ref={ref}/>      
        </Pane>
        <Pane 
            display={!columnSize({expand, mobile, column: 2}) ? "none" : undefined}
            row={0} 
            column={2}
        >
            <Catalog geojson={geojson} zoomLevel={zoom} queue={queue} setQueue={setQueue}/> 
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
