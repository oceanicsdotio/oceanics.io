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
    } else if (stage === 'develop' || stage === 'build') {
      actions.setWebpackConfig({
        devtool: 'eval-source-map',
        stats: 'verbose',
        // plugins: [
        //   new WasmPackPlugin({
        //     crateDirectory: path.resolve(__dirname, "rust-src"),
        //     args: "--log-level warn --verbose",
        //     extraArgs: "--target nodejs --no-typescript",
        //     outDir: "src/wasm",
        //     outName: "space",
        //     pluginLogLevel: "error"  // default 'info'
      
        //     // If defined, `forceMode` will force the compilation mode for `wasm-pack`
        //     // the mode `development` makes `wasm-pack` build in `debug` mode.
        //     // the mode `production` makes `wasm-pack` build in `release` mode.
        //     // forceMode: "development",
      
            
        //   }),
        // ]
      });
    }
  }

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions

  const blogPost = path.resolve(`./src/templates/blog-post.js`)
  const tagTemplate = path.resolve("src/templates/tags.js")
  const result = await graphql(
    `
      {
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
      }
    `
  )

  if (result.errors) {
    throw result.errors
  }

  // Create blog posts pages.
  const posts = result.data.allMarkdownRemark.edges

  posts.forEach((post, index) => {
    const previous = index === posts.length - 1 ? null : posts[index + 1].node
    const next = index === 0 ? null : posts[index - 1].node

    createPage({
      path: post.node.fields.slug,
      component: blogPost,
      context: {
        slug: post.node.fields.slug,
        previous,
        next,
      },
    })
  })

  // Extract tag data from query
  const tags = result.data.tagsGroup.group
  // Make tag pages
  tags.forEach(tag => {
    createPage({
      path: `/tags/${_.kebabCase(tag.fieldValue)}/`,
      component: tagTemplate,
      context: {
        tag: tag.fieldValue,
      },
    })
  })
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}
