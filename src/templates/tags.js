import React from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { Link, graphql } from "gatsby";
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
Tag pages link single tags back to many articles. This provides a many-to-many
mapping that can help traverse the content graph and find related data or
information. 
*/
const Tags = ({ data: { allMdx: {nodes}}, location }) => 
    
    <Layout location={location}>
        <SEO title={"Situational awareness for a changing ocean"} />
        <h1>{"Resources"}</h1>
        <List>
            {nodes.map(({fields: {slug}, frontmatter: {title}}) => 
                <li key={slug}>
                    <StyledLink to={slug}>{title}</StyledLink>
                </li>
            )}
        </List>
    </Layout>

export default Tags;

export const pageQuery = graphql`
    query($tag: String) {
        allMdx(
            sort: { fields: [frontmatter___date], order: DESC }
            filter: { 
                frontmatter: { 
                    tags: { in: [$tag] } 
                } 
            }
        ) {
            nodes {
                fields { slug }
                frontmatter { title }
            }
        }
    }
`;