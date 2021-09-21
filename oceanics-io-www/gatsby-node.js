/**
 * Path to local build files
 */
const path = require(`path`);
const remarkMath = require('remark-math')
const rehypeKatex = require('rehype-katex')

/**
 * Express server for develop and build
 */
const express = require(`express`);

/**
 * Create GraphQL node from local filesystem
 */
const { createFilePath } = require(`gatsby-source-filesystem`);

/**
 * There is a known problem with `gatsby develop` not picking up html files in the
 * public directory correctly. Build should work fine, and therefore NOT need a netlify
 * redirect, which we were using. 
 * 
 * This fix is take from: https://github.com/gatsbyjs/gatsby/issues/13072
 * 
 */
exports.onCreateDevServer = ({ app }) => {
    app.use(express.static("static"))
};

/**
 * Create HTML pages from Markdown
 * 
 * @param {*} param0 
 */
exports.createPages = async ({ 
    graphql, 
    actions: {
        createPage
    } 
}) => {

    const mdxQuery = `{
        allMdx(
            sort: { fields: [frontmatter___date], order: DESC }
            limit: 1000
        ) {
            nodes {
                fields { slug }
                frontmatter { 
                    title, 
                    tags, 
                    citations {
                        authors, year, title, journal, volume, pageRange
                    }
                }
            }  
        }
    }`;


    const {
        data: {
            allMdx: {nodes}
        },
        ...mdx
    } = await graphql(mdxQuery);

    if (mdx.errors !== undefined || mdx.errors) throw mdx.errors;

    const pagesQueue = {};


    nodes.forEach(({
        fields: {
            slug
        }, 
        frontmatter: {
            tags, 
            title, 
            citations
        }
    }, index) => {
        createPage({
            path: slug,
            component: path.resolve(`src/templates/article.tsx`),
            context: {
                slug,
                previous: index === nodes.length - 1 ? null : nodes[index + 1].node,
                next: index === 0 ? null : nodes[index - 1].node
            },
        });
    });

    Object.values(pagesQueue).map(page => createPage(page));
}

/**
 * For pages created from MDX files, create a unique `slug`
 * and then generate the web route.
 * 
 * @param {*} param0 
 * @returns 
 */
exports.onCreateNode = ({ 
    node, 
    actions: { 
        createNodeField
    }, 
    getNode 
}) => {
    if (node.internal.type !== `Mdx`) return;
    
    createNodeField({
        name: `slug`,
        node,
        value: createFilePath({ node, getNode }),
    })
}