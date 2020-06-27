import React from "react";
import { graphql } from "gatsby";

import SEO from "../components/seo";
import Layout from "../components/Layout";
// import Canvas from "../components/Canvas";
import Graph from "../components/Graph";
import Storage from "../components/Storage";

export default () => {
    
    return (
        <Layout>
            <SEO title={"Graphics"} />
            {/* <Canvas /> */}
            <Graph />
            <Storage />
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


