import Layout from "./src/components/Layout";
import React from "react";
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
 * Use with `gatsby-ssr.js` to prevent hydration errors.
 * 
 */

export const wrapPageElement = ({ element }) => (
    <Layout>
        {element}
    </Layout>
  );
