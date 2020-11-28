
import React, { useState, useReducer } from "react"
import { graphql } from "gatsby";
import styled from "styled-components";

import SEO from "../components/SEO";  // SEO headers
import Storage from "../components/Storage";  // S3 data lake interface
import Catalog from "../components/Catalog";  // Graph API interface
import Login from "../components/Login";  // API JWT authorizatio
import Map from "../components/Map";  // MapBox interface
import Roster from "../components/Roster";  // People management
import DataStream from "../components/DataStream";  // visualization
import Calendar from "../components/Calendar";
import RawBar from "../components/RawBar";

import {Locations} from "../components/Location";

import {Things} from "../components/Thing";
import {TileSet} from "../components/Oceanside";

import style from "../../static/style.yml";  // map style
import layers from "../../static/layers.yml";  // map layers
import {pink} from "../palette";


const things = {
    "R/V Lloigor": {
        icon: TileSet["boat"],
        capacity: 2,
        tanks: [{
            name: "starboard aft"
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

const Header = styled.h1`
    margin: auto;
    margin-bottom: 2rem;
    border-bottom: 1px solid;
    border-radius: 2rem;
    font-size: larger;
    font-family: inherit;

    & > button {
        background: none;
        color: ${pink};
        border: none;
        font-size: large;
        cursor: pointer;
        margin: 0.5rem;
        font-family: inherit;
    }
`;


const Mission = ({team, things, home}) => {
    return <>

    <h2>{"Daylight"}</h2>
    <DataStream />

    <h2>{"Team"}</h2>
    <Roster team={team} />

    <h2>{"Things"}</h2>
    <Things 
        things={things}
        home={home}
    />

    
    </>
};


const NavHeader = ({prev, next, children, onPrev, onNext, className}) => {
    return <div className={className}>
        <Header >
            <button onClick={onPrev}>{`< ${prev}`}</button>
                {children}
            <button onClick={onNext}>{`${next} >`}</button>
        </Header>
    </div>
}

const RotateSelection = styled(NavHeader)`
    align-content: center;
    width: 100%;
    display: flex; 
`;


const Account = ({onSuccess}) => <div>
    <Login onSuccess={onSuccess}/>
</div>


export default ({ 
    days,
    team = defaultTeam
}) => {
   
    const [token, loginCallback] = useState(null);
    
    const tools = [
        
        {
            name: "Calendar",
            component: <Calendar {...{days, team, home, locations}}>
                        
                <Locations 
                    team={team} 
                    home={home}
                    locations={locations}
                />
            </Calendar>
        },
        
        {name: "Account", component: <Account onSuccess={loginCallback}/>},
        {name: "Mission", component: <Mission {...{team, home, things}}/>},
        {name: "Catalog", component: <Catalog accessToken={token}/>},
        {name: "Assets", component: <Storage 
            target={"https://oceanicsdotio.nyc3.digitaloceanspaces.com"} 
            delimiter={"/"}
        />},
    ];

    return <Application>
        <SEO title={"Ocean analytics as a service"} />
        <ColumnContainer 
            row={0} 
            column={0}
        >
            <RawBar menu={tools}/>
        </ColumnContainer>

        <ColumnContainer 
            row={0} 
            column={1}
        >
            <Map 
                style={style} 
                layers={layers} 
                accessToken={'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q'}
            />
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