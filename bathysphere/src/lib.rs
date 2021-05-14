// src/lib.rs
use pyo3::prelude::*;
use std::env;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

extern crate serde_json; 
extern crate serde_yaml;

// mod variables;
mod microcystis;



#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct MetaDataTemplate {
    x_amz_acl: String,
    x_amz_meta_parent: Option<String>,
    x_amz_meta_created: String,
    x_amz_meta_service_file_type: Option<String>,
    x_amz_meta_service: Option<String>
}

#[pymethods]
impl MetaDataTemplate {
    #[new]
    pub fn new(
        x_amz_acl: String,
        x_amz_meta_parent: Option<String>,
        x_amz_meta_created: String,
        x_amz_meta_service_file_type: Option<String>,
        x_amz_meta_service: Option<String>
    ) -> Self {
        MetaDataTemplate {
            x_amz_acl,
            x_amz_meta_parent,
            x_amz_meta_created,
            x_amz_meta_service_file_type,
            x_amz_meta_service
        }
    }

    pub fn headers(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 * Messages are passed between services
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Message {
    message: String,
    timestamp: f64,
    arrow: String,
    data: String,
    pid: usize,
}

#[pymethods]
impl Message{
    #[new]
    pub fn new(
        message: String,
        timestamp: f64,
        arrow: String,
        data: String,
        pid: usize,
    ) -> Self {
        Message {
            message,
            timestamp,
            arrow,
            data,
            pid,
        }
    }

    /**
     * Format for general logging
     */
    fn logging_repr(&self) -> String {
        format!(
            "[{}] (PID {}) {} {} {}\n", 
            self.timestamp,
            self.pid,
            self.message,
            self.arrow,
            self.data
        )
    }
}


/**
 * The Cypher data structure contains pre-computed queries
 * ready to be executed against the Neo4j graph database. 
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Cypher {
    #[pyo3(get)]
    pub read_only: bool,
    #[pyo3(get)]
    pub query: String
}


/** 
 * The Node data structure encapsulates logic needed for 
 * representing entities in the Cypher query language.
 */
#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Node {
    #[pyo3(get)]
    pub pattern: Option<String>,
    #[pyo3(get)]
    pub symbol: Option<String>,
    #[pyo3(get)]
    pub label: Option<String>,
}

/**
 * Storage is an interface to cloud object storage.
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Storage {
    #[pyo3(get)]
    endpoint: String,
    #[pyo3(get)]
    service_name: String,
    #[pyo3(get)]
    bucket_name: String,
    #[pyo3(get)]
    index: String,
    #[pyo3(get)]
    session_id: String,
    #[pyo3(get)]
    lock_file: String,
}

#[pymethods]
impl Storage {
    #[new]
    pub fn new(
        endpoint: String,
        service_name: String,
        bucket_name: String,
        session_id: String,
    ) -> Self {
        Storage {
            endpoint,
            service_name,
            bucket_name,
            index: String::from("index.json"),
            session_id,
            lock_file: String::from("lock.json")
        }
    }
}


/**
 * Python Methods are primarily for Cypher query templating. 
 */
#[pymethods]
impl Node {

    #[new]
    fn new(
        pattern: Option<String>, 
        symbol: Option<String>, 
        label: Option<String>
    ) -> Self {
        Node {
            pattern,
            symbol,
            label,
        }
    }

    #[staticmethod]
    fn all_labels() -> Cypher {
        Cypher {
            query: String::from("CALL db.labels()"),
            read_only: true
        }
    }


    fn pattern_only(&self) -> String {

        let pattern: String;

        match &self.pattern {
            None => pattern = String::from(""),
            Some(value) => pattern = format!(" {{ {} }}", value)
        }

        pattern
    }

    fn symbol(&self) -> String {
        let symbol: String;

        match &self.symbol {
            None => symbol = String::from("n"),
            Some(value) => symbol = format!("{}", value)
        }
        symbol
    }

    /**
     * Format the cypher query representation of the Node data structure
     */
    fn cypher_repr(&self) -> String {

        let label: String;

        match &self.label {
            None => label = String::from(""),
            Some(value) => label = format!(":{}", value)
        }


        format!("( {}{}{} )", self.symbol(), label, self.pattern_only())
    }

