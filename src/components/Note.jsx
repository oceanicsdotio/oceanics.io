import React from "react";
import styled from "styled-components";
import { ghost } from "../palette";

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
 * A note is just a free form text area that can be changed by users
 * to collaborativle update information that does not cleanly fit
 * into the schema as it currently exists.
 */
export default ({
    heading="Notes",
    placeholder="..."
}) => 
    <>
        <h3>
            {heading}
        </h3>
        <StyledTextArea 
            contentEditable={true}
            suppressContentEditableWarning={true}
        >
            {placeholder}
        </StyledTextArea>
    </>;
    