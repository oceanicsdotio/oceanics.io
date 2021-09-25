/**
 * React and friends
 */
import React from "react";

/**
 * Render Provider components inside MDX, and render MDX to React components.
 * 
 * The `Article` is the basic template, and currently data-driven `Reference` components
 * are provided to the Gatsby rendering context. This allows us to build citation lists
 * and cross-reference material based on shared references.
 */
// import { MDXProvider } from "@mdx-js/react";

import Article from "oceanics-io-ui/build/components/References/Article";
import References from "oceanics-io-ui/build/components/References/References";
import Reference from "oceanics-io-ui/build/components/References/Reference"
import Inline from "oceanics-io-ui/build/components/References/Inline";
import fs from "fs";
import path from "path";

const ProviderComponents = {
  References,
  Reference,
  Inline
};

const ArticlePage = ({
  data,
  content
}) => {
  return (
    // <MDXProvider components={ProviderComponents}>
      <Article data={data} onClickTag={() => () => { }}>
        {body}
      </Article>
    // </MDXProvider>
  )
};

export default ArticlePage;

export async function getStaticPaths() {
    
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
  
    return {
      paths: docs.map(doc => {
        return {
          params: {
            slug: doc.slug
          }
        }
      }),
      fallback: false
    }
  }
