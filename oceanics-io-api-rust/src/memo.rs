pub mod memo {
    use chrono::NaiveDate;
    use chrono::Datelike;
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize, Serialize};
    use serde_wasm_bindgen;
    use js_sys::{Function,Date};
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    /**
     * Labels are string tags that may have a mouse event
     * handler attached to it. That will be a JS object/fcn
     * reference.
     */
    #[derive(Debug, Deserialize, Serialize)]
    struct Label {
        value: String,
        #[serde(skip_serializing, skip_deserializing)]
        #[allow(dead_code)]
        on_click: Option<Function>
    }

    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize)]
    pub struct Metadata {
        publication: String,
        published: NaiveDate,
        labels: Vec<Label>,
        references: Option<Vec<Memo>>,
        authors: Vec<String>,
        title: String,
        description: String,
        volume: String,
        pages: Option<Vec<(u32, Option<u32>)>>
    }

    #[wasm_bindgen]
    impl Metadata {
        #[wasm_bindgen(constructor)]
        pub fn new(props: JsValue) -> Self {
            serde_wasm_bindgen::from_value(props).unwrap()
        }

        #[wasm_bindgen(getter)]
        pub fn published(&self) -> Date {
            let date_string = self.published.format("2011-12-17T12:00:00.000Z").to_string();
            Date::new(&JsValue::from_str(&*date_string))
        }
    }

    impl Hash for Metadata {
        fn hash<H: Hasher>(&self, state: &mut H) {
            self.authors.hash(state);
            self.published.hash(state);
            self.title.hash(state);
        }
    }

    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize)]
    pub struct Memo {
        metadata: Metadata,
        content: Option<String>,
        slug: Option<String>
    }

    /**
     * Used only in Rust
     */
    impl Memo {
        fn year(&self) -> u32 {
            self.metadata.published.year() as u32
        }

        /**
         * Formatting the authors depends on how many names you
         * want to allow to be displayed, and the total number
         * of names there actually area. 
         */
        fn authors(&self) -> String {
            let authors = &self.metadata.authors;
            match authors.len() {
                0 => panic!("No Document Attribution"),
                1 => format!("{}", authors[0]),
                2 => format!("{} & {}", authors[0], authors[1]),
                3 => format!("{}, {} & {}", authors[0], authors[1], authors[2]),
                _ => format!("{} et al", authors[0])
            }
        }

        fn source(&self) -> String {
            fn inner_format((start, end): &(u32,  Option<u32>)) -> String {
                match end {
                    None => format!("{}", start),
                    Some(end) => format!("{}-{}", start, end)
                }
            }

            let prefix = format!("{} {}", self.metadata.publication, self.metadata.volume);
            match &self.metadata.pages {
                None => prefix,
                Some(pages) => {
                    let inner = 
                        pages.iter().map(inner_format).collect::<Vec<String>>();
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
        pub fn new (
            metadata: Metadata, 
            content: Option<String>,
            slug: Option<String>
        ) -> Self {
            Memo {
                metadata,
                content,
                slug
            }
        }

        #[wasm_bindgen(getter)]
        pub fn hash(&self) -> u64 {
            let mut s = DefaultHasher::new();
            self.metadata.hash(&mut s);
            s.finish()
        }

        /**
         * Block style reference repr for list of citations.
         */
        #[wasm_bindgen(getter)]
        pub fn block(&self) -> String {
            [
                self.authors(),
                self.year().to_string(),
                self.metadata.title.trim().to_string(),
                self.source()
            ].join(". ")
        }

        /**
         * Inline style reference repr for citing in markup. 
         */
        pub fn inline(&self, parenthesis: bool) -> String {
            match parenthesis {
                true => format!("{} ({})", self.authors(), self.year()),
                false => format!("({} {})", self.authors(), self.year())
            }
        }
    }
}