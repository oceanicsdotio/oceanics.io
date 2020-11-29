
import React, { useState, useRef } from "react"
import { graphql } from "gatsby";
import styled from "styled-components";

import useRectilinearGrid from "../hooks/useRectilinearGrid";
import useTriangularMesh from "../hooks/useTriangularMesh";
import useHexagonalGrid from "../hooks/useHexagonalGrid";


import SEO from "../components/SEO";  // SEO headers
import Storage from "../components/Storage";  // S3 data lake interface
import Catalog from "../components/Catalog";  // Graph API interface
import Login from "../components/Login";  // API JWT authorizatio
import Map from "../components/Map";  // MapBox interface
import Roster from "../components/Roster";  // People management
import DataStream from "../components/DataStream";  // visualization
import Calendar from "../components/Calendar";
import RawBar from "../components/RawBar";
import {TaskList} from "../components/Task";
import Location from "../components/Location";
import Lagrangian from "../components/Lagrangian";
import Thing from "../components/Thing";
import Note from "../components/Note";
import {TileSet} from "../components/Oceanside";

// import style from "../../static/style.yml";  // map style
// import layers from "../../static/layers.yml";  // map layers
// import {pink} from "../palette";


const things = {
    "R/V Lloigor": {
        icon: TileSet["boat"],
        capacity: 2,
        tanks: [{
            name: "starboard aft",
            capacity: 20,
        },
        {
            name: "port aft",
            level: 4,
        },
        {
            name: "starboard forward",
            level: 5.5,
        },
        {
            name: "port forward",
            level: 8.75,
        }]
    },
    "Sealab": {
        icon: TileSet["laboratory"],
        home: "Farm",
        capacity: 6
    }
};

const defaultTeam = [
    "HP Lovecraft",
    "Mary Shelley",
    "Arthur Machen",
    "Octavia Butler"
]

const locations = [{
    name: "Wharf",
    icon: TileSet["wharf"],
    home: true,
    capacity: 4,
    tasks: ["do a thing", "fix me"]
}, {
    name: "Farm",
    icon: TileSet["fish"],
    tasks: ["harvest"]
}];


const Application = styled.div`
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 3fr 4fr;
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
`;

// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;

const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 400px;
    cursor: none;
`;

const Account = ({onSuccess}) => <div>
    <Login onSuccess={onSuccess}/>
</div>


const Locations = ({
    locations,
    home,
    team=null
}) => 
    <>
        {locations.map(
            ({tasks, things=null, capacity, ...props}, ii) => 
                <Location 
                    key={`location-${ii}`}
                    {...props}
                >
                    <Roster team={props.home && team ? 
                        [...(props.team || []), ...team]: 
                        []} capacity={capacity}/>
                    {things ? <Things things={things} home={home}/> : null}
                    <TaskList tasks={tasks} heading={"Tasks"}/>
                </Location>
            )}
    </>


export default ({ 
    days,
    team = defaultTeam,
    title ="Ocean analytics as a service",
}) => {
   
    const [token, loginCallback] = useState(null);
    const ref = useRef(null);

    const _1 = useHexagonalGrid({ref});
    
    const tools = [{
        name: "Calendar",
        component: 
            <Calendar {...{days, team, home, locations}}>
              
                {Object.entries(things).map(([name, props], ii) => 
                    <Thing {...{
                        name, 
                        home,
                        key: `things-${ii}`,
                        ...props
                    }}/>
                )}
                {locations.map(({tasks, things=null, capacity, ...props}, ii) => 
                    <Location 
                        key={`location-${ii}`}
                        {...props}
                    >
                        <Roster team={props.home && team ? 
                            [...(props.team || []), ...team]: 
                            []} capacity={capacity}/>
                        {things ? <Things things={things} home={home}/> : null}
                        <TaskList tasks={tasks} heading={"Tasks"}/>
                    </Location>
                )}
                <Note/>
            </Calendar>
    },{
        name: "Account", 
        component: 
            <Account 
                onSuccess={loginCallback}
            />
    },{
        name: "Catalog", 
        component: 
            <Catalog 
                accessToken={token}
            />
    },{
        name: "Assets", 
        component: 
            <Storage 
                target={"https://oceanicsdotio.nyc3.digitaloceanspaces.com"} 
                delimiter={"/"}
            />
    }];

    return <Application>
        <SEO title={title} />
        <ColumnContainer row={0} column={0}>
            <RawBar menu={tools}/>
        </ColumnContainer>

        <ColumnContainer row={0} column={1}>
            {/* <Map 
                style={style} 
                layers={layers} 
                accessToken={'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q'}
            /> */}
            <StyledCanvas ref={ref} />
        </ColumnContainer>
    </Application>
   
};

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`;