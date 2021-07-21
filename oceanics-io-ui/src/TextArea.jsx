import React from "react";
import styled from "styled-components";
import {ghost} from "./palette"



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

export default StyledTextArea