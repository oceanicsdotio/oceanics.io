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
  - [Populating database](#populating-database)
  - [Modifying the web API](#modifying-the-web-api)
  - [Neo4j](#neo4j)

## About

Oceanics.io is a web application for portable high-performance computing and visualization. The interface and utilities ingest sensor and model data and metadata, and parse them into discoverable databases. Simulations and analyses run in the browser using Web Assembly, client side parallelism, and GPU acceleration. 

This document describes this repository, and steps to modify the API. To use the software, [see documentation for our API](https://www.oceanics.io/bathysphere). Software is provided by Oceanicsdotio LLC under the [MIT license](https://github.com/oceanics-io/oceanics.io/blob/main/LICENSE) as is with no warranty or guarantee. 

## Web application

We use a `yarn` monorepo and workspaces to manage code. The environment configuration is in `.yarnrc.yml`. There are version controlled plugins in `.yarn`. 

The top-level directory `/` also contains this `README.md` along with configuration files and scripts for linting, compiling, bundling, and deploying the site.

The top-level `package.json` describes the workspaces and shared dependencies required to get a development environment up and running. Scripts defined at this level control building and testing the API, which depends on sibling libraries.

The `oceanics-io-www` workspace contains a TypeScript web application. Client side interaction is accomplished with React Hooks and browser APIs. Static data and documents live in `references/` and `public/`. The former is used by NextJS to generate single page applications. Resources in `public/` are addressable by at the route matching the file name.

Rust to web assembly libraries are in `oceanics-io-wasm`. These methods are used both in cloud functions and the web application.

Presentational aspects of the front-end are part of the `oceanics-io-ui` workspace, so these React components and hooks can be shared across applications. We use Storybook to develop and test at the component level.

Netlify serverless functions are `oceanics-io-fcns`. These are single purpose endpoints that support secure data access, pre-processing, and sub-setting.
 
Static assets are hosted on Netlify. The deploy is setup in `netlify.toml `. When new commits are checked into the Github repository, the site is built and deployed to [https://www.oceanics.io](https://www.oceanics.io).

## Environment

There must also be several environment variables active for things to work:

- `NEO4J_HOSTNAME` is the hostname for Neo4j instance
- `NEO4J_ACCESS_KEY` is the password for Neo4j instance
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

## Populating database

Testing populates the connected database with the examples described in `oceanics-io-www/public/bathysphere.yaml`. The default entities are semi-fictitious and won't suit your needs. Use them as examples to make your own.

Find an entry like this and make a copy, replacing it with your information:

```yaml
kind: Providers
metadata:
  owner: true
spec:
  name: Oceanicsdotio
  description: Research and development
  domain: oceanics.io
```

Delete the `owner: true` from the Oceanicsdotio entry. Delete any default Providers that you don't want populated in the graph. These each have an API registration key created, so are not granted access rights by default and are safe to keep.  

## Modifying the web API

Changes need to be made in at least two places if you want to add or modify a data model. This is the intended behavior, as it allows the API specification to act as contract with front end clients.

Suppose you want a new subtype of `Entity` called `Missions`, as a pattern for connecting data from a series of operations. This could logically connect `Things`, `Locations`, and either `DataStreams` for post-hoc analysis or `TaskingCapabilities` for planning.

First declare this in `oceanics-io/public/bathysphere.yaml` under `components/schemas`.

1. Inherit from `Entity`
2. Add properties (already has `id`, `name`, and `description`). For instance, `conditions` could define go/no-go rules for starting a mission
3. Declare allowed linked types as `readOnly` and define multiplicity rules

Here, an example:

```yml
    Mission:

      allOf:
        - $ref: '#/components/schemas/Entity'
        - type: object
          properties:

            conditions:
              type: array
              items:
                type: object
                properties:
                  script:  # some command to extract a single value for comparison
                    type: string
                    default: "curl https://some-service-endpoints | ./blah.sh"
                  threshold:
                    type: float
                  flag:
                    type: bool

            Locations:
              readOnly: true
              oneOf:

                - type: array
                  title: references
                  minItems: 1
                  items:
                    type: string

                - type: array
                  title: objects
                  minItems: 1
                  items:
                    type: object

            Things:
              readOnly: true
              oneOf:

                - type: array
                  title: references
                  minItems: 1
                  items:
                    type: string

                - type: array
                  title: objects
                  minItems: 1
                  items:
                    type: object

            TaskingCapabilities:
              readOnly: true
              oneOf:

                - type: array
                  title: references
                  minItems: 1
                  items:
                    type: string

                - type: array
                  title: objects
                  minItems: 1
                  items:
                    type: object
```

This now needs to be referenced in `EntityCollection:` and `EntityClass:` schemas, as well the the `Entity:` entries in `requestBodies:` and `responses:` so that the API validator will allow requests carrying `Mission` records. Then add the class definitions to `oceanic-io-fcn` type definitions. We leave this to you. 

Default values should be undefined to allow search algorithms to use generic instances, `Missions()` or `Missions(name="Operation Ivy")` as a matching patterns. 

## Neo4j

You can run the database manager in an [official Neo4j container image](https://hub.docker.com/_/neo4j/), or use a managed service that supports the cypher query language. [Cypher](https://neo4j.com/docs/cypher-refcard/current/) is the Neo4j query language. Either cypher or `graphql` can be used to build the database, traverse nodes and edges, and return data.

The [built-in GUI](http://localhost:7474/browser/) is at `hostname:7474`, and the `bolt` [interface](https://boltprotocol.org/) defaults to `hostname:7687`. The browser interface for the graph database is useful for debugging logical errors in the database structure. There is official documentation at the neo4j [website](https://neo4j.com/developer/neo4j-browser/).

Important features that are not obvious at first:

- `:sysinfo` will return status and storage statistics
- The command interface can execute queries through `bolt` or `http` REST queries
- Everything can be styled with a `.grass` file
- You can create guided introductions and presentations by creating a [custom browser guide](https://neo4j.com/developer/guide-create-neo4j-browser-guide/).

If you are new to Neo4j, try deploying a local container to experiment:

```bash
docker run \
    --publish=7474:7474 \
    --publish=7473:7473 \
    --publish=7687:7687 \
    --volume=$HOME/neo4j/data:/data \
    neo4j/neo4j
```
