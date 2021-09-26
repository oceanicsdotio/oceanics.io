/**
 * React and friends
 */
import React, {FC} from "react";

/**
 * Render Provider components inside MDX, and render MDX to React components.
 * 
 * The `Article` is the basic template, and currently data-driven `Reference` components
 * are provided to the Gatsby rendering context. This allows us to build citation lists
 * and cross-reference material based on shared references.
 */
// import { MDXProvider } from "@mdx-js/react";

import Article from "oceanics-io-ui/build/components/References/Article";
import type {PartialArticle} from "oceanics-io-ui/build/components/References/utils";
import References from "oceanics-io-ui/build/components/References/References";
import Reference from "oceanics-io-ui/build/components/References/Reference"
import Inline from "oceanics-io-ui/build/components/References/Inline";
import { readMarkdownContent } from "../next-util";

const ProviderComponents = {
  References,
  Reference,
  Inline
};

interface IArticlePage {
    data: PartialArticle;
    content: any;
}

const ArticlePage: FC<IArticlePage> = ({
  data,
  content
}) => {
  return (
    // <MDXProvider components={ProviderComponents}>
      <Article data={data} onClickTag={() => () => { }}>
        {content}
      </Article>
    // </MDXProvider>
  )
};

export default ArticlePage;

/**
 * Used by NextJS in building
 */
export async function getStaticPaths() {
    return readMarkdownContent("../resources")
}
