# Oceanics.io

![](content/assets/dagan.png)

The site is Oceanic.io homepage, and an application for analuzing and visualizing ocean data
in your browser using a modern serverless approach. The languages are JavaScript and Rust. Static rendering is with GatsbyJS and React. 

Backend services are provided by the Bathysphere API geospatial graph, which is documented elsewhere.

## Development

### Production pipeline

The static sites are hosted on Netlify: [![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)

When new commits are checked into the repository, the site is deployed to `oceanicsdotio.netlify.com`, which has the custom domain `www.oceanics.io`.

### JavaScript

JavaScript dependencies and builds are managed with `yarn`. 

The local development version is deployed with `yarn develop`, or `netlify dev`. The ports are `:8000` and `:8080` respectively.

See the `package.json` file for build scripts, etc.


### Rust/WASM

The frontend uses Rust compiled to web assembly (WASM). There is still a lot of JavaScript, but the numerical and graphics features have been ported over to Rust. This section is for for those interested in diving right in. 

Start developing on Rust/WASM with `rustup`, and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

The `wasm-bindgen` tooling packages WASM as an importable JavaScript library. This allows the binaries to be served along with the other static assets by compiling [without a bundler](https://github.com/rustwasm/wasm-bindgen/tree/master/examples/without-a-bundler).

The `Cargo.toml` config file describes the Rust dependencies. The build command is in the package. Use `yarn compile` to compile rust to webassembly and generate the necessary JavaScript bindings.
