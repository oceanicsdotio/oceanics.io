import React from "react"
import Layout from "../components/Layout"
import SEO from "../components/SEO"
import { Link, graphql } from "gatsby"

export default ({ data: { allMdx: {edges}}, location }) => {
    
    return (
        <Layout location={location} title={null}>
            <SEO title="Situational awareness for a changing ocean" />
            <h2>{"Resources"}</h2>
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

export const pageQuery = graphql`
    query($tag: String) {
        allMdx(
            limit: 2000
            sort: { fields: [frontmatter___date], order: DESC }
            filter: { 
                frontmatter: { 
                    tags: { in: [$tag] } 
                } 
            }
        ) {
            nodes {
                fields { slug }
                frontmatter { title }
            }
        }
    }
`;