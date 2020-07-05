/**
 * SEO component that queries for data with
 *  Gatsby's useStaticQuery React hook
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from "react"
import PropTypes from "prop-types"
import Helmet from "react-helmet"
import { useStaticQuery, graphql } from "gatsby"

const SEO = ({ description, lang, meta, title }) => {

    const { site: { siteMetadata }} = useStaticQuery(
        graphql`
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
    )

    const display = description || siteMetadata.description;
    const displayTitle = title || siteMetadata.description;

    return (
        <Helmet
            htmlAttributes={{lang}}
            title={title}
            titleTemplate={`%s | ${title}`}
            meta={[
                {
                    name: `description`,
                    content: display,
                },
                {
                    property: `og:title`,
                    content: displayTitle,
                },
                {
                    property: `og:description`,
                    content: display,
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
                    content: displayTitle,
                },
                {
                    name: `twitter:description`,
                    content: display,
                },
            ].concat(meta)}
        />
    )
};

SEO.defaultProps = {
    lang: `en`,
    meta: [],
    description: ``,
}

SEO.propTypes = {
    description: PropTypes.string,
    lang: PropTypes.string,
    meta: PropTypes.arrayOf(PropTypes.object),
    title: PropTypes.string.isRequired,
}

export default SEO
