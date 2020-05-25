# Oceanics.io

![](content/assets/dagan.png)

The site is the homepage, and an application. The languages are JavaScript and Rust. Static rendering is with GatsbyJS and React. 

The static sites are hosted on Netlify: [![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)

Backend services are provided by the Bathysphere API geospatial graph, which is documented elsewhere.


## Development

### Production pipeline

When new commits are checked into the Bitbucket repository, the site is deployed to `oceanicsdotio.netlify.com`, which has the custom domain `oceanics.io`.

The `functions-src` directory contains the Netlify functions to deploy along side the site. Currently these include features for user authorization, and secure API calls.

User management is through Netlify Identity for the time being. 

### JavaScript

The local development version is deployed with `gatsby develop`, or `netlify dev`. The login functions using Netlify Identity will not work unless running with the later. The ports are `:8000` and `:8080` respectively.

The JavaScript dependencies and builds are managed with `yarn`. 

### Rust/WASM

The frontend uses Rust compiled to web assembly (WASM). This section is for for those interested in diving right in. Start developing on Rust/WASM with `rustup`, and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

The `wasm-bindgen` tooling packages WASM as an importable JavaScript library. This allows the binaries to be served along with the other static assets by compiling [without a bundler](https://github.com/rustwasm/wasm-bindgen/tree/master/examples/without-a-bundler).

 `Cargo.toml` describes the Rust dependencies. The build command is in the package. Use `yarn run build-wasm` to compile rust to webassembly and generate the necessary JavaScript bindings.

### Rust library

There is still a lot of JavaScript, but the numerical and graphics features have been ported over to Rust. 

The structure of the library is:

`agent.rs` - Agent-based simulations
`lib.rs` - Main routines and boiler plate code
`series.rs` - Time series manipulation, string methods, linked lists, tries, and such
`tessellate.rs` - Model generation, triangulation, and other discretization methods
`webgl.rs` - WebGL handlers and utilities for compiling client side (GPU) shaders

 

