
import React, { useState, useRef, useReducer } from "react"
import styled from "styled-components";
import {orange} from "../palette";

import useFractalNoise from "../hooks/useFractalNoise";
import useLagrangian from "../hooks/useLagrangian";
import useOceanside from "../hooks/useOceanside";
import useDetectDevice from "../hooks/useDetectDevice";

import SEO from "../components/SEO";  // SEO headers
import Catalog from "../components/Catalog";  // Graph API interface
import Login from "../components/Login";  // API JWT authorizatio
import Map from "../components/Map";  // MapBox interface
import Calendar from "../components/Calendar";
import {StyledRawBar} from "../components/Layout";
import Form from "../components/Form";

import entities from "../../static/entities.yml";

const {locations, things} = entities;
const storageTarget = "https://oceanicsdotio.nyc3.digitaloceanspaces.com";

const Application = styled.div`
    display: grid;
    grid-gap: 0;
    grid-template-columns: ${({mobile, expand})=>`${!expand ? 1 : 0}fr ${expand || !mobile ? 1 : 0}fr`};
    grid-auto-rows: minmax(50px, auto);
    margin: 0;
    padding: 0;
    height: 100vh;
    width: auto;
    overflow-y: hidden;
`;


const ColumnContainer = styled.div`

    display: ${({display})=>display};
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    overflow-x: hidden;

    width: 100%;

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
    image-rendering: pixelated;
`;

/*
Canvas uses crisp-edges to preserve pixelated style of map.
*/
const Preview = styled.canvas`
    display: ${({display="block"})=>display};
    image-rendering: crisp-edges;
    width: 128px;
    height: 128px;
`;


const Overlay = styled.div`
    display: ${({display})=>display};
    position: fixed;
    width: 128px;
    height: 128px;
    margin: 10px;
    border: ${orange} 0.2rem solid;
    top: 1rem;
    right: 1rem;
`;

// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;
const team  = entities.team;
const title = "Ocean analytics as a service";
const mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

export default () => {

    const ref = useRef(null);
    const nav = useRef(null);
    const [token, loginCallback] = useState(null);
    const [expand, setExpand] = useState(false);
    const {mobile} = useDetectDevice();
    const [showMap, setShowMap] = useReducer((prev, value)=>{
        return value !== undefined ? value : !prev;
    }, false);
    

    // useFractalNoise({ref});
    useLagrangian({ref, metadataFile:"/wind.json", source:"/wind.png"});

    // const {
    //     worldSize, 
    //     onBoardClick, 
    //     onNavClick
    // } = useOceanside({nav, board: ref});

    return <Application mobile={mobile} expand={expand}>
        <SEO title={title} />
        <ColumnContainer row={0} column={0}>
            <StyledRawBar menu={[{ 
                name: "Login", 
                component: <Login onSuccess={loginCallback}/>   
            },{
                name: "Lazarette",
                onClick: () => {
                    console.log("Laz");
                    setShowMap(true);
                },
                component: <Catalog {...{
                    graph: {accessToken: token},
                    storage: {target: storageTarget}
                }}/>
            },{
                name: "Almanac",
                onClick: () => {
                    console.log("Almanac");
                    setShowMap(false);
                },
                component: <Calendar {...{
                    team, home, locations, things
                }}/>
            }]}/>
        </ColumnContainer>
        
        <ColumnContainer row={0} column={1}>
            <button onClick={()=>setExpand(!expand)}>
                {expand ? "Minimize" : "Expand"}
            </button>
            {
                showMap ? 
                <Map accessToken={mapBoxAccessToken} /> : ( 
                <>
                <Canvas
                    ref={ref}
                    // onClick={onBoardClick}
                />          
                {/* <Overlay >
                    <Preview
                        ref={nav}
                        width={worldSize}
                        height={worldSize}
                        onClick={onNavClick}
                    />
                </Overlay> */}
                </>
                )
            }
        </ColumnContainer>
    </Application> 
};