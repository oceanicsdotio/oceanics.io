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
import { MDXProvider } from "@mdx-js/react";
import "katex/dist/katex.min.css";

import Article from "oceanics-io-ui/build/components/References/Article";
import References from "oceanics-io-ui/build/components/References/References";
import Reference from "oceanics-io-ui/build/components/References/Reference"
import Inline from "oceanics-io-ui/build/components/References/Inline";

const ProviderComponents = {
  References,
  Reference,
  Inline
};

const ArticlePage = ({
  data: {
    mdx: {
      frontmatter,
      body,
      fields
    }
  }
}) => {
  return (
    <MDXProvider components={ProviderComponents}>
      <Article frontmatter={frontmatter} fields={fields} onClickTag={() => () => { }}>
        {body}
      </Article>
    </MDXProvider>
  )
};

export default ArticlePage;
