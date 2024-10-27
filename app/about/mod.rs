use chrono::{NaiveDate, Datelike};
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use js_sys::Date;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
/**
 * Content data type, assumed to be text-based. 
 */
#[wasm_bindgen]
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Memo {
    authors: Vec<String>,
    content: Option<String>,
    description: String,
    issue: Option<String>,
    labels: Vec<String>,
    page_range: Vec<(u32, Option<u32>)>,
    publication: String,
    published: NaiveDate,
    references: Vec<Memo>,
    slug: Option<String>,
    title: String,
    volume: Option<String>,
}

impl Hash for Memo {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.authors.hash(state);
        self.published.hash(state);
        self.title.hash(state);
    }
}

/**
 * Used only in Rust
 */
impl Memo {
    fn year(&self) -> u32 {
        self.published.year() as u32
    }
    /**
     * Formatting the authors depends on how many names you
     * want to allow to be displayed, and the total number
     * of names there actually area. 
     */
    fn authors(&self) -> String {
        match self.authors.len() {
            0 => panic!("No Attribution"),
            1 => format!("{}", self.authors[0]),
            2 => format!("{} & {}", self.authors[0], self.authors[1]),
            3 => format!("{}, {} & {}", self.authors[0], self.authors[1], self.authors[2]),
            _ => format!("{} et al", self.authors[0])
        }
    }

    fn source(&self) -> String {
        fn inner_format((start, end): &(u32,  Option<u32>)) -> String {
            match end {
                None => format!("{}", start),
                Some(end) => format!("{}-{}", start, end)
            }
        }

        let prefix = match &self.volume {
            None => format!("{}", self.publication),
            Some(value) => format!("{} {}", self.publication, value)
        };
        match &self.page_range.len() {
            0 => prefix,
            _ => {
                let inner = 
                self.page_range.iter().map(inner_format).collect::<Vec<String>>();
                inner.join(", ")
            }
        }
    }
}
/**
 * Used in JavaScript context
 */
#[wasm_bindgen]
impl Memo {

    #[wasm_bindgen(constructor)]
    pub fn new(props: JsValue) -> Self {
        serde_wasm_bindgen::from_value(props).unwrap()
    }
    
    #[wasm_bindgen(getter)]
    pub fn published(&self) -> Date {
        let date_string = self.published.format("2011-12-17T12:00:00.000Z").to_string();
        Date::new(&JsValue::from_str(&*date_string))
    }

    pub fn get_hash(&self) -> u64 {
        let mut s = DefaultHasher::new();
        self.hash(&mut s);
        s.finish()
    }
    /**
     * Block style reference repr for list of citations.
     */
    #[wasm_bindgen(getter)]
    pub fn block(&self) -> JsValue {
        JsValue::from_str(&*[
            self.authors(),
            self.year().to_string(),
            self.title.trim().to_string(),
            self.source()
        ].join(". "))
    }
    /**
     * Inline style reference repr for citing in markup. 
     */
    pub fn inline(&self, parenthesis: bool) -> JsValue {
        let _inline = match parenthesis {
            true => format!("{} ({})", self.authors(), self.year()),
            false => format!("({} {})", self.authors(), self.year())
        };
        JsValue::from_str(&*_inline)
    }
}
