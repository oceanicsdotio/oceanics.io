
import React, { useState, useRef } from "react"
import { graphql } from "gatsby";
import styled from "styled-components";

import useFractalNoise from "../hooks/useFractalNoise";

import SEO from "../components/SEO";  // SEO headers
import Storage from "../components/Storage";  // S3 data lake interface
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
    }
`;

// guess where things should be by default
const home = locations.filter(({home=false}) => home).pop().name;

export default ({ 
    team = entities.team,
    title = "Ocean analytics as a service",
    mapBoxAccessToken = 'pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q'
}) => {
   
    const [token, loginCallback] = useState(null);
    const ref = useRef(null);
    
    useFractalNoise({ref});
    
    const tools = [{
        name: "Calendar",
        component: 
            <Calendar {...{team, home, locations}}>
              
                {Object.entries(things).map(([name, props], ii) => 
                    <Thing {...{
                        name, 
                        home,
                        key: `things-${ii}`,
                        ...props
                    }}/>
                )}
                {locations.map(({tasks, things=null, capacity, icon=null, ...props}, ii) => 
                    <Location 
                        key={`location-${ii}`}
                        icon={icon ? TileSet[icon] : null}
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
            <div>
                <Login onSuccess={loginCallback}/>
            </div>
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
                accessToken={mapBoxAccessToken}
            />  */}
            <canvas ref={ref} />
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