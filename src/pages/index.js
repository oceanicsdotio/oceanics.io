import React from "react";
import { Link, graphql } from "gatsby";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { rhythm } from "../typography";

const StyledHeader = styled.h3`
    margin-bottom: ${rhythm(0.25)};
`;

const StyledLink = styled(Link)`
    box-shadow: none;
`;

export default ({ 
    data: { 
        allMdx: {nodes}, 
        site: { 
            siteMetadata: {title}
        } 
    }, 
    location
}) => {

    const bannerImage = "shrimpers-web.png";

    return (
        <Layout location={location} title={title}>
            <SEO title={"Situational awareness for a changing ocean"} />
            <img src={bannerImage} alt={"Agents@Rest"} />
            {nodes.map(node => {
                const title = node.frontmatter.title || node.fields.slug;
                return <article key={node.fields.slug}>
                    <header>
                        <StyledHeader>
                            <StyledLink to={node.fields.slug}>
                                {title}
                            </StyledLink>
                        </StyledHeader>
                        <small>{node.frontmatter.date}</small>
                    </header>
                    <section>
                        <p dangerouslySetInnerHTML={{
                            __html: node.frontmatter.description || node.excerpt,
                        }} />
                    </section>
                </article>
            })}
        </Layout>
    )
};

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMdx(sort: { fields: [frontmatter___date], order: DESC }) {
      nodes {
          excerpt
          fields {
            slug
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            description
          }
      }
    }
  }
`
