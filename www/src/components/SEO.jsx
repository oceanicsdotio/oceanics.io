/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */
import React from "react";

/**
 * Enable some type checking on component
 */
import PropTypes from "prop-types";

/**
 * Stuff for bots and browsers
 */
import Helmet from "react-helmet";

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
`

/**
 * Base component, will be extended with propTypes and defaults. 
 * 
 * @param {*} param0 
 * @returns 
 */
const SEO = ({ 
    description, 
    lang, 
    meta, 
    title
}) => {
    /**
     * Use GraphQL to to get fallback `title` and `description`. 
     */
    const { 
        site: { 
            siteMetadata 
        }
    } = useStaticQuery(query);
       
    return <Helmet
        htmlAttributes={{lang}}
        title={"Oceanics.io"}
        titleTemplate={`%s | ${title}`}
        meta={[
            {
                name: `description`,
                content: description || siteMetadata.description,
            },
            {
                property: `og:title`,
                content: title || siteMetadata.title,
            },
            {
                property: `og:description`,
                content: description || siteMetadata.description,
            },
            {
                property: `og:type`,
                content: `website`,
            },
            {
                name: `twitter:card`,
                content: `summary`,
            },
            {
                name: `twitter:creator`,
                content: siteMetadata.author,
            },
            {
                name: `twitter:title`,
                content: title || siteMetadata.title,
            },
            {
                name: `twitter:description`,
                content: description || siteMetadata.description,
            },
        ].concat(meta)}
    />;
};

/**
 * Sensible defaults
 */
SEO.defaultProps = {
    lang: `en`,
    meta: [],
    description: ``,
};

/**
 * Build time type checking
 */
SEO.propTypes = {
    description: PropTypes.string,
    lang: PropTypes.string,
    meta: PropTypes.arrayOf(PropTypes.object),
    title: PropTypes.string.isRequired,
};

/**
 * Expanded with types and defaults
 */
export default SEO;
