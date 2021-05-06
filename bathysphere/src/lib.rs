// src/lib.rs
use pyo3::prelude::*;

#[pyclass]
struct Point {
    #[pyo3(get)]
    x: f64,
    #[pyo3(get)]
    y: f64
}

#[pymethods]
impl Point {
    #[new]
    pub fn new(x: f64, y: f64) -> Self {
        Point { x, y }
    }
}

#[pymodule]
fn point(_: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<Point>()?;

    Ok(())
}