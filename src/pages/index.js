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
        search
    }
}) => {

    /**
     * React state to hold parsed query string parameters.
     */
    const [ query, setQuery] = useState({
        items: itemIncrement,
        tag: null
    });

    

    /**
     * When page loads parse the query string. 
     */
    useEffect(() => {
        if (!search) return;

        console.log(Object.fromEntries(search
            .slice(1, search.length)
            .split("&")
            .map(item => item.split("="))));

        setQuery(
            Object.fromEntries(search
                .slice(1, search.length)
                .split("&")
                .map(item => item.split("=")))
        );

    }, [ search ]);


    const [ visible, setVisible ] = useState(nodes.slice(0, itemIncrement));

    /**
     * Determine the visible articles. 
     * 
     * Trigger when query parameters are updated. 
     */
    useEffect(() => {

        if (!query || !query.items) return;

        // Filter down to just matching
        const filtered = !query.tag ? nodes : nodes.filter(({tags=null}) =>
            query.tag in (tags || [])
        );

        // Limit number of visible
        setVisible(filtered.slice(0, Math.min(query.items, filtered.length)));

    }, [ query ]);


    /**
     * Set tag as current, and increase number visible
     */
    const onClick = () => { 

        const tagString = query.tag ? `tag=${query.tag}&` :  ``;
        const itemsString = `items=${Math.min(nodes.length, Number.parseInt(query.items) + itemIncrement)}`;

        navigate(`/?${tagString}${itemsString}`); 
    };

    /**
     * Set tag from selection, and keep current number
     * @param {} event 
     */
    const onChange = event => { 

        console.log(query);

        const tagString = `tag=${event.target.value}`;
        const itemsString = `&items=${query.items}` ;

        navigate(`/?${tagString}${itemsString}`);  
    };


    return (
        <Layout title={title}>
            <SEO title={"Blue economy trust"} />
            <Image src={bannerImage} alt={"Agents@Rest"} />
            <Form
                fields={[{
                    type: "select",
                    id: "filter by tag",
                    options: group.map(({ fieldValue }) => fieldValue),
                    onChange
                }]}
            />
            {visible.map((node, ii) => <Article {...{ ...node, key: ii }} />)}
            <br/>
            <Form
                actions={[{
                    value: "more content...",
                    type: "button",
                    onClick
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
