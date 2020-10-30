import React, {useState} from "react";
import styled from "styled-components";

import Person from "../components/Person";
import {grey, green, ghost} from "../palette";
import {TileSet} from "./Oceanside";


const dateFormat = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
};

const thingLocations = {
    "Wharf": {
        things: {
            "R/V Lloigor": {
                team: []
            }
        },
        team: [],
        icon: TileSet["wharf"],
        home: true
    }, 
    "Farm": {
        things: {},
        team: [],
        icon: TileSet["mussels"]
    }
};

const Icon = styled.img`
    image-rendering: crisp-edges;
    display: inline-block;
    height: 24px;
`;

const DayContainer = styled.div`
    width: 100%;
    min-height: 150px;
    border: 2px solid ${ghost};
    border-radius: 5px;
    padding: 0;
    margin: 0;
    margin-bottom: 10px;
`;

const StyledInput = styled.input`
    background: none;
    border: none;
    max-width: 100px;
    display: block;
`;

const Expand = styled.div`
    font-size: larger;
    cursor: default;
    display: inline;
`;

const StyledTextArea = styled.input`
    background: none;
    border: none;
    display: block;
    color: ${green};
    width: 100%;
    margin: 10px;
`;

const StyledLabel = styled.div`
    display: block;
    font-size: x-large;
    margin-top: 10px;
`;

const DropTarget = styled.div`
    width: auto;
    min-height: 25px;
    border: 2px dashed ${ghost};
    border-radius: 3px;
    margin: 3px;
    padding: 2px;
`;

const StyledThing = styled.div`
    display: inline-block;
    border-radius: 5px;
    border: 3px solid;
    padding: 3px;
    margin: 5px;
    background: ${({active=false}) => active ? green : grey};
    color: ${({active=false}) => active ? grey : green};
    border-color: ${({active=false}) => active ? grey : green};
`;

const StyledLocation = styled.div`
    display: block;
    border: 2px solid;
    border-color: ${({active}) => active ? green : grey};
    margin: 0;
    height: auto;
    position: relative;
    background: ${({active}) => active ? grey : "black"};
`;

const Task = ({task}) => {
    /*
    Right now tasks are simply editable text fields. They
    do not have logical concepts for due date, assignment,
    or relations with other data. 
    */
    return <StyledInput type={"text"} defaultValue={task} />
};

const TaskList = ({
    heading="Tasks",
    tasks=null,
}) => {
    /*
    The tasklist component is an editable list of tasks currently
    associated with a date and location. 
    */

    return (
        <>
        <StyledLabel>
            {tasks ? heading : "New task"}
            <Expand 
            onClick={()=>{console.log("yo")}}>
            {" ⊕"}
        </Expand>
        </StyledLabel>
        {(tasks || []).map(task => <Task {...{task, key: task}}/>)}
        </>)
};

const Note = ({
    heading="Notes",
    placeholder="..."
}) => {
    /*
    A note is just a free form text area that can be changed by users
    to collaborativle update information that does not cleanly fit
    into the schema as it currently exists.
    */

    const [visible, setVisibility] =  useState(false);

    return (
        <>
        <StyledLabel>
            {heading}
        </StyledLabel>
        <StyledTextArea {...{type: "textarea", placeholder}}/>
        </>
    )
};

const Roster = ({team}) => {
    /*
    The roster component is an interactive list of the people
    currently assigned to a location, or to a thing, which
    might move between locations. 
    */

    const [crew, setCrew] = useState(team);

    const moveIndicator = (event) => {
        /*
        Makes the mouse icon change to drag version
        while dragging.
        */
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    const allocateCrew = (event) => {
        /*
        Get the drag event data, and use the element handle
        to move/copy the content to the drop target.
        */
        event.preventDefault();
        const data = event.dataTransfer.getData("text/plain");
        const elem = document.getElementById(data);
        event.target.appendChild(elem);
        setCrew([...crew, "Clone"]);
    }

    return (<DropTarget
        onDragOver={moveIndicator}
        onDrop={allocateCrew}
    >
        {   
            crew.length ? 
            crew.map((name, jj) => 
                <Person name={name} key={`${name}-${jj}`}/>) : 
            "No crew assigned"
        }
    </DropTarget>)
}

const Thing = ({thing, team, statusComponent=null}) => {
    /*
    A thing is a physical entity in the SensorThings ontology. In 
    this case, thing primarily means a mobile vehicle that may 
    carry people, like a boat or truck. 
    */
    return (
        <StyledThing key={thing}>
            {thing}
            {statusComponent ? statusComponent : null}
            <Roster {...{team}}/>
        </StyledThing>
    )
}


const Location = ({name, things, icon, team}) => {
    return (
        <StyledLocation 
            active={!!Object.keys(things).length}
        >
            <StyledLabel>
                {`${name} `}
                <Icon src={icon.data}/>
            </StyledLabel>
           
            {Object.entries(things).map(([thing, team], ii) => 
                <Thing {...{thing, team, key: ii}} />
            )}
            <Roster team={team}/>
            <TaskList tasks={["do a thing", "fix me", "harvest"]} />
            <Note />
        </StyledLocation>
    )
};


const Locations = ({
    heading="Locations"
}) => {
    /*
    The locations component displays an array of locations as 
    containers for the Things and People currently there, or 
    with tasks that take them there on the given day.
    */
    return (
        <>
        <StyledLabel>
            {heading}
            <Expand 
            onClick={()=>{console.log("yo")}}>
            {" ⊕"}
        </Expand>
        </StyledLabel>
       
        {Object.entries(thingLocations)
            .map(([name, props]) => 
                <Location {...{name, key: name, ...props}}/>
            )}
        </>
    )
}

const Day = ({
    date, 
    team = [
        "AB",
        "CD",
        "EF",
        "GH",
    ],
    format=dateFormat
}) => {

    return (
        <>
        <StyledLabel>
            {date.toLocaleDateString(undefined, format)}
        </StyledLabel>
        <DayContainer>
            <StyledLabel>{"Team"}</StyledLabel>
            <Roster team={team}/>
            <Locations />
        </DayContainer>
        </>
    )
};

export default ({
    days
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
        <>
        {
            [...Array(days).keys()]
                .map(offset => {
                    const today = new Date();
                    const date = new Date(today.setDate(today.getDate()+offset));

                    return <Day date={date}/>
                })
        }
        </>
    );
};

