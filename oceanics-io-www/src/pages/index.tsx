/**
 * React and friends.
 */
import React, {FC} from "react";

/**
 * For building and linking data
 */
import { graphql, navigate, PageProps } from "gatsby";

/**
 * Campaign component
 */
//@ts-ignore
import CampaignContainer from "oceanics-io-ui/Campaign/Campaign";
//@ts-ignore
import Index from "oceanics-io-ui/References/Index";
import useQueryString from "../hooks/useQueryString";

/**
 * How many articles are made visible at a time.
 */
const itemIncrement = 3;

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const Home = ({
    data: {
        allMdx: {
            nodes,
            group
        }
    },
    location: {
        search
    }
}) => {
    /**
     * Search string query parameters
     */
    const { query } = useQueryString({
        search,
        defaults: {
            items: itemIncrement,
            tag: null,
            reference: null
        }
    })
    
    return (
        <>
            <CampaignContainer navigate={navigate}/>
            <Index query={query} nodes={nodes} group={group}/>
        </>
    )
};

export default Home;


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
