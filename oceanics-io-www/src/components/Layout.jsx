/**
 * Stuff for bots and browsers
 */
import React from 'react';
import Helmet from "react-helmet";
import BaseLayout from "oceanics-io-ui/src/components/Layout/Layout";
import PageData from "oceanics-io-ui/src/components/Layout/PageData.json";

/**
 * Retrieve Gatsby data
 */
import { useStaticQuery, graphql } from "gatsby";



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
    /**
     * Use GraphQL to to get fallback `title` and `description`. 
     */
    const queryData = useStaticQuery(query);

    return (
        <BaseLayout {...{ ...PageData, ...props }}>
            <Helmet
                htmlAttributes={{ lang: "en" }}
                title={"Oceanics.io"}
                titleTemplate={`%s | Oceanics.io`}
                meta={metadata(queryData)}
            />
            {children}
        </BaseLayout>
    )
}

export default Layout;