# Oceanics.io

## Contents

- [Oceanics.io](#oceanicsio)
  - [Contents](#contents)
  - [About](#about)
  - [Getting started](#getting-started)
  - [Environment](#environment)
  - [Logging](#logging)
  - [Dead code and dependencies](#dead-code-and-dependencies)
  - [Troubleshooting](#troubleshooting)

## About

This document is for developers of [https://www.oceanics.io](https://www.oceanics.io), a web application for high-performance computing and visualization. 

Software is provided by Oceanicsdotio LLC under the [MIT license](https://github.com/oceanics-io/oceanics.io/blob/main/LICENSE) as is, with no warranty or guarantee. 

## Getting started

The top-level directory contains this `README.md` along with configuration files and scripts for linting, compiling, bundling, and deploying.

The site is hosted on Netlify. The build process is setup in `netlify.toml` and `makefile`. Local testing requires the Netlify CLI, which is installed from the parent module.

We use `yarn` to manage code. The environment configuration lives in `.yarnrc.yml`, and version controlled plugins in `.yarn`. Shared dependencies are defined in `package.json`.

The `app` directory contains our NextJS web page. Client interaction is through React Hooks and browser APIs.

Netlify serverless `functions` provide our backend. These are single purpose endpoints that support secure data access and processing.

You can run the Neo4j database manager in a [Neo4j container image](https://hub.docker.com/_/neo4j/), or use a managed service that supports [cypher](https://neo4j.com/docs/cypher-refcard/current/).

Running `make out` will build packages, and `make dev` will build and run a local API and web server.

Running `make test` populates the connected database with the examples described in `specification.yaml`.

## Environment

These environment variables must be present for things to work:

- `NEO4J_HOSTNAME`: the hostname for Neo4j instance
- `NEO4J_ACCESS_KEY`: the password for Neo4j instance
- `SPACES_ACCESS_KEY`: for accessing storage
- `SPACES_SECRET_KEY`: for accessing storage
- `STORAGE_ENDPOINT`: the region and host for cloud storage
- `BUCKET_NAME`: the prefix to the storage endpoint
- `SERVICE_PROVIDER_API_KEY`: Provider API key for registering accounts
- `JWT_SIGNING_KEY`: A signing key for e-mail verification
- `SERVICE_ACCOUNT_USERNAME`: email for service account
- `SERVICE_ACCOUNT_PASSWORD`: password for service account
- `SERVICE_ACCOUNT_SECRET`: string for salting service key password
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: mapbox access token for map interface

## Logging

Logging is [through Logtail for JavaScript](https://docs.logtail.com/integrations/javascript). If you want to get performance metrics from the log database, you can use a query like:
```sql
SELECT
  count(*) as requests,
  JSONExtract(json, 'event', 'httpMethod','Nullable(String)') AS method,
  JSONExtract(json, 'event', 'path','Nullable(String)') AS function,
  avg(JSONExtract(json, 'duration','INT')) AS duration
FROM {{source}}
WHERE
  method IS NOT NULL
GROUP BY method, function
```

## Dead code and dependencies

Unused code and dependencies should be removed as a matter of course.

Use `machete` for Rust dependencies:
https://github.com/bnjbvr/cargo-machete

Use `yarn depcheck` for Yarn/Node, which is already installed in the environment. This will return false positives for packages that are used in `makefile`, or that are imported in Rust code using `wasm_bindgen`.

## Troubleshooting

Some tips that could help save some time...

- Neo4j routing error: Likely that the URL or password for the database instance are out of date in the web UI. Can be applied from the commandline, by updating the `.env` to match the `.envrc`.
- Yarn updates: when you are ready to update the version of yarn used, run `yarn set version stable`, followed by an install.
