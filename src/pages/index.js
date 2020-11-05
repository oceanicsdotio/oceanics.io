import React from "react";
import { Link, graphql } from "gatsby";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { rhythm } from "../typography";
import {grey, pink, ghost} from "../palette"

const StyledHeader = styled.h3`
    margin-bottom: ${rhythm(0.25)};
`;

const StyledLink = styled(Link)`
    box-shadow: none;
    text-decoration: none;
    color: ${pink};
`;

const Excerpt = styled.p`
    color: ${ghost};
`;

const Date = styled.small`
    color: ${grey};
`;

const Image = styled.img`
    width: 100%;
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
            <Image src={bannerImage} alt={"Agents@Rest"} />
            {nodes.map(node => {
                const title = node.frontmatter.title || node.fields.slug;
                return <article key={node.fields.slug}>
                    <header>
                        <StyledHeader>
                            <StyledLink to={node.fields.slug}>
                                {title}
                            </StyledLink>
                        </StyledHeader>
                        <Date>{node.frontmatter.date}</Date>
                    </header>
                    <section>
                        <Excerpt dangerouslySetInnerHTML={{
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
