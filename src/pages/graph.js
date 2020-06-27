import React from "react";
import { graphql } from "gatsby";

import SEO from "../components/seo";
import Layout from "../components/Layout";
import Graph from "../components/Graph";

export default () => {
    
    return (
        <Layout>
            <SEO title={"Geospatial graph"} />
            <Graph />
        </Layout>
    )   
    
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
  }
`


