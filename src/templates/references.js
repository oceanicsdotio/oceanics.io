import React from "react"
import Layout from "../components/Layout"
import SEO from "../components/SEO"
import { Link } from "gatsby"

export default ({ pageContext: {backLinks}, location }) => {
    /*
    Each references page is built by collect and deduplicating references from all
    markdown content, and then adding an article link for each parent to
    a unique slug created by hashing the reference data.

    Because of object nesting, data have to be passed in rather than queried directly
    with GraphQL.
    */    
    return (
        <Layout location={location} title={null}>
            <SEO title="Situational awareness for a changing ocean" />
            <h2>{"Resources"}</h2>
            <ul>
                {Object.entries(backLinks).map(([slug, title]) => (
                    <li key={slug}>
                        <Link to={slug}>{title}</Link>
                    </li>
                ))}
            </ul>
        </Layout>
    )
}
