import React from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { Link } from "gatsby";
import { ghost } from "../palette";


const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${ghost};
`;

const List = styled.ol`
    margin: 0;
    padding: 0;

    & > li {
        display: block;
        color: ${ghost};
    }
`;

 /*
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
    location
}) => 
    <Layout location={location}>
        <SEO title={"Situational awareness for a changing ocean"} />
        <h1>{"Resources"}</h1>
        <List>
            {Object.entries(backLinks).map(([slug, title]) => (
                <li key={slug}>
                    <StyledLink to={slug}>{title}</StyledLink>
                </li>
            ))}
        </List>
    </Layout>
  