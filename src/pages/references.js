import React from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import {graphql } from "gatsby";
import References from "../components/References";


export default ({
    location,
    data: {
        allMdx: { nodes },
        site: {
            siteMetadata: { title },
        },
    },
}) => {

    const heading = "References";
    const citations = nodes.flatMap(node => node.frontmatter.citations).filter(x => !!x)

    return <Layout location={location} title={title}>
        <SEO title={heading}/>
        <References heading={heading} references={citations}/>
    </Layout>
    
};

export const pageQuery = graphql`
    query {
        site {
            siteMetadata { title }
        }
        allMdx {
            nodes {
                frontmatter { 
                    citations { authors, year, title, journal, volume, pageRange }
                }  
            }
        }
    }
`;