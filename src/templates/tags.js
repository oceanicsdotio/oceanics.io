import React from "react"
import PropTypes from "prop-types"
import Layout from "../components/Layout"
import SEO from "../components/seo"
import { Link, graphql } from "gatsby"

const Tags = ({ data: { allMarkdownRemark: {edges}}, location }) => {
    
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
    pageContext: PropTypes.shape({
        tag: PropTypes.string.isRequired,
    }),
    data: PropTypes.shape({
        allMarkdownRemark: PropTypes.shape({
            totalCount: PropTypes.number.isRequired,
            edges: PropTypes.arrayOf(
                PropTypes.shape({
                    node: PropTypes.shape({
                        frontmatter: PropTypes.shape({
                            title: PropTypes.string.isRequired,
                        }),
                        fields: PropTypes.shape({
                            slug: PropTypes.string.isRequired,
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
        allMarkdownRemark(
            limit: 2000
            sort: { fields: [frontmatter___date], order: DESC }
            filter: { frontmatter: { tags: { in: [$tag] } } }
        ) {
            totalCount
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