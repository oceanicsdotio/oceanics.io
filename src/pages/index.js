import React, { useEffect, useReducer, useState } from "react";
import { graphql, navigate } from "gatsby";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";

import Article from "../components/Article"
import Form from "../components/Form";

const Image = styled.img`
    width: 100%;
`;

/**
 * Image to use for top of article list
 */
const bannerImage = "shrimpers-web.png";

/**
 * How many articles are made visible at a time.
 */
const itemIncrement = 3;


/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
export default ({
    data: {
        allMdx: {
            nodes,
            group
        },
        site: {
            siteMetadata: { title }
        }
    },
    location: {
        search,
        hash
    }
}) => {

    const [ query, setQuery] = useState({
        items: itemIncrement,
        topic: null
    });

    /**
     * When page loads parse the query string. 
     */
    useEffect(() => {
        if (!search) return;

        setQuery(
            Object.fromEntries(search
                .slice(1, search.length)
                .split("&")
                .map(item => item.split("=")))
        );

    }, [ search ]);


    return (
        <Layout title={title}>
            <SEO title={"Blue economy trust"} />
            <Image src={bannerImage} alt={"Agents@Rest"} />
            <Form
                fields={[{
                    type: "select",
                    id: "filter by topic",
                    options: group.map(({ fieldValue }) => fieldValue),
                    onChange: event => { navigate(`/?topic=${event.target.value}&items=${query.items}`) }
                }]}
            />
            {nodes.slice(0, query.items).map((node, ii) => <Article {...{ ...node, key: ii }} />)}
            <Form
                actions={[{
                    value: "more content...",
                    type: "button",
                    onClick: event => { navigate(`/?topic=${event.target.value}&items=${Math.min(nodes.length, query.items + itemIncrement)}`) }
                }]}
            />
        </Layout>
    )
};


/**
 * GraphQL query for static data to build the content feed and interface.
 */
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
            tags
            title
            description
          }
      }
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
    }
  }
`
