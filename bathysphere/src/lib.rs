// src/lib.rs
use pyo3::prelude::*;
use std::env;
extern crate serde_json;  // or yaml

#[macro_use]
extern crate serde_derive;


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Cypher {
    #[pyo3(get)]
    pub read_only: bool,
    #[pyo3(get)]
    pub query: String
}


#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Node {
    #[pyo3(get)]
    pub pattern: String,
    #[pyo3(get)]
    pub symbol: String
}

/*
Links are the relationships between two entities.

They are directional, and have properties like entities. When you
have the option, it is encouraged to use rich links, instead of
doubly-linked nodes to represent relationships.

The attributes are for a `Link` are:
- `_symbol`, a private str for cypher query templating
- `rank`, a reinforcement learning parameter for recommending new data
- `uuid`, the unique identifier for the entity
- `props`, properties blob
- `label`, the optional label for the relationship, we only use one per link
 */
#[pyclass]
#[derive(Debug, Serialize, Deserialize)]
struct Link {
    #[pyo3(get)]
    pub cost: Option<f32>,
    #[pyo3(get)]
    pub rank: Option<u32>,
    #[pyo3(get)]
    pub label: Option<String>,
    #[pyo3(get)]
    pub pattern: Option<String>,
}


#[pymethods]
impl Link {
    #[new]
    fn new(
        label: Option<String>,
        rank: Option<u32>,
        cost: Option<f32>,
        pattern: Option<String>
    ) -> Self {
        Link {
            rank,
            label,
            cost,
            pattern
        }
    }

    /*

    Format the Link for making a Cypher language query
    to the Neo4j graph database

    [ r:Label { <key>:<value>, <key>:<value> } ]
     */
   

    // labelStr = f":{self.label}" if self.label else ""
    // combined = {"uuid": self.uuid, "rank": self.rank, **(self.props or {})}
    // nonNullValues = tuple(
    //     filter(lambda x: x, map(processKeyValueInbound, combined.items()))
    // )
    // pattern = (
    //     "" if len(nonNullValues) == 0 else f"""{{ {', '.join(nonNullValues)} }}"""
    // )
    // return f"[ {self._symbol}{labelStr} {pattern} ]"
    fn cypher_repr(&self) -> String {

        let label: String;

        match &self.label {
            None => label = String::from(""),
            Some(value) => label = format!(":{}", value)
        }

        let pattern: String;


        match &self.pattern {
            None => pattern = String::from(""),
            Some(value) => pattern = format!(" {{ {:?} }}", pattern)
        }

        format!("-[ r{}{} ]-", label, pattern)
    }

    pub fn drop(
        &self, 
        left: &Node,
        right: &Node,
    ) -> Cypher {
        Cypher {
            read_only: false,
            query: format!(
                "MATCH {}{}{} DELETE r", 
                left.pattern, 
                self.cypher_repr(), 
                right.pattern
            )
        }
    }

    pub fn join(
        &self, 
        left: &Node,
        right: &Node,
    ) -> Cypher {
        Cypher {
            read_only: false,
            query: format!(
                "MATCH {}, {} MERGE ({}){}({})", 
                left.pattern, 
                right.pattern, 
                left.symbol, 
                self.cypher_repr(), 
                right.symbol
            )
        }
    }

    pub fn query(
        &self, 
        left: String,
        right: String, 
        result: String
    ) -> Cypher { 
        Cypher {
            read_only: true,
            query: format!(
                "MATCH {}{}{} RETURN {}", 
                left.pattern, 
                self.cypher_repr(), 
                right.pattern, 
                result
            )
        } 
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
    m.add_class::<Link>()?;
    m.add_class::<Cypher>()?;
    m.add_class::<Agent>()?;
    m.add_class::<Asset>()?;
    Ok(())
}