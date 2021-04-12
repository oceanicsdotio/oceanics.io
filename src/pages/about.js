/**
 * React
 */
import React, { useMemo } from "react";

/**
 * Styling
 */
import styled from "styled-components";

/**
 * Needed for parsing source files
 */
import YAML from "yaml";

/**
 * Default page layout
 */
import Layout, { StyledLayout } from "../components/Layout";

/**
 * Bots and browsers
 */
import SEO from "../components/SEO";

/**
 * Page data
 */
import about from "../data/about.yml";

/**
 * Larger paragraphs
 */
const StyledParagraph = styled.p`
    font-size: larger;
`;

/**
 * Marketing page
 */
export default ({
    location
}) => {

    /**
     * Use a memo so that if something decides to refresh the parent,
     * we won't pick the other narrative and be confusing. 
     */
    const version = useMemo(()=>{

        const random = Math.floor(Math.random() * about.length);
        const { text, ...props } = about[random];

        return {
            ...props,
            content: YAML.parse(text)
                .split("\n")
                .filter(paragraph => paragraph)
        }
    });    

    return <Layout location={location} title={"Oceanics.io"}>
        <SEO title={"About"} />
        {version.content.map((text, ii)=>
            <StyledParagraph key={`paragraph-${ii}`}>{text}</StyledParagraph>)}
    </Layout>
};