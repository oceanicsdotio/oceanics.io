import React from "react";
import styled from "styled-components";
import { graphql } from "gatsby";
import { MDXProvider } from "@mdx-js/react";
import { MDXRenderer } from "gatsby-plugin-mdx";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import Rubric from "../components/Rubric";
import References, {Reference, Inline} from "../components/References";
import PDF from "../components/PDF";
import OpenApi from "../components/OpenApi";

import { rhythm, scale } from "../typography";
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

export default ({ 
    data: { 
        mdx: { 
            frontmatter: {
                date,
                title,
                description,
                citations=[]
            }, 
            excerpt, 
            body
        }
    }, 
    location 
}) => 
    <Layout location={location}>
        <SEO
            title={title}
            description={description || excerpt}
        />
        <MDXProvider components={{
                Rubric,
                Reference,
                References,
                Inline,
                PDF,
                OpenApi
            }}>
            <article>
                <header>
                    <StyledHeader>{title}</StyledHeader>
                    <StyledParagraph>{date}</StyledParagraph>
                </header>
                <MDXRenderer>{body}</MDXRenderer>
                <References references={citations}/>
            </article>
        </MDXProvider>
        
    </Layout>
  

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
`
