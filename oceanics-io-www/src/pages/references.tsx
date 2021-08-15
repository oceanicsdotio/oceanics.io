/**
 * React and friends. 
 */
import React, {FC, useMemo} from "react";

/**
 * Query for MDX frontmatter for references. No references can be added that aren't
 * cited within a file.
 */
import {graphql } from "gatsby";

/**
 * Array of references component, no heading
 */
import References from "oceanics-io-ui/src/components/References/References";
import {ArticleType,ReferenceType} from "oceanics-io-ui/src/components/References/utils";

type PageType = {
    data: {
        allMdx: {
            nodes: ArticleType
        }
    }
}

const filterNullish = (x: ReferenceType): boolean => !!x;
const unpackCitations = (node: ArticleType): ReferenceType[] => node.frontmatter.citations

/**
 * The page component to render
 */
const ReferencesPage = ({
    data: {
        allMdx: { nodes }
    },
}) => {
    /**
     * Memoize the filtered array of citations listed in 
     * article frontmatter.
     */
    const references = useMemo(() => 
        nodes.flatMap(unpackCitations).filter(filterNullish), [])

    return <References citations={references}/>
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