# Oceanics.io

## Contents

- [Oceanics.io](#oceanicsio)
  - [Contents](#contents)
  - [About](#about)
  - [Build](#build)
  - [Testing](#testing)
  - [Environment](#environment)
  - [Dead code and unused dependencies](#dead-code-and-unused-dependencies)
  - [Troubleshooting](#troubleshooting)

## About

Software is provided by Oceanicsdotio LLC under the [MIT license](https://github.com/oceanics-io/oceanics.io/blob/main/LICENSE) as is, with no warranty or guarantee. 

The top-level directory contains this `README.md` along with configuration files and scripts for linting, compiling, bundling, and deploying.

The site is hosted on Netlify. The build process is setup in `netlify.toml` and `makefile`.

We use `yarn` to manage code. The environment configuration lives in `.yarnrc.yml`, and version controlled plugins in `.yarn`. Shared dependencies are defined in `package.json`. Yarn itself can be updated with `yarn set version stable`. Netlify build requires using `node-modules`, and prevents migrating to Yarn PnP.

The `app` directory contains our NextJS web page. Client interaction is through React Hooks and browser APIs.

Netlify serverless `functions` provide our backend. These are single purpose endpoints that support secure data access and processing.

## Build

Running `make out` will build packages.

## Testing

Running `make test` pushes to a test environment and populates the connected database with the examples described in `specification.yaml`.

Both frontend and backend will be deployed, but at this time tests only run against `functions`.

## Environment

Some environment variables are required for things to work.

Most apply to `functions`:
- `NEO4J_HOSTNAME`: the database hostname
- `NEO4J_ACCESS_KEY`: the database password
- `JWT_SIGNING_KEY`: A signing key for transaction verification
- `POSTMARK_SERVER_API_TOKEN`: credentials for sending out of band verification emails
- `SITE_RECAPTCHA_SECRET`: secret for Google ReCaptcha verification

These need to be defined in Netlify cloud, but it can help to have saved locally for debugging. Building locally and deploying to Netlify requires these variables in the `netlify.toml` file:
- `NODE_VERSION`: Node version used to build functions, also the default runtime for functions when deployed
- `NETLIFY_NEXT_PLUGIN_SKIP`: We define our our build process and pre-build static assets

Fewer are used [publicly by Next](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables#bundling-environment-variables-for-the-browser) `app`:
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: mapbox access token for map interface
- `NEXT_PUBLIC_SITE_RECAPTCHA_KEY`: Google ReCaptcha frontend key

These are inlined during the `next build` process, and need to be defined only in the local `.envrc`, along with:
- `NETLIFY_AUTH_TOKEN`: Personal access token for deploying site
- `NETLIFY_SITE_ID`: linking to specific Netlify site

Testing with `functions.spec.ts` also service account credentials defined in `.envrc`:
- `SERVICE_ACCOUNT_USERNAME`: email for service account
- `SERVICE_ACCOUNT_PASSWORD`: password for service account

## Dead code and unused dependencies

Use `machete` for Rust dependencies:
https://github.com/bnjbvr/cargo-machete

Use `yarn depcheck` for Yarn/Node, which is already installed in the environment. This will return false positives for packages that are used in `makefile`, or that are imported in Rust code using `wasm_bindgen`.

## Troubleshooting

Some tips that could help save some time...

- Neo4j routing error: Likely that the URL or password for the database instance are out of date in the web UI. Can be applied from the commandline, by updating the `.env` to match the `.envrc`.
- 502 Gateway Error: a Neo4j routing error from bad credentials or URL can result in this status code
- Yarn updates: when you are ready to update the version of yarn used, run `yarn set version stable`, followed by an install.
- Yarn nodeLinker: Netlify does not support PnP as a nodeLinker, you gotta use node-modules
