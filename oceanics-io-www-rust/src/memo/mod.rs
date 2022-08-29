pub mod memo {
    use chrono::NaiveDate;
    use wasm_bindgen::prelude::*;
    use serde::{Deserialize, Serialize};
    use js_sys::Function;
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    /**
     * Labels are string tags that may have a mouse event
     * handler attached to it. That will be a JS object/fcn
     * reference.
     */
    struct Label {
        value: String,
        onClick: Option<Function>
    }

    
    #[derive(Deserialize)]
    struct SerializedMetadata {
        publication: String,
        published: String,
        labels: Vec<Label>,
        references: Option<Vec<SerializedMemo>>,
        authors: Vec<String>,
        title: String,
        description: String,
        volume: String,
        pages: Option<Vec<Vec<u16>>>
    }

    #[wasm_bindgen]
    #[derive(Debug,Deserialize, Serialize)]
    struct Metadata {
        publication: String,
        published: NaiveDate,
        labels: Vec<Label>,
        references: Option<Vec<Memo>>,
        authors: Vec<String>,
        title: String,
        description: String,
        volume: String,
        pages: Option<Vec<Vec<u16>>>
    }

    #[wasm_bindgen]
    impl Metadata {
        #[wasm_bindgen(constructor)]
        pub fn new(
            published: String,
            labels: Option<Vec<String>>,
            references: Option<Vec<Memo>>,
        ) -> Self {
            Metadata { 
                publication: (), 
                published: NaiveDate::new(published), 
                labels: labels.into_iter().map(
                    |value| Label{value, onClick: None}
                ), 
                references: Some(references).unwrap().into_iter().map(
                    |each| Memo{
                        ..each
                    }
                ), 
                authors: (), 
                title: (), 
                description: (), 
                volume: (), 
                pages: () 
            }
        }
    }

    impl Hash for Metadata {
        fn hash<H: Hasher>(&self, state: &mut H) {
            self.authors.hash(state);
            self.published.hash(state);
            self.title.hash(state);
        }
    }

    #[derive(Deserialize)]
    struct SerializedMemo {
        metadata: Metadata,
        content: Option<String>,
        slug: Option<String>
    }

    #[wasm_bindgen]
    #[derive(Debug, Deserialize, Serialize)]
    struct Memo {
        metadata: Metadata,
        content: Option<String>,
        slug: Option<String>
    }

    #[wasm_bindgen]
    impl Memo {
        #[wasm_bindgen(constructor)]
        pub fn new (
            metadata: Metadata, 
            content: Option<String>,
            slug: Option<String>
        ) -> Self {
           
            Memo {
                metadata: Metadata::new(),
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

        #[wasm_bindgen(getter)]
        pub fn year(&self) -> u32 {
            self.metadata.published.get_full_year()
        }

        /**
         * Formatting the authors depends on how many names you
         * want to allow to be displayed, and the total number
         * of names there actually area. 
         */
        #[wasm_bindgen(getter)]
        pub fn authors(&self, named_authors: usize) -> String {
            let count = self.metadata.authors.len();
            let stop = cmp::min(count, named_authors);
            let last_names = &self.metadata.authors[..stop];

            match count {
                0 => panic!("No Document Attribution"),
                1 => last_names[0],
                named_authors => format!(
                    "{} & {}", 
                    last_names[..last_names.len()].join(", "), last_names[last_names.len()]
                ),
                _ => format!("{} et al", last_names.join(", "))
            }
        }

        /**
         * 
         */
        #[wasm_bindgen(getter)]
        pub fn source(&self) -> String {
            let prefix = [
                self.metadata.publication,
                self.metadata.volume
            ].join(" ");
            match self.metadata.pages {
                None => prefix,
                Some(page) => {
                    let inner = self.metadata.pages.into_iter().map(
                        |x| x.into_iter().map(|y| format!("{}", y)).collect().join("-")
                    ).map(
                        |x| x.join("-")
                    ).collect().join(", ");
                    inner
                }
            }
        }

        #[wasm_bindgen(getter)]
        pub fn reference(&self) -> String {
            [
                self.metadata.authors.join(", "),
                self.year(),
                self.metadata.title.trim(),
                self.source()
            ].join(". ")
        }
    }
}