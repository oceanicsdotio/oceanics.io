import React, {useState} from "react";
import styled from "styled-components";

import Person from "../components/Person";
import {grey, green} from "../palette";

const thingLocations = {
    "Wharf": {"R/V Lloigor": []}, 
    "Farm": {}
};

const DayContainer = styled.div`
    width: auto;
    min-height: 150px;
    border: 3px solid black;
    border-radius: 5px;
    padding: 10px;
    margin: 10px;
`;

const StyledInput = styled.input`
    background: none;
    border: none;
    max-width: 100px;
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
    width: auto;
    margin: 10px;
`;

const StyledLabel = styled.div`
    display: block;
`;

const StyledThing = styled.div`
    display: inline-block;
    border-radius: 5px;
    border: 3px solid;
    padding: 10px;
    margin: 5px;
    background: ${({active=false}) => active ? green : grey};
    color: ${({active=false}) => active ? grey : green};
    border-color: ${({active=false}) => active ? grey : green};
`;

const StyledLocation = styled.div`
    display: inline-block;
    border-radius: 5px;
    border: 2px black solid;
    padding: 5px;
    margin: 5px;
    height: auto;
    position: relative;
    background: ${({active}) => active ? 'none' : grey};
`;

const Task = ({task}) => {
    /*
    Right now tasks are simply editable text fields. They
    do not have logical concepts for due date, assignment,
    or relations with other data. 
    */
    return (
        <li key={task}>
            <StyledInput type={"text"} defaultValue={task} />
        </li>
    )
};

const TaskList = ({
    heading="Tasks ⊕",
    tasks=null,
}) => {
    /*
    The tasklist component is an editable list of tasks currently
    associated with a date and location. 
    */

    return (
        <>
        <StyledLabel>{heading}</StyledLabel>
        <ul>
            {(tasks || []).map(task => <Task {...{task}}/>)}
        </ul>
        
        </>)
};

const Note = ({
    heading="Notes",
    placeholder="Add notes..."
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
            <Expand 
                onClick={()=>{console.log("yo")}}>
                {"⊕"}
            </Expand>
        </StyledLabel>
        <StyledTextArea {...{type: "textarea", placeholder}}/>
        </>
    )
};

const Roster = ({people}) => {
    /*
    The roster component is an interactive list of the people
    currently assigned to a location, or to a thing, which
    might move between locations. 
    */
    return (<div>
        {people.length ? people.map((name, jj) => <Person name={name} key={jj}/>) : null}
    </div>)
}

const Thing = ({thing, people}) => {
    /*
    A thing is a physical entity in the SensorThings ontology. In 
    this case, thing primarily means a mobile vehicle that may 
    carry people, like a boat or truck. 
    */
    return (
        <StyledThing key={thing}>
            {thing}
            <Roster {...{people}}/>
        </StyledThing>
    )
}

const Things = ({
    heading="Things",
    things
}) => {
    return (
        <>
        <StyledLabel>{heading}</StyledLabel>
        {
            Object.entries(things).map(([thing, people]) => 
                <Thing {...{thing, people}}/>
            )
        }
        </>
    )
}

const Location = ({name, things}) => {
    return (
        <StyledLocation active={!!Object.keys(things).length}>
            <StyledLabel>{name}</StyledLabel>
            <hr/>
            <Things {...{things}}/>
            <hr/>
            <TaskList tasks={["do a thing", "fix me", "harvest"]}/>
            <Note/>
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
        <StyledLabel>{heading}</StyledLabel>
        {
            Object.entries(thingLocations)
                .map(([name, things]) => 
                    <Location {...{name, things, key: name}}/>
                )
        }
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
    ]
}) => {

    const dateFormat = { weekday: 'long', month: 'short', day: 'numeric' };

    return (
        <DayContainer>
            <StyledLabel key={"date"}>{date.toLocaleDateString(undefined, dateFormat)}</StyledLabel>
            <div>
            <StyledLabel key={"team"}>Team</StyledLabel>
            {team.map((name, ii) => <Person name={name} key={`${name}-${ii}`}/>)}
            </div>
            <div>
                <Locations />
            </div>
            
        </DayContainer>
    )
};

export default ({
    heading="Schedule",
    days=7
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
        <div>
            <h1>{heading}</h1>
            {
                [...Array(days).keys()]
                    .map(offset => {
                        const today = new Date();
                        const date = new Date(today.setDate(today.getDate()+offset));

                        return <Day date={date}/>
                    })
            }
        </div>
    );
};

