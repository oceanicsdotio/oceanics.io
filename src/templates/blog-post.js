import React from "react";
import { Link, graphql } from "gatsby";

import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { rhythm, scale } from "../typography";
import { MDXRenderer } from "gatsby-plugin-mdx";
require(`katex/dist/katex.min.css`)

const BlogPostTemplate = ({data: {mdx: {frontmatter, excerpt, body}, site: {siteMetadata: {title}}}, pageContext: {next, previous}, location}) => {
 
    return (
      <Layout location={location} title={title}>
        <SEO
          title={frontmatter.title}
          description={frontmatter.description || excerpt}
        />
        <article>

          <header>
            <h1 style={{marginTop: rhythm(1), marginBottom: 0}}>
              {frontmatter.title}
            </h1>
            <p
              style={{
                ...scale(-1 / 5),
                display: `block`,
                marginBottom: rhythm(1),
              }}
            >
              {frontmatter.date}
            </p>
          </header>
          <hr/>
          <MDXRenderer>{body}</MDXRenderer>
          <hr
            style={{
              marginBottom: rhythm(1),
            }}
          />
          <footer />
        </article>

        <nav>
          <ul
            style={{
              display: `flex`,
              flexWrap: `wrap`,
              justifyContent: `space-between`,
              listStyle: `none`,
              padding: 0,
            }}
          >
            <li>
              {previous && (
                <Link to={previous.fields.slug} rel="prev">
                  ← {previous.frontmatter.title}
                </Link>
              )}
            </li>
            <li>
              {next && (
                <Link to={next.fields.slug} rel="next">
                  {next.frontmatter.title} →
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </Layout>
    )
}

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
      }
    }
  }
`
