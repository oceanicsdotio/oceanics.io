---
title: JavaScript Dependencies
date: 2020-10-23T09:00:00.000Z
description: |
    Getting into JavaScript dependencies always scared me, because web dev
    is the wild west and all that. I spend a not insignificant amount of time trying to remove dependencies. These are notes on the first order dependencies for this site, and why we use 'em.
    
tags: [javascript, gatsbyjs, dependencies, dev, "oceanics.io"]
---

## Intent

I spent a long time getting to a place I was happy with managing Python dependencies and scientific computing environments. 

None of that tooling carries over to the JS world, and (for me) it is a bit harder to isolate dependencies for web applications. Part of the issue is that all the JS code lives in a single repository, and is deployed as a single application.

This makes CI/CD very simple, at the expense of a bit of overhead in building.

The site has reached a moderately stable toolset, so I though it was time to sit down and remind myself what exactly all the dependencies in `package.json` do.

The site is bundled using GatsbyJS, so most of the dependencies will be related to React and the bundling/polyfilling process.

## Dev

Some of the dependencies are only required for development, and not for production. 

* `eslint` - Linting during build
* `eslint-plugin-react-hooks` - Enforce React rule of hooks
* `prettier` - Opinionated code formatter

## Application

Most of the code is used in generating text and image content.

* `@babel/core` - JS compiler for backwards compatibility
* `@babel/plugin-syntax-import-meta` - Parse module metadata
* `@mdx-js/mdx` - Write JSX in markdown
* `@mdx-js/react` - Write JSX in markdown
* `@wasm-tool/wasm-pack-plugin` - Define Rust build in Webpack config
* `babel-plugin-styled-components` - Babel support for Styled Components
* `babel-plugin-syntax-dynamic-import` - Async import of Rust/WASM runtime
* `babel-preset-gatsby` - Babel support for GatsbyJS
* `gatsby` - Static site generator
* `gatsby-cli` - CLI for GatsbyJS
* `gatsby-image` - Lazy loading of image elements
* `gatsby-link` - Component with pre-fetching
* `gatsby-plugin-create-client-paths` - Create non-static routes
* `gatsby-plugin-manifest` - Web manifest for progressive web apps
* `gatsby-plugin-mdx` - Write JSX in markdown
* `gatsby-plugin-offline` - Service worker tooling
* `gatsby-plugin-react-helmet` - Manage document head data
* `gatsby-plugin-sharp` - Image library wrapper
* `gatsby-plugin-styled-components` - Support for Styled Components
* `gatsby-react-router-scroll` - Scrolling support
* `gatsby-remark-copy-linked-files` - Copy files to public directory as necessary
* `gatsby-remark-images` - Process markdown images
* `gatsby-remark-katex` - Support for $\latex$
* `gatsby-remark-prismjs` - Code block formatting in markdown
* `gatsby-remark-responsive-iframe` - Container for iFrames in Markdown
* `gatsby-remark-smartypants` - Support for em dash and ellipsis from ASCII
* `gatsby-source-filesystem` - Data from local files
* `gatsby-transformer-remark` - Parse markdown
* `gatsby-transformer-sharp` - GraphQL support for image processing
* `katex` - $\latex$ rendering
* `mapbox-gl` - Client side WebGL based map application
* `pdfjs-dist` - Client side PDF manipulation
* `pg` - Serverside Postgres access
* `pluralize` - Consistent pluralization is harder than you think
* `prismjs` - Code block styling in Markdown
* `prop-types` - Strong typing for React components
* `react` -  The React framework
* `react-dom` - Renderer for React
* `react-helmet` - Document head manager
* `react-is` - Check if element is valid React component
* `react-router-dom` - React router DOM bindings
* `react-typography` - Wrapper for typography in React
* `remark-parse` - Parse markdown
* `styled-components` - Components with style, no more heavy-handed CSS
* `typography` - Typesetting
* `yaml` - Parse YAML files
