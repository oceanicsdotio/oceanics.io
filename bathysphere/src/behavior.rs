/**
 * Container for fish-like behavior
 */
mod ichthyoid {

    use std::f64::consts::PI;

    struct Behavior {
        speed: f64,
        angle: f64,
        memory: f64,
        threshold: f64,
        weight: f64,
    }
    
    impl Behavior {

        pub fn event(&self, signal: &f64) -> bool {
            signal > self.threshold
        }

        pub fn utility(&self, probability: &f64, signal: &f64) -> f64 {
            self.weight * self.probability(signal, probability)
        }

        pub fn probability(&self, probability: &f64, signal: &f64) -> f64 {
            let memory = self.memory;
            probability * (1.0 - memory) * self.event(signal) + memory * probability
        }
        
    }

    /**
     * Describe the motion.
     *
     * Also need to note if flight was previously active
     */
    struct Velocity {
        u: f64,
        v: f64,
        w: f64,
        reverse: bool
    }

    /**
     * Inputs needed each time step
     */
    struct Forcing {
        suitability: f64,
        dissolved: f64,
        toxin: f64,
        mass: f64,
        random: f64,
        velocity: Velocity
    }

    /**
     * Container for toxin parameters
     */
    struct Toxin {
        fraction: f64,
    }

    /**
     * Container for toxin depuration parameters
     */
    struct Depuration {
        rate: f64,
    }

    /**
     * Container for absorption parameters
     */
    struct Absorption {
        rate: f64
    }

    /**
     */
    struct Ingestion {
        rate: f64
    }

    struct Growth {
        max: f64
    }

    struct Ichthyoid {
        growth: Growth,
        util_cutoff: f64,
        absorption: Absorption,
        depuration: Depuration,
        ingestion: Ingestion,
        toxin: Toxin,
        speed_impair: f64,
        reverse: f64,
        length: f64,
    }



    impl Ichthyoid {
        
        fn new() -> Self {

            let behaviors: Vec<Behavior> = vec![
                Behavior { speed: 0.5, angle: 2.0, memory: 0.0, threshold: 0.0, weight: 0.0, reverse: false },
                Behavior { speed: 1.0, angle: 0.25, memory: 0.5, threshold: 0.005e-6, weight: 0.7, reverse: true },
                Behavior { speed: 0.5, angle: 0.25, memory: 0.96, threshold: 0.005e-6, weight: 0.7, reverse: true },
                Behavior { speed: 0.25, angle: 1.0, memory: 0.5, threshold: 0.5, weight: 1.0, reverse: false},
                Behavior { speed: 0.33, angle: 0.5, memory: 0.96, threshold: 0.5, weight: 1.0, reverse: false},
            ];
        
            Ichthyoid {
                growth: Growth{
                    max: 0.0025 *12.0 *0.001, // conversion to meters per hour from mm per 5min
                },
                util_cutoff: 0.01,  //level at which default behavior is chosen
                absorption: Absorption{
                    rate: 0.0046748 // grams of toxin / m^2 / hour / [toxin]
                },
                depuration: Depuration{
                    rate: 0.01
                },
                ingestion: Ingestion{
                    rate: 0.00002
                },
                tox_frac: 0.015e-6,
                speed_impair: 0.9,
                reverse: f64,
                length: f64,
                angle: f64,
                event: Vec<f64>,
                probability: Vec<f64>,
                utility: Vec<f64>
            }
        }

        // fn movement(&self, suitability: f64) {
        //     let maxutil: f64 = 0.0;
        //     let speed: f64 = 0.0;
        //     let rule_index: u8 = 0.0;
        //     let absorption: f64;
        //     let depuration: f64;
        //     let mass: f64;

        //     self.event[0] = (self.microcystin > )

        // }

        /**
         * Length growth of individuals in meters per hour based on small pelagic fish
         */
        fn linear_growth(&self, suitability: &f64, time_delta: &f64) -> f64 {
            self.growth.max*suitability*time_delta
        }

        fn impaired(&self, toxin: &f64, mass: &f64) -> bool {
            toxin / mass > self.tox_frac
        }

        fn mass(&self, length: &f64) -> f64 {
            2e-6 * (1000.0*length)**(3.38)
        }

        /**
         * Ingestion
         */
        fn ingestion(&self, mass: &f64, length: &f64, toxin_load: &f64) -> f64 {
            (self.mass(length) - mass) * self.ingestion.rate * toxin_load
        }

        fn depuration(&self, toxin: &f64) -> f64 {
            self.depuration.rate * toxin
        }

        fn absorption(&self, dissolved: &f64, length: &f64) -> f64 {
            self.absorption.rate * length * dissolved
        }

        fn pick_behavior(&self, probabilities: Vec<f64>, signals: Vec<f64>) -> &Behavior {
            let mut behavior;
            let mut max_util = 0.0;
            for (each, prob, sig) in self.behaviors.iter().zip(probabilities, signals) {
                if each.utility(prob, sig) > max_util {
                    behavior = each;
                }
            }
            behavior
        }

    
        fn velocity(&self, probabilities: Vec<f64>, signals: Vec<f64>, reverse: &bool, length: &f64) -> Velocity {

            let behavior = self.pick_behavior(probabilities, signals);

            let _reverse = behavior.reverse & !reverse;

            let mut _length: f64 = 1.0;
            if (self.impaired(toxin, mass)) {
                _length = self.speed_impair;
            }
            _length

            let speed = 3600.0 * behavior.speed * length * self.effective_length()
            let angle = _reverse * PI + 


            Velocity {
                u: 0.0,
                v: 0.0,
                w: 0.0,
                reverse: _reverse
            }

           self%angle(ii) = self%angle(ii) + self%reverse(ii)*pi + &
                    &merge(random%uniform(), random%clipped(), self%impaired(ii))*pi*angletable(rule_index)
    
            speed = dti*3600.0_sp*speedtable(rule_index)*self%length(ii)*self%effective_length(ii)
            self%xp(ii) = self%xp(ii) + cos(self%angle(ii))*speed
            self%yp(ii) = self%yp(ii) + sin(self%angle(ii))*speed
        }



    }

    struct CarbonFlux {
        growth: f64
    }

    struct ToxinFlux {
        depuration: f64,
        ingestion: f64
    }

    struct Transaction {
        toxin: ToxinFlux,
        carbon: CarbonFlux
    }


    struct Result {
        mass_transfer: Transaction,
        depuration: f64,
        impaired: bool
    }
}

        

    
        
        
