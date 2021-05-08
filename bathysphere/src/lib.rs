// src/lib.rs
use pyo3::prelude::*;
use std::env;
extern crate serde_json;  // or yaml

#[macro_use]
extern crate serde_derive;


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Cypher {
    #[pyo3(get)]
    pub read_only: bool,
    #[pyo3(get)]
    pub query: String
}


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Node {
    #[pyo3(get)]
    pub pattern: String,
    #[pyo3(get)]
    pub symbol: String
}

#[pymethods]
impl Node {

    #[new]
    fn new(pattern: String, symbol: String) -> Self {
        Node {
            pattern,
            symbol
        }
    }

    /**
     * Count instances of the node label
     */
    fn count(&self) -> Cypher {
        Cypher {
            query: format!("MATCH {} RETURN count({})", self.pattern, self.symbol),
            read_only: true
        }
        
    }

    /**
     * Apply new label to the node set matching the node pattern
     */
    fn add_label(&self, label: String) -> Cypher {
        Cypher {
            query: format!("MATCH {} SET {}:{}", self.pattern, self.symbol, label),
            read_only: false
        }
    }

    /**
     * 
    */
    pub fn delete(&self) -> Cypher {
        Cypher{
            query: format!("MATCH {} DETACH DELETE {}", self.pattern, self.symbol),
            read_only: false
        }
    }

    pub fn mutate(&self, updates: String) -> Cypher {
        Cypher{
            query: format!("MATCH {} SET {} += {{ {} }}", self.pattern, self.symbol, updates),
            read_only: false
        }
    }

    pub fn load(&self, key: Option<String>) -> Cypher {

        let variable: String;
        match &key {
            None => variable = String::from(""),
            Some(value) => variable = format!(".{}", value)
        }

        Cypher {
            query: format!("MATCH {} RETURN {}{}", self.pattern, self.symbol, variable),
            read_only: true,
        }
    }

    pub fn create(&self) -> Cypher {
        Cypher {
            query: format!("MERGE {}", self.pattern),
            read_only: false,
        }
    }
    
}


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct NodeIndex {
    #[pyo3(get)]
    pub label: String,
    #[pyo3(get)]
    pub key: String
}


#[pymethods]
impl NodeIndex {
    #[new]
    fn new(
        label: String,
        key: String
    ) -> Self {
        NodeIndex {
            label, key
        }
    }
     
    /**
     * Indexes add a unique constraint as well as speeding up queries
     * on the graph database.
     */
    pub fn add(&self) -> Cypher {
        Cypher {
            query: format!("CREATE INDEX ON : {}({})", self.label, self.key),
            read_only: false
        }
        
    }

    /**
     * 
     */
    pub fn drop(&self) -> Cypher {
        Cypher {
            query: format!("DROP INDEX ON : {}({})", self.label, self.key),
            read_only: false
        }
        
    }

    /*
     *
     */
    pub fn unique_constraint(&self) -> Cypher {
        Cypher {
            query: format!("CREATE CONSTRAINT ON (n:{}) ASSERT n.{} IS UNIQUE", self.label, self.key),
            read_only: false
        } 
    }
}

/*
Links are the relationships between two entities.

They are directional, and have properties like entities. When you
have the option, it is encouraged to use rich links, instead of
doubly-linked nodes to represent relationships.

The attributes are for a `Link` are:
- `_symbol`, a private str for cypher query templating
- `rank`, a reinforcement learning parameter for recommending new data
- `uuid`, the unique identifier for the entity
- `props`, properties blob
- `label`, the optional label for the relationship, we only use one per link
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Link {
    #[pyo3(get)]
    pub cost: Option<f32>,
    #[pyo3(get)]
    pub rank: Option<u32>,
    #[pyo3(get)]
    pub label: Option<String>,
    #[pyo3(get)]
    pub pattern: Option<String>,
}


#[pymethods]
impl Link {
    #[new]
    fn new(
        label: Option<String>,
        rank: Option<u32>,
        cost: Option<f32>,
        pattern: Option<String>
    ) -> Self {
        Link {
            rank,
            label,
            cost,
            pattern
        }
    }

    /*

    Format the Link for making a Cypher language query
    to the Neo4j graph database

    [ r:Label { <key>:<value>, <key>:<value> } ]
     */
    fn cypher_repr(&self) -> String {

        let label: String;

        match &self.label {
            None => label = String::from(""),
            Some(value) => label = format!(":{}", value)
        }

        let pattern: String;

        match &self.pattern {
            None => pattern = String::from(""),
            Some(value) => pattern = format!(" {{ {:?} }}", value)
        }

        format!("-[ r{}{} ]-", label, pattern)
    }

    pub fn drop(
        &self, 
        left: &Node,
        right: &Node,
    ) -> Cypher {
        Cypher {
            read_only: false,
            query: format!(
                "MATCH {}{}{} DELETE r", 
                left.pattern, 
                self.cypher_repr(), 
                right.pattern
            )
        }
    }

    pub fn join(
        &self, 
        left: &Node,
        right: &Node,
    ) -> Cypher {
        Cypher {
            read_only: false,
            query: format!(
                "MATCH {}, {} MERGE ({}){}({})", 
                left.pattern, 
                right.pattern, 
                left.symbol, 
                self.cypher_repr(), 
                right.symbol
            )
        }
    }

    pub fn query(
        &self, 
        left: &Node,
        right: &Node, 
        result: String
    ) -> Cypher { 
        Cypher {
            read_only: true,
            query: format!(
                "MATCH {}{}{} RETURN {}", 
                left.pattern, 
                self.cypher_repr(), 
                right.pattern, 
                result
            )
        } 
    }
}


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Agent {
    #[pyo3(get)]
    name: String,
}

