import React from "react"
import {shape, arrayOf, string, number} from "prop-types"
import kebabCase from "lodash/kebabCase"
import Layout from "../components/Layout"
import SEO from "../components/SEO"
import { Link, graphql } from "gatsby"

const TagsPage = ({
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

TagsPage.propTypes = {
    data: shape({
        allMdx: shape({
            group: arrayOf(
                shape({
                    fieldValue: string.isRequired,
                    totalCount: number.isRequired,
                }).isRequired
            ),
        }),
        site: shape({
            siteMetadata: shape({
                title: string.isRequired,
            }),
        }),
    }),
}

export default TagsPage

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