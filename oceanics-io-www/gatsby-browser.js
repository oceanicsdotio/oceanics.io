/**
 * This file is the interface for the Gatsby Browser APIs for client
 * interactions. 
 * 
 * For instance we can:
 * - `wrapPageElement` to embed all pages in a parent.
 * - `onRouteUpdate` for logging
 * - `onRouteUpdateDelayed` for providing loading wait indicator
 * - `onServiceWorkerActive/Installed` for SW interactions 
 * 
 * Use with `gatsby-ssr.js` to prevent hydration errors
 */
 import "katex/dist/katex.min.css";
import "./src/styles/global.css";
import "./src/styles/theme.css";


import React from 'react';
import Layout from "oceanics-io-ui/Layout/Layout"
import Rubric from "oceanics-io-ui/Form/Rubric"
import Reference from "oceanics-io-ui/References/Reference"
import References from "oceanics-io-ui/References/References"
import Inline from "oceanics-io-ui/References/Inline"
import SEO from "./src/components/SEO"
import PDF from "oceanics-io-ui/References/PDF"
// import OpenAPI from "../components/OpenAPI"

export const wrapPageElement = ({ element, props }) => {
    return <Layout {...props}>
        <SEO/>
        {element}
    </Layout>
}

const providerComponents = {
    Rubric,
    Reference,
    References,
    Inline,
    PDF,
    // OpenApi
}

export const wrapRootElement = ({}) => {
    return <MDXProvider 
        components={providerComponents}
    >
        <Template references={citations} date={date} title={title}>
            <MDXRenderer>{body}</MDXRenderer>
        </Template>
    </MDXProvider> 
}
