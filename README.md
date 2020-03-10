
# Bathysphere API

- [Deploy](#deploy)
- [Functions](#functions)
- [Neo4j](#neo4j)
- [Cypher](#cypher)
- [Ingestion Tips](#ingestion-tips)
- [Postgres](#postgres)

Bathysphere is a distributed store and registry for public and proprietary geospatial data. It was originally designed to support aquaculture research in the Gulf of Maine, but is intentionally generic. 

The interface and utilities help ingest sensor and model data and metadata, and parse them into discoverable databases.

Services usually run in Docker containers configured to receive and route traffic between computing environments and networked devices. Data persist in cloud object storage, with `minio` as the default driver.

The runtime supports parallelism, and the web infrastructure scales to meet high throughput or availability requirements. 

This document provides guidance for testing and developing Bathysphere. For instructions on interacting with an existing deployment, please see the [API specification](https://graph.oceanics.io).

## Deploy

The development environment is deployed locally with `docker-compose up -d`, and the production environment with `kubectl`.

| Service             | Port   | Description                                 |
| ------------------- | ------ | ------------------------------------------- |
| `nginx`             | `80`   | OpenAPI specification                       |
| `bathysphere-graph` | `5000` | Graph API gateway                           |
| `bathysphere-array` | `5000` | Array processing service                    |
| `neo4j`             | `7687` | Graph database `bolt` protocol access       |
| `neo4j`             | `7474` | Graph database built-in browser and console |

## Commandline interface

The Python application provides configurations and management tools through `click`. 

This is a work in progress and will be documented more fully in the future.



## Functions

Extensions to the core API are provided through the `/functions` end point. This is provided either by an `openfaas` [gateway](https://github.com/openfaas/workshop/blob/master), or by cloud vender-specific
Functions-as-a-Service platforms. 

The current version expects to have access to Google Cloud Functions. Functions use hash-based message authentication codes (HMAC) for cryptographic verification. The key is stored in a secret manager and is loaded to validate requests.


## Neo4j

The database manager runs in an extension of the [official container image](https://hub.docker.com/_/neo4j/), and maps the server ports to an external interface. The [built-in GUI](http://localhost:7474/browser/) is at  `hostname:7474`, and the `bolt` [interface](https://boltprotocol.org/) defaults to  `hostname:7687`. 

The `bolt` protocol is used for API calls from Python scripts. User authorization requires the environment variable `NEO4J_AUTH`. 

We recommend a managed cluster for the production service, like the official Aura platform from Neo4j. Other methods for provisioning are given below to get you started. 

### Localhost

If you are new to Neo4j, try deploying a local container to experiment:

```bash
docker run \
    --publish=7474:7474 \
    --publish=7473:7473 \
    --publish=7687:7687 \
    --volume=$HOME/neo4j/data:/data \
	oceanicsdotio/neo4j
```

### Docker machine

Most cloud providers have an endpoint for docker. You can create a new node and deploy to it by use third party drivers with `docker-machine`:

```bash
# src/docker-machine-create.sh
docker-machine create \
--driver digitalocean \
--digitalocean-size s-2vcpu-4gb \
--digitalocean-access-token $DOCKER_MACHINE_PAK \
bathysphere-api-neo4j
```

Connect you local environment to issue commands to the remote docker service, and then setup the node remotely through an `ssh` tunnel, and install `certbot`:

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



## Cypher

[Cypher](https://neo4j.com/docs/cypher-refcard/current/) is the Neo4j query language. Either can be used to build the database, traverse nodes and edges, and return data. You can manage the database with the Python `neo4j-driver` package, installed with `pip install neo4j-driver`. 

Establish a connection to the database using Bolt, and start a session:

```python
from neo4j.v1 import GraphDatabase
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "neo4j"))
session = driver.session()
```

Using a 3D model as an example, here are some basic queries. 

Return a specific triangle, child vertices, and their relationships:

```sql
MATCH (v:Vertex)-[]->(t:Triangle {id: 100})
RETURN v, t
```

Return neighbor indices of vertices connected to a named vertex through a named parent:

```sql
MATCH (:Vertex {id: 118})-[]->(:Triangle {id: 100})<-[]-(v:Vertex)
RETURN n.id
```

Return the number of  within 2 strides of named element,

```sql
MATCH (v:Vertex)-[*1..3]-(t:Triangle {id: 152})
RETURN count(DISTINCT v)
```

Return the center coordinates of a triangle,

```sql
MATCH (v:Vertex)-[]-(:Triangle {id: 10000})
RETURN avg(v.x), 
```



Nodes are neighbors if they share a parent. Each node gets a **non-directional** neighbor relationship with unique nodes that joined by a parent:

```sql
MATCH (a:Node)-[:SIDE_OF]->(:Cell)<-[:SIDE_OF]-(b:Node) 
MERGE (a)-[:NEIGHBORS]-(b)
```

Cells are neighbors if they share two child nodes. Crawling all node and cell combinations would be really slow, and we already created edges as neighbor relationships between nodes. Use those to create cell neighbors, since they are one-to-one, **with one notable exception**. Edges joining boundary nodes will not have cell-cell neighbor relationships.

```
MATCH (a:Node {id: 0})
MATCH (a)-->(b)-[:SIDE_OF]->(c:Element)<-[:SIDE_OF]-(a)
WITH collect(DISTINCT c.id) AS candidates
MATCH 
RETURN candidates

MATCH (a)-->(b)--(c)--(a)
MATCH (b)-->(candidates:Element)<--(c)
WITH DISTINCT candidates AS unique, parents
WITH collect(unique.id) AS cans, collect(parents.id) AS pars
RETURN apoc.coll.intersection(cans, pars)

RETURN a.id, b.id, c.id

WITH a, b
MATCH (a)-[:SIDE_OF]->(e:Element)
UNWIND b.id AS nb
MATCH p = (:Node {id: nb})-[:SIDE_OF]->(e)<--(a)
RETURN e.id

UNWIND b.id as nb
MATCH (:Node {id: nb})-->(start:Element)<--(a)-[:NEIGHBORS]->(:Node {id: nb})->(end:Element)<--(a)
RETURN nb.id, b.id, e.id
```



## Ingestion tips

### Mount remote NetCDF files with NFS

Meshes are often stored as NetCDF, which can be read remotely by mounting the host volume to your local environment (e.g. using [fuse](https://github.com/osxfuse/osxfuse/releases) and [sshfs](https://github.com/libfuse/sshfs)). On macOS `meson` and `ninja` are required, before downloading and install the `sshfs` tarball:

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

### Import bulk CSV data with Neo4j 

Topology may also be saved in CSV files which require pre-processing. Space-delimited files can be converted to comma-delimited using `sed`, `cat`, and `cut`:

```bash
sed 's/[[:blank:]]/,/g' midcoast_nodes.csv > neo4j_nodes.csv
sed 's/[[:blank:]]/,/g' midcoast_elements.csv > neo4j_elements.csv
sed 's/,,/,/g' neo4j_elements.csv > new_elements.csv
cat new_elements.csv | cut -c 2- > neo4j_elements.csv
```

A single triangular element/cell in a 2-D mesh consists of seven graph nodes: three vertices, three edges, and one element. The former are related to the latter by the `SIDE_OF` relationship. The vertices and edges are shared by other edges and elements, which they are also `SIDE_OF`.

CSV data are ingested with `LOAD CSV`, which [loads data](https://neo4j.com/developer/guide-import-csv/) from a uniform resource identifier (URI). Vertices are loaded first, and relationships built in the second call. The process calls `CREATE` for each line of the input file. Explicit IDs are used for mapping between global and local domains when partitioning the graph. The files need to be in `/var/lib/neo4j/import` of the database container. At this point, it it worth noting, that if data entry goes wrong, you can abort and remove all nodes and relationships with `MATCH (n) DETACH DELETE n`.

Create vertices:

```sql
USING PERIODIC COMMIT
LOAD CSV FROM "file:///neo4j_nodes.csv" AS line
CREATE (n:Node { id: toInteger(line[0]), latitude: toFloat(line[1]), longitude: toFloat(line[2]), depth: toFloat(line[3]) })
```

Create elements:

```sql
USING PERIODIC COMMIT
LOAD CSV FROM "file:///neo4j_elements.csv" AS line
CREATE ( e:Element { id: toInteger(line[0]) } )
```

### Build graph in multiple passes

To limit future results to non-duplicates, enforce:

```sql
CREATE CONSTRAINT ON (e:Element) ASSERT e.id IS UNIQUE
CREATE CONSTRAINT ON (n:Node) ASSERT n.id IS UNIQUE
```

This automatically creates an index on ID. Depending on the structure of your queries, it may be useful to manually index a property, such as the node ID. Adding an index is quick and speeds up queries, but takes up more memory, so de-index when not in use,

```sql
CREATE INDEX ON :Node(id)
CREATE INDEX ON :Element(id)
DROP INDEX ON :Node(id)
DROP INDEX ON :Element(id)
```

Parent-child relationships are created in an additional pass. This reads the elements file again, and sets vertices `SIDE_OF` elements.

```sql
USING PERIODIC COMMIT
LOAD CSV FROM "file:///neo4j_elements.csv" AS line
MATCH ( n1:Node { id: toInteger(line[1]) } ), \
( n2:Node { id: toInteger(line[2]) } ), \
( n3:Node { id: toInteger(line[3]) } ), \
( e:Element { id: toInteger(line[0]) } )
CREATE (n1)-[:SIDE_OF]->(e)
CREATE (n2)-[:SIDE_OF]->(e)
CREATE (n3)-[:SIDE_OF]->(e)
```



## Postgres

### Extensions

The back-end uses the `postgres` relational database, with the `timescale` and `postgis` extensions for time series and spatial data, respectively. A database is manually created and extended through queries with,

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