    /**
     * Count instances of the node label.
     */
    fn count(&self) -> Cypher {
        Cypher {
            query: format!("MATCH {} RETURN count({})", self.cypher_repr(), self.symbol()),
            read_only: true
        }
    }

    /**
     * Apply new label to the node set matching the node pattern.
     */
    fn add_label(&self, label: String) -> Cypher {
        Cypher {
            query: format!("MATCH {} SET {}:{}", self.cypher_repr(), self.symbol(), label),
            read_only: false
        }
    }

    /**
     * Query to delete a node pattern from the graph.
     */
    pub fn delete(&self) -> Cypher {
        Cypher{
            query: format!("MATCH {} DETACH DELETE {}", self.cypher_repr(), self.symbol()),
            read_only: false
        }
    }

    /**
     * Format a query that will merge a pattern into all matching nodes.
     */
    pub fn mutate(&self, updates: Node) -> Cypher {
        Cypher{
            query: format!("MATCH {} SET {} += {{ {} }}", self.cypher_repr(), self.symbol(), updates.pattern_only()),
            read_only: false
        }
    }

    /**
     * Generate a query to load data from the database
     */
    pub fn load(&self, key: Option<String>) -> Cypher {

        let variable: String;
        match &key {
            None => variable = String::from(""),
            Some(value) => variable = format!(".{}", value)
        }

        Cypher {
            query: format!("MATCH {} RETURN {}{}", self.cypher_repr(), self.symbol(), variable),
            read_only: true,
        }
    }

    pub fn create(&self) -> Cypher {
        Cypher {
            query: format!("MERGE {}", self.cypher_repr()),
            read_only: false,
        }
    }
    
}


/**
 * Data structure representing a Node Index, which can be used to
 * to create index on node property to speed up retievals and enfroce
 * unique constraints. 
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NodeIndex {
    #[pyo3(get)]
    pub label: String,
    #[pyo3(get)]
    pub key: String
}

/**
 * Public Python implementation for NodeIndex
 */
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
     * Remove the index
     */
    pub fn drop(&self) -> Cypher {
        Cypher {
            query: format!("DROP INDEX ON : {}({})", self.label, self.key),
            read_only: false
        }
        
    }

    /**
     * Apply a unique constraint, without creating an index
     */
    pub fn unique_constraint(&self) -> Cypher {
        Cypher {
            query: format!("CREATE CONSTRAINT ON (n:{}) ASSERT n.{} IS UNIQUE", self.label, self.key),
            read_only: false
        } 
    }
}

/** 
 * Links are the relationships between two entities.
 *
 * They are directional, and have properties like entities. When you
 * have the option, it is encouraged to use rich links, instead of
 *  doubly-linked nodes to represent relationships.
 * 
 * The attributes are for a `Links` are:
 * - `_symbol`, a private str for cypher query templating
 * - `rank`, a reinforcement learning parameter for recommending new data
 * - `uuid`, the unique identifier for the entity
 * - `props`, properties blob
 * - `label`, the optional label for the relationship, we only use one per link
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

/**
 * Link implementation for Python contains Cypher query generators.
 */
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

    /**
     *  Format the Links for making a Cypher language query
     * to the Neo4j graph database
     *
     * [ r:Label { <key>:<value>, <key>:<value> } ]
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
            Some(value) => pattern = format!(" {{ {} }}", value)
        }

        format!("-[ r{}{} ]-", label, pattern)
    }

    /**
     * Query to remove a links between node patterns
     */
    pub fn drop(
        &self, 
        left: &Node,
        right: &Node,
    ) -> Cypher {
        Cypher {
            read_only: false,
            query: format!(
                "MATCH {}{}{} DELETE r", 
                left.cypher_repr(), 
                self.cypher_repr(), 
                right.cypher_repr()
            )
        }
    }

    /**
     * Create links between node patterns
     */
    pub fn join(
        &self, 
        left: &Node,
        right: &Node,
    ) -> Cypher {
        Cypher {
            read_only: false,
            query: format!(
                "MATCH {}, {} MERGE ({}){}({})", 
                left.cypher_repr(), 
                right.cypher_repr(), 
                left.symbol(), 
                self.cypher_repr(), 
                right.symbol()
            )
        }
    }

    /**
     * Use link-based queries, usually to get all children/siblings,
     * but actually very flexible.
     */
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
                left.cypher_repr(), 
                self.cypher_repr(), 
                right.cypher_repr(), 
                result
            )
        } 
    }
}


