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
import Campaign from "oceanics-io-ui/src/components/Campaign/Campaign";
import Index from "oceanics-io-ui/src/components/References/Index";
import {ArticleType} from "oceanics-io-ui/src/components/References/utils";

type GroupType = {
    fieldValue: string;
    totalCount: number;
};
type PageType = {
    data: {
        allMdx: {
            nodes: ArticleType[];
            group: GroupType[];
        }
    };
    location: {
        search: string;
    }
};

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const Home: FC<PageType> = ({
    location: {
        search
    },
    ...props
}) => {
    /**
     * Search string query parameters
     */
    // const { query } = useQueryString({
    //     search,
    //     defaults: {
    //         items: itemIncrement,
    //         tag: null,
    //         reference: null
    //     }
    // })
    const query = {
        items: 3,
        tag: "",
        reference: 0,
        inc: 3
    }
    
    return (
        <>
            <Campaign navigate={navigate}/>
            <Index query={query} {...props}/>
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