#[pymethods]
impl Agent {
    #[new]
    pub fn new(name: String) -> Self {
        Agent { name }
    } 
}


struct Socket {
    host: String,
    port: u32
}

/**
 * Actuators are devices that turn messages into physical effects
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Actuator {
    #[pyo3(get)]
    name: Option<String>,
    description: Option<String>,
    encoding_type: Option<String>,
    metadata: Option<String>,
    network_address: Option<Socket>
}


#[pymethods]
impl Actuator {
    #[new]
    pub fn new(
        name: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        metadata: Option<String>,
        network_address: Option<Socket>
    ) -> Self {
        Actuator{
            name,
            description,
            encoding_type,
            metadata,
            network_address
        }
    }
}

/**
 * Assets are references to external data objects, which may or may not
 * be accessible at the time of query.
 * These are most likely ndarray/raster or json blobs in object storage
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Asset {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    location: Option<String>
}

#[pymethods]
impl Asset {
    #[new]
    pub fn new(
        name: Option<String>, 
        description: Option<String>,
        location: Option<String>
    ) -> Self {
        Asset {
            name, description, location
        }
    }

    #[staticmethod]
    fn getenv() {
        let key = "NEO4J_HOSTNAME";
        match env::var(key) {
            Ok(val) => println!("{}: {:?}", key, val),
            Err(e) => println!("couldn't interpret {}: {}", key, e),
        }
    }
}


/**
 * Collections are arbitrary groupings of entities.
 * 
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Collection {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    extent: Option<Vec<f64>>,
    #[pyo3(get)]
    keywords: Option<String>,
    #[pyo3(get)]
    license: Option<String>,
    #[pyo3(get)]
    version: Option<u32>
}

#[pymethods]
impl Collection {
    #[new]
    pub fn new(
        name: Option<String>,
        description: Option<String>,
        extent: Option<Vec<f64>>,
        keywords: Option<String>,
        license: Option<String>,
        version: Option<u32>
    ) -> Self{
        Collection{
            name,
            description,
            extent,
            keywords,
            license,
            version
        }
    }
}

/**
 * FeaturesOfInterest are usually Locations.
 */
#[pyclass]
struct FeatureOfInterest {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    encoding_type: Option<String>,
    #[pyo3(get)]
    feature: Option<HashMap>
}

#[pymethods]
impl FeatureOfInterest {
    #[new]
    pub fn new(
        name: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        feature: Option<HashMap>
    ) -> Self {
        FeatureOfInterest {
            name,
            description,
            encoding_type,
            feature
        }
    }
}

#[pyclass]
struct Sensor{
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    encoding_type: Option<String>,
    #[pyo3(get)]
    metadata: Option<HashMap>
}

#[pymethods]
impl FeatureOfInterest {
    #[new]
    pub fn new(
        name: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        metadata: Option<HashMap>
    ) -> Self {
        FeatureOfInterest {
            name,
            description,
            encoding_type,
            metadata
        }
    }
}

/**
 * Create a property, but do not associate any data streams with it
 */
#[pyclass]
struct ObservedProperty {
    name: Option<String>,
    description: Option<String>,
    definition: Option<String>
}

#[pymethods]
impl ObservedProperty{
    #[new]
    pub fn new(
        name: Option<String>,
        description: Option<String>,
        definition: Option<String>
    ) -> Self {
        ObservedProperty{
            name,
            description,
            definition
        }
    }
}


#[pymodule]
fn bathysphere(_: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<Link>()?;
    m.add_class::<Cypher>()?;
    m.add_class::<Agent>()?;
    m.add_class::<Asset>()?;
    m.add_class::<Node>()?;
    m.add_class::<NodeIndex>()?;
    m.add_class::<Actuator>()?;
    m.add_class::<Collection>()?;
    m.add_class::<FeatureOfInterest>()?;
    m.add_class::<Sensor>()?;
    Ok(())
}