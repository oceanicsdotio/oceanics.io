import React, { useState } from "react";
import styled from "styled-components";

const StyledCanvas = styled.canvas`
    border-radius: 3px;
    border: 1px solid #FF00FF;
    position: relative;
    width: 100%;
`;

export default () => {

    let radius = 0;
    const [state, setState] = useState(null);

    return (
        <StyledCanvas></StyledCanvas>
    );
};