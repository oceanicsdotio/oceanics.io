import React, { useRef } from "react";
import styled from "styled-components";
import useTriangularMesh from "../hooks/useTriangularMesh";

export const StyledCanvas = styled.canvas`
    position: relative;
    width: ${({style:{width}})=>width};
    height: ${({style:{height}})=>height};
    cursor: none;
`;


/**
Draw a square tessellated by triangles using the 2D context
of an HTML canvas. This is accomplished primarily in WASM,
called from the React Hook loop. 
*/
export default ({
    width="100%",
    height="400px",
}) => {
   
    const ref = useRef(null);
    useTriangularMesh({ref});
    return <StyledCanvas ref={ref} style={{width, height}}/>;
};