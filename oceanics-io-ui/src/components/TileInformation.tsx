/**
 * React and friends
 */
import React from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Runtime type checking
 */
import PropTypes from "prop-types";

/**
 * Compile-time type checking
 */
type TileType = {
    tile: {
        publicURL: string, 
        anchorHash: string,
        queryString: string,
        grayscale: boolean
    }, 
    className: string,
    search: string
}

/**
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
export const TileInformation = ({
    tile: {
        publicURL, 
        anchorHash,
        //queryString
    }, 
    className,
    //search
}: TileType) => {
    return <div className={className}>
        <a id={anchorHash}/>
        <img 
            src={publicURL}
            //onClick={() => {navigateWithQuery(`/app`, search, {agent: queryString})}}
        />
    </div>
};

/**
 * Runtime input type checking
 */
TileInformation.propTypes = {
    tile: PropTypes.shape({
        publicURL: PropTypes.string.isRequired, 
        anchorHash: PropTypes.string.isRequired,
        queryString: PropTypes.string,
    }), 
    className: PropTypes.string,
    search: PropTypes.string
}


/**
 * Styled version of the basic TileInfo that makes the 
 * rendering context use crisp edges and a fixed size icon
 */
export const StyledTileInformation = styled(TileInformation)`

    padding: 0 32px 0 8px;
    
    & img {
        image-rendering: crisp-edges;
        width: 96px;
        filter: grayscale(${({tile: {grayscale}})=>Number(!!grayscale)*100}%);
        cursor: pointer;
    }
`;

/**
 * Default export is the styled version
 */
export default StyledTileInformation;