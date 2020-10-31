import React, {useState, useReducer} from "react";
import styled from "styled-components";

import Person from "../components/Person";
import {grey, green, ghost} from "../palette";
import {TileSet} from "./Oceanside";
import {Vessel} from "./Vessel";

import { v4 as uuid4 } from "uuid";


const dateFormat = { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
};

const defaultThings = {
    "R/V Lloigor": {
        icon: TileSet["boat"]
    },
    "Sealab": {
        icon: TileSet["laboratory"],
        home: "Farm"
    }
};

const defaultTeam = [
    "AB",
    "CD",
    "EF",
    "GH",
]

const thingLocations = {
    "Wharf": {
        things: defaultThings,
        icon: TileSet["wharf"],
        home: true
    }, 
    "Farm": {
        things: {},
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
    padding: 0;
    margin: 0;
`;

const StyledInput = styled.input`
    background: none;
    border: none;
    display: inline;
    text-decoration: ${({complete}) => complete ? "line-through" : null};
    color: ${({emphasize}) => emphasize ? "orange" : "inherit"};
`;

const CheckBox = styled.input`
    display: inline;
`;

const Expand = styled.div`
    font-size: larger;
    cursor: default;
    display: inline;
`;

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

const StyledTextArea = styled.div`
    background: none;
    border: none;
    position: relative;
    display: block;
    color: ${green};
    margin: 0;
    word-wrap: break-word;
    word-break: break-all;
    padding: 5px;
`;

const StyledLabel = styled.h3`
    display: block;
`;

const DropTarget = styled.div`
    width: auto;
    min-height: ${({hidden}) => hidden ? "0px" : "25px"};
    border: 2px dashed ${ghost};
    border-radius: 3px;
    margin: 3px;
    padding: 2px;
    visibility: ${({hidden}) => hidden ? "hidden": null};
`;

const StyledLocation = styled.div`
    display: block;
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

    Status is used to de-emphasize component in CSS. 
    */

    const [complete, toggleComplete] = useReducer(
        (prev)=>{return !prev},false
    );

    const [emphasize, toggleEmphasize] = useReducer(
        (prev)=>{return !prev},false
    );

    const [textContent, setTextContent] = useState(task);

    const onBlurHandler = (event) => {
        setTextContent(event.target.value);
    };
 
    return (
        <div>
        <CheckBox 
            onClick={toggleComplete} 
            type={"checkbox"}
            emphasize={emphasize}
        />
        <StyledInput 
            type={"text"} 
            defaultValue={textContent}
            complete={complete}
            emphasize={emphasize}
            onBlur={onBlurHandler}
            onClick={toggleEmphasize}
        />
        </div>
    )
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
        <StyledTextArea 
            contentEditable={true}
            suppressContentEditableWarning={true}
        >
            {placeholder}
        </StyledTextArea>
        </>
    )
};

const Roster = ({team, hidden=false}) => {
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
        setCrew([...crew]);
    }

    return (<DropTarget
        hidden={hidden}
        onDragOver={moveIndicator}
        onDrop={allocateCrew}
    >
        {   
            crew.length ? 
            crew.map((name, jj) => 
                <Person name={name} key={`${name}-${jj}`}/>) : 
            null
        }
    </DropTarget>)
}

const Thing = ({className, name, team, statusComponent=null, home=null}) => {
    /*
    A thing is a physical entity in the SensorThings ontology. In 
    this case, thing primarily means a mobile vehicle that may 
    carry people, like a boat or truck. 
    */

    const [expand, toggleExpand] = useReducer((prev, state)=>{
        return state === undefined ? !prev : state;
    }, false)

    const defaultHome = Object.entries(thingLocations).filter(([k,v])=>v.home).pop()[0];

    return (
        <div 
            className={className} 
            key={name}
            onMouseOver={() => toggleExpand(true)}
            onDragOver={() => toggleExpand(true)}
            onDragLeave={() => toggleExpand(false)}
            onMouseLeave={() => toggleExpand(false)}
        >
            {name}
            
            
            {statusComponent ? statusComponent : null}
            <Roster
                team={team}
                hidden={!expand}
            />
            {expand ? "rebase | route" : null}
            <br/>
            {`Home: ${home || defaultHome}`}
            <br/>
        </div>
    )
}

const StyledThing = styled(Thing)`
    display: block;
    border-radius: 5px;
    border: 3px solid;
    padding: 3px;
    margin: 3px;
    color: ${({active}) => active ? grey : green};
    border-color: ${({active}) => active ? grey : green};
`;

const Things = ({things}) => {
    return Object.entries(things).map(([name, team], ii) => 
        <StyledThing {...{
            name, 
            team, 
            key: ii,
            statusComponent: Vessel,
            id: uuid4(),
            draggable: true,
            onDragStart: (event) => {
                event.dataTransfer.setData("text/plain", event.target.id);
                event.dataTransfer.dropEffect = "move";
                
            }}}
        />
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
            <Roster team={team}/>
            <Things things={things}/>
            <TaskList tasks={["do a thing", "fix me", "harvest"]} />
            <Note />
        </StyledLocation>
    )
};


const Locations = ({
    team=null
}) => {
    /*
    The locations component displays an array of locations as 
    containers for the Things and People currently there, or 
    with tasks that take them there on the given day.
    */
    return (
        <>
        {Object.entries(thingLocations)
            .map(([name, props]) => 
                <Location 
                    name={name}
                    key={name}
                    {...props}
                    team={
                        props.home && team ? 
                        [...(props.team || []), ...team]: 
                        []
                    }
                />
            )}
        </>
    )
}

const Day = ({
    date, 
    team = [],
    format=dateFormat
}) => {

    return (
        <>
        <h2>
            {date.toLocaleDateString(undefined, format)}
        </h2>
        <DayContainer>
            <Locations team={team}/>
        </DayContainer>
        </>
    )
};

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
            <Things things={defaultThings}/>
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
                        return <Day date={date} team={team}/>
                    })
            }
            </Stream>
            </ColumnContainer>
        </Application>
    );
};

