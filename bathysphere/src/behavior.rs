pub mod behavior {

    use std::f32::consts::PI;

    struct Behavior {
        speed: f32,
        angle: f32,
    }

    struct Memory {
        value: f32
    }

    struct Agent {
        threshold: f32,
        weight: f32,
    }

    struct FishAgent {
        growth_max: f32,
        util_cutoff: f32,
        absorption_rate: f32,
        depuration_rate: f32,
        ingestion_rate: f32,
        tox_frac: f32,
        speed_impair: f32,
        enforce_default: bool,
        no_flight: bool,
        ingestion_multiplier: bool,
        impaired: bool,
        last_rule: u8,
        reverse: f32,
        suitability: f32,
        length: f32,
        effective_length: f32,
        mass: f32,
        microcystin: f32,
        dissolved: f32,
        angle: f32,
        pathway: f32,
        event: Vec<f32>,
        probability: Vec<f32>,
        utility: Vec<f32>
    }

    impl FishAgent {
        fn new(angle: f32) -> FishAgent {

            let length = 0.1;
            let mass = 2e-6 * ((1000.0 * length)as f32).powf(3.38);

            FishAgent {
                impaired: false,
                event: vec![0.0; 2],
                last_rule: 0,
                angle,
                length,
                effective_length: 1.0,
                microcystin: 0.0,
                dissolved: 0.0,
                pathway: 0.0,
                probability: vec![0.0; 3],
                utility: vec![0.0; 4],
                reverse: 0.0,
                suitability: 0.0,
                absorption_rate: 0.0,
                depuration_rate: 0.0,
                growth_max: 0.0,
                ingestion_rate: 0.0,
                mass: 0.0,
                speed_impair: 0.0,
                tox_frac: 0.0,
                util_cutoff: 0.0,
            }
        }

        fn impaired(&self) -> bool {
            (self.microcystin/self.mass) > self.tox_frac
        }

        // fn movement(&self, suitability: f32) {

        //     let maxutil: f32 = 0.0;
        //     let speed: f32 = 0.0;
        //     let rule_index: u8 = 0.0;
        //     let absorption: f32;
        //     let depuration: f32;
        //     let mass: f32;

        //     self.event[0] = (self.microcystin > )

        // }
    }

}