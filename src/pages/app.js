
import React, { useState, useRef } from "react"
import styled from "styled-components";
import {orange} from "../palette";
import useFractalNoise from "../hooks/useFractalNoise";
import useOceanside from "../hooks/useOceanside";

import SEO from "../components/SEO";  // SEO headers
import Catalog from "../components/Catalog";  // Graph API interface
import Login from "../components/Login";  // API JWT authorizatio
import Map from "../components/Map";  // MapBox interface
import Calendar from "../components/Calendar";
import RawBar from "../components/RawBar";
import Form from "../components/Form";

import entities from "../../static/entities.yml";

const {locations, things} = entities;
const storageTarget = "https://oceanicsdotio.nyc3.digitaloceanspaces.com";

const Application = styled.div`
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 1fr 1fr;
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

    bottom: 0;
    margin: 0;
    padding: 0;
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
    const nav = useRef(null);  // minimap for navigation
    const [token, loginCallback] = useState(null);
    
    const show = {
        Map: true,
        Overlay: true,
        Canvas: true,
        Preview: true,
    }

    // useFractalNoise({ref});
    const {
        worldSize, 
        onBoardClick, 
        onNavClick
    } = useOceanside({nav, board: ref});

    return <Application>
        <SEO title={title} />
        <ColumnContainer row={0} column={0}>
            <RawBar menu={[{
                name: "Account", 
                component: <Login onSuccess={loginCallback}/>   
            },{
                name: "Catalog", 
                component: <Catalog {...{
                    graph: {accessToken: token},
                    storage: {target: storageTarget}
                }}/>
            },{
                name: "Calendar",
                component: <Calendar {...{
                    team, home, locations, things
                }}/>
            }]}/>
        </ColumnContainer>
        
        <ColumnContainer row={0} column={1}>
            
            <Map 
                display={show.Map ? undefined : "none"}
                accessToken={mapBoxAccessToken}
            />
            
            <Canvas
                ref={ref}
                onClick={onBoardClick}
            /> 
            <Overlay display={show.Overlay}>
                <button>{"Swap"}</button>
                <Preview
                    ref={nav}
                    width={worldSize}
                    height={worldSize}
                    onClick={onNavClick}
                />
            </Overlay>
        </ColumnContainer>
    </Application> 
};