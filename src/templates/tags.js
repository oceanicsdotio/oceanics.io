import React from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { graphql } from "gatsby";
import Tags from "../components/Tags";

/*
Tag pages link single tags back to many articles. This provides a many-to-many
mapping that can help traverse the content graph and find related data or
information. 
*/
const TagResources = ({
    data: {
        allMdx: {
            nodes
        }
    }, 
    location
}) => 
    <Layout location={location}>
        <SEO title={"Situational awareness for a changing ocean"} />
        <Tags group={nodes.map(({fields: {slug}, frontmatter: {title}}) => Object({
            link: slug,
            text: title
        }))}/>
    </Layout>

export default TagResources;

export const pageQuery = graphql`
    query($tag: String) {
        allMdx(
            sort: { fields: [frontmatter___date], order: DESC }
            filter: { 
                frontmatter: { 
                    tags: { in: [$tag] } 
                } 
            }
        ) {
            nodes {
                fields { slug }
                frontmatter { title }
            }
        }
    }
`;