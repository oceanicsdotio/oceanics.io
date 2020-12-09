import React, {useReducer, useState} from "react";
import styled from "styled-components";
import Roster from "./Roster";
import Form from "./Form";
import {ghost} from "../palette";
import Tanks from "./Tanks";


/**
A thing is a physical entity in the SensorThings ontology. In 
this case, thing primarily means a mobile vehicle that may 
carry people, like a boat or truck. 

Hovering sets the expansion state.
*/
const Thing = ({
    spec: {
        name,
        properties = null
    },
    className, 
    team=[],
}) => {
   
    const [hidden, toggleHidden] = useReducer((prev, state)=>{
        return state === undefined ? !prev : state;
    }, true);

    const [info] = useState(
        Object.fromEntries(
            ["home", "capacity", "tanks"].map(key => [
                key, 
                key in (properties || {}) ? properties[key] : null
            ])
        )
    );

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
            <div>
                {hidden || !info.home ? 
                    null : 
                    `Home: ${info.home}`}
            </div>
            <Roster
                team={team}
                hidden={hidden}
                capacity={info.capacity}
            />
            {(hidden || !info.tanks) ? 
                null : 
                <Tanks tanks={info.tanks}/>
            }
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