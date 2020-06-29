import React from "react";
import { graphql } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/seo";
import IndexedDB from "../components/IndexedDB";


export default (props) => {

    const { data, location } = props;
    const siteTitle = data.site.siteMetadata.title;

    return (
      <Layout location={location} title={siteTitle}>
        <SEO title={"Local storage"} />
        <IndexedDB />
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
