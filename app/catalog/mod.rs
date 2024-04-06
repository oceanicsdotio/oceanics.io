pub mod data_streams;
pub mod features_of_interest;
pub mod historical_locations;
pub mod locations;
pub mod observations;
pub mod observed_properties;
pub mod sensors;
pub mod things;

use serde::{Deserialize, Serialize};

/// Assets are references to external data objects, which may or may not
/// be accessible at the time of query.
/// These are likely blobs in object storage

#[derive(Debug, Serialize, Deserialize)]
struct Assets {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub location: Option<String>,
}

/// Collections are groups of entities.
/// They can be recursive.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Collections {
    pub name: Option<String>,
    pub uuid: Option<String>,
    pub description: Option<String>,
    pub extent: Option<Vec<f64>>,
    pub keywords: Option<String>,
    pub license: Option<String>,
    pub version: Option<u32>,
}


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
