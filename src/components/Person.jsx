import React, {useState} from "react";
import styled from "styled-components";

const StyledPerson = styled.div`
    display: inline-block;
    padding: 5px;
    margin: 5px;
    border: 2px solid;
    border-radius: 3px;
    border-color: ${({available}) => available ? '#444444': '#44BA66'};
    background: ${({available}) => available ? '#44BA66' : '#444444'};
    color: ${({available}) => available ? '#444444': '#44BA66'};
`;


export default ({name}) => {
    /*
    Originally used in the scheduling mini-app to indicate the availability
    of a person or agent for a scheduled task
    */

    const [available, setAvailable] =  useState(true);

    return <StyledPerson 
        available={available}
        onClick={()=>{
            setAvailable(!available);
        }}>
        {`${name}`}
    </StyledPerson>
};