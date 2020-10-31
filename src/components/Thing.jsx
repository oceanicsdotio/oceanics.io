import React, {useReducer} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import {grey, green} from "../palette";

const Thing = ({
    name,
    home,
    className="Thing", 
    team=null
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
            <Roster
                team={team}
                hidden={hidden}
            />
            <div>{hidden ? null : "rebase | route"}</div>
            <div>{`Home: ${home}`}</div>
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
    color: ${({active}) => active ? grey : green};
    border-color: ${({active}) => active ? grey : green};
`;