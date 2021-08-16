import React, {Fragment} from "react";
import GlobalStyle from "oceanics-io-ui/build/components/Layout/GlobalStyle"
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
import "katex/dist/katex.min.css";

export const wrapPageElement = ({ element }) => (
    <Fragment>
      <GlobalStyle />
      {element}
    </Fragment>
  );
