import React from "react";
import styled from "styled-components";
import {ghost, orange, pink, grey, charcoal} from "../../palette";


/**
 * FormField is the container for a form input
 * and its metadata.
 */
const FormField = styled.div`

    margin-bottom: 1rem;  
    box-sizing: border-box;

    & > div {
        color: ${ghost};
        font-size: smaller;
        font-style: italic;
    }  

    & > select {
        -moz-appearance: none;
        -webkit-appearance: none;
        appearance: none;
        border: 1px dashed ${grey};
        background-color: ${charcoal};

        & > option {
            font-size: inherit;
            font-family: inherit;
            color: ${pink};
        }

        &:focus {
            border-color: ${orange};
            box-shadow: none;
            color: ${orange}; 
            outline: none;
        }

        &::-ms-expand {
            display: none;
        }
    }
`;
