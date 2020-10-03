import React from "react"
import {shape, arrayOf, string, number} from "prop-types"
import Layout from "../components/Layout"
import SEO from "../components/SEO"
import { Link, graphql } from "gatsby"

const Page = ({
    location,
    data: {
        allMdx: { group },
        site: {
            siteMetadata: { title },
        },
    },
}) => (
        <Layout location={location} title={title}>
            <SEO title="References" />

            <h2>{"References"}</h2>
            <ul>
                {group.map(({fieldValue, totalCount}, key) => (
                    <li key={fieldValue}>
                        <Link to={`/references/${key}/`}>
                            {fieldValue} ({totalCount})
                        </Link>
                    </li>
                ))}
            </ul>
        </Layout>
    )

Page.propTypes = {
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

export default Page

export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
        allMdx(limit: 100) {
            group(field: frontmatter___citations) {
                fieldValue
                totalCount
            }
        }
    }
`