use serde::{Serialize,Deserialize};

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

