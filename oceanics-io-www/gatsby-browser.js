/**
 * This file is the interface for the Gatsby Browser APIs for client
 * interactions. 
 * 
 * For instance we can:
 * - `wrapPageElement` to embed all pages in a parent.
 * - `onRouteUpdate` for logging
 * - `onRouteUpdateDelayed` for providing loading wait indicator
 * - `onServiceWorkerActive/Installed` for SW interactions 
 * 
 * Use with `gatsby-ssr.js` to prevent hydration errors.
 * 
 */
import "katex/dist/katex.min.css";
import "oceanics-io-ui/src/styles/global.css";
import "oceanics-io-ui/src/styles/theme.css";

/**
 * Stuff for bots and browsers
 */
import React from 'react';
import Helmet from "react-helmet";
import Layout from "oceanics-io-ui/src/components/Layout/Layout";
import PageData from "oceanics-io-ui/src/components/Layout/Layout.json";

/**
 * Retrieve Gatsby data
 */
import { useStaticQuery, graphql } from "gatsby";

/**
 * Static GraphQL query for sire metadata
 * 
 * @param {*} param0 
 * @returns 
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


const Wrapper = ({element, props}) => {
    /**
     * Use GraphQL to to get fallback `title` and `description`. 
     */
     const queryData = useStaticQuery(query);

    return( 
        <Layout {...{...PageData, ...props }}>
            <Helmet
                htmlAttributes={{ lang: "en" }}
                title={"Oceanics.io"}
                titleTemplate={`%s | Oceanics.io`}
                meta={metadata(queryData)}
            />
            {element}
        </Layout>
    )
}

/**
 * Inner wrap
 * 
 * Gatsby will use this `wrapPageElement` for SSR since we do 
 * not declare a separate file.
 */
export const wrapPageElement = ({ element, props }) => {
    return  <Wrapper element={element} props={props}/>
}
