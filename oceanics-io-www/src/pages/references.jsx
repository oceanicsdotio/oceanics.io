/**
 * React and friends. 
 */
import React, { useMemo } from "react";
import { graphql } from "gatsby";

/**
 * Array of references component, no heading
 */
import References from "oceanics-io-ui/build/components/References/References";

/**
 * The ReferencesPage renders a memoized array of filtered citations
 * listed in article frontmatter. Query for MDX frontmatter for references. 
 * No references can be added that aren't cited within a file.
 */
const ReferencesPage = ({
  data: {
    allMdx: { nodes }
  },
}) => {
  const references = useMemo(() =>
    nodes.flatMap((node) => node.frontmatter.citations).filter((x) => !!x), 
    [nodes]
  );
  return <References citations={references} />
};
export default ReferencesPage;

/**
 * GraphQL data provider
 */
export const pageQuery = graphql`
  query {
    allMdx {
      nodes {
        frontmatter { 
          citations { authors, year, title, journal, volume, pageRange }
        }  
      }
    }
  }
`;