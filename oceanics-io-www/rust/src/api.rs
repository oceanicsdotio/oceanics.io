/**
 *
 */
use std::env;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

extern crate serde_json; 
extern crate serde_yaml;

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

    pub fn headers(&self) -> String {
        serde_json::to_string(self).unwrap()
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



/**
 * Agents are a mystery
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Agents {
    
    name: Option<String>,
    
    uuid: Option<String>,
}


/**
 * Python interface for Agents
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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


/**
 * Python bindings for Socker structure
 */

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


/**
 * Python bindings for Actuators
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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


/**
 * Python implementation of Features
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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


/**
 * Python implementation of Sensors
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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


/**
 * Python implementation of ObservedProperties
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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


/**
 * Python implementation of tasks
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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
 * Python implementation of Things
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 * Providerss are generally organization or enterprise sub-units. This is used to
    route ingress and determine implicit permissions for data access, sharing, and
    attribution. 
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Providers {
    
    uuid: Option<String>,
    
    name: Option<String>,
    
    description: Option<String>,
    
    domain: Option<String>,
    
    secret_key: Option<String>,
    
    api_key: Option<String>,
    
    token_duration: Option<u16>,
}


impl Providers {
    
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}


/**
time interval, ISO8601
*/

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
 * Observationss are individual time-stamped members of DataStreams
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


/**
 * Python implementation of Observations
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
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


/**
 * Python implementation of DataStreams
 */

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

    pub fn serialize(&self) -> String {
        serde_json::to_string(self).unwrap()
    }
}

/**
 *  Create a user entity. Users contain authorization secrets, and do not enter/leave
 *  the system through the same routes as normal Entities
 */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct User {
    
    uuid: Option<String>,
    
    ip: Option<String>,
    
    name: Option<String>,
    
    alias: Option<String>,
    
    credential: Option<String>,
    
    validated: Option<bool>,
    
    description: Option<String>
}


/**
 * Python implementation of User
 */

impl User {
    
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



struct Experiment {

}


#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelMetadata {
    name: String,
    description: String,
    keywords: Vec<String>,
    license: String,
}



#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelProperties {
    workers: u16,
    dt: u16,
    integration: String,
    backend: String
}


#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Model {
    uuid: Option<String>,
    metadata: Option<ModelMetadata>,
    properties: Option<ModelProperties>
}


impl Model {
    
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




#[derive(Debug, Serialize, Deserialize)]
struct Axis {
    label: String,
    tick: u32,
    interval: [f32; 2],
    dim: String,
    spines: [String; 2]
}


impl Axis {
    
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


impl FigureLayout {
    
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


#[derive(Debug, Serialize, Deserialize)]
struct FigurePalette {
    bg: String,
    contrast: String,
    flag: String,
    label: String,
    colors: Vec<String>
}


impl FigurePalette {
    
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


#[derive(Debug, Serialize, Deserialize)]
struct FigureStyle {
    base: FigureLayout,
    dark: FigurePalette,
    light: FigurePalette,
}


impl FigureStyle {
    
    pub fn new(
        spec: String,
    ) -> Self {
        serde_yaml::from_str(&spec).unwrap()
    }
}
