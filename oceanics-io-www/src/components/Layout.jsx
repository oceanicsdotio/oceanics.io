/**
 * Stuff for bots and browsers
 */
import React, { Fragment } from 'react';
import Helmet from "react-helmet";
import BaseLayout from "oceanics-io-ui/build/components/Layout/Layout";
import PageData from "oceanics-io-ui/build/components/Layout/PageData.json";
import GlobalStyle from "oceanics-io-ui/build/components/Layout/GlobalStyle";
/**
 * Retrieve Gatsby data
 */
import { useStaticQuery, graphql } from "gatsby";


/**
 * Format result of GraphQL query as an object suitable for the
 * React Helmet metadata. 
 */
const metadata = ({ title, description, site: { siteMetadata } }) => [
  {
    name: `description`,
    content: description || siteMetadata.description,
  }, {
    property: `og:title`,
    content: title || siteMetadata.title,
  }, {
    property: `og:description`,
    content: description || siteMetadata.description,
  }, {
    property: `og:type`,
    content: `website`,
  }, {
    name: `twitter:card`,
    content: `summary`,
  }, {
    name: `twitter:creator`,
    content: siteMetadata.author,
  }, {
    name: `twitter:title`,
    content: title || siteMetadata.title,
  }, {
    name: `twitter:description`,
    content: description || siteMetadata.description,
  }
];


const Layout = ({ children, ...props }) => {
  /**
   * Static GraphQL query for site metadata.
   */
  const query = graphql`
    query {
      site {
        siteMetadata {
          title
          description
          author
        }
      }
    }
  `;
  /**
   * Use GraphQL to to get fallback `title` and `description`. 
   */
  const queryData = useStaticQuery(query);

  return (
    <Fragment>
      <GlobalStyle />
      <BaseLayout {...{ ...PageData, ...props }}>
        <Helmet
          htmlAttributes={{ lang: "en" }}
          title={"Oceanics.io"}
          titleTemplate={`%s | Oceanics.io`}
          meta={metadata(queryData)}
        />
        {children}
      </BaseLayout>
    </Fragment>
  )
}

export default Layout;