/**
 * Agents are a mystery
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Agents {
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    uuid: Option<String>,
}


/**
 * Python interface for Agents
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/** 
 * Data structure representing a network accessible Socket
 */
#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
struct Socket {
    #[pyo3(get)]
    host: String,
    #[pyo3(get)]
    port: Option<u32>
}


/**
 * Python bindings for Socker structure
 */
#[pymethods]
impl Socket {
    #[new]
    pub fn new(
        host: String,
        port: Option<u32>
    ) -> Self {
        Socket {
            host,
            port
        }
    }
}


/**
 * Actuators are devices that turn messages into physical effects.
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python bindings for Actuators
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/**
 * Assets are references to external data objects, which may or may not
 * be accessible at the time of query.
 * 
 * These are most likely blobs in object storage
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


/**
 * Python implementation of Assets
 */
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
            Ok(val) => println!("{}: {}", key, val),
            Err(e) => println!("couldn't interpret {}: {}", key, e),
        }
    }

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/**
 * Collections are arbitrary groupings of entities.
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python implementation of Collections
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/**
 * FeaturesOfInterest are usually Locations.
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python implementation of Features
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/**
 * Sensors are devices that convert a phenomenon to a digital signal.
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python implementation of Sensors
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 * Create a property, but do not associate any data streams with it
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python implementation of ObservedProperties
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 * Tasks are connected to `Things` and `TaskingCapabilities`.
 *
 * Tasks are pieces of work that are done asynchronously by humans or machines.
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Tasks {
    #[pyo3(get)]
    creation_time: Option<f64>,
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    tasking_parameters: Option<HashMap<String, String>>
}


/**
 * Python implementation of tasks
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/** 
 * A thing is an object of the physical or information world that is capable of of being identified
 * and integrated into communication networks.
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Things {
    #[pyo3(get)]
    uuid: Option<String>,
    #[pyo3(get)]
    name: Option<String>,
    #[pyo3(get)]
    description: Option<String>,
    #[pyo3(get)]
    properties: Option<HashMap<String, String>>
}


/**
 * Python implementation of Things
 */
#[pymethods]
impl Things {
    #[new]
    pub fn new(
        uuid: Option<String>,
        name: Option<String>,
        description: Option<String>,
        properties: Option<HashMap<String, String>>
    ) -> Self {
        Things {
            uuid,
            name,
            description,
            properties
        }
    }

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 * TaskingCapabilities may be called by defining graph patterns that supply all of their inputs.
  */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 * Providerss are generally organization or enterprise sub-units. This is used to
    route ingress and determine implicit permissions for data access, sharing, and
    attribution. 
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpatialLocationData {
    #[pyo3(get)]
    r#type: String,
    #[pyo3(get)]
    coordinates: [f64; 3],
}


#[pymethods]
impl SpatialLocationData {
    #[new]
    pub fn new(
        r#type: String,
        coordinates: [f64; 3]
    ) -> Self {
        SpatialLocationData {
            r#type,
            coordinates
        }
    }
}


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    location: Option<SpatialLocationData>,
}

#[pymethods]
impl Locations {
    #[new]
    pub fn new(
        uuid: Option<String>,
        name: Option<String>,
        description: Option<String>,
        encoding_type: Option<String>,
        location: Option<SpatialLocationData>
    ) -> Self {
        Locations {
            uuid,
            name,
            description,
            encoding_type,
            location
        }
    }

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/**
 * Private and automatic, should be added to sensor when new location is determined
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python implementation of Observations
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 * DataStreams are collections of Observations from a common source
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python implementation of DataStreams
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 *  Create a user entity. Users contain authorization secrets, and do not enter/leave
 *  the system through the same routes as normal Entities
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
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


/**
 * Python implementation of User
 */
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


#[pyclass]
struct Experiment {

}

#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelMetadata {
    name: String,
    description: String,
    keywords: Vec<String>,
    license: String,
}


