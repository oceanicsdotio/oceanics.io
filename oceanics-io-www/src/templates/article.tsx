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
// import Rubric from "../components/Rubric";
// import References, {Reference, Inline} from "../components/References";
// import PDF from "../components/PDF";
// import OpenApi from "../components/OpenApi";
import Article from "oceanics-io-ui/src/components/References/Article"

export default ({ 
    data: { 
        mdx: { 
            frontmatter,
            body,
            fields
        }
    }
}) => {
    return (
        <MDXProvider components={{}}>
            <Article frontmatter={frontmatter} fields={fields} onClickTag={()=>()=>{}}>
                <MDXRenderer>{body}</MDXRenderer>
            </Article>
        </MDXProvider> 
    ) 
  }

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
