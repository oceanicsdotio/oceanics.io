# Oceanics.io

[![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)

## About

Oceanics.io is a web application framework for portable high-performance computing and visualization workloads. Models run in the browser using Web Assembly, client side parallelism, and GPU acceleration. Backend services are provided through [our API](https://graph.oceanics.io).

The software is maintained by Oceanicsdotio LLC and provided as is with no warranty or guarantee. As we validate models we will provide uptime, accuracy, and suitability guarantees.

Collaborator welcome! Our core systems will always be open source.

<p align="center">
  <img width="50%" height="50%" src="content/assets/dagan.png">
</p>

## Developers

### Structure

The progressive web application is written in (order of LOC) JavaScript (React-Node), Rust, GLSL, and Go. We use GatsbyJS to build static assets in the CI/CD process. Client side interaction is accomplished with heavy use of React Hooks, and browser APIs.

The use of many languages adds some complex, but the structure ends up being pretty tidy.

The top-level directory `/` contains this `README.md` along with various configuration files and scripts for linting, compiling, bundling, and deploying the site. Subdirectories `/.github` and `/.storybook` contain additional configuration data.

Static data and documents live in `/content` and `/static`. The former is used by GatsbyJS to generate single page applications that _look like_ blog posts. Resources in `/static` are publicly addressable with the same route as the file name.

Source code for Netlify serverless functions is in `/functions` (NodeJS/Go). These are single purpose services that support secure data access, pre-processing, and sub-setting.

The main part of the application code is in `/src`.

Building locally produces additional artifacts.  

### Environment

The frontend uses Rust compiled to web assembly (WASM). [`Cargo.toml`](/Cargo.toml) describes the Rust crate dependencies. You'll need `rustup` and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

You need to set the environment variables `SPACES_ACCESS_KEY` and `SPACES_SECRET_KEY` to access data from secure S3 buckets. Locally we use a git-ignored `.envrc` file.

JavaScript dependencies and builds are managed with `yarn`. Deploy a local version to port `8000` with `yarn develop`. See [`package.json`](/package.json) for build scripts, etc.

When running `yarn build` or `yarn develop` GatsbyJS automatically triggers compilation. Errors in the code will cause the entire build to fail. There is no hot loading or automatic recompiling, as described in [`/gatsby-node.js`](/gatsby-node.js).  The build produces the `neritics` JavaScript module.

You can also use `yarn compile` to build.

### Deploy

Static assets are hosted on Netlify. When new commits are checked into the Github repository, the site is built and deployed to [https://www.oceanics.io](https://www.oceanics.io).
