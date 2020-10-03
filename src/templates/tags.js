import React from "react"
import {shape, arrayOf, string} from "prop-types"
import Layout from "../components/Layout"
import SEO from "../components/SEO"
import { Link, graphql } from "gatsby"

const Tags = ({ data: { allMdx: {edges}}, location }) => {
    
    return (
        <Layout location={location} title={null}>
            <SEO title="Situational awareness for a changing ocean" />
            <h2>Resources</h2>
            <ul>
                {edges.map(({ node: {fields: {slug}, frontmatter: {title}} }) => {
                    return (
                        <li key={slug}>
                            <Link to={slug}>{title}</Link>
                        </li>
                    )
                })}
            </ul>
        </Layout>
    )
}

Tags.propTypes = {
    pageContext: shape({
        tag: string.isRequired,
    }),
    data: shape({
        allMdx: shape({
            edges: arrayOf(
                shape({
                    node: shape({
                        frontmatter: shape({
                            title: string.isRequired,
                        }),
                        fields: shape({
                            slug: string.isRequired,
                        }),
                    }),
                }).isRequired
            ),
        }),
    }),
}

export default Tags

export const pageQuery = graphql`
    query($tag: String) {
        allMdx(
            limit: 2000
            sort: { fields: [frontmatter___date], order: DESC }
            filter: { frontmatter: { tags: { in: [$tag] } } }
        ) {
            edges {
                node {
                    fields {
                        slug
                    }
                    frontmatter {
                        title
                    }
                }
            }
        }
    }
`