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
import { ghost, orange, charcoal } from "../palette";

/**
 * Fetch site data.
 */
import { useStaticQuery, graphql } from "gatsby";

/**
 * SEO headers.
 */
import SEO from "../components/SEO";  

/**
 * Bathysphere (SensorThings API) interface right-side interface
 */ 
import Catalog from "../components/Catalog";  

/**
 * Interactive Map component using MapBox.
 */
import useMapBox from "../hooks/useMapBox";

/**
 * Dedicated worker loader.
 */
 import Worker from "../hooks/useBathysphereApi.worker.js";

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
const query = graphql`
    query {
        oceanside: allOceansideYaml(sort: {
            order: ASC,
            fields: [name]
        }) {
            tiles: nodes {
                name
                data
                description
                becomes
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
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
const TileInformation = ({
    tile: {
        name,
        publicURL
    }, 
    className
}) =>
    <div className={className}>
        <a id={name.toLowerCase().split(" ").join("-")}/>
        <img src={publicURL}/>
    </div>;



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


const StyledTrifold = styled(Trifold)`
    width: 32px;
    height: 32px; 
    cursor: pointer;
    margin: 16px;
    top: 0;
    right: 0;
`;


/**
 * Styled version of the basic TileInfo that makes the 
 * rendering context use crisp edges and a fixed size icon
 */
const StyledTileInformation = styled(TileInformation)`

    padding: 0 32px 0 8px;
    
    & img {
        image-rendering: crisp-edges;
        width: 96px;
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
`;

/**
 * Styled div the main Map.
 */
const Map = styled.div`
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

/**
 * Page component rendered by GatsbyJS.
 */
const AppPage = () => {

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
     * Custom Hook that handles event cascades for loading and parsing data
     * into MapBox sources and layers.
     */
    const { ref } = useMapBox({ triggerResize: [expand], geolocationSettings: {}});

    /**
     * Get icon static data
     */
    const {
        oceanside: {tiles},
        icons: {icons}
    } = useStaticQuery(query);

    
    /**
     * Web worker reference for fetching and auth.
     */
    const worker = useRef(null);

    /**
    * Create worker. Must be inside Hook, or webpack will protest.
    */
    useEffect(() => {
        worker.current = new Worker();
    }, []);
 
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
        <SEO title={"Blue economy trust layer"} />
        <Pane 
            row={0} 
            column={0}
            display={!columnSize({expand, mobile, column: 0}) ? "none" : undefined}
        >
            {sorted.map((tile, ii) => 
                <StyledTileInformation
                    key={`tile-${ii}`} 
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
            <Map ref={ref}/>      
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
            <Catalog storage={{}} graph={{}}/> 
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