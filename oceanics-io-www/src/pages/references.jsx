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
import References from "oceanics-io-ui/build/components/References/References";
import Layout from "../components/Layout";

const filterNullish = (x) => !!x;
const unpackCitations = (node) => node.frontmatter.citations

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
        nodes.flatMap(unpackCitations).filter(filterNullish), [nodes])

    return (
        <Layout>
            <References citations={references}/>
        </Layout>
    )
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