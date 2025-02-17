# Oceanics.io

## Contents

- [Oceanics.io](#oceanicsio)
  - [Contents](#contents)
  - [About](#about)
  - [Getting started](#getting-started)
  - [Environment](#environment)
  - [Dead code and unused dependencies](#dead-code-and-unused-dependencies)
  - [Troubleshooting](#troubleshooting)

## About

Software is provided by Oceanicsdotio LLC under the [MIT license](https://github.com/oceanics-io/oceanics.io/blob/main/LICENSE) as is, with no warranty or guarantee. 

## Getting started

The top-level directory contains this `README.md` along with configuration files and scripts for linting, compiling, bundling, and deploying.

The site is hosted on Netlify. The build process is setup in `netlify.toml` and `makefile`. Local testing requires the Netlify CLI, which is installed from the parent module.

We use `yarn` to manage code. The environment configuration lives in `.yarnrc.yml`, and version controlled plugins in `.yarn`. Shared dependencies are defined in `package.json`.

The `app` directory contains our NextJS web page. Client interaction is through React Hooks and browser APIs.

Netlify serverless `functions` provide our backend. These are single purpose endpoints that support secure data access and processing.

Running `make out` will build packages.

Running `make test` pushed to a test environment and populates the connected database with the examples described in `specification.yaml`.

## Environment

These environment variables must be present for things to work:

- `NEO4J_HOSTNAME`: the hostname for Neo4j instance
- `NEO4J_ACCESS_KEY`: the password for Neo4j instance
- `JWT_SIGNING_KEY`: A signing key for e-mail verification
- `SERVICE_ACCOUNT_USERNAME`: email for service account
- `SERVICE_ACCOUNT_PASSWORD`: password for service account
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: mapbox access token for map interface

## Dead code and unused dependencies

Use `machete` for Rust dependencies:
https://github.com/bnjbvr/cargo-machete

Use `yarn depcheck` for Yarn/Node, which is already installed in the environment. This will return false positives for packages that are used in `makefile`, or that are imported in Rust code using `wasm_bindgen`.

## Troubleshooting

Some tips that could help save some time...

- Neo4j routing error: Likely that the URL or password for the database instance are out of date in the web UI. Can be applied from the commandline, by updating the `.env` to match the `.envrc`.
- 502 Gateway Error: a Neo4j routing error from bad credentials or URL can result in this status code
- Yarn updates: when you are ready to update the version of yarn used, run `yarn set version stable`, followed by an install.
