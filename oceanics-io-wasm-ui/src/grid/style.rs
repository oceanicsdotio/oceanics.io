pub mod style {
    use serde::Deserialize;

    /**
     * Styles are used in rendering the WebGL/Canvas animations
     * and static images of the grid
     */
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Style {
        pub background_color: String, 
        pub grid_color: String, 
        pub overlay_color: String, 
        pub line_width: f64,
        pub font_size: f64, 
        pub tick_size: f64, 
        pub label_padding: f64
    }
}