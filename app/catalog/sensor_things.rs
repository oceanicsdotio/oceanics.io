/**
 * Data models for persistence and application logic. Plus abstractions
 * over data sources and sinks, and vendor metadata schemas. This used
 * to be used with Maturin to generate Python bindings, but we don't 
 * need to do domain-level models for passing-through API requests to
 * the database, so this is current is used for serializing/deserializing
 * data in Rust application code. 
 */
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// S3 storage metadata headers
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct MetaDataTemplate {
    x_amz_acl: String,
    x_amz_meta_parent: Option<String>,
    x_amz_meta_created: String,
    x_amz_meta_service_file_type: Option<String>,
    x_amz_meta_service: Option<String>
}

impl MetaDataTemplate {
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
}

/**
 * Storage is an interface to cloud object storage.
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Storage {
    endpoint: String,
    service_name: String,
    bucket_name: String,
    index: String,
    session_id: String,
    lock_file: String,
}

impl Storage {
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Agents {
    name: Option<String>,
    uuid: Option<String>,
}

impl Agents {
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

/** 
 * Data structure representing a network accessible Socket
 */
#[derive(Clone, Debug, Serialize, Deserialize)]
struct Socket {
    host: String,
    port: Option<u32>
}

impl Socket {
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
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Actuators {
    name: Option<String>,
    uuid: Option<String>,
    description: Option<String>,
    encoding_type: Option<String>,
    metadata: Option<String>,
    network_address: Option<Socket>
}

impl Actuators {
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
 * FeaturesOfInterest are usually Locations.
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeaturesOfInterest {
    
    name: Option<String>,
    
    uuid: Option<String>,
    
    description: Option<String>,
    
    encoding_type: Option<String>,
    
    feature: Option<HashMap<String, String>>,
}

impl FeaturesOfInterest {
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


/**
 * Sensors are devices that convert a phenomenon to a digital signal.
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Sensors{
    
    name: Option<String>,
    
    uuid: Option<String>,
    
    description: Option<String>,
    
    encoding_type: Option<String>,
    
    metadata: Option<HashMap<String, String>>
}

impl Sensors {
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
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObservedProperties {
    
    name: Option<String>,
    
    uuid: Option<String>,
    
    description: Option<String>,
    
    definition: Option<String>
}

impl ObservedProperties{
    
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Tasks {
    creation_time: Option<f64>,
    uuid: Option<String>,
    tasking_parameters: Option<HashMap<String, String>>
}

impl Tasks {
    
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
 * A thing is an object of the physical or information world that is capable of of being identified
 * and integrated into communication networks.
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Things {
    
    uuid: Option<String>,
    
    name: Option<String>,
    
    description: Option<String>,
    
    properties: Option<HashMap<String, String>>
}


/**
 *  implementation of Things
 */

impl Things {
    
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
}

/**
 * TaskingCapabilities may be called by defining graph patterns that supply all of their inputs.
*/
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaskingCapabilities {
    
    uuid: Option<String>,
    
    name: Option<String>,
    
    description: Option<String>,
    
    creation_time: Option<f64>,
    
    tasking_parameters: Option<HashMap<String, String>>
}

impl TaskingCapabilities {
    
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


#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpatialLocationData {
    
    r#type: String,
    
    coordinates: [f64; 3],
}

impl SpatialLocationData {
    
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Locations {
    
    uuid: Option<String>,
    
    name: Option<String>,
    
    description: Option<String>,
    
    encoding_type: Option<String>,
    
    location: Option<SpatialLocationData>,
}


impl Locations {
    
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
}


/**
 * Private and automatic, should be added to sensor when new location is determined
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoricalLocations {
    
    uuid: Option<String>,
    
    time: Option<f64>,
}

impl HistoricalLocations {
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


/** time interval, ISO8601 */
#[derive(Clone, Debug, Serialize, Deserialize)]
struct TimeInterval {
    
    start: f64,
    
    end: f64
}


impl TimeInterval {
    
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
 * Observations are individual time-stamped members of DataStreams
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Observations {
    
    uuid: Option<String>,
    
    phenomenon_time: Option<f64>,
    
    result: Option<f64>,
    
    result_time: Option<f64>,
    
    result_quality: Option<String>,
    
    valid_time: Option<TimeInterval>,
    
    parameters: Option<HashMap<String, String>>
}

impl Observations {
    
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
 * DataStreams are collections of Observations from a common source
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DataStreams {
    
    uuid: Option<String>,
    
    name: Option<String>,
    
    description: Option<String>,
    
    unit_of_measurement: Option<String>,
    
    observation_type: Option<String>,
    
    phenomenon_time: Option<TimeInterval>,
    
    result_time: Option<TimeInterval>
}

impl DataStreams {
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
