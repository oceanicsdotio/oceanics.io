// src/lib.rs
use pyo3::prelude::*;
use std::env;
use pyo3::wrap_pyfunction;
extern crate serde_json;  // or yaml

#[macro_use]
extern crate serde_derive;


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Query {
    #[pyo3(get)]
    read_only: bool,
    #[pyo3(get)]
    method: String
}



#[pymethods]
impl Query {
    #[new]
    pub fn new(read_only: bool, method: String) -> Self {
        Query { read_only, method }
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

#[pymodule]
fn bathysphere(_: Python, m: &PyModule) -> PyResult<()> {
   
    m.add_class::<Agent>()?;
    m.add_class::<Asset>()?;
    Ok(())
}