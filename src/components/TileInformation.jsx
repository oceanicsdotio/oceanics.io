import React from "react";
import styled from "styled-components";

import Tags from "./Tags";
import Form from "./Form";
import {grey, orange, pink, ghost} from "../palette";

import useImageNavBar from "../hooks/useImageNavBar";


import { useStaticQuery, graphql } from "gatsby";

const query = graphql`
    query {
        oceanside: allOceansideYaml(sort: {
            order: ASC,
            fields: [name]
        }) {
            tiles: nodes {
                name
                data
                description
                becomes
            }
        }
        icons: allFile(filter: { 
            sourceInstanceName: { eq: "assets" },
            extension: {in: ["gif"]}
        }) {
            icons: nodes {
                relativePath
                publicURL
            }
        }
    }`



/**
 * Art and information for single tile feature. 
 * This is used to render documentation for the game.
 */
const TileInformation = ({
    tile: {
        name,
        // description,
        // group=[], 
        publicURL
    }, 
    className
}) =>
    <div className={className}>
        <a id={name.toLowerCase().split(" ").join("-")}/>
        <img src={publicURL}/>
        {/* <p>{name}</p> */}
        {/* <p>{description}</p> */}
        {/* {group.length ? <>{"Becomes: "}<Tags group={group}/></> : null} */}
    </div>;

/**
 * Styled version of the basic TileInfo that makes the 
 * rendering context use crisp edges and a fixed size icon
 */
const StyledTileInformation = styled(TileInformation)`

    display: block;
    padding: px;
    width: auto;
    
    & p {
        font-size: inherit;
        font-family: inherit;
        margin: 0;
        padding: 0;
    }

    & img {
        position: relative;
        image-rendering: crisp-edges;
        width: 6rem;
        height: 6rem;
    }  
`;

export default () => {


    const {
        oceanside: {tiles},
        icons: {icons}
    } = useStaticQuery(query);
    const {sorted, navigate} = useImageNavBar({icons, tiles});

    return <>
        <Form
            fields={[{
                type: "select",
                id: "asset",
                options: sorted.map(({name}) => name),
                onChange: navigate
            }]}
        />

        {sorted.map((tile, ii) => 
            <StyledTileInformation
                key={`tile-${ii}`} 
                tile={tile}
            />
        )}
    </>
}


    