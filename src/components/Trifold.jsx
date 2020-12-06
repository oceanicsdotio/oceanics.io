import React from "react";
import styled from "styled-components";
import {pink} from "../palette";



export const Trifold = ({display, onClick, className}) =>
    <svg 
        className={className}
        display={display}
        viewBox={"0 0 300 300"}
        onClick={onClick}
    >
        <g>    
            <polygon 
                stroke={pink}
                fill={"none"}
                strokeWidth={15}
                strokeLinejoin={"bevel"}
                points="200,300 200,100 75,50 75,250"
            />

            <polygon 
                stroke={pink} 
                fill={"none"}
                strokeWidth={15}
                strokeLinejoin={"bevel"}
                points="300,50 175,0 175,50"
            />

            <polygon 
                stroke={pink} 
                fill={"none"}
                strokeWidth={15}
                strokeLinejoin={"bevel"}
                points="200,100 200,250 300,250 300,50 75,50"
            />
        </g>
    </svg>;


const StyledTrifold = styled(Trifold)`
    display: ${({display})=>display};
    width: 2rem;
    height: 2rem; 
    position: absolute;
    cursor: pointer;
    padding: 0.2rem;
    margin: 0.3rem;
    top: 0;
    right: 0;
`;

export default StyledTrifold;