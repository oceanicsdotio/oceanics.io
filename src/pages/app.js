
import React, { useState, useRef } from "react"
import { graphql } from "gatsby";
import styled from "styled-components";

import useFractalNoise from "../hooks/useFractalNoise";
import useOceanside from "../hooks/useOceanside";

import SEO from "../components/SEO";  // SEO headers
import Catalog from "../components/Catalog";  // Graph API interface
import Login from "../components/Login";  // API JWT authorizatio
import Map from "../components/Map";  // MapBox interface
import Roster from "../components/Roster";  // People management
import Calendar from "../components/Calendar";
import RawBar from "../components/RawBar";
import {TaskList} from "../components/Task";
import Location from "../components/Location";
import Thing from "../components/Thing";
import Note from "../components/Note";
import {TileSet} from "../hooks/useOceanside";

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
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    bottom: 0;
    overflow-x: hidden;
    margin: 0;
    padding: 0;

    & > canvas {
        width: 100%;
        height: 100%;
        cursor: none;
        image-rendering: pixelated;
    }

`;

/*
Canvas uses crisp-edges to preserve pixelated style of map.
*/
const StyledCanvas = styled.canvas`
    display: inline-block;
    image-rendering: crisp-edges;
    position: relative;
    left: 0;
    bottom: 0;
    width: 128px;
    height: 128px;
    margin: 10px;
    border: orange 1px solid;
`;

const LeftColumn = () => {

    const [token, loginCallback] = useState(null);
   
    const tools = [{
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
    }];

    return <ColumnContainer row={0} column={0}>
        <RawBar menu={tools}/>
    </ColumnContainer>
};


const RightColumn = () => {


    const ref = useRef(null);
    const nav = useRef(null);  // minimap for navigation

    
    // useFractalNoise({ref});
    const {worldSize, map, clock, onBoardClick, onNavClick} = useOceanside({nav, board: ref});


    return <ColumnContainer row={0} column={1}>
        
        {/* <Map 
            accessToken={mapBoxAccessToken}
        />  */}
        {/* <canvas ref={ref} /> */}
        <div>
            {clock ? `${clock.date.toLocaleDateString()} ${18-2*(clock.actions ? clock.actions : 0)}:00, Balance: $${map ? map.score() : 0.0}` : null  }
        </div>
        
        <canvas
            ref={ref}
            onClick={onBoardClick}
        />
        <div>
            <StyledCanvas
                ref={nav}
                width={worldSize}
                height={worldSize}
                onClick={onNavClick}
            />
        </div>    

    </ColumnContainer>

}
// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;
const team  = entities.team;
const title = "Ocean analytics as a service";
const mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';

export default () => {
    return <Application>
        <SEO title={title} />
        <LeftColumn/>
        <RightColumn/>
    </Application> 
};