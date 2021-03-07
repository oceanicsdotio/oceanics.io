import React, {useMemo} from "react";
import styled from "styled-components";
import YAML from "yaml";

import Layout from "../components/Layout";
import SEO from "../components/SEO";

import policy from "../data/policy.yml";


const StyledParagraph = styled.p`
    font-size: larger;
`;

export default ({
    location
}) => {

    const paragraphs = useMemo(()=>{
        return YAML.parse(policy.text)
            .split("\n")
            .filter(paragraph => paragraph)
    });

    return <Layout location={location} title={policy.title}>
        <SEO title={policy.title} />
        {paragraphs
            .map((text, ii) => <StyledParagraph key={`text-${ii}`}>{text}</StyledParagraph>)}    
    </Layout>}