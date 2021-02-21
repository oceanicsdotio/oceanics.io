
import React, { useState, useEffect } from "react";
import styled from "styled-components";

import SEO from "../components/SEO";  // SEO headers
import Catalog from "../components/Catalog";  // Graph API interface
import Map from "../components/Map";  // MapBox interface
import Trifold from "../components/Trifold";

import useOceanside from "../hooks/useOceanside";
import useDetectDevice from "../hooks/useDetectDevice";

import { ghost } from "../palette";


const title = "Discover data";
const mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';


/**
 * Logical combinator to calculate visibility and style of columns
 */
const columnSize = ({expand, mobile, column}) => {
    if (column === 1) {
        return !expand ? 1 : 0;
    } else if (column === 0) {
        return (expand || !mobile) ? 1 : 0;
    }
};

/**
 * Application component is the container for the grid/column
 * view of interface elements, depending on whether the user is
 * on desktop or mobile.
 * 
 * There is no tablet specific view at this time. 
 */
const Application = styled.div`
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

/**
 * Just holds preview map for now. May hold additional
 * interface elements in the future. Currently required
 * for consistent styling across layouts.
 */
const Interface = styled.div`
    display: flex;
    flex-flow: column;
    position: absolute;
    /* height: 100%; */
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
 * The ColumnContainer component holds one or more Mini-Apps,
 * and provides the control interface for hiding/showing/selecting
 * among them.
 */
const ColumnContainer = styled.div`

    display: ${({display})=>display};
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    overflow-x: hidden;
    overflow-y: ${({column})=>column?undefined:"hidden"};

    width: 100%;
    min-height: 100vh;
    bottom: 0;
    margin: 0;
    padding: 0;
`;

// Debugging aid
const FORCE_MOBILE = false;


export default () => {
    /**
     * Set map full screen
     */
    const [ expand, setExpand ] = useState(false);

    /**
     * Determine how much information to show on screen,
     * as well as how to interpret the location of the device
     */
    const { mobile } = useDetectDevice();

    /**
     * Isometric pixel renderer interface
     */
    const isometric = useOceanside({});

    /**
     * Assume that on mobile the user will want to see the map
     * rather than our loading Jenk.
     */
    useEffect(()=>{
        setExpand(FORCE_MOBILE || mobile);
    },[ mobile ]);

    return <Application {...{mobile, expand}}>
        <SEO title={title} />
        <ColumnContainer 
            row={0} 
            column={0}
            display={!columnSize({expand, mobile, column: 0}) ? "none" : undefined}
        >
            <Map 
                center={[-70, 43.7]}
                accessToken={mapBoxAccessToken}
                triggerResize={[expand]}
            />         
            <Interface>
                <canvas
                    id={"preview-target"}
                    ref={isometric.nav.ref}
                    width={isometric.worldSize}
                    height={isometric.worldSize}
                    onClick={isometric.nav.onClick}
                />
                <Trifold 
                    onClick={() => {setExpand(!expand)}}
                    stroke={ghost}
                /> 
            </Interface>
        </ColumnContainer>

        <ColumnContainer 
            display={!columnSize({expand, mobile, column: 1}) ? "none" : undefined}
            row={0} 
            column={1}
        >
            <Catalog storage={{}} graph={{}}/> 
        </ColumnContainer>
    </Application> 
};