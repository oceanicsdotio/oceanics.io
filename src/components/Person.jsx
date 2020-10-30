import React, {useReducer} from "react";
import styled from "styled-components";
import {grey, green} from "../palette";
import { v4 as uuid4 } from "uuid";

const StyledPerson = styled.div`
    display: inline-block;
    padding: 5px;
    margin: 2px;
    border: 2px solid;
    border-radius: 50%;
    border-color: ${({available}) => available ? grey : green};
    background: ${({available}) => available ? green : grey};
    color: ${({available}) => available ? grey: green};
    cursor: default;
`;

export default ({name}) => {
    /*
    Used in scheduling and vessel mini-apps to indicate the 
    availability of a person or agent for a scheduled task.

    Style toggles with state. Cursor will not recognize as text.
    */
    const [available, toggleAvailability] =  useReducer((previous)=>{
        return !previous;
    }, true);

    return (
        <StyledPerson {...{
            id: uuid4(),
            available, 
            onClick: toggleAvailability,
            draggable: true,
            onDragStart: (event) => {
                toggleAvailability();
                event.dataTransfer.setData("text/plain", event.target.id);
                event.dataTransfer.dropEffect = "move";
                
            }
        }}>
            {name}
        </StyledPerson>
    )
};