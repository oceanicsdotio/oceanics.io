/**
 * React and friends.
 */
import React, { useEffect, useState, useMemo } from "react";

/**
 * For building and linking data
 */
import { graphql, navigate } from "gatsby";

/**
 * Needed for parsing source files
 */
import YAML from "yaml";

/**
 * Stylish stuff
 */
import styled from "styled-components";

/**
 * Predefined color palette
 */
import { ghost } from "../palette";

/**
 * Standard layout component for main and non-app pages
 */
import Layout from "../components/Layout";

/**
 * Bots and browsers info
 */
import SEO from "../components/SEO";

/**
 * For interactive elements
 */
import { FormContainer } from "../components/Form";

/**
 * Use Oceanside for header image
 */
import Oceanside from "../components/Oceanside";

import Article from "../components/Article";

import useQueryString, { navigateWithQuery, onSelectValue, onIncrementValue } from "../hooks/useQueryString";

/**
 * Page data
 */
import about from "../data/about.yml";

/**
 * Some of the canonical fields do not contain uniquely identifying information. 
 * Technically, the same content might appear in two places. 
 */
const referenceHash = ({authors, title, year}) => {
   
    const stringRepr = `${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()}`.replace(/\s/g, "");
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    return hashCode(stringRepr);
};

/**
 * Larger paragraphs
 */
const StyledParagraph = styled.p`
    font-size: larger;
`;



/**
 * How many articles are made visible at a time.
 */
const itemIncrement = 3;



const CampaignContainer = styled.div`
    margin-bottom: 3em;


    & p {
        font-size: 1.3rem;
        margin-top: 1rem;
        margin-bottom: 1rem;
        line-height: 1.6rem;
    }

    & div {
        color: ${ghost};
        font-size: 2rem;
    }
`;


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
     * Use a memo so that if something decides to refresh the parent,
     * we won't pick the other narrative and be confusing. 
     */
     const version = useMemo(()=>{


        const random = Math.floor(Math.random() * about.length);
        const { text, ...props } = about[random];

        return {
            ...props,
            content: YAML.parse(text)
                .split("\n")
                .filter(paragraph => paragraph)
        }
    });    

    /**
     * The array of visible articles. The initial value is the subset from 0 to
     * the increment constant. 
     */
    const [ visible, setVisible ] = useState(nodes.slice(0, itemIncrement));

    const { query } = useQueryString({
        search,
        defaults: {
            items: itemIncrement,
            tag: null,
            reference: null
        }
    })
    /**
     * When page loads or search string changes parse the string to React state.
     * 
     * Determine visible content. 
     */
    useEffect(() => {
        if (!query) return;

        // Pick up a value and see if article has it.
        const _eval = (obj, key, data) =>
            (!!obj[key] && !(data||[]).includes(obj[key]));

        // Use to filter based on query string
        const _filter = ({
            frontmatter: {
                tags,
                citations,
            }
        }) => !(
            _eval(query, "tag", tags) || 
            _eval(query, "reference", (citations||[]).map(referenceHash))
        );
        
        // Filter down to just matching, and then limit number of items
        setVisible(nodes.filter(_filter).slice(0, query.items));

    }, [ query ]);

    return (
        <Layout title={title}>
            <SEO title={"Blue computing"} />
            <Oceanside/>
            
            <CampaignContainer>
                <div>
                   {"Autonomous, Prosperous, Accountable. Pick Three."} 
                </div>
                {version.content.map((text, ii) => 
                    <StyledParagraph key={`paragraph-${ii}`} children={text}/>)
                }
              
                <FormContainer
                    actions={[{
                        value: `${version.response}`,
                        type: "button",
                        onClick: () => {navigateWithQuery(`/app`, search, {campaign: version.name})}
                    },{
                        value: `Learn about our API`,
                        type: "button",
                        onClick: () => {navigate(`/bathysphere/`)}
                    },{
                        value: "See the science",
                        type: "button",
                        onClick: ()=>{navigate(`/references/`)}
                    }]}
                />
            </CampaignContainer>
            {visible.map((props, ii) => <Article {...{...props, search, key: `node-${ii}`}}/>)}
            <br/>
            
            <FormContainer
                fields={[{
                    type: "select",
                    id: "filter by tag",
                    options: group.map(({ fieldValue }) => fieldValue),
                    onChange: onSelectValue(search, "tag")
                }]}
                actions={[{
                    value: "More arcana",
                    type: "button",
                    onClick: onIncrementValue(search, "items", itemIncrement)
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
            citations {
                authors, year, title, journal, volume, pageRange
            }
          }
      }
      group(field: frontmatter___tags) {
        fieldValue
        totalCount
      }
    }
  }
`
