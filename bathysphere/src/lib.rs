// src/lib.rs
use pyo3::prelude::*;
use std::env;
use std::collections::{HashMap};
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
Linkss are the relationships between two entities.

They are directional, and have properties like entities. When you
have the option, it is encouraged to use rich links, instead of
doubly-linked nodes to represent relationships.

The attributes are for a `Links` are:
- `_symbol`, a private str for cypher query templating
- `rank`, a reinforcement learning parameter for recommending new data
- `uuid`, the unique identifier for the entity
- `props`, properties blob
- `label`, the optional label for the relationship, we only use one per link
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Links {
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
impl Links {
    #[new]
    fn new(
        label: Option<String>,
        rank: Option<u32>,
        cost: Option<f32>,
        pattern: Option<String>
    ) -> Self {
        Links {
            rank,
            label,
            cost,
            pattern
        }
    }

    /*

    Format the Links for making a Cypher language query
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
struct Agents {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
}

#[pymethods]
impl Agents {
    #[new]
    pub fn new(
        name: Option<String>,
        uuid: Option<String>,
    ) -> Self {
        Agents { 
            name,
            uuid
        }
    } 
}

#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
struct Socket {
    host: String,
    port: u32
}

/**
 * Actuatorss are devices that turn messages into physical effects
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Actuators {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    encoding_type: Option<String>,
    #[pyo3(get)]
    metadata: Option<String>,
    #[pyo3(get)]
    network_address: Option<Socket>
}


#[pymethods]
impl Actuators {
    #[new]
    pub fn new(
        name: Option<String>,
        uuid: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        metadata: Option<String>,
        network_address: Option<Socket>
    ) -> Self {
        Actuators{
            name,
            uuid,
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
struct Assets {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    location: Option<String>
}

#[pymethods]
impl Assets {
    #[new]
    pub fn new(
        name: Option<String>, 
        uuid: Option<String>,
        description: Option<String>,
        location: Option<String>
    ) -> Self {
        Assets {
            name, 
            uuid,
            description, 
            location
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
 * Collectionss are arbitrary groupings of entities.
 * 
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Collections {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
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
impl Collections {
    #[new]
    pub fn new(
        name: Option<String>,
        uuid: Option<String>,
        description: Option<String>,
        extent: Option<Vec<f64>>,
        keywords: Option<String>,
        license: Option<String>,
        version: Option<u32>
    ) -> Self{
        Collections{
            name,
            uuid,
            description,
            extent,
            keywords,
            license,
            version
        }
    }
}

/**
 * FeaturesOfInterest are usually Locationss.
 */
#[pyclass]
struct FeaturesOfInterest {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    encoding_type: Option<String>,
    #[pyo3(get)]
    feature: Option<HashMap<String, String>>,
}

#[pymethods]
impl FeaturesOfInterest {
    #[new]
    pub fn new(
        name: Option<String>,
        uuid: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        feature: Option<HashMap<String, String>>,
    ) -> Self {
        FeaturesOfInterest {
            uuid,
            name,
            description,
            encoding_type,
            feature
        }
    }
}

#[pyclass]
struct Sensors{
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    encoding_type: Option<String>,
    #[pyo3(get)]
    metadata: Option<HashMap<String, String>>
}

#[pymethods]
impl Sensors {
    #[new]
    pub fn new(
        name: Option<String>,
        uuid: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        metadata: Option<HashMap<String, String>>
    ) -> Self {
        Sensors {
            name,
            uuid,
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
struct ObservedProperties {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    definition: Option<String>
}

#[pymethods]
impl ObservedProperties{
    #[new]
    pub fn new(
        name: Option<String>,
        uuid: Option<String>,
        description: Option<String>,
        definition: Option<String>
    ) -> Self {
        ObservedProperties{
            name,
            uuid,
            description,
            definition
        }
    }
}

/**
 * Tasks are connected to `Things` and `TaskingCapabilities`.
 *
 * Tasks are pieces of work that are done asynchronously by humans or machines.
 */
#[pyclass]
struct Tasks {
    #[pyo3(get)]
    creation_time: Option<f64>,
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    tasking_parameters: Option<HashMap<String, String>>
}

#[pymethods]
impl Tasks {
    #[new]
    pub fn new(
        creation_time: Option<f64>,
        uuid: Option<String>,
        tasking_parameters: Option<HashMap<String, String>>
    ) -> Self {
        Tasks {
            creation_time,
            uuid,
            tasking_parameters
        }
    }
}


/** 
 *  A thing is an object of the physical or information world that is capable of of being identified
    and integrated into communication networks.
 * 
 */
#[pyclass]
struct Thing {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    properties: Option<HashMap<String, String>>
}

#[pymethods]
impl Thing {
    #[new]
    pub fn new(
        uuid: Option<String>,
        name: Option<String>,
        description: Option<String>,
        properties: Option<HashMap<String, String>>
    ) -> Self {
        Thing {
            uuid,
            name,
            description,
            properties
        }
    }
}

/**
 * TaskingCapabilities may be called by defining graph patterns that supply all of their inputs.
  */
#[pyclass]
struct TaskingCapabilities {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    creation_time: Option<f64>,
    #[pyo3(get)]
    tasking_parameters: Option<HashMap<String, String>>
}

#[pymethods]
impl TaskingCapabilities {
    #[new]
    pub fn new(
        uuid: Option<String>,
        name: Option<String>,
        description: Option<String>,
        creation_time: Option<f64>,
        tasking_parameters: Option<HashMap<String, String>>
    ) -> Self {
        TaskingCapabilities {
            uuid,
            name, 
            description,
            creation_time,
            tasking_parameters
        }
    }
}

/**
 * Providerss are generally organization or enterprise sub-units. This is used to
    route ingress and determine implicit permissions for data access, sharing, and
    attribution. 
 */
#[pyclass]
struct Providers {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    domain: Option<String>,
    #[pyo3(get)]
    secret_key: Option<String>,
    #[pyo3(get)]
    api_key: Option<String>,
    #[pyo3(get)]
    token_duration: Option<u16>,
}

#[pymethods]
impl Providers {
    #[new]
    pub fn new(
        uuid: Option<String>,
        name: Option<String>,
        description: Option<String>,
        domain: Option<String>,
        secret_key: Option<String>,
        api_key: Option<String>,
        token_duration: Option<u16>,
    ) -> Self {
        Providers {
            uuid,
            name,
            description,
            domain,
            secret_key,
            api_key,
            token_duration
        }
    }
}


#[pyclass]
struct Locations {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    encoding_type: Option<String>,
    #[pyo3(get)]
    location: Option<HashMap<String, String>>,
}

#[pymethods]
impl Locations {
    #[new]
    pub fn new(
        uuid: Option<String>,
        name: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        location: Option<HashMap<String, String>>
    ) -> Self {
        Locations {
            uuid,
            name,
            description,
            encoding_type,
            location
        }
    }
}


/**
 * Private and automatic, should be added to sensor when new location is determined
 */
#[pyclass]
struct HistoricalLocations {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    time: Option<f64>,
}


#[pymethods]
impl HistoricalLocations {
    #[new]
    pub fn new(
        uuid: Option<String>,
        time: Option<f64>
    ) -> Self {
        HistoricalLocations {
            uuid,
            time
        }
    }
}


/**
time interval, ISO8601
*/
#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
struct TimeInterval {
    #[pyo3(get)]
    start: f64,
    #[pyo3(get)]
    end: f64
}

#[pymethods]
impl TimeInterval {
    #[new]
    pub fn new(
        start: f64,
        end: f64
    ) -> Self {
        TimeInterval {
            start,
            end
        }
    }
}


/**
 * Observationss are individual time-stamped members of DataStreams
 */
#[pyclass]
struct Observations {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    phenomenon_time: Option<f64>,
    #[pyo3(get)]
    result: Option<f64>,
    #[pyo3(get)]
    result_time: Option<f64>,
    #[pyo3(get)]
    result_quality: Option<String>,
    #[pyo3(get)]
    valid_time: Option<TimeInterval>,
    #[pyo3(get)]
    parameters: Option<HashMap<String, String>>
}

#[pymethods]
impl Observations {
    #[new]
    pub fn new(
        uuid: Option<String>,
        phenomenon_time: Option<f64>,
        result: Option<f64>,
        result_time: Option<f64>,
        result_quality: Option<String>,
        valid_time: Option<TimeInterval>,
        parameters: Option<HashMap<String, String>>
    ) -> Self {
        Observations {
            uuid,
            phenomenon_time,
            result,
            result_time,
            result_quality,
            valid_time,
            parameters
        }

    }
}

/**
 *
 */
#[pyclass]
struct DataStreams {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    unit_of_measurement: Option<String>,
    #[pyo3(get)]
    observation_type: Option<String>,
    #[pyo3(get)]
    phenomenon_time: Option<TimeInterval>,
    #[pyo3(get)]
    result_time: Option<TimeInterval>
}

#[pymethods]
impl DataStreams {
    #[new]
    pub fn new(
        uuid: Option<String>,
        name: Option<String>,
        description: Option<String>,
        unit_of_measurement: Option<String>,
        observation_type: Option<String>,
        phenomenon_time: Option<TimeInterval>,
        result_time: Option<TimeInterval>
    ) -> Self {
        DataStreams {
            uuid,
            name,
            description,
            unit_of_measurement,
            observation_type,
            phenomenon_time,
            result_time
        }
    }
}

/**
 *  Create a user entity. Users contain authorization secrets, and do not enter/leave
 *  the system through the same routes as normal Entities
 */
#[pyclass]
struct User {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    ip: Option<String>,
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    alias: Option<String>,
    #[pyo3(get)]
    credential: Option<String>,
    #[pyo3(get)]
    validated: Option<bool>,
    #[pyo3(get)]
    description: Option<String>
}

#[pymethods]
impl User {
    #[new]
    pub fn new(
        uuid: Option<String>,
        ip: Option<String>,
        name: Option<String>,
        alias: Option<String>,
        credential: Option<String>,
        validated: Option<bool>,
        description: Option<String>
    ) -> Self {
        User {
            uuid,
            ip,
            name,
            alias,
            credential,
            validated,
            description
        }
    }
}


#[pymodule]
fn bathysphere(_: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<Links>()?;
    m.add_class::<Cypher>()?;
    m.add_class::<Agents>()?;
    m.add_class::<Assets>()?;
    m.add_class::<Node>()?;
    m.add_class::<NodeIndex>()?;
    m.add_class::<Actuators>()?;
    m.add_class::<Collections>()?;
    m.add_class::<FeaturesOfInterest>()?;
    m.add_class::<Sensors>()?;
    m.add_class::<ObservedProperties>()?;
    m.add_class::<TaskingCapabilities>()?;
    m.add_class::<TaskingCapabilities>()?;
    m.add_class::<Providers>()?;
    m.add_class::<Observations>()?;
    m.add_class::<Locations>()?;
    m.add_class::<HistoricalLocations>()?;
    m.add_class::<User>()?;
    Ok(())
}