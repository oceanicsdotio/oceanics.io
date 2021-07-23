# Oceanics.io

[![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)


Oceanics.io is a website and framework for running high-performance computing and visualization workloads for ocean science. Models run in the browser, using a combination of Rust/WASM and GLSL hardware acceleration.

Backend services are provided by our APIs, which are documented elsewhere.

<p align="center">
  <img width="50%" height="50%" src="content/assets/dagan.png">
</p>

## Development

### Production pipeline

The static sites are hosted on Netlify. When new commits are checked into the repository, the site is deployed to [oceanicsdotio.netlify.com](oceanicsdotio.netlify.com), which has the custom domain [www.oceanics.io](https://www.oceanics.io).

### JavaScript

JavaScript dependencies and builds are managed with `yarn`. 

The local development version is deployed with `yarn develop`, or `netlify dev`. The ports are `:8000` and `:8080` respectively.

See [`package.json`](/package.json) for build scripts, etc.


### Rust/WASM

The frontend uses Rust compiled to web assembly (WASM). There is still a lot of JavaScript, but the numerical and graphics features have been ported over to Rust. This section is for for those interested in diving right in. 

Start developing on Rust/WASM with `rustup`, and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

Gatsby triggers the build pipeline automatically! But, only on the excution of `yarn build` or `yarn develop`! There is no hot loading or automatic recompiling. This is decribed in [`gatsby-nodes.js`](/gatsby-node.js)

The [`Cargo.toml`](/Cargo.toml) config file describes the Rust dependencies. The `wasm-bindgen` and `wasm-pack` package WASM as an importable JavaScript library named `neritics`. Use `yarn compile` to compile rust to WASM and generate necessary JavaScript bindings, or see the command in [`package.json`](/package.json). 
