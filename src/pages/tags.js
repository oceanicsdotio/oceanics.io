import React from "react";
import styled from "styled-components";
import kebabCase from "lodash/kebabCase";
import Layout from "../components/Layout";
import SEO from "../components/SEO";
import { Link, graphql } from "gatsby";
import {ghost} from "../palette";

const ListItem = styled.li`
    margin: 1%;
    padding: 1%;
    display: inline-block;
    border: 0.5px solid;
    border-radius: 3px;
    color: ${ghost};
`;

const StyledLink = styled(Link)`
    text-decoration: none;
    color: ${ghost};
`;

const List = styled.ul`
    margin: 0;
    padding: 0;
`;

export default ({
    location,
    data: {
        allMdx: { group },
        site: {
            siteMetadata: { title },
        },
    },
}) => (
    <Layout location={location} title={title}>
        <SEO title="Content tags" />
        <h1>{"Tags"}</h1>
        <List>
            {group.map(({fieldValue, totalCount}) => (
                <ListItem key={fieldValue}>
                    <StyledLink to={`/tags/${kebabCase(fieldValue)}/`}>
                        {`${fieldValue} (${totalCount})`}
                    </StyledLink>
                </ListItem>
            ))}
        </List>
    </Layout>
)

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