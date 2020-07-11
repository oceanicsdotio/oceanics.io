import Catalog from '../catalog/Catalog'
import React from "react";
import { Link, graphql } from "gatsby";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { rhythm } from "../typography";

const StyledHeader = styled.h3`
    margin-bottom: ${rhythm(0.25)};
`;

export default ({data: {allMarkdownRemark: {edges}, site: {siteMetadata: {title}}}, location}) => {
    return (
      <Layout location={location} title={title}>
        <SEO title="Situational awareness for a changing ocean" />
        <Catalog edges={edges}/>
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
    allMarkdownRemark {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            tags
            description
          }
        }
      }
    }
  }
`
