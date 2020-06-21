import React from "react";
import { graphql } from "gatsby";

import SEO from "../components/seo";
import Layout from "../components/Layout";
// import Canvas from "../components/Canvas";
import Graph from "../components/Graph";
import Entity from "../components/Entity";


export default () => {

    return (
        <Layout>
            <SEO title={"Graphics"} />
            {/* <Canvas /> */}
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


