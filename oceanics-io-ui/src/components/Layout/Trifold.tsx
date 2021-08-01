/**
 * React and friends
 */
import React, { MouseEventHandler } from "react";

/**
 * Component level styling
 */
import styled from "styled-components"

/**
 * Compile time type checking
 */
type TrifoldType = {
    display: string,
    onClick: MouseEventHandler,
    className: string,
    stroke: string,
    fill: string,
    strokeWidth: number,
    strokeLinejoin: "bevel" | "miter" | "round" | "inherit",
}

/**
 * Vector graphic icon for toggle between folded/unfolded view.
 * 
 * 
 * @param {*} param0 
 * @returns 
 */
export const Trifold = ({
    display, 
    onClick, 
    className,
    stroke,
    fill = "none",
    strokeWidth = 15,
    strokeLinejoin = "bevel"
}: TrifoldType) => {

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

/**
 * For display inline with text/heading
 */
export const InlineTrifold = styled(Trifold)`
    width: 2rem;
    height: 2rem; 
    cursor: pointer;
    margin: 0;
`;

/**
 * Export styled fixed sized version
 */
export default StyledTrifold;