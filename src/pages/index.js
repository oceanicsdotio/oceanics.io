import React, { useMemo, useReducer } from "react";
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
    /**
     * Image to use for top of article list
     */
    const bannerImage = "shrimpers-web.png";

    /**
     * How many articles are made visible at a time.
     */
    const visibilityIncrement = 3;

    /**
     * Memoize the article components so that they aren't
     * re-rendered when user adds more to view.
     */
    const articles = useMemo(() => {
        return nodes.map(node => {
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
        })
    });

    const [visible, increment] = useReducer(
        prev => Math.min(articles.length, prev + 3),
        visibilityIncrement
    );

    return (
        <Layout location={location} title={title}>
            <SEO title={"Blue economy trust layer"} />
            <Image src={bannerImage} alt={"Agents@Rest"} />
            {articles.slice(0, visible)}
            <p><em onClick={increment}>{"Show older content..."}</em></p>
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
