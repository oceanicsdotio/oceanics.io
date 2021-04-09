import React, { useEffect, useReducer, useState } from "react";
import { graphql, navigate, Link } from "gatsby";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";

import Form from "../components/Form";

import { pink, grey, ghost } from "../palette";


const StyledArticle = styled.article`

    & h2 {
        margin-bottom: 0;
        padding: 0;
    }

    & small {
        display: block;
        color: ${grey};
    }

    & a {
        display: inline-block;
        text-decoration: none;
        color: ${ghost};
        border: 1px solid;
        border-radius: 0.3rem;
        padding: 0.3rem;
        font-size: smaller;
        margin: 0;
        margin-right: 0.2rem;
        cursor: pointer;
    }

    & h2 > a {
        box-shadow: none;
        color: ${pink};
        text-decoration: none;
        border: none;
        margin: 0;
        padding: 0;
    }
`;

const Article = ({
    frontmatter: {
        title,
        date,
        description,
        tags
    }, fields: {
        slug
    }
}) =>
    <StyledArticle>
        <header>
            <h2>
                <Link to={slug}>{title}</Link>
            </h2>
            <small>{date}</small>
        </header>
        <section>
            <p>{description}</p>
        </section>
        {tags.map((text, ii) => 
                <a 
                    key={`tags-${ii}`} 
                    onClick={`tags/${kebabCase(text)}`
                }>
                    {text}
                </a>
            )}
    </StyledArticle>;

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
        const filtered = !query.tag ? nodes : nodes.filter(({frontmatter: {tags=null}}) =>
            (tags || []).includes(query.tag)
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

        const tagString = `tag=${event.target.value}`;
        const itemsString = `&items=${query.items}` ;

        navigate(`/?${tagString}${itemsString}`);  
    };

    return (
        <Layout title={title}>
            <SEO title={"Blue economic trust"} />
            <Image src={bannerImage} alt={"Agents@Rest"} />
            <Form
                fields={[{
                    type: "select",
                    id: "filter by tag",
                    options: group.map(({ fieldValue }) => fieldValue),
                    onChange
                }]}
            />
            {visible.map(({
                frontmatter: {
                    title,
                    date,
                    description,
                    tags
                }, fields: {
                    slug
                }
            }) =>
                <StyledArticle>
                    <header>
                        <h2>
                            <Link to={slug}>{title}</Link>
                        </h2>
                        <small>{date}</small>
                    </header>
                    <section>
                        <p>{description}</p>
                    </section>
                    {tags.map((text, ii) => 
                        <a 
                            key={`tags-${ii}`} 
                            onClick={() => {navigate(`/?tag=${text}&items=${query.items}`)}}
                        >
                            {text}
                        </a>
                    )}
                </StyledArticle>)}
            <br/>
            <Form
                actions={[{
                    value: "More",
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
