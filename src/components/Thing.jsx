import React, {useReducer} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import {ghost} from "../palette";
import TankSystem from "./TankSystem";

import { v4 as uuid4 } from "uuid";


const Thing = ({
    name,
    home,
    tanks=null,
    className="Thing", 
    team=null,
    capacity
}) => {
    /*
    A thing is a physical entity in the SensorThings ontology. In 
    this case, thing primarily means a mobile vehicle that may 
    carry people, like a boat or truck. 
    */

    // set element expansion state
    const [hidden, toggleHidden] = useReducer((prev, state)=>{
        return state === undefined ? !prev : state;
    }, true)

    return (
        <div 
            className={className} 
            key={name}
            onMouseOver={() => toggleHidden(false)}
            onDragOver={() => toggleHidden(false)}
            onDragLeave={() => toggleHidden(true)}
            onMouseLeave={() => toggleHidden(true)}
        >
            {name}
            <div>{hidden ? null : `Home: ${home}`}</div>
            <Roster
                team={team}
                hidden={hidden}
                capacity={capacity}
            />
            {(hidden && tanks) ? null : <TankSystem tanks={tanks}/>}
            <div>{hidden ? null : `Actions: rebase | route`}</div>
        </div>
    )
}

export default Thing;

export const StyledThing = styled(Thing)`
    display: block;
    border-radius: 5px;
    border: 1px solid;
    padding: 3px;
    margin: 0;
    margin-bottom: 1%;
    color: ${ghost};
    border-color: ${ghost};
`;


export const Things = ({things, home}) => {
    
    return Object.entries(things).map(([name, props]) => {
        const key = uuid4();
        return <StyledThing {...{
            name, 
            home,
            key,
            id: key,
            ...props
        }}></StyledThing>
    })
};