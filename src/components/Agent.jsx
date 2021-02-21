import React from "react";
import styled from "styled-components";
import { grey, orange } from "../palette";
import { v4 as uuid4 } from "uuid";

/**
Used in scheduling and vessel mini-apps to indicate the 
availability of a person or agent for a scheduled task.

Style toggles with state. Cursor will not recognize as text.
*/
const Agent = ({
    name,
    className,
}) => {
    
    const key = uuid4();
   
    return <div {...{
        id: key,
        key,
        className,
        draggable: true,
        onDragStart: (event) => {
            event.dataTransfer.setData("text/plain", event.target.id);
            event.dataTransfer.dropEffect = "move";
        }
    }}>
        {name.split(" ")
            .map((word) => {return word ? word[0] : ""})
            .join("")
        }
    </div>
};

/**
Selectable person token
 */
export const StyledAgent = styled(Agent)`

    display: inline-block;
    padding: 0.5rem;
    margin: 0.2rem;
    border: 0.2rem solid;
    border-radius: 50%;
    background: none;
    color: ${orange};
    cursor: pointer;
    font-family: inherit;
    font-size: larger;

    &:hover {
        border-color: ${orange};
        background: ${orange};
        color: ${grey};
    }
`;


export default StyledAgent;