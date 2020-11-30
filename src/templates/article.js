import React from "react";
import { graphql } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import References from "../components/References";
import { rhythm, scale } from "../typography";
import { MDXRenderer } from "gatsby-plugin-mdx";
import styled from "styled-components";
require(`katex/dist/katex.min.css`);


const StyledHeader = styled.h1`
    margin-bottom: 0;
    margin-top: ${() => rhythm(1)};
`;

const {lineHeight, fontSize} = scale(-1 / 5);
const StyledParagraph = styled.p`
    display: block;
    margin-bottom: ${() => rhythm(1)};
    font-size: ${fontSize};
    line-height: ${lineHeight};
`;

const BlogPostTemplate = ({ 
    data: { 
        mdx: { frontmatter, excerpt, body }, 
        site: { 
            siteMetadata: { title } 
        } 
    }, 
    location 
}) => 
    <Layout location={location} title={title}>
        <SEO
            title={frontmatter.title}
            description={frontmatter.description || excerpt}
        />
        <article>
            <header>
                <StyledHeader>{frontmatter.title}</StyledHeader>
                <StyledParagraph>{frontmatter.date}</StyledParagraph>
            </header>
            <hr />
            <MDXRenderer>{body}</MDXRenderer>
            {frontmatter.citations ? <References heading={"References"} references={(frontmatter.citations || [])} /> : null }
        </article>
    </Layout>
  

export default BlogPostTemplate

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
      }
    }
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
`
