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
import Rubric from "../components/Rubric";
import References, {Reference, Inline} from "../components/References";
import PDF from "../components/PDF";
import OpenApi from "../components/OpenApi";
import Template from "oceanics-io-ui/References/Template"

export default ({ 
    data: { 
        mdx: { 
            frontmatter: {
                date,
                title,
                citations=[]
            },
            body
        }
    }
}) => 
    <MDXProvider 
        components={{
            Rubric,
            Reference,
            References,
            Inline,
            PDF,
            OpenApi
        }}
    >
        <Template references={citations} date={date} title={title}>
            <MDXRenderer>{body}</MDXRenderer>
        </Template>
    </MDXProvider>  
  

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
    }
  }
`;
