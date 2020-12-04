import React, {Fragment} from "react";
import YAML from "yaml";

import Layout from "../components/Layout";
import SEO from "../components/SEO";

import policy from "../data/policy.yml";

const title = "Policy";
const parseYamlText = (text, prefix) => 
    YAML.parse(text)
        .split("\n")
        .filter(paragraph => paragraph)
        .map(
            (text, ii) => 
            <p key={`${prefix}-text-${ii}`}>{text}</p>
        );

export default ({
    location
}) => 
    <Layout location={location} title={title}>
        <SEO title={title} />
        {
            policy.map(({heading, text})=>
                <Fragment key={heading}>
                    <h2>{heading}</h2>
                    {parseYamlText(text, title)}
                </Fragment>
            )
        }    
    </Layout>