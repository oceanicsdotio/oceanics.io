[TOC]

# Knowledge Graphs

The representation of complex relationships between heterogenous data is simplified by applying a graph framework. The Graph API extension uses [Neo4j](https://neo4j.com/) graph database to store semi-structured data, along with labeled relationships. It can be applied to many flexible, high-level cases, from NASA managing their [lessons-learned](https://neo4j.com/blog/nasa-lesson-learned-database-using-neo4j-linkurious/) mission database, to modeling a virtual [economy](https://www.airpair.com/neo4j/posts/modelling-game-economy-with-neo4j). 

The system is relatively dumb, with complex logic delegated to sidecar and frontend services. This REST API provides backend functionality supporting:

- Secure organizational accounts
- OGC SensorThings API coverage
- SpatioTemporal Assets Catalog coverage



See the OpenAPI specification for complete details on the supported schemas and methods. 

There is an [embedded](http://localhost) version running if you use `docker-compose`, 
and an [online](https://bathysphere-graph.netlify.com) one with current status: [![Netlify Status](https://api.netlify.com/api/v1/badges/dfa3c4f1-b304-42cb-9ff5-ea64f2219ff0/deploy-status)](https://app.netlify.com/sites/bathysphere-graph/deploys)


In general, the format for entity-based requests is: 


| Route                       | Description         | Arguments            | Format |
| --------------------------- | ------------------- | -------------------- | ------ |
| `/`                         | All sets            | None                 | JSON   |
| `/name`                     | Set                 | name                 | JSON   |
| `/name(id)`                 | Instance            | name, id             | JSON   |
| `/name(id)/key`             | Property            | name, id, key        | JSON   |
| `/name(id)/key/$value`      | Value               | name, id, key        | JSON   |
| `/name(id)/other`           | Neighbors           | name, id, other      | JSON   |
| `/name(id)/other/$ref`      | Link to other nodes | name, id, other      | JSON   |
| `/name(id)/other(id2)/$ref` | Link                | name, id, other, id2 | JSON   |



## Getting Started

Deployed locally with `docker-compose up -d`. 

The database manager runs in the [official container image](https://hub.docker.com/_/neo4j/), and maps the server ports to an external interface. The [built-in GUI](http://localhost:7474/browser/) is at  `hostname:7474`, and the `bolt` [interface](https://boltprotocol.org/) defaults to  `hostname:7687`. Bolt is used for API calls from Python scripts. User authorization requires the environment variable `NEO4J_AUTH`. 

If you are new to Neo4j, try deploying a stand-alone graph container first:

```bash
docker run \
	--publish=7474:7474 \
	--publish=7687:7687 \
	--volume=$HOME/neo4j/data:/data \
	--env=NEO4J_AUTH=none neo4j
```

The `nginx` container is a reverse proxy that forwards requests to the other services. It also serves static content on port `80`, in this case the ReDoc-rendered OpenAPI specification.  This fully describes the possible transactions with the database, which are enforced in the `bathysphere_graph` application by the Python `connexion` library. 

| Service             | Port   | Description                |
| ------------------- | ------ | -------------------------- |
| `nginx`             | `80`   | OpenAPI specification      |
| `bathysphere_graph` | `5000` | Graph API                  |
| `neo4j`             | `7687` | Neo4j Bolt protocol access |
| `neo4j`             | `7474` | Neo4j built-in browser GUI |



## Clients

**Cypher**

The Neo4j web interface provides a visualization of the graph, which can be used to sanity check things.  [Cypher](https://neo4j.com/docs/cypher-refcard/current/) is the Neo4j query language. Either can be used directly to build the database, traverse nodes and edges, and return data. The mesh example below has further details, but using a 3D model as an example, here are some basic queries:

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



**Python**

Instead of manually commands or Cypher scripts, you can manage the database with the Python `neo4j-driver` package. This can be installed locally with `pip install neo4j-driver`. Establish a connection to the database using Bolt, and start a session:

```python
from neo4j.v1 import GraphDatabase
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "neo4j"))
session = driver.session()
```



# Mesh Example

## Pre-processing

Finite-volume methods need to perform mesh interpolations, the algorithms for which involve keeping the mesh and fields in memory. It is desirable to partition data structures across some number of processes or machines, since the memory requirements of the simulation may exceed available resources. In ocean modeling, this is usually done with [ParMETIS](http://glaros.dtc.umn.edu/gkhome/metis/parmetis/overview). Databases are slower, but ensure consistency, and can be used to dispatch data to distributed analytical systems. 

Meshes are often stored as NetCDF files. These can be read remotely by mounting the host volume to your local environment. For instance, using [fuse](https://github.com/osxfuse/osxfuse/releases) and [sshfs](https://github.com/libfuse/sshfs). On macOS `meson` and `ninja` are required, before downloading the `sshfs` tarball, installing it,

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

Alternatively, topology may simply be saved in CSV files, for which pre-processing might be necessary. For example, space-delimited files can be converted to comma-delimited using `sed`, `cat`, and `cut`:

```bash
sed 's/[[:blank:]]/,/g' midcoast_nodes.csv > neo4j_nodes.csv
sed 's/[[:blank:]]/,/g' midcoast_elements.csv > neo4j_elements.csv
sed 's/,,/,/g' neo4j_elements.csv > new_elements.csv
cat new_elements.csv | cut -c 2- > neo4j_elements.csv
```



## Ingestion

For an unstructured grid, the graph nodes include nodes/vertices in the simulation mesh, along with elements, edges, and layers. A vertex would have parent elements and edges, and have adjacency with other vertices—and could have any number of associated environmental variables. Edges have child nodes, and parent elements. Their properties include boundary information. Surfaces are also a helpful construct, for representing the seafloor and air-water interface (or other isopycnal). 

A single triangular element/cell in a 2-D mesh consists of seven graph nodes: three vertices, three edges, and one element. The former are related to the latter by the `SIDE_OF` relationship. The vertices and edges are shared by other edges and elements, which they are also `SIDE_OF`.

CSV data are ingested with `LOAD CSV`, which [loads data](https://neo4j.com/developer/guide-import-csv/) from a uniform resource identifier (URI). Vertices are loaded first, and relationships built in the second call. The process calls `CREATE` for each line of the input file. Explicit IDs are used for mapping between global and local domains when partitioning the graph. The files need to be in `/var/lib/neo4j/import` of the database container. At this point, it it worth noting, that if data entry goes wrong, you can abort and remove all nodes and relationships with `MATCH (n) DETACH DELETE n`.

Create nodes/vertices:

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



## Topological queries

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



## Benchmarks

The University of Maine "Midcoast" mesh (15 MB of CSV files) on a late model MacBook:

- 165,632 nodes with 662,498 properties  (ID, latitude, longitude, and depth) = 8061–9460 ms
- 322,546 elements with 322,546 properties (ID) = 7993–9071 ms. 
- 967,638 relationships = 51,360 ms
- Database volume = 385 MB

