const path = require(`path`);
const _ = require("lodash");
const { createFilePath } = require(`gatsby-source-filesystem`);
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

// https://www.gatsbyjs.org/docs/debugging-html-builds/
// https://loadable-components.com/

const referenceHash = ({authors, title, year, journal}) => {
    /*
    Some of the canonical fields do not contain uniquely identifying information. Technically,
    the same content might appear in two places. 
    */
    const stringRepr = `${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()} ${journal.toLowerCase()}`.replace(/\s/g, "");
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    return hashCode(stringRepr);
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
    const pagesQueue = {};

    const {errors, data: {allMdx: {nodes}}} = await graphql(`{
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
    }`);

    if (errors) throw errors;
    nodes.forEach(({fields: {slug}, frontmatter: {tags, title, citations}}, index) => {
        createPage({
            path: slug,
            component: blogPost,
            context: {
                slug,
                previous: index === nodes.length - 1 ? null : nodes[index + 1].node,
                next: index === 0 ? null : nodes[index - 1].node
            },
        });

        (tags || []).forEach(tag => {
            const formattedTag = _.kebabCase(tag);
            const path = `/tags/${formattedTag}/`;
            if (path in pagesQueue) return;  // skip building pages if there is a duplicate url

            pagesQueue[path] = {
                path,
                component: tagTemplate,
                context: {tag}
            }
        });

        (citations || []).forEach(citation => {
            const hash = referenceHash(citation);
            const path = `/references/${hash}/`;
            if (path in pagesQueue) {
                pagesQueue[path].context.backLinks[slug] = title
            } else {
                pagesQueue[path] = {
                    path,
                    component: referenceTemplate,
                    context: {
                        backLinks: {[slug]: title}
                    }
                }
            }
        });
    });

    Object.values(pagesQueue).map((page) => {
        createPage(page);
    });
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
