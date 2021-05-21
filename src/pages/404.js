/**
 * React and friends.
 */
import React from "react";

/**
 * IMage styling.
 */
import styled from "styled-components";

/**
 * Use the default "fixed width" char-based layout
 */
import Layout from "../components/Layout";

/**
 * Headers for bots.
 */
import SEO from "../components/SEO";

/**
 * Use animated gif of our little bud. 
 */
import dagan from "../../static/dagan-sprite.gif";

/**
 * Using image for GIF, don't have to worry about pixel-smoothing like canvas
 */
const StyledImage = styled.img`
    position: relative;
    display: block;
    margin-left: auto;
    margin-right: auto;
`;

/**
 * Page content, could be externalized in `data/`.
 */
const CONTENT = {
    title: "404",
    message: "You can't get there from here",
    img: "/dagan-sprite.gif"
}

/**
 * Just a dumb functional component.
 */
export default ({
    location, 
}) => 
    <Layout location={location}>
        <SEO title={CONTENT.title}/>
        <p>{CONTENT.message}</p>
        <StyledImage src={CONTENT.img}/>
    </Layout>;