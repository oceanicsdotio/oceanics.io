/**
 * React and friends
 */
import React from "react";
import { graphql } from "gatsby";

/**
 * Render Provider components inside MDX, and render MDX to React components.
 * 
 * The `Article` is the basic template, and currently data-driven `Reference` components
 * are provided to the Gatsby rendering context. This allows us to build citation lists
 * and cross-reference material based on shared references.
 */
import { MDXProvider } from "@mdx-js/react";
import { MDXRenderer } from "gatsby-plugin-mdx";
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
        <MDXRenderer>{body}</MDXRenderer>
      </Article>
    </MDXProvider>
  )
};

export default ArticlePage;

export const pageQuery = graphql`
  query ArticleBySlug($slug: String!) {
    mdx(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      body
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        description
        citations {
            authors, year, title, journal, volume, pageRange
        }
      }
      fields {
        slug
      }
    }
  }
`;
