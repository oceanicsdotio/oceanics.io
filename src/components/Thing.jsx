import React, {useReducer} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import Form from "./Form";
import {ghost, grey, blue} from "../palette";
import Tanks from "./Tanks";


/**
A thing is a physical entity in the SensorThings ontology. In 
this case, thing primarily means a mobile vehicle that may 
carry people, like a boat or truck. 

Hovering sets the expansion state.
*/
const Thing = ({
    name,
    home,
    tanks=null,
    className, 
    team=[],
    capacity
}) => {
   
    const [hidden, toggleHidden] = useReducer((prev, state)=>{
        return state === undefined ? !prev : state;
    }, true);

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
            {(hidden && tanks) ? null : <Tanks tanks={tanks}/>}
            <div>{hidden ? null : 
                <Form actions={[
                    {value: "Delegate"}
                ]}/>
            }</div>
        </div>
    )
}


/**
 * Styled version of the Thing Component
 */
export const StyledThing = styled(Thing)`
    display: block;
    border-bottom: 0.07rem solid ${ghost};
    padding: 0.5rem;
    margin: 0;
    color: ${ghost};
    box-sizing: border-box;

`;

export default StyledThing;