import React from "react";
import { graphql } from "gatsby";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import styled from "styled-components";

const StyledPixelImage = styled.img`
    image-rendering: crisp-edges;
    position: relative;
    display: inline-block;
`;

const IconContainer = styled.div`
    position: relative;
    width: 100%;
    height: auto;
`;

const iconSet = [
    "boat", "diver-down", "lighthouse", "oyster", "mussels", "herring-gull", "fish-pen", "lobster-buoys", "platform"
];

export default ({location, data: {site: {siteMetadata: {title}}}}) => {

    return (
        <Layout location={location} title={title}>
            <SEO title={"Public domain assets"} />
            <div>
            {iconSet.map(icon => <StyledPixelImage src={`/${icon}.gif`} width={64} height={64}/>)}
            </div>
        </Layout>
    )
};


export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
    }
`
