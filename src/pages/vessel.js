
import React from "react"
import { graphql } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Vessel from "../components/Vessel";
import Schedule from "../components/Schedule";


export default ({
    data: {
        site: {
            siteMetadata: { title }
        }
    },
    location,
}) => {
    return (
        <Layout location={location} title={title}>
            <SEO title="Ocean analytics as a service" />
            <Vessel/>
            <Schedule/>
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
