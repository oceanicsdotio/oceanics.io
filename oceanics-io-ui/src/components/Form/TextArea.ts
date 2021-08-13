/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Color palette
 */
import {ghost} from "../../palette"


/**
 * Styled div, nothing special
 */
const StyledTextArea = styled.div`
    background: none;
    border: none;
    position: relative;
    display: block;
    color: ${ghost};
    margin: 0;
    word-wrap: break-word;
    word-break: break-all;
    padding: 0.5rem;
`;

/**
 * Default version is the styled component
 */
export default StyledTextArea