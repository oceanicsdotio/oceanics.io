import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { ghost } from "../palette";

/**
 * SEO headers
 */
import SEO from "../components/SEO";  

/**
 * SVG button for toggling between map and catalog views. 
 */
import Trifold from "../components/Trifold";

/**
 * Left-side nav bar with animated icons. 
 */
import TileInformation from "../components/TileInformation";

/**
 * Bathysphere (SensorThings API) interface right-side interface
 */ 
 import Catalog from "../components/Catalog";  

/**
 * Pixel graphic renderer for raster geospatial data.
 */
import useOceanside from "../hooks/useOceanside";

/**
 * Interactive Map component using Mapbox.
 */
import useMapBox from "../hooks/useMapBox";

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
`;

/**
 * Styled div the main Map.
 */
const Map = styled.div`
    height: 100vh;
    width: 100%;
`;

/**
 * Just holds preview map for now. May hold additional
 * interface elements in the future. Currently required
 * for consistent styling across layouts.
 */
const Control = styled.div`
    display: flex;
    flex-flow: column;
    position: absolute;
    margin: 0;
    top: 0;
    left: 0;
    
    & > canvas {
        image-rendering: crisp-edges;
        width: 128px;
        height: 128px;
        margin-bottom: auto;
        margin-right: auto;
        margin-left: 1rem;
        margin-top: 1rem;
    }
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
     * Isometric pixel rendering interface for rasterized data.
     */
    const { nav, worldSize } = useOceanside({});

    /**
     * Custom Hook that handles event cascades for loading and parsing data
     * into MapBox sources and layers.
     */
    const { ref } = useMapBox({ triggerResize: [expand], geolocationSettings: {}});

    return <App {...{mobile, expand}}>
        <SEO title={"Blue economy trust layer"} />
        <Pane 
            row={0} 
            column={0}
            display={!columnSize({expand, mobile, column: 0}) ? "none" : undefined}
        >
            <TileInformation/>
        </Pane>
        <Pane 
            row={0} 
            column={1}
            display={!columnSize({expand, mobile, column: 1}) ? "none" : undefined}
        >
            <Map ref={ref}/>      
            <Control>
                <canvas
                    id={"preview-target"}
                    ref={nav.ref}
                    width={worldSize}
                    height={worldSize}
                    onClick={nav.onClick}
                />
                <Trifold 
                    onClick={() => {setExpand(!expand)}}
                    stroke={ghost}
                /> 
            </Control>
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
`;