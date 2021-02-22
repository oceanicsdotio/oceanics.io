import React from "react";
import styled from "styled-components";

import Tags from "./Tags";
import {grey} from "../palette";

/**
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
const TileInformation = ({
    tile: {
        name,
        description,
        group=[], 
        publicURL
    }, 
    className
}) =>
    <div className={className}>
        <h3>
            <a id={name.toLowerCase().split(" ").join("-")}/>
            {name}
        </h3>
        <img src={publicURL}/>
        <p>{description}</p>
        {group.length ? <>{"Becomes: "}<Tags group={group}/></> : null}
    </div>;

/**
 * Styled version of the basic TileInfo that makes the 
 * rendering context use crisp edges and a fixed size icon
 */
const StyledTileInformation = styled(TileInformation)`

    border-bottom: 0.1rem solid ${grey};

    & > * {
        font-size: inherit;
        font-family: inherit;
    }

    & > img {
        position: relative;
        image-rendering: crisp-edges;
        width: 6rem;
        height: 6rem;
    }  
`;

export default StyledTileInformation;