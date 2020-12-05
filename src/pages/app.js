
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
import {StyledRawBar} from "../components/Layout";

import entities from "../data/entities.yml";
import {pink, grey, shadow, ghost} from "../palette";

const {locations, things, team} = entities;
const storageTarget = "https://oceanicsdotio.nyc3.digitaloceanspaces.com";
// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;
const title = "Ocean analytics as a service";
const mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';


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
    margin: 0;
    bottom: 0;
    z-index: 2;
`;

const Svg = styled.svg`
    display: ${({display})=>display};
    width: 2rem;
    height: 2rem; 
    cursor: pointer;
    padding: 0.2rem;
    margin: 0.3rem;
`;


const ColumnContainer = styled.div`

    display: ${({display})=>display};
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
    overflow-x: hidden;

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
    margin-bottom: 0;
    margin-top: auto;
`;



export default () => {

    const [token, loginCallback] = useState(null);
    const [expand, setExpand] = useState(false);
    const {mobile} = useDetectDevice();
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
        <ColumnContainer row={0} column={0}>
            <StyledRawBar menu={[{ 
                name: "Login", 
                component: <Login onSuccess={loginCallback}/>   
            },{
                name: "Lazarette",
                onClick: () => {setShowMap(true)},
                component: <Catalog {...{
                    graph: {accessToken: token},
                    storage: {target: storageTarget}
                }}/>
            },{
                name: "Almanac",
                onClick: () => {setShowMap(false)},
                component: <Calendar {...{
                    team, home, locations, things
                }}/>
            }]}/>
        </ColumnContainer>
        
        <ColumnContainer row={0} column={1}>
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
                <Interface>
                    <Svg 
                        display={mobile?"none":undefined}
                        viewBox={"0 0 310.88 310.879"}
                        onClick={() => {setExpand(!expand)}}
                    >
                        <g>
                            <polygon 
                                fill={grey}
                                points="205.506,90.753 205.506,256.321 243.622,249.602 243.622,37.368 87.632,57.365"
                            />
                            <polygon 
                                fill={ghost}
                                points="196.541,310.879 196.541,94.917 67.258,58.292 67.258,269.779"
                            />
                            <polygon 
                                fill={ghost}
                                points="111.721,47.461 230.544,33.259 111.721,0"
                            />
                        </g>
                    </Svg>

                    <Preview
                        display={showMap?"none":"block"}
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