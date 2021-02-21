import React from "react";
import styled from "styled-components";


export const Trifold = ({
    display, 
    onClick, 
    className,
    stroke,
    strokeWidth=15,
    strokeLinejoin="bevel",
    fill="none"
}) => {

    const presentation = {
        stroke,
        fill,
        strokeWidth,
        strokeLinejoin
    }

    return <svg 
        className={className}
        display={display}
        viewBox={"0 0 225 300"}
        onClick={onClick}
    >
        <g>    
            <polygon {...{
                ...presentation,
                points: "125,300 125,100 0,50 0,250"
            }}/>

            <polygon {...{
                ...presentation,
                points: "225,50 100,0 100,50"
            }}/>

            <polygon {...{
                ...presentation,
                points: "125,100 125,250 225,250 225,50 0,50"
            }}/>
        </g>
    </svg>
    };


const StyledTrifold = styled(Trifold)`
    display: ${({display})=>display};
    width: 2rem;
    height: 2rem; 
    cursor: pointer;
    margin: 1rem;
    top: 0;
    right: 0;
    z-index: 10;
`;

export default StyledTrifold;