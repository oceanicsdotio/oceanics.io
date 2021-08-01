/**
 * React and friends.
 */
import React, { MouseEventHandler, useMemo } from "react";

/**
 * Runtime input type checking
 */
import PropTypes from "prop-types";

/**
 * Component-level styling.
 */
import styled from "styled-components";

/**
 * Predefined colors.
 */
import { ghost, orange, grey } from "../../palette";


/**
 * Emoji button, cuz it unicode baby. 
 */
const Emoji = styled.a`
    margin: 5px;
    padding: 2px;
    border-radius:50%;
    background-color: ${grey};
    cursor: pointer;
    border: 1px dashed ${ghost};
    text-decoration: none !important;
`;

export type LayerType = {
    id: string,
    url: string,
    type: string,
    className: string,
    component: string,
    maxzoom: number,
    minzoom: number,
    zoomLevel: number,
    attribution: string,
    info: string | null,
    onClick: MouseEventHandler
}
 
/**
 * This is the per item element for layers
 * @param {*} param0 
 * @returns 
 */
export const LayerCard = ({
    id,
    url,
    type,
    className,
    component="default",
    maxzoom=21,
    minzoom=1,
    attribution="Oceanics.io",
    info=null,
    onClick,
}: LayerType) => {

    return <div className={className}>
        <div>
            <h2>{id.replace(/-/g, ' ')}</h2>
            <a href={info||""}>{attribution}</a>
        </div>
        <p>{`${type} with <${component}/> popup`}</p>
        <div className={"zoom"}>{`zoom: ${minzoom}-${maxzoom}`}</div>
        <div>
            {onClick && <Emoji onClick={onClick}>{"🏝️"}</Emoji>}
            {url && <Emoji href={url}>{"💻"}</Emoji>}
        </div>  
    </div>
}


/**
 * Styled Version
 */
const StyledLayerCard = styled(LayerCard)`

    margin-top: 10px;
    border-top: 1px dashed ${ghost};

    & > #zoom {
        height: auto;
        border: 1px solid;
        margin-bottom: 15px;
        margin-left: ${({minzoom})=>(minzoom-1)/22*100}%;
        margin-right: ${({maxzoom})=>(22-maxzoom)/22*100}%;
        color: ${({ minzoom, maxzoom, zoomLevel}) => (zoomLevel === null || (zoomLevel >= minzoom) && (zoomLevel <= maxzoom)) ? orange : grey};
    }

    & p {
        color: ${grey};
        margin: 0;
        font-size: larger;
    }

    & a {
        color: ${orange};
        cursor: pointer;
        font-family: inherit;
        display: inline-block;
        text-decoration: none;  
        text-decoration: underline dashed; 
    }

    & h2 {
        text-transform: capitalize;
        display: inline;
        font-size: larger;
        font-family: inherit;
        width: fit-content;
        padding: 0;
        margin-right: 10px;
    }
`;

/**
 * Default export is the styled version
 */
export default StyledLayerCard;
