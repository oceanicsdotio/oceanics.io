import React, { useRef } from "react";
import styled from "styled-components";
import useDataStream from "../hooks/useDataStream";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: 100%;
    height: 100px;
    cursor: none;
`;

export default () => {
    /*
    Time series data
    */
    const ref = useRef(null);
    const {dataStream} = useDataStream({ref});

    return <StyledCanvas ref={ref} />;
};