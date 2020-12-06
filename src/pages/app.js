
import React, { useState, useEffect } from "react"
import styled from "styled-components";

// import useFractalNoise from "../hooks/useFractalNoise";
// import useLagrangian from "../hooks/useLagrangian";
import useOceanside from "../hooks/useOceanside";
import useDetectDevice from "../hooks/useDetectDevice";


import SEO from "../components/SEO";  // SEO headers
import Catalog from "../components/Catalog";  // Graph API interface
import Login from "../components/Login";  // API JWT authorizatio
import Map from "../components/Map";  // MapBox interface
import Calendar from "../components/Calendar";
import {StyledRawBar} from "../components/RawBar";
import Trifold from "../components/Trifold";

import entities from "../data/entities.yml";
import "../styles/app.css";

const {locations, things, team} = entities;
const storageTarget = "https://oceanicsdotio.nyc3.digitaloceanspaces.com";
// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;
const title = "Ocean analytics as a service";
const mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';


/**
 * Logical combinator to calculate visibility and style of columns
 */
const columnSize = ({expand, mobile, column}) => {
    if (column === 0) {
        return !expand ? 1 : 0;
    } else if (column === 1) {
        return (expand || !mobile) ? 1 : 0;
    }
};

/**
 * Application coomponent is the container for the grid/column
 * view of interface elements, depending on whether the user is
 * on desktop or mobile.
 * 
 * There is no tablet specific view at this time. 
 */
const Application = styled.div`
    display: grid;
    grid-gap: 0;
    grid-template-columns: ${
        ({mobile, expand})=>
            `${columnSize({expand, mobile, column: 0})}fr ${columnSize({expand, mobile, column: 1})}fr`
        };
    grid-auto-rows: minmax(5rem, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: clip;
`;


/**
 * Fill area for visual elements. Currently required for correct
 * resizing of map on transiitions between column and full screen
 * views.
 */
const Composite = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    padding: 0;

    & > canvas {
        position: relative;
        display: ${({display="block"})=>display};
        width: 100%;
        height: 100%;
        cursor: none;
        image-rendering: crisp-edges;
    }
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
    height: 100%;
    margin: 0;
    bottom: 0;
    right: 0;
    
    & > canvas {
        display: ${({display="block"})=>display};
        image-rendering: crisp-edges;
        width: 128px;
        height: 128px;
        margin-bottom: 0;
        margin-right: 0;
        margin-left: auto;
        margin-top: auto;
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
    overflow-y: ${({column})=>column?"hidden":undefined};

    width: 100%;
    min-height: 100vh;

    bottom: 0;
    margin: 0;
    padding: 0;

    & > button {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 10;
    }
`;

export default () => {

    const [token, loginCallback] = useState(null);
    const [expand, setExpand] = useState(false);
    const [showMap, setShowMap] = useState(false);

    const {mobile} = useDetectDevice();    
    const isometric = useOceanside({});
    // const noise = useFractalNoise({
    //     opacity: 1.0
    // });
    // const particles = useLagrangian({
    //     metadataFile:"/wind.json", 
    //     source:"/wind.png"
    // });


    /**
     * Assume that on mobile the user will want to see the map
     * rather than our loading Jenk.
     */
    useEffect(()=>{
        setShowMap(mobile);
    },[mobile]);

    return <Application mobile={mobile} expand={expand}>
        <SEO title={title} />
        <ColumnContainer 
            display={!columnSize({expand, mobile, column: 0}) ? "none" : undefined}
            row={0} 
            column={0}
        >
            <StyledRawBar menu={[{ 
                name: "Login", 
                component: <Login onSuccess={loginCallback}/>   
            },{
                name: "Almanac",
                onClick: () => {setShowMap(false)},
                component: <Calendar {...{
                    team, home, locations, things
                }}/>
            },{
                name: "Data",
                onClick: () => {setShowMap(true)},
                component: <Catalog {...{
                    graph: {accessToken: token},
                    storage: {target: storageTarget}
                }}/>
            }]}/>
        </ColumnContainer>
        
        <ColumnContainer 
            row={0} 
            column={1}
            display={!columnSize({expand, mobile, column: 1}) ? "none" : undefined}
        >
            <Composite display={showMap?"none":undefined}>
                <Map 
                    accessToken={mapBoxAccessToken}
                    display={showMap?undefined:"none"}
                    triggerResize={[expand, showMap]}
                />
                <canvas
                    ref={isometric.ref.board}
                    // onClick={isometric.onBoardClick}
                /> 
                         
                <Interface display={showMap?"none":undefined}>
                    <canvas
                        ref={isometric.ref.nav}
                        width={isometric.worldSize}
                        height={isometric.worldSize}
                        // onClick={isometric.onNavClick}
                    />
                </Interface>
            </Composite>
        </ColumnContainer>
        <Trifold onClick={() => {setExpand(!expand)}}/> 

    </Application> 
};