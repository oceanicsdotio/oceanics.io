const path = require(`path`);
const _ = require("lodash");
const YAML = require("yaml");
const express = require("express");
const { createFilePath } = require(`gatsby-source-filesystem`);
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");


// https://www.gatsbyjs.org/docs/debugging-html-builds/
// https://loadable-components.com/


/**
 * Some of the canonical fields do not contain uniquely identifying information. 
 * Technically, the same content might appear in two places. 
 */
const referenceHash = ({authors, title, year, journal}) => {
   
    const stringRepr = `${authors.join("").toLowerCase()} ${year} ${title.toLowerCase()}`.replace(/\s/g, "");
    const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
    return hashCode(stringRepr);
};

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
 * Dynamically create webpack behaviors based on what stage
 * being executed. 
 * 
 * During HTML stage, need to avoid loading client-side code. This includes
 * Mapbox, any WASM, and web workers. 
 * 
 * When develop/build is called, we re-compile all the rust code to create
 * the JS module bindings into Rust-WASM. This prevents bad code from being
 * deployed.
 * 
 * @param {*} param0 
 */
exports.onCreateWebpackConfig = ({ stage, loaders, actions }) => {
    if (stage === 'build-html') {
        actions.setWebpackConfig({
            module: {
                rules: [
                    {
                        test: /mapbox-gl/,
                        use: loaders.null(),
                    },
                    {
                        test: /wasm/,
                        use: loaders.null(),
                    },
                    {
                        test: /\.worker\.js$/,
                        use: { loader: 'workerize-loader' }
                    }
                    
                ]
            }
        })
    } else if (stage === 'develop' || stage === 'build') {
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
            component: path.resolve(`src/templates/article.js`),
            context: {
                slug,
                previous: index === nodes.length - 1 ? null : nodes[index + 1].node,
                next: index === 0 ? null : nodes[index - 1].node
            },
        });

        (tags || []).forEach(tag => {
            const formattedTag = _.kebabCase(tag);
            const route = `/tags/${formattedTag}/`;
            if (route in pagesQueue) return;  // skip building pages if there is a duplicate url

            pagesQueue[route] = {
                path: route,
                component: path.resolve(`src/templates/tags.js`),
                context: {tag}
            }
        });

        (citations || []).forEach(citation => {
            const hash = referenceHash(citation);
            const route = `/references/${hash}/`;
            if (route in pagesQueue) {
                pagesQueue[route].context.backLinks[slug] = title
            } else {
                pagesQueue[route] = {
                    path: route,
                    component: path.resolve(`src/templates/references.js`),
                    context: {
                        backLinks: {[slug]: title}
                    }
                }
            }
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