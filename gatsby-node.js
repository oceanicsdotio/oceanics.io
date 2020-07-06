const path = require(`path`);
const _ = require("lodash");
const { createFilePath } = require(`gatsby-source-filesystem`);
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

exports.onCreateWebpackConfig = ({ stage, loaders, actions }) => {
    if (stage === 'build-html') {
        actions.setWebpackConfig({
            module: {
                rules: [
                    {
                        test: /mapbox-gl/,
                        use: loaders.null(),
                    }
                ]
            }
        })
    } else if (stage === 'develop') {
        actions.setWebpackConfig({
            devtool: 'eval-source-map',
            stats: 'verbose',
            plugins: [
                new WasmPackPlugin({
                    crateDirectory: path.resolve(__dirname, "src/rust"),
                    args: "--log-level warn --verbose",
                    extraArgs: "--no-typescript --target bundler",
                    outDir: "src/wasm",
                    outName: "space",
                    pluginLogLevel: "error",
                    forceMode: "development",
                }),
            ]
        });
    } else if (stage === 'build') {
        actions.setWebpackConfig({
            devtool: 'eval-source-map',
            stats: 'verbose',
            plugins: [
                new WasmPackPlugin({
                    crateDirectory: path.resolve(__dirname, "src/rust"),
                    args: "--log-level warn --verbose",
                    extraArgs: "--no-typescript --target bundler",
                    outDir: "src/wasm",
                    outName: "space",
                    pluginLogLevel: "error",
                    forceMode: "development",
                }),
            ]
        });
    }
}

exports.createPages = async ({ graphql, actions: {createPage} }) => {
   
    const blogPost = path.resolve(`./src/templates/blog-post.js`);
    const tagTemplate = path.resolve("src/templates/tags.js");

    const {errors, data: {allMarkdownRemark: {edges}, tagsGroup: {group}}} = await graphql(`{
        allMarkdownRemark(
        sort: { fields: [frontmatter___date], order: DESC }
        limit: 1000
        ) {
        edges {
            node {
            fields {
                slug
            }
            frontmatter {
                title,
                tags
            }
            }
        }
    
        }
        tagsGroup: allMarkdownRemark(limit: 2000) {
        group(field: frontmatter___tags) {
        fieldValue
    }
        }
    }`)

    if (errors) throw errors;
    edges.forEach(({node: {fields: {slug}}}, index) => {
        createPage({
            path: slug,
            component: blogPost,
            context: {
                slug,
                previous: index === edges.length - 1 ? null : edges[index + 1].node,
                next: index === 0 ? null : edges[index - 1].node
            },
        })
    })

    group.forEach(({fieldValue}) => {
        createPage({
            path: `/tags/${_.kebabCase(fieldValue)}/`,
            component: tagTemplate,
            context: {
                tag: fieldValue,
            },
        })
    })
}

exports.onCreateNode = ({ node, actions: { createNodeField }, getNode }) => {
    if (node.internal.type === `MarkdownRemark`) {
        const value = createFilePath({ node, getNode })
        createNodeField({
            name: `slug`,
            node,
            value,
        })
    }
}
