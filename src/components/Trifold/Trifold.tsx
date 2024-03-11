import React, { MouseEventHandler } from "react";
import styled from "styled-components"

export type TrifoldType = {
    /**
     * Use as a button
     */
    onClick: MouseEventHandler,
    /**
     * Styling hook
     */
    className?: string,
    /**
     * String color, valid CSS
     */
    stroke: string,
    strokeWidth?: number,
    strokeLinejoin?: "bevel" | "miter" | "round" | "inherit",
}

/**
 * Vector graphic icon for toggle between folded/unfolded view.
 */
export const Trifold = ({ 
    onClick, 
    className,
    stroke,
    strokeWidth = 15,
    strokeLinejoin = "bevel"
}: TrifoldType) => {

    const presentation = {
        stroke,
        fill: "none",
        strokeWidth,
        strokeLinejoin
    }

    return <svg 
        className={className}
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

Trifold.displayName = "Trifold";
export default StyledTrifold;