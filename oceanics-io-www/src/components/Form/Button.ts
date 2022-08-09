/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Color palette
 */
import {orange, grey, charcoal} from "../../palette";

/**
 * Styled component
 */
const ButtonWrapper = styled.button`
    background-color: ${charcoal};
    color: ${orange};
    border: 1px dashed ${grey};
    border-radius: 5px;
    padding: 5px;
    margin: 0;
    margin-bottom: 0.5rem;
    display: block;
    font-family: inherit;
    font-size: inherit;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    -webkit-appearance: none;  /*Removes default chrome and safari style*/
    -moz-appearance: none;  /*Removes default style Firefox*/
`;

/**
 * Export styled as default
 */
export default ButtonWrapper