import React from "react";
import styled from "styled-components";
import PropTypes from "prop-types";

/**
 * Compile-time type checking
 */
export type TileType = {
    /**
     * Description goes here TypeScript
     */
    tile: {
        publicURL: string, 
        anchorHash: string,
        queryString: string,
        grayscale: boolean
    }, 
    className?: string,
    query: object
}
const propTypes = {
    tile: PropTypes.shape({
        publicURL: PropTypes.string.isRequired, 
        anchorHash: PropTypes.string.isRequired,
        queryString: PropTypes.string.isRequired,
        grayscale: PropTypes.bool.isRequired
    }).isRequired, 
    className: PropTypes.string,
    query: PropTypes.object.isRequired
}

/**
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
export const TileInformation = ({
    tile: {
        publicURL, 
        anchorHash,
    }, 
    className,
}: TileType) => {
    return (
        <div className={className}>
            <a id={anchorHash}/>
            <img src={publicURL}/>
        </div>
    )
};

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

TileInformation.displayName = "TileInformation";
StyledTileInformation.propTypes = propTypes;
TileInformation.propTypes = propTypes;
export default StyledTileInformation;
