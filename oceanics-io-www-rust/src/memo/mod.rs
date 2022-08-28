pub mod memo {
    use std::cmp;
    use chrono::NaiveDate;
    use regex::Regex;
    use wasm_bindgen::prelude::*;
    use js_sys::Function;

    struct Label {
        value: String,
        onClick: Option<Function>
    }

    #[wasm_bindgen]
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
            published: String
        ) -> Self {
            Metadata { 
                publication: (), 
                published: NaiveDate::new(published), 
                labels: (), 
                references: (), 
                authors: (), 
                title: (), 
                description: (), 
                volume: (), 
                pages: () }
        }
    }

    #[wasm_bindgen]
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
                metadata: Metadata {
                    labels: ,
                    ..metadata
                },
                content,
                slug
            }
        }

        #[wasm_bindgen(getter)]
        pub fn hash(&self) -> String {
            let re = Regex::new(r"/\s/g").unwrap();
            
            let inputs = [
                self.metadata.authors.join(""),
                format!("{}", self.year()),
                self.metadata.title
            ].join("");

            let result: Vec<str> = re.replace_all(inputs, "").to_lowercase().split("").into();

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