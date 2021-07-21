import React from "react";
import styled from "styled-components";

import {navigateWithQuery} from "../hooks/useQueryString";


/**
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
 const TileInformation = ({
    tile: {
        publicURL, 
        anchorHash,
        queryString
    }, 
    className,
    search
}) =>{

    return <div className={className}>
        <a id={anchorHash}/>
        <img 
            src={publicURL}
            onClick={() => {navigateWithQuery(`/app`, search, {agent: queryString})}}
        />
    </div>
};


/**
 * Styled version of the basic TileInfo that makes the 
 * rendering context use crisp edges and a fixed size icon
 */
const StyledTileInformation = styled(TileInformation)`

    padding: 0 32px 0 8px;
    
    & img {
        image-rendering: crisp-edges;
        width: 96px;
        filter: grayscale(${({tile: {grayscale}})=>!!grayscale*100}%);
        cursor: pointer;
    }
`;


export default StyledTileInformation;