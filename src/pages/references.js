import React from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import {graphql } from "gatsby";
import References from "../components/References";

const heading = "References";

export default ({
    location,
    data: {
        allMdx: { nodes }
    },
}) => 
    <Layout location={location} title={heading}>
        <SEO title={heading}/>
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