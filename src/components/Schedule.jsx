import React, {useState, useReducer} from "react";
import styled from "styled-components";

import Roster from "./Roster";
import {Things} from "./Thing";
import {TileSet} from "./Oceanside";
import {Locations} from "./Location";


const dateFormat = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
};

const defaultThings = {
    "R/V Lloigor": {
        icon: TileSet["boat"],
        capacity: 2
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

const thingLocations = {
    "Wharf": {
        things: defaultThings,
        icon: TileSet["wharf"],
        home: true,
        capacity: 4
    }, 
    "Farm": {
        things: {},
        icon: TileSet["mussels"]
    }
};


const Application = styled.div`
    display: grid;
    grid-gap: 5px;
    grid-template-columns: 3fr 4fr;
    grid-auto-rows: minmax(50px, auto);
`;

const Stream = styled.div`
    padding: 5px;
    height: 100vh;
    overflow-y: scroll;
    overflow-x: hidden;
`;

const ColumnContainer = styled.div`
    grid-row: ${({row})=>row+1};
    grid-column: ${({column})=>column+1};
`;

 // guess where things should be by default
 const defaultHome = Object.entries(thingLocations)
 .filter(([_,v]) => v.home).pop()[0];

const Day = ({
    date, 
    team = [],
    format = dateFormat,
    className = "Day"
}) => 
    <div className={className}>
        <h2>
            {date.toLocaleDateString(undefined, format)}
        </h2>
        <Locations team={team} thingLocations={thingLocations}/>
    </div>;

const DayContainer = styled(Day)`
    width: 100%;
    padding: 0;
    margin: 0;
`;

export default ({
    days,
    team = defaultTeam,
    callback
}) => {
    /*
    This is a test service meant to enable automatic reminders and scheduling assistance.

    The service maintains a record of upcoming operations. 

    This includes the missions for vessels, personnel responsibly for that action, and the location
    of the actions. There are many features that can be added, but this is a minimal effort.

    Requirements:
    1. Allow input from pre-populated items
    2. Display next 7 days
    3. Send e-mail or text reminders with SendGrid
    4. Allow recipients to adjust personal settings (optional)

    */
    
    return (
        <Application>
            <ColumnContainer
                row={0}
                column={0}
            >
            <h1 onClick={callback}>{"Mission API"}</h1>
            <h2>{"Team"}</h2>
            <Roster team={team} />

            <h2>{"Things"}</h2>
            <Things things={defaultThings} home={defaultHome}/>
            </ColumnContainer>
            <ColumnContainer
                row={0}
                column={1}
            >
            <Stream>
            {
                [...Array(days).keys()]
                    .map(offset => {
                        const today = new Date();
                        const date = new Date(today.setDate(today.getDate()+offset));
                        return <DayContainer date={date} team={team}/>
                    })
            }
            </Stream>
            </ColumnContainer>
        </Application>
    );
};

