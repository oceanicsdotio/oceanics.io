
import React, { useState, useEffect } from "react";
import {graphql} from "gatsby";
import styled from "styled-components";

import useRectilinearGrid from "../hooks/useRectilinearGrid";
import useOceanside from "../hooks/useOceanside";
import useDetectDevice from "../hooks/useDetectDevice";


import { NavBar, Title } from "../components/Layout";
import SEO from "../components/SEO";  // SEO headers
import Catalog from "../components/Catalog";  // Graph API interface
import Login from "../components/Login";  // API JWT authorizatio
import Map from "../components/Map";  // MapBox interface
import Almanac from "../components/Calendar";
import Trifold from "../components/Trifold";

import { ghost } from "../palette";
import layers from "../data/layers.yml";

const storageTarget = "https://oceanicsdotio.nyc3.digitaloceanspaces.com";
// guess where things should be by default
const title = "Ocean analytics as a service";
const mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q';


const BackBuffer = styled.canvas`
    width: 500px;
    height: 500px;
    position: fixed;
    visibility: hidden;
    image-rendering: crisp-edges;
`;

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
        margin-bottom: 1rem;
        margin-right: 1rem;
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

    & > main {
        height: auto;
        bottom: 0;
        padding-top: 1rem;
        padding-bottom: 1rem;
        border-top: 0.1rem solid ${ghost};
        border-radius: 1rem;
        padding: 1rem;
    }

    & > button {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 10;
    }
`;

// Debugging aid
const FORCE_MOBILE = false;

export default ({
    data: {
        team, 
        locations,
        tasks: {
            tasksByLocation
        }
    }}) => {

    const [token, loginCallback] = useState(null);
    const [expand, setExpand] = useState(false);
    const [showMap, setShowMap] = useState(false);

    const {mobile} = useDetectDevice(); 
    const isometric = useOceanside({});
    const grid = useRectilinearGrid({
        lineWidth: 1.0,
        boundingBox: [
            [-70.1, 44.0],
            [-69.7, 44.0],
            [-69.7, 43.6],
            [-70.1, 43.6]
        ]
    });

    /**
     * Assume that on mobile the user will want to see the map
     * rather than our loading Jenk.
     */
    useEffect(()=>{
        setShowMap(FORCE_MOBILE || mobile);
        setExpand(FORCE_MOBILE || mobile);
    },[mobile]);


    const [meshNodes, setMeshNodes] = useState([]);
    const [nextFragment, setNextFragment] = useState({
        query: true,
        start: null,
        end: null
    });
    useEffect(()=>{

        const url = nextFragment.query ? 
            `https://www.oceanics.io/api/mesh-nodes?prefix=MidcoastMaineMesh&key=mesh_nodes` :
            `https://www.oceanics.io/api/mesh-nodes?prefix=MidcoastMaineMesh&key=mesh_nodes&start=${nextFragment.start}&end=${nextFragment.end}`;

        fetch(url)
            .then(response => response.json())
            .then(({dataUrl, next, ...metadata}) => {
               
                const nodes = new Float32Array(Uint8Array.from(
                    window.atob(dataUrl.split("base64,").pop()), c => c.charCodeAt(0)
                ).buffer);

                setNextFragment({
                    query: next | false,
                    start: next ? next[0] : null,
                    end: next ? next[1] : null
                });
                setMeshNodes([...meshNodes, ...nodes])

                console.log("MeshQuery", {metadata});
            }
        )
    },[nextFragment]);

    /**
     * Build a rotating menu
     */
    const [menu, setMenu] = useState([{ 
        name: "Login", 
        component: <Login onSuccess={loginCallback}/>   
    },{
        name: "Almanac",
        onClick: () => {setShowMap(false)},
        component: 
            <Almanac {...{
                team: team.nodes,
                locations: locations.nodes,
                tasks: Object.fromEntries(tasksByLocation.map(
                    ({location, nodes})=>[location, nodes]))
            }}/>
    },{
        name: "Catalog",
        onClick: () => {setShowMap(true)},
        component: <Catalog {...{
            graph: {accessToken: token},
            storage: {target: storageTarget}
        }}/>
    }]);

    return <Application mobile={mobile} expand={expand}>

        <SEO title={title} />

        <BackBuffer
            id={grid.mapbox.layer.id}
            ref={grid.ref}
        /> 

        <ColumnContainer 
            display={!columnSize({expand, mobile, column: 0}) ? "none" : undefined}
            row={0} 
            column={0}
        >
            <NavBar>
                <Title to={"/"} color={ghost}>{menu[0].name}</Title>
                {menu.slice(1, menu.length).map(({name, onClick}, ii)=>
                    <button 
                        key={`button-${name}`}
                        onClick={() => {
                            if (onClick) onClick();
                            setMenu([
                                ...menu.slice(ii+1, menu.length), 
                                ...menu.slice(0, ii+1)]);
                        }}
                    >
                        {name}
                    </button>)
                }
            </NavBar>
            <main>{menu[0].component}</main>
        </ColumnContainer>
        
        <ColumnContainer 
            row={0} 
            column={1}
            display={!columnSize({expand, mobile, column: 1}) ? "none" : undefined}
        >
            <Composite display={showMap?"none":undefined}>
                <Map 
                    center={[-70, 43.7]}
                    layers={{...layers, canvas: [grid.mapbox]}}
                    accessToken={mapBoxAccessToken}
                    display={showMap?undefined:"none"}
                    triggerResize={[expand, showMap]}
                />
                <canvas
                    id={"render-target"}
                    ref={isometric.board.ref}
                    // onClick={isometric.board.onClick}
                /> 
                         
                <Interface display={showMap?"none":undefined}>
                    <canvas
                        id={"preview-target"}
                        ref={isometric.nav.ref}
                        width={isometric.worldSize}
                        height={isometric.worldSize}
                        // onClick={isometric.nav.onClick}
                    />
                </Interface>
            </Composite>
        </ColumnContainer>
        <Trifold onClick={() => {setExpand(!expand)}}/> 
    </Application> 
};

export const pageQuery = graphql`
    query {
        team: allBathysphereYaml(
            filter: {
                kind: { eq: "Agents" }
            }
        ) {
            nodes {
                spec { name }
            }   
        }
        locations: allBathysphereYaml(
            filter: {
                kind: { eq: "Locations" }
                metadata: {
                    fictional: { eq: true }
                }
            }
        ) {
            nodes {
                kind
                metadata {
                    fictional
                    home
                    icon
                    capacity
                }
                spec { name }
            }   
        }
        tasks: allBathysphereYaml(
            filter: {
                kind: { eq: "Tasks" }
            }
        ) {
            tasksByLocation: group(field: metadata___Locations___name) {
                location: fieldValue
                nodes { 
                    spec { name }
                }
            }  
        }
    }
`;