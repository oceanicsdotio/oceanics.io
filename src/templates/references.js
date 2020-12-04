import React from "react";
import styled from "styled-components";
import { Link } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/SEO";

import { ghost } from "../palette";


const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${ghost};
    display: block;

    border: 0.1rem solid;
    border-radius: 0.3rem;
    margin: 0.2rem;
    padding: 0.3rem;
`;

/**
Each references page is built by collect and deduplicating references from all
markdown content, and then adding an article link for each parent to
a unique slug created by hashing the reference data.

Because of object nesting, data have to be passed in rather than queried directly
with GraphQL.
*/    
export default ({ 
    pageContext: {
        backLinks
    }, 
    location,
    title="Resources"
}) => 
    <Layout location={location}>
        <SEO title={title} />
        {Object.entries(backLinks).map(([slug, title]) =>
            <StyledLink key={slug} to={slug}>
                {title}
            </StyledLink>
        )}
    </Layout>;