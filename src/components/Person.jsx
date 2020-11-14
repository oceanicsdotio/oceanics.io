import React, { useReducer } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { grey, green } from "../palette";
import { v4 as uuid4 } from "uuid";

/**
Selectable person token
 */
export const StyledPerson = styled.div`
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

StyledPerson.propTypes = {
    available: PropTypes.bool.isRequired
}


/**
Used in scheduling and vessel mini-apps to indicate the 
availability of a person or agent for a scheduled task.

Style toggles with state. Cursor will not recognize as text.
*/
const Person = ({
    name
}) => {
    
    const key = uuid4();
    const [available, toggleAvailability] =  useReducer((previous)=>{
        return !previous;
    }, true);

    return <StyledPerson {...{
        id: key,
        key,
        available, 
        onClick: toggleAvailability,
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
    </StyledPerson>
};

Person.propTypes = {
    /**
    Name that will be abbreviated
     */
    name: PropTypes.string.isRequired
}

export default Person;