/**
 * React and friends. 
 */
import React from "react";

/**
 * Standard view across website.
 */
import Layout from "../components/Layout";

/**
 * For bots and elgoog.
 */
import SEO from "../components/SEO";

/**
 * Query for MDX frontmatter for references. No references can be added that aren't
 * cited within a file.
 */
import {graphql } from "gatsby";

/**
 * Array of references component, no heading
 */
import References from "../components/References";

/**
 * What we call the page in menu and SEO
 */
const HEADING = "References";

/**
 * The page component to render
 */
export default ({
    location,
    data: {
        allMdx: { nodes }
    },
}) => 
    <Layout location={location} title={HEADING}>
        <SEO title={HEADING}/>
        <References 
            heading={null}
            references={
                nodes.flatMap(({frontmatter: {citations}}) => citations)
                    .filter(x => !!x)
            }
        />
    </Layout>
  

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