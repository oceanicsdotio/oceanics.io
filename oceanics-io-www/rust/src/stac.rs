#[allow(dead_code)]
pub mod stac {
    use serde::{Deserialize, Serialize};

    /**
     * Assets are references to external data objects, which may or may not
     * be accessible at the time of query.
     *
     * These are most likely blobs in object storage
     */

    #[derive(Debug, Serialize, Deserialize)]
    struct Assets {
        name: Option<String>,
        uuid: Option<String>,
        description: Option<String>,
        location: Option<String>,
    }

    /**
     * Python implementation of Assets
     */

    impl Assets {
        pub fn new(
            name: Option<String>,
            uuid: Option<String>,
            description: Option<String>,
            location: Option<String>,
        ) -> Self {
            Assets {
                name,
                uuid,
                description,
                location,
            }
        }
    }

    /**
     * Collections are arbitrary groupings of entities.
     */

    #[derive(Debug, Serialize, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Collections {
        name: Option<String>,
        uuid: Option<String>,
        description: Option<String>,
        extent: Option<Vec<f64>>,
        keywords: Option<String>,
        license: Option<String>,
        version: Option<u32>,
    }

    /**
     * Python implementation of Collections
     */
    impl Collections {
        pub fn new(
            name: Option<String>,
            uuid: Option<String>,
            description: Option<String>,
            extent: Option<Vec<f64>>,
            keywords: Option<String>,
            license: Option<String>,
            version: Option<u32>,
        ) -> Self {
            Collections {
                name,
                uuid,
                description,
                extent,
                keywords,
                license,
                version,
            }
        }
    }
}