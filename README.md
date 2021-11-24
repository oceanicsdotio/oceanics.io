# Oceanics.io

![Test](https://github.com/oceanicsdotio/oceanics.io/workflows/Test/badge.svg)
![Rust](https://github.com/oceanicsdotio/oceanics.io/workflows/Rust/badge.svg)
![CodeQL](https://github.com/oceanicsdotio/oceanics.io/workflows/CodeQL/badge.svg)
[![Netlify Status](https://api.netlify.com/api/v1/badges/ad77195f-da0a-428f-ad2d-8dc5f45b3858/deploy-status)](https://app.netlify.com/sites/oceanicsdotio/deploys)


<p align="center">
  <img width="75%" src="static/dagan-sprite.gif">
</p>

## Contents

- [Oceanics.io](#oceanicsio)
  - [Contents](#contents)
  - [About](#about)
  - [Developers](#developers)
    - [Web application](#web-application)
    - [Quick start](#quick-start)
    - [Python](#python)
    - [Modifying the web API](#modifying-the-web-api)
    - [Manage](#manage)
  - [Neo4j](#neo4j)
    - [Browser interface](#browser-interface)

## About

Oceanics.io is a web application for portable high-performance computing and visualization.

The interface and utilities ingest sensor and model data and metadata, and parse them into discoverable databases. These services usually run in Docker containers configured to receive and route traffic between computing environments and networked devices. Data persist in cloud object storage.

Simulations run in the browser using Web Assembly, client side parallelism, and GPU acceleration. Backend services are provided through [our graph-based API](https://www.oceanics.io/bathysphere) for proprietary ocean data.

The runtime supports parallelism, and infrastructure scales to meet high throughput or availability requirements.

Software is maintained by Oceanicsdotio LLC and provided as is with no warranty or guarantee. Our core systems will always be open source, and we welcome collaboration.

## Developers

### Web application

The progressive web application is written in JavaScript, Rust, GLSL, and Go. We use GatsbyJS to build static assets during the CI/CD process.

Client side interaction is accomplished with React Hooks and browser APIs.

Using many languages adds complex, but the structure ends up being tidy.

The top-level directory `/` contains this `README.md` along with various configuration files and scripts for linting, compiling, bundling, and deploying the site.

Static data and documents live in `/content` and `/static`. The former is used by GatsbyJS to generate single page applications that _look like_ blog posts. Resources in `/static` are publicly addressable with the same route as the file name.

Source code for Netlify serverless functions is in `/functions` (NodeJS/Go). These are single purpose services that support secure data access, pre-processing, and sub-setting.

The main part of the application code is in `/src`.

Building locally produces additional artifacts.  

Static assets are hosted on Netlify. When new commits are checked into the Github repository, the site is built and deployed to [https://www.oceanics.io](https://www.oceanics.io).

### Quick start

The frontend uses Rust compiled to web assembly (WASM). [`Cargo.toml`](/Cargo.toml) describes the Rust crate dependencies. You'll need `rustup` and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
```

You need to set the environment variables `SPACES_ACCESS_KEY` and `SPACES_SECRET_KEY` to access data from secure S3 buckets. Locally we use a git-ignored `.envrc` file.

JavaScript dependencies and builds are managed with `yarn`. Deploy a local version to port `8000` with `yarn develop`. See [`package.json`](/package.json) for build scripts, etc.

When running `yarn build` or `yarn develop` GatsbyJS automatically triggers compilation. Errors in the code will cause the entire build to fail. There is no hot loading or automatic recompiling, as described in [`/gatsby-node.js`](/gatsby-node.js).  The build produces the `neritics` JavaScript module.

You can also use `yarn compile` to build.

### Python

There must also be several environment variables active for things to work. 

These are:

- `NEO4J_ACCESS_KEY` is the password for Neo4j instance
- `POSTGRES_SECRETS` is comma separated strings `<username>,<password>,<cloudsqlInstance>`
- `OBJECT_STORAGE_SECRETS` is comma separated strings `<accessKey>,<secretKey>`
- `DARKSKY_API_KEY` is the API key for an optional weather service that will be deprecated
- `SPACES_ACCESS_KEY`: for accessing storage
- `SPACES_SECRET_KEY`: for accessing storage
- `STORAGE_ENDPOINT`: the region and host for cloud storage
- `BUCKET_NAME`: the prefix to the storage endpoint
- `SERVICE_NAME`: grouping of data in storage
- `PORT`: used locally and by Google Cloud Run

We recommend using `direnv` to manage these in `.envrc`.


### Modifying the web API

We use a multilayered, fail fast approach to validating and handling requests. Most of the validation happens before a request even reaches our code, by using the `connexion` and `prance` packages to enforce the OpenAPI specification.

This means that changes need to be made in at least two places if you want to add or modify a data model. This is the intended behavior, as it allows the specification to act as contract with front end clients.

Suppose you want a new graph entity `Missions`, as a high-level container for managing data from a series of operations. This could be implemented with `Collections`, or it could be a new subtype of `Entity` that logically connects `Things`, `Locations`, and either `DataStreams` for post-hoc analysis or `TaskingCapabilities` for planning.

First declare this in `openapi/api.yml` under `components/schemas`.

1. Inherit from `Entity`
2. Add properties (already has `id`, `name`, and `description`). For instance, `conditions` could define go/no-go rules for starting a mission
3. Declare allowed linked types as `readOnly` and define multiplicity rules

*Pay careful attention to pluralization and case sensitivity.*

Here is an example:

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
                  flag"
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

This now need to be referenced in `EntityCollection:` and `EntityClass:` schemas, as well the the `Entity:` entries in `requestBodies:` and `responses:` so that the API will allow requests carrying `Mission` records.

Now add the class definitions to `bathysphere/models.py` and `bathysphere/graph/models.py`. The first makes the data model available to all parts of bathysphere. The second inherits from the first, and makes the data model available in the graph database service.

Default values **should always be `default=None`** to allow search algorithms to use an basic instance, `Missions()` or `Missions(name="Operation Ivy")`, to be used as a matching pattern. Hard coding values will restrict search to parts of the graph that have been created with that default.

```python
# bathysphere/models.py
@attr.s(repr=False)
class Missions:  # note plural
    """Base model with minimum properties required to work"""
    name: str = attr.ib(default=None)
    description: str = attr.ib(default=None)
    conditions: [dict] =  attr.ib(default=None)

# bathysphere/graph/models.py
@attr.s(repr=False)
class Missions(Entity, models.Missions):
    """Graph extension to base model"""
```

### Manage

The Python application provides configurations and management tools through `click`.

The commands are:

- `test`, run developer tests
- `serve`, Serve documentation or testing coverage on the local machine
- `start`, Start the API server in the local environment
- `build`, Build Docker containers
- `up`, Run Docker images
- `neo4j`, Run neo4j in Docker and open a browser interface to the management page
- `providers`, Manage API keys for accessing the databases, there must already be a database
- `object-storage`, List the contents of S3 repositories

Some of these will execute a subroutine, for example reading the contents of a remote S3 bucket. Commands with potential side effects simply print the command to the terminal. This allows you to see the generated command without running it. The evaluate it instead, wrap with `$()`.

## Neo4j

The database manager runs in an extension of the [official container image](https://hub.docker.com/_/neo4j/), and maps the server ports to an external interface. The [built-in GUI](http://localhost:7474/browser/) is at `hostname:7474`, and the `bolt` [interface](https://boltprotocol.org/) defaults to `hostname:7687`.

[Cypher](https://neo4j.com/docs/cypher-refcard/current/) is the Neo4j query language. Either cypher or `graphql` can be used to build the database, traverse nodes and edges, and return data.

The `bolt` protocol is used for API calls from Python scripts. User authorization requires the environment variable `NEO4J_AUTH` to be declared in `docker-compose.yml`.

If you are new to Neo4j, try deploying a local container to experiment:

```bash
docker run \
    --publish=7474:7474 \
    --publish=7473:7473 \
    --publish=7687:7687 \
    --volume=$HOME/neo4j/data:/data \
    neo4j/neo4j
```

### Browser interface

The browser interface for the graph database is useful for debugging logical errors in the database structure. There is official documentation at the neo4j [website](https://neo4j.com/developer/neo4j-browser/).

Important features that are not obvious at first:

- `:sysinfo` will return status and storage statistics
- The command interface can execute queries through `bolt` or `http` REST queries
- Everything can be styled with a `.grass` file
- You can create guided introductions and presentations by creating a [custom browser guide](https://neo4j.com/developer/guide-create-neo4j-browser-guide/).

Our custom guide is an html slide deck in `/openapi/guide.html` and hosted at <https://graph.oceanics.io/guide.html>. This can be played within the browser by serving it locally, and loading with `:play localhost:<PORT>/openapi/guide.html`.
