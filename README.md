# Oceanics.io

[![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)

<p align="center">
  <img width="60%" src="https://www.oceanics.io/assets/dagan-sprite.gif">
</p>

## Contents

- [Oceanics.io](#oceanicsio)
  - [Contents](#contents)
  - [About](#about)
  - [Web application](#web-application)
  - [Environment](#environment)
  - [Database](#database)

## About

Oceanics.io is a web application for high-performance computing and visualization. The interface and utilities ingest sensor and model data and metadata, and parse them into discoverable databases. Simulations and analyses run in the browser using Web Assembly, client side parallelism, and GPU acceleration. 

This document describes this repository, and steps to modify the API. To use the software, [see documentation for our API](https://www.oceanics.io/bathysphere). Software is provided by Oceanicsdotio LLC under the [MIT license](https://github.com/oceanics-io/oceanics.io/blob/main/LICENSE) as is, with no warranty or guarantee. 

## Web application

We use a `yarn` monorepo and workspaces to manage code. The environment configuration is in `.yarnrc.yml`. There are version controlled plugins in `.yarn`. Workspaces and shared dependencies are defined in `package.json`. 

Static assets are hosted on Netlify. The deploy is setup in `netlify.toml`. When new commits are checked into the Github repository, the site is built and deployed to [https://www.oceanics.io](https://www.oceanics.io).

The build process is defined in `makefile`. 

The top-level directory also contains this `README.md` along with configuration files and scripts for linting, compiling, bundling, and deploying the site.

The `oceanics-io-www` workspace contains the TypeScript web application. Client side interaction is accomplished with React Hooks and browser APIs.

Netlify serverless functions that make up our API are `oceanics-io-api`. These are single purpose endpoints that support secure data access, pre-processing, and sub-setting.

The Rust-to-Web-Assembly libraries used by these workspaces are in `oceanics-io-*-rust`.

## Environment

These environment variables must be present for things to work:

- `NEO4J_HOSTNAME`: the hostname for Neo4j instance
- `NEO4J_ACCESS_KEY`: the password for Neo4j instance
- `SPACES_ACCESS_KEY`: for accessing storage
- `SPACES_SECRET_KEY`: for accessing storage
- `STORAGE_ENDPOINT`: the region and host for cloud storage
- `BUCKET_NAME`: the prefix to the storage endpoint
- `SERVICE_NAME`: grouping of data in storage
- `PORT`: used on localhost
- `SERVICE_PROVIDER_API_KEY`: Provider API key for registering accounts
- `SIGNING_KEY`: A signing ket for producing JWT in-application
- `SERVICE_ACCOUNT_USERNAME`: email for service account
- `SERVICE_ACCOUNT_PASSWORD`: password for service account
- `SERVICE_ACCOUNT_SECRET`: string for salting service key password
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: mapbox access token for map interface

## Database

You can run the database manager in an [official Neo4j container image](https://hub.docker.com/_/neo4j/), or use a managed service that supports the [cypher query language](https://neo4j.com/docs/cypher-refcard/current/)

Running automated tests populates the connected database with the examples described in `oceanics-io-www/public/bathysphere.yaml`. Use the default entities as examples to make your own.

If you are new to Neo4j, deploy a local container to kick the tires:

```bash
docker run \
    --publish=7474:7474 \
    --publish=7473:7473 \
    --publish=7687:7687 \
    --volume=$HOME/neo4j/data:/data \
    neo4j/neo4j
```

The [browser interface](http://localhost:7474/browser/) is useful for debugging data access layer errors. See [the official documentation for more info](https://neo4j.com/developer/neo4j-browser/).
