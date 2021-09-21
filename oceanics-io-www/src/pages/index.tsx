/**
 * React and friends.
 */
import React from "react";
import { graphql, navigate } from "gatsby";

/**
 * Campaign component
 */
import Campaign, { PageData } from "oceanics-io-ui/build/components/Campaign/Campaign";
import Index from "oceanics-io-ui/build/components/References/Index";
import useQueryString from "oceanics-io-ui/build/hooks/useQueryString.js";
const ITEM_INCREMENT = 3;

const DEFAULTS = {
    items: ITEM_INCREMENT,
    tag: "",
    reference: 0
}

/**
 * Base component for web landing page.
 * 
 * Optionally use query parameters and hash anchor to filter content. 
 */
const IndexPage = ({
  location: {
    search
  },
  data
}) => {
  /**
   * Search string query parameters
   */
  const { query, navigateWithQuery } = useQueryString(search, DEFAULTS, navigate);
  
  return (
    <>
      <img src={"/shrimpers-web.png"} alt={"agents at rest"} width={"100%"}/>
      <Campaign
        navigate={navigate}
        title={PageData.title}
        campaign={PageData.campaigns[1]}
      />
      <Index
        query={query}
        onClickTag={(tag: string) => () => {navigateWithQuery({tag})}}
        onClickMore={() => {navigateWithQuery({items: query.items + 3})}}
        onClearAll={()=>{navigate("/")}}
        data={data}
      />
    </>
  )
};

export default IndexPage;

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
