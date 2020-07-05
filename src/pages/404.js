import React from "react"
import { graphql } from "gatsby"

import Layout from "../components/Layout"
import SEO from "../components/SEO"

export default ({location, data: {site: {siteMetadata: {title}}}}) => {
    return (
      <Layout location={location} title={title}>
        <SEO title="404: Not Found" />
        <h1>Not Found</h1>
        <p>You can't get there from here bub.</p>
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
