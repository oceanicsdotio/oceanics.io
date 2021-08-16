module.exports = {
    siteMetadata: {
        title: `Oceanics.io`,
        author: `Oceanicsdotio LLC`,
        description: `Trust layer for the blue economy`,
        siteUrl: `https://www.oceanics.io`
    },
    plugins: [
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                path: `${__dirname}/content`,
                name: `content`,
            },
        },
        {
            resolve: `gatsby-source-filesystem`,
            options: {
                path: `${__dirname}/assets`,
                name: `assets`,
            },
        },
        `gatsby-remark-images`,
        `gatsby-remark-katex`,
        `gatsby-remark-responsive-iframe`,
        `gatsby-remark-copy-linked-files`,
        `gatsby-remark-smartypants`,
        {
            resolve: `gatsby-plugin-mdx`,
            options: {
                extensions: [".mdx", ".md"],
                gatsbyRemarkPlugins: [
                    `gatsby-remark-images`,
                    `gatsby-remark-katex`,
                    `gatsby-remark-responsive-iframe`,
                    `gatsby-remark-copy-linked-files`,
                    `gatsby-remark-smartypants`,
                    {
                        resolve: `gatsby-remark-prismjs`,
                        options: {
                            classPrefix: "language-",
                            inlineCodeMarker: null,
                            aliases: {},
                            showLineNumbers: false,
                            noInlineHighlight: false,
                            languageExtensions: [],
                            escapeEntities: {},
                        },
                    },
                ],
            },
        },
        `gatsby-transformer-sharp`,
        `gatsby-plugin-sharp`,
        {
            resolve: `gatsby-plugin-manifest`,
            options: {
                name: `Oceanicsdotio`,
                short_name: `GatsbyJS`,
                start_url: `/`,
                background_color: `#000000`,
                theme_color: `#EF5FA1`,
                display: `minimal-ui`,
                icon: `static/favicon.ico`,
            },
        },
        `gatsby-plugin-react-helmet`,
        `gatsby-plugin-styled-components`
    ],
}