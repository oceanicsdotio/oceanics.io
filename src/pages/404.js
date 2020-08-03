import React from "react";
import { graphql } from "gatsby";
import styled from "styled-components";

import Layout from "../components/Layout"
import SEO from "../components/SEO"


const StyledImage = styled.img`
    position: relative;
    display: block;
    margin-left: auto;
    margin-right: auto;
`;

export default ({location, data: {site: {siteMetadata: {title}}}}) => {
    return (
      <Layout location={location} title={title}>
        <SEO title="404: Not Found" />
        <h1>Does not compute</h1>
        <p>You can't get there from here bub.</p>
        <StyledImage src="/dagan-sprite.gif"/>
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
