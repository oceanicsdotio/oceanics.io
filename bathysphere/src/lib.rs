// src/lib.rs
use pyo3::prelude::*;
// use pyo3::wrap_pyfunction;
extern crate serde_json;  // or yaml

#[macro_use]
extern crate serde_derive;


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
    name: String,
    #[pyo3(get)]
    description: String,
    #[pyo3(get)]
    location: String
}

#[pymethods]
impl Asset {
    #[new]
    pub fn new(name: String, description: String, location: String) -> Self {
        Asset {
            name, description, location
        }
    }
}

#[pymodule]
fn bathysphere(_: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<Agent>()?;
    m.add_class::<Asset>()?;
    Ok(())
}