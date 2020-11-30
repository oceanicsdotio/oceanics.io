import React from "react";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { graphql } from "gatsby";
import Tags from "../components/Tags";

import kebabCase from "lodash/kebabCase";

export default ({
    location,
    data: {
        allMdx: { group },
        site: {
            siteMetadata: { title },
        },
    },
}) => 
    <Layout location={location} title={title}>
        <SEO title={"Content tags"} />
        <Tags group={group.map(props => Object({
            link: `/tags/${kebabCase(props.fieldValue)}`,
            ...props
        }))}/>
    </Layout>


export const pageQuery = graphql`
    query {
        site {
            siteMetadata {
                title
            }
        }
        allMdx(limit: 2000) {
            group(field: frontmatter___tags) {
                fieldValue
                totalCount
            }
        }
    }
`