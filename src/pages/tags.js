import React from "react"
import kebabCase from "lodash/kebabCase"
import Layout from "../components/Layout"
import SEO from "../components/SEO"
import { Link, graphql } from "gatsby"

export default ({
    location,
    data: {
        allMdx: { group },
        site: {
            siteMetadata: { title },
        },
    },
}) => (
    <Layout location={location} title={title}>
        <SEO title="Content tags" />

        <h2>Tags</h2>
        <ul>
            {group.map(tag => (
                <li key={tag.fieldValue}>
                    <Link to={`/tags/${kebabCase(tag.fieldValue)}/`}>
                        {tag.fieldValue} ({tag.totalCount})
                    </Link>
                </li>
            ))}
        </ul>
    </Layout>
)

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
        allMdx(limit: 2000) {
            group(field: frontmatter___tags) {
                fieldValue
                totalCount
            }
        }
    }
`