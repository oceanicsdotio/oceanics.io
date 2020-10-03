const path = require(`path`);
const _ = require("lodash");
const { createFilePath } = require(`gatsby-source-filesystem`);
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");
const { SHA1 } = require("crypto-js");

// https://www.gatsbyjs.org/docs/debugging-html-builds/
// https://loadable-components.com/

const referenceHash = ({authors, title, year, journal}) => {
    /*
    Some of the canonical fields do not contain uniquely identifying information. Technically,
    the same content might appear in two places. 
    */
    return SHA1(`${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()} ${journal.toLowerCase()}`.replace(" ", ""))
}

exports.onCreateWebpackConfig = ({ stage, loaders, actions }) => {
    if (stage === 'build-html') {
        actions.setWebpackConfig({
            module: {
                rules: [
                    {
                        test: /mapbox-gl/,
                        use: loaders.null(),
                    },{
                        test: /wasm/,
                        use: loaders.null(),
                    },
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
                    outName: "neritics",
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
                    outName: "neritics",
                    pluginLogLevel: "error",
                    forceMode: "development",
                }),
            ]
        });
    }
}

exports.createPages = async ({ graphql, actions: {createPage} }) => {
   
    const blogPost = path.resolve(`src/templates/blog-post.js`);
    const tagTemplate = path.resolve(`src/templates/tags.js`);
    const referenceTemplate = path.resolve(`src/templates/references.js`);
    const pages = {};

    const {errors, data: {allMdx: {edges}}} = await graphql(`{
        allMdx(
            sort: { fields: [frontmatter___date], order: DESC }
            limit: 1000
        ) {
            edges {
                node {
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
        }
    }`)

    if (errors) throw errors;
    edges.forEach(({node: {fields: {slug}, frontmatter: {tags, citations}}}, index) => {
        createPage({
            path: slug,
            component: blogPost,
            context: {
                slug,
                previous: index === edges.length - 1 ? null : edges[index + 1].node,
                next: index === 0 ? null : edges[index - 1].node
            },
        });

        (tags || []).forEach(tag => {
            const formattedTag = _.kebabCase(tag);
            const path = `/tags/${formattedTag}/`;
            if (path in pages) return;  // skip building pages if there is a duplicate url

            const page = {
                path,
                component: tagTemplate,
                context: {tag}
            }
            createPage(page);
            pages[path] = page;
        });

        (citations || []).forEach(citation => {
            const hash = referenceHash(citation);
            const path = `/references/${hash}/`;
            if (path in pages) return;  // skip building pages if there is a duplicate url

            const page = {
                path,
                component: referenceTemplate,
                context: {
                    title: citation.title
                }
            }
            createPage(page);
            pages[path] = page;
        });
    })
}

exports.onCreateNode = ({ node, actions: { createNodeField }, getNode }) => {
    if (node.internal.type === `Mdx`) {
        const value = createFilePath({ node, getNode })
        createNodeField({
            name: `slug`,
            node,
            value,
        })
    }
}
