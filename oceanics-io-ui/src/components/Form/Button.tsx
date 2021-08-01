/**
 * React and friends
 */
import React from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Color palette
 */
import {orange, grey, charcoal} from "../../palette";

/**
 * Form input component
 */
import {Input} from "./Input";

/**
 * Styled component
 */
const ButtonWrapper = styled(Input)`
    background-color: ${charcoal};
    
    color: ${orange};

    border: 1px dashed ${grey};
    /* border: none; */

    border-radius: 5px;
    padding: 5px;
    margin: 0;
    margin-bottom: 0.5rem;

    display: block;
    font-family: inherit;
    font-size: inherit;
    width: 100%;
    
    box-sizing: border-box;

    cursor: ${({type}) => type === "button" ? "pointer" : null};
    
    -webkit-appearance: none;  /*Removes default chrome and safari style*/
    -moz-appearance: none;  /*Removes default style Firefox*/

    ::after {
        content: ${({required})=>required?"'(!)'":null};
        color: orange;
        font-size: smaller;
    }

    & > * {
        padding: 0;
        margin: 0;
        max-width: 100%;
    } 
`;

/**
 * Export styled as default
 */
export default ButtonWrapper