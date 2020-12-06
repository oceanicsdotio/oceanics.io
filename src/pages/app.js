
import React, { useState } from "react"
import styled from "styled-components";

import useFractalNoise from "../hooks/useFractalNoise";
import useLagrangian from "../hooks/useLagrangian";
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
import appStyle from "../styles/app.css";

const {locations, things, team} = entities;
const storageTarget = "https://oceanicsdotio.nyc3.digitaloceanspaces.com";
// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;
const title = "Ocean analytics as a service";
const mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

const columnSize = ({expand, mobile, column}) => {
    if (column === 0) {
        return !expand ? 1 : 0;
    } else if (column === 1) {
        return (expand || !mobile) ? 1 : 0;
    }
};

const Application = styled.div`
    display: grid;
    grid-gap: 0;
    grid-template-columns: ${
        ({mobile, expand})=>
            `${columnSize({expand, mobile, column: 0})}fr ${columnSize({expand, mobile, column: 1})}fr`
        };
    grid-auto-rows: minmax(50px, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: clip;
`;

const Composite = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    padding: 0;
`;

const Interface = styled.div`
    display: flex;
    flex-flow: column;
    position: fixed;
    width: fit-content;
    height: 100%;
    width: fit-content;
    margin: 0;
    bottom: 0;
    right: 0;
    z-index: 2;
    border: 1px yellow dashed;

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

const Canvas = styled.canvas`
    position: relative;
    display: ${({display})=>display};
    width: 100%;
    height: 100%;
    cursor: none;
    image-rendering: crisp-edges;
`;


export default () => {

    const [token, loginCallback] = useState(null);
    const [expand, setExpand] = useState(false);
    const {mobile} = useDetectDevice();
    // const mobile=true;
    const [showMap, setShowMap] = useState(false);
    
    const isometric = useOceanside({});
    const noise = useFractalNoise({
        opacity: 1.0
    });
    const particles = useLagrangian({
        metadataFile:"/wind.json", 
        source:"/wind.png"
    });

    
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
            <Composite>
                <Map 
                    accessToken={mapBoxAccessToken}
                    display={showMap?undefined:"none"}
                    triggerResize={[expand]}
                />
                <Canvas
                    display={showMap?"none":undefined}
                    ref={isometric.ref.board}
                    // onClick={isometric.onBoardClick}
                /> 
                         
                <Interface display={showMap?"none":undefined}>
                    <Trifold 
                        onClick={() => {setExpand(!expand)}}
                    /> 
                    <canvas
                        ref={isometric.ref.nav}
                        width={isometric.worldSize}
                        height={isometric.worldSize}
                        // onClick={isometric.onNavClick}
                    />
                </Interface>
            </Composite>
        </ColumnContainer>
        
    </Application> 
};