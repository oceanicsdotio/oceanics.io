/**
 * React and friends
 */
import React from "react";

/**
 * Query for static data
 */
import { graphql } from "gatsby";

/**
 * Render specified components inside MDX
 */
import { MDXProvider } from "@mdx-js/react";

/**
 * Render MDX to React
 */
import { MDXRenderer } from "gatsby-plugin-mdx";

/**
 * Common layout
 */
import References from "oceanics-io-ui/build/components/References/References";
import Reference from "oceanics-io-ui/build/components/References/Reference"
import Inline from "oceanics-io-ui/build/components/References/Inline";
import Article from "oceanics-io-ui/build/components/References/Article";
import Layout from "../components/Layout"

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
        <Layout>
            <MDXProvider components={ProviderComponents}>
                <Article frontmatter={frontmatter} fields={fields} onClickTag={()=>()=>{}}>
                    <MDXRenderer>{body}</MDXRenderer>
                </Article>
            </MDXProvider> 
        </Layout>
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
