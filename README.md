

[TOC]

# Overview

The Bathysphere API is a distributed store and registry for public and proprietary data. The system is designed to support a buoy network in the Gulf of Maine, but can be configured and extended for other applications. It uses best-in-class technology to ingest sensor data and metadata, and automatically parse them into discoverable databases.

You probably have to share data anyway. Good Buoy as middleware can enhance your data science and management experience. A Linux container cluster provides a web interface for sharing and visualizing data, while keeping proprietary data hidden. This supports and open marketplace data sharing model, which may be preferable to redundant collection. By assessing availability over the whole domain, projects can target resources to fill coverage gaps. 

The representation of complex relationships between heterogenous data is simplified by applying a graph framework. The Graph API extension uses [Neo4j](https://neo4j.com/) graph database to store semi-structured data, along with labeled relationships. It can be applied to many flexible, high-level cases, from NASA managing their [lessons-learned](https://neo4j.com/blog/nasa-lesson-learned-database-using-neo4j-linkurious/) mission database, to modeling a virtual [economy](https://www.airpair.com/neo4j/posts/modelling-game-economy-with-neo4j). 

The API provides services through a representation state transfer (REST) interface, with:

- Secure organizational accounts
- Open Geospatial Consortium (OGC) SensorThings API coverage
- Data provenance tracking


See the OpenAPI specification for complete details on schemas and methods. There is an [embedded](http://localhost) version running if you use `docker-compose`, and one [online](http://graph.oceanics.io). In general, the format for entity-based requests is: 


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



## Deploy

### Development

Microservices subset and transform data before delivering it to a web client. These run in Docker containers, and are orchestrated with Kubernetes. A deployment will run at least five containers, known to each other through Kubernetes or Docker networking. The backend uses `postgres`relational database, and  `redis` for caching and message passing. Metadata and dynamic permissions for the hubs are handled with the Neo4j graph database. 

Deploy locally with `docker-compose up -d`. 

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



### Frontend

The interface is served as static files throughs Nginx. This uses pure JavaScript. The functionality is broken 
down in `goodbuoy.js` and `webgl.js`. These methods inject elements into the basic HTML skeleton provided by `index.html`. This follows the logic of a "card"-like system, in which UI and visualization elements are added based on context. So a location card can create a map, and a data stream card can create a plot. 



### DigitalOcean

Create a new personal access token for Digital Ocean. 

Authorize your development environment using `doctl auth init`, and then provide the new access token. 

`doctl kubernetes cluster kubeconfig save $CLUSTER_NAME`

Download the cluster configuration, and get the nodes.

`cd ~/.kube && kubectl --kubeconfig="$CLUSTER_NAME-kubeconfig.yaml" get nodes`



The cluster doesn't need nginx, so we just deploy the neo4j container and the bathyphsere-graph container. 



```
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.0-beta4/aio/deploy/recommended.yaml
```

```
kubectl -n kubernetes-dashboard describe secret $(kubectl -n kubernetes-dashboard get secret | grep admin-user | awk '{print $1}')
```

```
https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.26.1/deploy/static/mandatory.yaml
```

```
brew install kubernetes-helm
helm init # baf
helm repo add stable https://kubernetes-charts.storage.googleapis.com/
kubectl get deployments -l 'app=helm' --all-namespaces

helm install \
--namespace bathysphere \
--name neo4j-helm stable/neo4j \
--set acceptLicenseAgreement=yes \
--set neo4jPassword=n0t_passw0rd

kubectl logs -l "app=neo4j,component=core"


kubectl run -it --rm cypher-shell \
    --image=neo4j:3.2.3-enterprise \
    --restart=Never \
    --namespace bathysphere \
    --command -- ./bin/cypher-shell -u neo4j -p n0t_passw0rd \
    --a neo4j-helm-neo4j.bathysphere.svc.cluster.local "call dbms.cluster.overview()"


helm delete neo4j-helm --purge


kubectl scale deployment neo4j-helm-neo4j-replica  --namespace bathysphere --replicas=2

kubectl exec neo4j-helm-neo4j-core-0 -- bin/cypher-shell \
"UNWIND range(0, 1000) AS id CREATE (:Person {id: id}) RETURN COUNT(*)"
```





```
kubectl create serviceaccount tiller --namespace kube-system
helm init --service-account tiller --upgrade
```



```
kubectl get svc --namespace=ingress-nginx
```

https://www.asykim.com/blog/deep-dive-into-kubernetes-external-traffic-policies



### OpenFAAS

OpenFaas can be deployed automatically on DigitalOcean.

`brew install faas-cli`

```
faas-cli list --verbose

echo oceanics.io | faas-cli invoke figlet

docker service create -d \
--name=grafana \
--publish=3000:3000 \
--network=func_functions \
stefanprodan/faas-grafana:4.6.3
```





https://github.com/openfaas/workshop/blob/master/lab3.md

https://github.com/openfaas/workshop/blob/master/lab11.md

```
faas-cli new --lang python3 hello-openfaas --prefix=oceanicsdotio
echo -n $HMAC_KEY | faas-cli secret create payload-secret
faas-cli up -f hello-openfaas.yml

echo null | faas-cli invoke hello-openfaas

echo -n "Hello" | faas-cli invoke hello-openfaas --sign hmac --key=$HMAC_KEY

echo -n '{"id": 66, "limit": 10, "observedProperties": ["temperature", "salinity"]}' | faas-cli invoke buoy-data --sign hmac --key=$HMAC_KEY


echo -n '{"id": 67, "limit": 10, "observedProperties": ["temperature", "salinity"], "encoding": "txt"}' | faas-cli invoke buoys --sign hmac --key=$HMAC_KEY

echo -n '{"subject": "Hello World", "addresses": ["nicholas.keeney@gmail.com"]}' | faas-cli invoke notify --sign hmac --key=$HMAC_KEY

echo -n '{"subject": "Hello World", "addresses": ["nicholas.keeney@gmail.com"]}' | faas-cli invoke notify --sign hmac --key=$HMAC_KEY
```



## Clients

### Cypher

The Neo4j web interface provides a visualization of the graph, which can be used to sanity check things.  [Cypher](https://neo4j.com/docs/cypher-refcard/current/) is the Neo4j query language. Either can be used to build the database, traverse nodes and edges, and return data. Using a 3D model as an example, here are some basic queries:

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



### Python

Instead of manually commands or Cypher scripts, you can manage the database with the Python `neo4j-driver` package. This can be installed locally with `pip install neo4j-driver`. Establish a connection to the database using Bolt, and start a session:

```python
from neo4j.v1 import GraphDatabase
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "neo4j"))
session = driver.session()
```



### GraphQL

https://daten-und-bass.io/blog/getting-started-with-neo4j-and-graphql/

https://github.com/neo4j-graphql/neo4j-graphql#schema-from-graph



### SQL



To work directly with the relational database, run a container, and enter the Postgres instance with the `exec` command,

```bash
docker run -d --name timescaledb -p 5432:5432 -e
	POSTGRES_PASSWORD=password
	timescale/timescaledb-postgis
	
docker exec -it timescaledb-postgis psql -U postgres
```

The  `goodbuoy.client.postgres` submodule provides an interface to Postgres databases. If this doesn't fulfill your use case, some guidance is provided here for using the `pyscopg2` (or `pyscopg2-binary`) package available through `pip install`. This is the simpler library than `sqlalchemy`, and has no C-language dependencies. 



A database is manually created and extended with, 

```sql
CREATE database bathysphere;
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

The enhanced paging features of TimeScale DB are enabled with,

```sql
SELECT create_hypertable('series', 'time');
```

With Docker, the default database to create at start-up can be specified using the environment variable `POSTGRES_DB`. This is done automatically using the provided `docker-compose.yml`. The entity data for user authentication and sensor network topology are already stored in the Neo4j graph. So, this database should really only need one table: **observations**. There are actually multiple tables, one for each deployment, since the columns present for each may vary, and we're not in the business of doing joins. 

A simple table might consist of a timestamp, and some measured properties (as well as diagnostic info and event logs for the data logger). Something like,

```sql
CREATE TABLE series (
  time        TIMESTAMPTZ       NOT NULL,
  temperature DOUBLE PRECISION  NULL,
  salinity    DOUBLE PRECISION  NULL,
  pressure    DOUBLE PRECISION  NULL, 
);
```

New data is added with an `INSERT` query,

```sql
INSERT INTO series(time, temperature, salinity)
VALUES (NOW(), 20.0, 30.0),
		(NOW(), 21.0, 30.1);
```

The most recent data are selected and returned by a `SELECT`,   


```sql
SELECT * FROM series ORDER BY time DESC LIMIT 10;
```

### 

Use the `psycopg2` library for connecting to and querying the database. The commands are identical, but sent as strings.

```python
from psycopg2 import connect

db = connect(dbname='observations', user='postgres', host='localhost', password="password")
```

Tables can be setup with a string generator,

```python
DP_NULL = "DOUBLE PRECISION NULL"

def create_table(params):
    ts = "time TIMESTAMPTZ NOT NULL"
    fields = [ts] + [" ".join([p, DP_NULL]) for p in params]
    return "CREATE TABLE series(" + ", ".join(fields) + ");"

cmd = create_table(params)
cur = db.cursor()
cur.execute(cmd)
```



```python
def insert_single(data):
    string = "INSERT INTO series(time, temperature, salinity, pressure)"
    row = "(" + ", ".join(["NOW()"] + [str(i) for i in data]) + ")"
    return " ".join([string, "VALUES", row]) + ";"
```



```python
def read(table, sort, limit=10):
    cmd = ["SELECT * FROM", table, "ORDER BY", sort, "DESC LIMIT", str(limit)]
    return " ".join(cmd) + ";"
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

# Benchmarks

The University of Maine "Midcoast" mesh (15 MB of CSV files) on a late model MacBook:

- 165,632 nodes with 662,498 properties  (ID, latitude, longitude, and depth) = 8061–9460 ms
- 322,546 elements with 322,546 properties (ID) = 7993–9071 ms. 
- 967,638 relationships = 51,360 ms
- Database volume = 385 MB



# Extensions

## Graphics

`PNG` rendering is available through the Anti-Grain Graphic (AGG) `neritics-gx` service. This is a fallback for publishable images, if WebGL is not supported by the browser. 

Normally, an AGG request will create a time-series figure, pushed to a file buffer for web rendering or cached in the image service. This is invoked by appending `/image`. The `/wrap` parameter blends multiple years together,  `/coverage` shows the annual distribution of observations, and `/frequency` renders the distribution of a variable over days of the year. 

| Path               | Summary             | Parameters          | Format |
| ------------------ | ------------------- | ------------------- | ------ |
| `/image/wrap`      | Climatology         | `identity`, `field` | `PNG`  |
| `/image/coverage`  | Effort distribution | `identity`          | `PNG`  |
| `/image/frequency` | Variable histogram  | `identity`, `field` | `PNG`  |



## Signal processing

The `neritics-filter` service adds methods for resampling, interpolating, filling, and smoothing series. Most functions default to safe values, or will silently fail without manipulating data. 

Some functions return a mask. For instance `/outlier` detects statistical anomalies in the independent variable, while `/outOfRange` returns a mask  of the values to pin. Finally, `outlier_mask()` looks for anomalies in independent variable and time derivatives to remove spikes and gaps (e.g. wave action on inter-tidal sensors, or electrical issues). 

Interpolation function `/smooth` uses `numpy.convolve` to smooth a series using a boxcar filter. More control over fast Fourier transforms are given through `/fftFilter`, which can low/highpass filter, and forward-fill, using `scipy.fftpack`. 

Most useful is `/resample`, which will produce a regularly-spaced series from sparse observations, using forward/backward fill or linear interpolation. This is meant for low frequency data, like manually collected data, or satellite observations. 



# References

Aven, P., & Burley, D. (2017). Building on Multi-Model Databases. (S. Cutt & M. Yarbrough, Eds.) (First Edit). Sebastopol, CA: O’Reilly Media, Inc.

Dale, K. (2016). Data Visualization with Python and JavaScript. (D. Schanafelt, M. Blanchette, & K. Brown, Eds.) (First Edit). Sebastopol, CA: O’Reilly Media, Inc.

Gers, F. Schmidhuber, J., and Cummins, F. (1999). Learning to forget: Continual prediction with LSTM." IET, 850-855.

Lawrence, N. D. (2017). Data Readiness Levels. Cambridge, UK. [[arxiv]](http://arxiv.org/abs/1705.02245)

Samet, H. (1995). Spatial Data Structures. In W. Kim (Ed.), Modern Database Systems: The Object Model, Interoperability, and Beyond (pp. 361–385). Reading, MA: Addison Wesley/ACM Press.