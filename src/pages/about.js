import React, { useMemo } from "react";
import styled from "styled-components";
import YAML from "yaml";

import Layout from "../components/Layout";
import SEO from "../components/SEO";

import about from "../data/about.yml";


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
}