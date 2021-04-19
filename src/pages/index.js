/**
 * React and friends.
 */
import React, { useEffect, useState, useMemo } from "react";

/**
 * For building and linking data
 */
import { graphql, navigate, Link } from "gatsby";

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
import { pink, grey, ghost } from "../palette";

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
import Form from "../components/Form";

/**
 * Page data
 */
import about from "../data/about.yml";

/**
 * Some of the canonical fields do not contain uniquely identifying information. 
 * Technically, the same content might appear in two places. 
 */
 const referenceHash = ({authors, title, year, journal}) => {
   
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
 * Article element, rendered with child metadata 
 */
const StyledArticle = styled.article`

    & h2 {
        margin-bottom: 0;
        padding: 0;
    }

    & small {
        display: block;
        color: ${ghost};
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

/**
 * Banner image
 */
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
 * Go from search string to object with parsed numeric values
 * 
 * @param {*} x 
 * @returns 
 */
const decodeSearch = x => Object.fromEntries(x
    .slice(1, x.length)
    .split("&")
    .map(item => {
        const [key, value] = item.split("=");
        const parsed = Number(value);

        return value && !isNaN(parsed) ? [key, parsed] : [key, value]
    }));

/**
 * Go from object to valid local URL
 * @param {*} x 
 * @returns 
 */
const encodeSearch = x => 
    "/?" + Object.entries(x)
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

/**
 * Set tag as current, and increase number visible
 */
const onAddItems = search => () => { 

    const params = decodeSearch(search);
    const items = (typeof params.items !== undefined && params.items) ? 
        params.items + itemIncrement : 2*itemIncrement;

    navigate(encodeSearch({
        ...decodeSearch(search),
        items
    })); 
};


/**
 * Set tag from value know in advance
 * 
 * @param {*} search 
 * @param {*} tag 
 * @returns 
 */
const onSelectTag = (search, tag=null) => event => {
    navigate(encodeSearch({
        ...decodeSearch(search), 
        tag: tag ? tag : event.target.value
    }));
};


const CampaignContainer = styled.div`
    margin-bottom: 2rem;

    & > * {
        font-size: larger;
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

    /**
     * When page loads or search string changes parse the string to React state.
     * 
     * Determine visible content. 
     */
    useEffect(() => {
        
        const _query = ((x) => Object({
            items: itemIncrement,
            tag: null,
            reference: null,
            ...decodeSearch(x)
        }))(search);

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
            _eval(_query, "tag", tags) || 
            _eval(_query, "reference", (citations||[]).map(referenceHash))
        );
        
        // Filter down to just matching, and then limit number of items
        setVisible(nodes.filter(_filter).slice(0, _query.items));

    }, [ search ]);

    return (
        <Layout title={title}>
            <SEO title={"Blue computing"} />
            <Image src={bannerImage} alt={"Agents@Rest"} />
            <CampaignContainer>
                
                {version.content.map((text, ii)=>
                    <StyledParagraph key={`paragraph-${ii}`}>
                    {text}
                    </StyledParagraph>)}
                <Form
                    actions={[{
                        value: version.callToAction,
                        type: "button",
                        onClick: () => {navigate(`/app/?campaign=${version.name}`)}
                    }]}
                />
            </CampaignContainer>
            
            <Form
                fields={[{
                    type: "select",
                    id: "filter by tag",
                    options: group.map(({ fieldValue }) => fieldValue),
                    onChange: onSelectTag(search)
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
            }, ii) =>
                <StyledArticle>
                    <header>
                        <h2>
                            <Link to={slug}>{title}</Link>
                        </h2>
                        <small>{date}</small>
                    </header>
                    <section>
                        <StyledParagraph>{description}</StyledParagraph>
                    </section>
                    {tags.map(text => 
                        <a
                            key={`node-${ii}-${text}`} 
                            onClick={onSelectTag(search, text)}
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
                    onClick: onAddItems(search)
                },{
                    value: "References",
                    type: "button",
                    onClick: ()=>{navigate(`/references/`)}
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
