pub mod style {
    use serde::Deserialize;  // comm with Web JS

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Style {
        pub background_color: String, 
        pub overlay_color: String, 
        pub line_width: f64,
        pub font_size: f64, 
        pub tick_size: f64, 
        pub label_padding: f64,
        pub fade: f64,
        pub radius: f64
    }
}