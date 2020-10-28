import React, {useReducer} from "react";
import styled from "styled-components";
import {grey, green} from "../palette";

const StyledPerson = styled.div`
    display: inline-block;
    padding: 5px;
    margin: 5px;
    border: 2px solid;
    border-radius: 3px;
    border-color: ${({available}) => available ? grey : green};
    background: ${({available}) => available ? green : grey};
    color: ${({available}) => available ? grey: green};
    cursor: default;
`;

export default ({name}) => {
    /*
    Used in scheduling and vessel mini-apps to indicate the 
    availability of a person or agent for a scheduled task
    */

    const [available, toggleAvailability] =  useReducer((previous)=>{
        return !previous;
    }, true);

    return <StyledPerson 
        available={available}
        onClick={toggleAvailability}>
        {name}
    </StyledPerson>
};