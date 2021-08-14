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
import Layout from "oceanics-io-ui/src/components/Layout/Layout"
import SEO from "./src/components/SEO"

/**
 * Inner wrap
 */
export const wrapPageElement = ({ element, props }) => {
    return <Layout {...props}>
        <SEO/>
        {element}
    </Layout>
}
