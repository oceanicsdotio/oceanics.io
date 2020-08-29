pub mod water_quality {

    use std::collections::HashMap;

    pub struct Limit {
        lower: f64,
        upper: f64
    }

    impl Limit {
        pub fn new() -> Limit {
            Limit {

            }
        }
    }

    struct Chemistry {
        sources: Vec<&usize>,
        limit: Limit,
    }

    impl Chemistry {
        pub fn new() -> Chemistry {

        }
    }


}