
# Bathysphere API

- [Developers](#developers)
    - [Develop](#develop)
    - [Deploy](#deploy)
    - [Manage](#manage)
    - [Test](#test)
- [Neo4j](#neo4j)
    - [Introduction](#introduction)
    - [Browser interface](#browser-interface)
    - [Python client](#python-client)
- [Postgres](#postgres)
    - [Extensions](#extensions)
    - [CloudSQL proxy](#cloudsql-proxy)
- [Redis](#redis)
- [Ingestion tips](#ingestion-tips)


Bathysphere is a distributed store and registry for public and proprietary geospatial data. It was originally designed to support aquaculture research in the Gulf of Maine, but is intentionally generic. 

The interface and utilities help ingest sensor and model data and metadata, and parse them into discoverable databases.

Services usually run in Docker containers configured to receive and route traffic between computing environments and networked devices. Data persist in cloud object storage, with `minio` as the default driver.

The runtime supports parallelism, and the web infrastructure scales to meet high throughput or availability requirements. 

This document provides guidance for testing and developing Bathysphere. For instructions on interacting with an existing deployment, please see the [API specification](https://graph.oceanics.io).

## Developers

### Develop

We use `pipenv` to manage Python dependencies. Thesre are found in `Pipfile` and `Pipfile.lock`. A new shell is activated with `pipenv shell`. Then:

1. `pipenv install -e .`
2. `pipenv install --dev`

There must also be several environment variables active for things to work. These are:

* `NEO4J_ACCESS_KEY` is the password for Neo4j instance
* `POSTGRES_SECRETS` is comma separated strings <username>,<password>,<cloudsqlInstance>
* `OBJECT_STORAGE_SECRETS` is comma separated strings <accessKey>,<secretKey>
* `DARKSKY_API_KEY` is the API key for an optional weather service that will be deprecated

We recommend using `direnv` to manage these in `.envrc`.

Developer documentation is generated from the code base using `pdoc3`. The command is:

``` bash
pdoc --html --output-dir openapi/docs bathysphere
```

A live version of these are available at https://graph.oceanics.io/docs/bathysphere

Not everything is documented or tested, and not everything works! Here are some tips to make that not an awful experience.

If you have problems because of docker versions (destructive!):
* `docker system prune -a`


### Modifying the web API

We use a multilayered, fail fast approach to validating and handling requests. Most of the validation happens before a request even reaches our code, by using the `connexion` and `prance` packages to enforce the OpenAPI specification.

This means that changes need to be made in at least two places if you want to add or modify a data model. This is the intended behavior, as it allows the specification to act as contract with front end clients.

Suppose you want a new graph entity `Missions`, as a high-level container for managing data from a series of operations. This could be implemented with `Collections`, or it could be a new subtype of `Entity` that logically connects `Things`, `Locations`, and either `DataStreams` for post-hoc anaylsis or `TaskingCapabilties` for planning.

First declare this in `openapi/api.yml` under `components/schemas`. 

1. Inherit from `Entity`
2. Add properties (already has `id`, `name`, and `description`). For instance, `conditions` could define go/no-go rules for starting a mission
3. Declare allowed linked types as `readOnly` and define multiplicity rules

** Pay careful attention to pluralization and case sensitivity **

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
* `test` - run developer tests
* `serve` - Serve documentation or testing coverage on the local machine
* `start` - Start the API server in the local environment
* `build` - Build Docker containers
* `redis-worker` - Start a worker process in remote redis instance
* `up` - Run Docker images
* `neo4j` - Run neo4j in Docker and open a browser interface to the management page
* `providers` - Manage API keys for accessing the databases, there must already be a database
* `object-storage` - List the contents of S3 repositories
* `cloud-sql-proxy` - Run local proxy to communicate with CloudSQL databases

Some of these will execute a subroutine, for example reading the contents of a remote S3 bucket. Commands with potential side effects simply print the command to the terminal. This allows you to see the generated command without running it. The evaluate it instead, wrap with `$()`.

### Test

Deploy just the graph database backend with `docker-compose up neo4j`. This should work! Follow the local link printed to the terminal, and follow the instructions below to familiarize yourself with Neo4j.

The `bathysphere/tests` directory contains unit and integration test code. This uses `pytest` for the testing framework. Tests can be run though the command line interface, once the package has been installed locally. You may also wish to devise your own subset of tests. 

We use markers, keywords, and dependencies to filter for tests. The custom markers are described in `pytest.ini`. The setup and utility functions for `pytest` are in `bathysphere/test/conftest.py`. 

The command for the default tests is `$(bathysphere test --kw=KEYWORD_STRING)`.

Testing will also populate the connected databases with the information described in `config/bathypshere.yml`. The default things are semi-fictious and won't suit your needs. Use them as examples to make your own. Most importantly, find an entry like this and make a copy, replacing it with your own information:

```
kind: Providers
metadata:
  owner: true
spec:
  name: Oceanicsdotio
  description: Research and development
  domain: oceanics.io
```

Then delete the `owner: true` from the Oceanicsdotio entry. Delete any default Providers that you don't want populated in the graph. These each have an API registration key created, so are not granted access rights by default and are safe to keep.  

Try just running `$(bathysphere test --kw=test_graph)` to test the graph database layer. This contains the core features and authentication capabilities of the API. All of the tests should pass.

Running tests this way will produce a directory `htmlcov` which contains test coverage statistics. These are listed in `.gitignore` and are therefore only stored locally. To serve the directory locally use `bathysphere serve htmlcov` to make these available on port 8000.

If you get permission errors, `pytest` is probably crawling a directory in use by Neo4j. This directory should be ignored by default in the commands generated by the CLI.

Use `bathysphere providers` to get the list of API keys for each mode of ingress. Using the desired API key as the `x-api-key` header, try creating an account by sending a `POST` request using something like Postmand to `/api/auth` with a JSON body like `{"username": "<YOUR EMAIL>", "password": "<SOME SECRET KEY>"}`. 

Using these credentials you should be able to get a JWT for further authorization, and be able to add and retrieve data.


### Deploy

First generate a `requirements.txt` file from `Pipfile` with `pipenv lock -r > requirements.txt`. This may take a while to resolve dependencies and conflicts. The actual installation is pretty quick. Build the necessary containers with `$(bathysphere build)`. 

The development environment is deployed locally with `$(bathysphere up)`, and the production environment with `kubectl`.

| Service             | Port   | Description                                 |
| ------------------- | ------ | ------------------------------------------- |
| `bathysphere`       | `5000` | Graph API gateway                           |
| `neo4j`             | `7687` | Graph database `bolt` protocol access       |
| `neo4j`             | `7474` | Graph database built-in browser and console |

The current version expects to have access to Google Cloud Functions. Functions use hash-based message authentication codes (HMAC) for cryptographic verification. The key is stored in a secret manager and is loaded to validate requests.


## Neo4j

### Introduction

The database manager runs in an extension of the [official container image](https://hub.docker.com/_/neo4j/), and maps the server ports to an external interface. The [built-in GUI](http://localhost:7474/browser/) is at `hostname:7474`, and the `bolt` [interface](https://boltprotocol.org/) defaults to `hostname:7687`. 

[Cypher](https://neo4j.com/docs/cypher-refcard/current/) is the Neo4j query language. Either cypher or `graphql` can be used to build the database, traverse nodes and edges, and return data. 

The `bolt` protocol is used for API calls from Python scripts. User authorization requires the environment variable `NEO4J_AUTH` to be declared in `docker-compose.yml`.

### Browser interface

The browser interface for the graph database is useful for debugging logical errors in the database structure. There is official documentation at the neo4j [website](https://neo4j.com/developer/neo4j-browser/).

Important features that are not obvious at first:
* `:sysinfo` will return status and storage statistics
* The command interface can execute queries through `bolt` or `http` REST queries
* Everything can be styled with a `.grass` file
* You can create guided introductions and presentations by creating a [custom browser guide](https://neo4j.com/developer/guide-create-neo4j-browser-guide/).

Our custom guide is an html slide deck in `/openapi/guide.html` and hosted at https://graph.oceanics.io/guide.html. This can be played within the browser by serving it locally, and loading with `:play localhost:<PORT>/openapi/guide.html`. 


### Python client

You can manage the database with the Python `neo4j-driver` package, installed with `pip install neo4j-driver`. 

Establish a connection to the database using Bolt, and start a session:

```python
from neo4j.v1 import GraphDatabase
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "neo4j"))
session = driver.session()
```

### Managed instances

We recommend a managed cluster for the production service, like the official Aura platform from Neo4j. Other methods for provisioning are given below to get you started. 

### Docker

If you are new to Neo4j, try deploying a local container to experiment:

```bash
docker run \
    --publish=7474:7474 \
    --publish=7473:7473 \
    --publish=7687:7687 \
    --volume=$HOME/neo4j/data:/data \
	oceanicsdotio/neo4j
```

### Docker Machine

Most cloud providers have an endpoint for docker. You can create a new node and deploy to it by use third party drivers with `docker-machine`:

```bash
# src/docker-machine-create.sh
docker-machine create \
--driver digitalocean \
--digitalocean-size s-2vcpu-4gb \
--digitalocean-access-token $DOCKER_MACHINE_PAK \
bathysphere-api-neo4j
```

Connect to your local environment to issue commands to the remote docker service, and then setup the node remotely through an `ssh` tunnel, and install `certbot`:

```bash
eval $(docker-machine env bathysphere-api-neo4j)
docker-machine ssh
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update
sudo apt-get install -y certbot
```


## Postgres

### Extensions

The back-end uses the `postgres` relational database, with the `timescaledb` and `postgis` extensions for time series and spatial data, respectively. A database is manually created and extended through queries with,

```sql
CREATE database bathysphere;
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

### Localhost

To develop with a local relational database, run and enter a `postgres` instance with the `exec` command:

```bash
docker run -d --name timescaledb -p 5432:5432 -e
	POSTGRES_PASSWORD=n0t_passw0rd
	timescale/timescaledb-postgis
	
docker exec -it timescaledb-postgis psql -U postgres
```

### CloudSQL Proxy

By default, the postgres interface uses unix sockets and a local proxy to talk to Google CloudSQL instances. 

If you have the `glcoud` command line utility authorized and have done this before, you should be able to start the local proxy with,

```
~/cloud_sql_proxy -dir=/cloudsql/
```

## Redis

We use `redis` for simple caching, pubsub style message queues, and asynchronous job execution.

This can use a local instance, but normally expects a Google Cloud instance to be available.

```
gcloud compute instances create redis-forwarder --machine-type=f1-micro
gcloud compute ssh redis-forwarder -- -N -L 6379:10.0.0.3:6379
```


## Ingestion tips

### Mount remote NetCDF files

Meshes and model data are often stored as NetCDF, which can be read remotely by mounting the host volume to your local environment (e.g. using [fuse](https://github.com/osxfuse/osxfuse/releases) and [sshfs](https://github.com/libfuse/sshfs)). 

On macOS `meson` and `ninja` are required, before downloading and install the `sshfs` tarball:

```bash
pip install meson
brew install ninja
gzip -d sshfs-3.3.2.tar.gz
tar -xvf sshfs-3.3.2.tar
cd sshfs-3.3.2
mkdir build
cd build
meson ..
sudo ninja install 
```

To mount the remote file system locally,

```bash
mkdir ~/remote/
sshfs username@hostname:/nfs-home/username/>>export ~/remote/
```

### Preprocess text files 

Topology and spatial data may also be saved in CSV files which require pre-processing. Space-delimited files can be converted to comma-delimited using `sed`, `cat`, and `cut`:

```bash
sed 's/[[:blank:]]/,/g' midcoast_nodes.csv > neo4j_nodes.csv
sed 's/[[:blank:]]/,/g' midcoast_elements.csv > neo4j_elements.csv
sed 's/,,/,/g' neo4j_elements.csv > new_elements.csv
cat new_elements.csv | cut -c 2- > neo4j_elements.csv
```
