import React from "react";
import styled from "styled-components";



export default styled.div`

    background: #101010FF;
    font-family: inherit;
    font-size: larger;
    height: fit-content;
    width: fit-content;
    margin: 0;
    padding: 0;
    overflow: hidden;

    & > canvas {
        width: 200px;
        height: 75px;
        display: block;
        border-bottom: 1px solid ${({fg="#ccc"})=>fg};
        image-rendering: crisp-edges;
    }

    & > div {
        overflow-y: scroll;
        max-height: 300px;
        height: fit-content;
        padding: 0.5rem;

        & > ul {
            padding: 0;

            & > li {
                color: #CCCCCCFF;
                margin: 0;
                padding: 0;
                display: block;
            }
        }
    }
`;

