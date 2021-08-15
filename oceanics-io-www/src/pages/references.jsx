/**
 * React and friends. 
 */
import React, {useMemo} from "react";

/**
 * Query for MDX frontmatter for references. No references can be added that aren't
 * cited within a file.
 */
import {graphql } from "gatsby";

/**
 * Array of references component, no heading
 */
import References from "oceanics-io-ui/src/components/References/References";

const filterNullish = (x) => !!x;
const unpackCitations = (node) => node.frontmatter.citations

/**
 * The page component to render
 */
const Page = ({
    data: {
        allMdx: { nodes }
    },
}) => {
    /**
     * Memoize the filtered array of citations listed in 
     * article frontmatter.
     */
    const references = useMemo(() => 
        nodes.flatMap(unpackCitations).filter(filterNullish), [nodes])

    return <References citations={references}/>
};
export default Page;

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