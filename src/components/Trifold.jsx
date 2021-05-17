import React from "react";
import styled from "styled-components"


/**
 * Vectro graphic icon for toggle between folded/unfolded view.
 * 
 * 
 * @param {*} param0 
 * @returns 
 */
export const Trifold = ({
    display, 
    onClick, 
    className,
    stroke
}) => {

    const presentation = {
        stroke,
        fill: "none",
        strokeWidth: 15,
        strokeLinejoin: "bevel"
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


/**
 * Styled version of the trifold component.
 */
export const StyledTrifold = styled(Trifold)`
    width: 32px;
    height: 32px; 
    cursor: pointer;
    margin: 16px;
    top: 0;
    right: 0;
`;

export const InlineTrifold = styled(Trifold)`
    width: 2rem;
    height: 2rem; 
    cursor: pointer;
    margin: 0;
`;

export default StyledTrifold;