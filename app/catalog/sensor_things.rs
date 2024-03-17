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
    pub x_amz_acl: String,
    pub x_amz_meta_parent: Option<String>,
    pub x_amz_meta_created: String,
    pub x_amz_meta_service_file_type: Option<String>,
    pub x_amz_meta_service: Option<String>
}


/**
 * Storage is an interface to cloud object storage.
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Storage {
    pub endpoint: String,
    pub service_name: String,
    pub bucket_name: String,
    pub index: String,
    pub session_id: String,
    pub lock_file: String,
}

/** 
 * Data structure representing a network accessible Socket
 */
#[derive(Clone, Debug, Serialize, Deserialize)]
struct Socket {
    pub host: String,
    pub port: Option<u32>
}

/**
 * Actuators are devices that turn messages into physical effects.
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Actuators {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub encoding_type: Option<String>,
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
    
    pub name: Option<String>,
    
    pub uuid: Option<String>,
    
    pub description: Option<String>,
    
    pub encoding_type: Option<String>,
    
    pub feature: Option<HashMap<String, String>>,
}

/**
 * Create a property, but do not associate any data streams with it
 */
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ObservedProperties {
    
    pub name: Option<String>,
    
    pub uuid: Option<String>,
    
    pub description: Option<String>,
    
    pub definition: Option<String>
}


/**
 * Tasks are connected to `Things` and `TaskingCapabilities`.
 *
 * Tasks are pieces of work that are done asynchronously by humans or machines.
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Tasks {
    pub creation_time: Option<f64>,
    pub uuid: Option<String>,
    pub tasking_parameters: Option<HashMap<String, String>>
}


/**
 * TaskingCapabilities may be called by defining graph patterns that supply all of their inputs.
*/
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaskingCapabilities {
    
    pub uuid: Option<String>,
    
    pub name: Option<String>,
    
    pub description: Option<String>,
    
    pub creation_time: Option<f64>,
    
    pub tasking_parameters: Option<HashMap<String, String>>
}


