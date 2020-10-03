import React from "react"
import Layout from "../components/Layout"
import SEO from "../components/SEO"
import { Link } from "gatsby"

export default ({ pageContext: {backLinks}, location }) => {

    console.log()
    
    return (
        <Layout location={location} title={null}>
            <SEO title="Situational awareness for a changing ocean" />
            <h2>{"Resources"}</h2>
            <ul>
                {Object.entries(backLinks).map(([slug, title]) => {
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
