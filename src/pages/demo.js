import React from "react"
import { graphql } from "gatsby";

import SEO from "../components/seo";
import Layout from "../components/Layout";
import Map from "../components/Map";



export default class extends React.Component {

    render() {
        return (
            <Layout>
                <SEO title={"Geospatial visualization"} />
                <Map />
            </Layout>
        )      
    }
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