#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelProperties {
    workers: u16,
    dt: u16,
    integration: String,
    backend: String
}

#[pyclass]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Model {
    uuid: Option<String>,
    metadata: Option<ModelMetadata>,
    properties: Option<ModelProperties>
}

#[pymethods]
impl Model {
    #[new]
    pub fn new(
        uuid: Option<String>,
        metadata: Option<ModelMetadata>,
        properties: Option<ModelProperties>
    ) -> Self {
        Model {
            uuid,
            metadata,
            properties
        }
    }

    
    pub fn self_link(&self) -> String {
        format!("")
    }

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}



#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Axis {
    label: String,
    tick: u32,
    interval: [f32; 2],
    dim: String,
    spines: [String; 2]
}

#[pymethods]
impl Axis {
    #[new]
    pub fn new(
        label: String,
        tick: u32,
        interval: [f32; 2],
        dim: String,
    ) -> Self {

        let spines;
        
        match dim.as_ref() {
            "x" => spines = [String::from("left"), String::from("right")],
            "y" => spines = [String::from("top"), String::from("bottom")],
            "z" => spines = [String::from("front"), String::from("back")],
            _ => spines = [String::from(""), String::from("")]
        }

        Axis {
            label,
            tick,
            dim,
            interval,
            spines
        }
    }

    pub fn ax_attr(&self) -> String {
        format!("{}axis", self.dim)
    }
}


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct FigureLayout {
    padding: [f64; 4],
    marker: f32,
    font: u8,
    text: u8,
    width: f32,
    height: f32,
    line: f32,
    alpha: f32,
    dpi: u16,
    legend: bool,
    grid: bool,
    image_interp: String
}

#[pymethods]
impl FigureLayout {
    #[new]
    pub fn new(
        padding: [f64; 4],
        marker: f32,
        font: u8,
        text: u8,
        width: f32,
        height: f32,
        line: f32,
        alpha: f32,
        dpi: u16,
        legend: bool,
        grid: bool,
        image_interp: String
    ) -> Self {
        FigureLayout {
            padding,
            marker,
            font,
            text,
            width,
            height,
            line,
            alpha,
            dpi,
            legend,
            grid,
            image_interp
        }
    }
}

#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct FigurePalette {
    bg: String,
    contrast: String,
    flag: String,
    label: String,
    colors: Vec<String>
}


#[pymethods]
impl FigurePalette {
    #[new]
    pub fn new(
        bg: String,
        contrast: String,
        flag: String,
        label: String,
        colors: Vec<String>
    ) -> Self {
        FigurePalette {
            bg,
            contrast,
            flag,
            label,
            colors
        }
    }
}

#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct FigureStyle {
    base: FigureLayout,
    dark: FigurePalette,
    light: FigurePalette,
}

#[pymethods]
impl FigureStyle {
    #[new]
    pub fn new(
        spec: String,
    ) -> Self {
        serde_yaml::from_str(&spec).unwrap()
    }
}


/**
 * Bind our data structures and methods, so they will be available
 * from Python for use in the Flask-Connexion API. 
 */
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
    m.add_class::<DataStreams>()?;
    m.add_class::<FeaturesOfInterest>()?;
    m.add_class::<Sensors>()?;
    m.add_class::<ObservedProperties>()?;
    m.add_class::<Tasks>()?;
    m.add_class::<TaskingCapabilities>()?;
    m.add_class::<Providers>()?;
    m.add_class::<Observations>()?;
    m.add_class::<Locations>()?;
    m.add_class::<Things>()?;
    m.add_class::<HistoricalLocations>()?;
    m.add_class::<User>()?;
    m.add_class::<MetaDataTemplate>()?;
    m.add_class::<Storage>()?;
    m.add_class::<Axis>()?;
    m.add_class::<FigureStyle>()?;
    m.add_class::<FigurePalette>()?;
    m.add_class::<SpatialLocationData>()?;
    Ok(())
}