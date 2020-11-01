import React, {useState, useReducer} from "react";
import styled from "styled-components";

import Roster from "./Roster";
import {Things} from "./Thing";
import {TileSet} from "./Oceanside";
import {Locations} from "./Location";

import {v4 as uuid4} from "uuid";

const dateFormat = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
};

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
const home = locations.filter(({home=false}) => home).pop().name;

const Day = ({
    date, 
    children,
    format = dateFormat,
    className = "Day"
}) => 
    <div className={className}>
        <h2>
            {date.toLocaleDateString(undefined, format)}
        </h2>
        <div>
            {children}
        </div>
    </div>;

const DayContainer = styled(Day)`
    width: 100%;
    padding: 0;
    margin: 0;
`;

const daysFromToday = (day) => {
    const today = new Date();
    return new Date(today.setDate(today.getDate()+day));
}

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
                <Things 
                    things={things}
                    home={home}
                />
            </ColumnContainer>

            <ColumnContainer
                row={0}
                column={1}
            >
            <Stream>
            {
                [...Array(days).keys()]
                    .map(daysFromToday)
                    .map(date => 
                        <DayContainer 
                            date={date}     
                            team={team}
                            key={uuid4()}
                        >
                            <Locations 
                                team={team} 
                                home={home}
                                locations={locations}
                            />
                        </DayContainer>
                    )
            }
            </Stream>
            </ColumnContainer>
        </Application>
    );
};

