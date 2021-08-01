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
import Layout from "oceanics-io-ui/Layout/Layout";

/**
 * Headers for bots.
 */
import SEO from "../components/SEO";

/**
 * Using image for GIF, don't have to worry about pixel-smoothing like canvas
 */
const NotFoundImage = styled.img`
    position: relative;
    display: block;
    margin-left: auto;
    margin-right: auto;
`;

/**
 * Text style
 */
const NotFoundText = styled.p`
    font-size: xx-large;
    font-family: inherit;
`;

/**
 * Page content, could be externalized in `data/`.
 */
const CONTENT = {
    title: "404",
    message: "You can't get there from here.",
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
        <NotFoundText>{CONTENT.message}</NotFoundText>
        <NotFoundImage src={CONTENT.img}/>
    </Layout>;