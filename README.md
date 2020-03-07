# Oceanics.io

[![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)

The site is the homepage, and an application. The language are JavaScript and Rust. 



# JS Development

The local development version is deployed with `gatsby develop`, or `netlify dev`. The login functions using Netlify Identity will not work unless running with the later. The ports are `:8000` and `:8080` respectively.

The JavaScript dependencies and builds are managed with `yarn`. 



# WASM Development

The frontend uses Rust compiled to web assembly (WASM) in the frontend. 

To develop on WASM, you can get started with `rustup`, and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

The `wasm-bindgen` tooling packages WASM to interact with Javascript, and can be served 
as static files by compiling [without a bundler](https://github.com/rustwasm/wasm-bindgen/tree/master/examples/without-a-bundler)



# Production

When new commits are checked into the Bitbucket repository, the site is deployed to `oceanicsdotio.netlify.com`, which has the custom domain `oceanics.io`.

The `functions-src` directory contains the Netlify functions to deploy along side the site. Currently these include features for user authorization, and secure API calls.

User management is through Netlify Identity for the time being.  



