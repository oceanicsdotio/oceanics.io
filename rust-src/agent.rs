pub mod agent_system {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue};
    use web_sys::{CanvasRenderingContext2d};
    use std::f64::consts::{PI};
    use std::i64;

    fn signal (time: f64, period: f64) -> f64 {
        let _period = period * 1000.0;
        return (time % _period) / _period;
    }

    fn alpha (color: &JsValue) -> i64 {

        let mut cstring = color.as_string().unwrap();
        if cstring.len() == 9 {
            let alpha_string = &cstring[7..9].to_lowercase();
            i64::from_str_radix(alpha_string, 16).unwrap()
        } else {
            255 as i64
        }
    }

    struct CoordinatesXY {
        x: f64,
        y: f64
    }

    struct CoordinatesUV {
        u: f64,
        v: f64
    }

    struct Target {
        active: bool
    }

    #[wasm_bindgen]
    pub struct CursorState {
        reticule: CoordinatesXY,
        target: Target,
        cursor: CoordinatesUV,
        delta: CoordinatesXY,
        dragging: bool
    }

    #[wasm_bindgen]
    pub struct Cursor {

    }

    #[wasm_bindgen]
    impl Cursor {

        #[wasm_bindgen(constructor)]
        pub fn new() -> Cursor {
            Cursor {

            }
        }

        #[wasm_bindgen]
        pub fn keyring (ctx: &CanvasRenderingContext2d, displacement: f64, radius: f64, n: u32, radians: f64) {
            /*
            Ring of circles around the center.
            */
            ctx.save();
            for _ in 0..n {
                ctx.rotate(2.0 * PI / n as f64).unwrap();
                ctx.begin_path();
                let offset = PI - radians / 2.0;
                ctx.arc(displacement, 0.0, radius, -offset, radians).unwrap();
                ctx.stroke();
            }
            ctx.restore();
        }

        #[wasm_bindgen]
        pub fn ticks (ctx: &CanvasRenderingContext2d, theta: f64, n: u32, a: f64, b: f64) {

            ctx.save();
            ctx.rotate(theta).unwrap();
            let inc = 2.0 * PI / n as f64;
            for _ in 0..n {
                ctx.begin_path();
                ctx.rotate(inc).unwrap();
                ctx.move_to(a, 0.0);
                ctx.line_to(b, 0.0);
                ctx.stroke();
            }
            ctx.restore();
        }

        #[wasm_bindgen]
        pub fn draw (ctx: &CanvasRenderingContext2d, w: f64, h: f64, time: f64, x: f64, y: f64, dx: f64, dy: f64, color: JsValue) {

            use std::i64;
            const PULSE_RINGS: usize = 7;
            const ICON: f64 = 16.0;

            // fraction of complete circle for tool icons
            let completeness = signal(time, 2.0);
            let rad = w.max(h) / 2.5; // outer radius

            ctx.set_global_alpha((alpha(&color) as f64)/255.0);
            ctx.set_stroke_style(&color);
            ctx.clear_rect(0.0, 0.0, w, h);
            ctx.set_line_width(1.0);
            ctx.set_line_cap("round");

            {
                const RADIANS: f64 = 2.0 * PI;
                const OFFSET: f64 = PI - 0.5 * RADIANS;
                ctx.save();
                ctx.translate(x, y).unwrap();
                ctx.begin_path();
                ctx.arc(0.0, 0.0, ICON, OFFSET, RADIANS).unwrap();  // inner circle
                ctx.stroke();
                ctx.restore();
            }

            let _dx = x - (dx+0.5*w);
            let _dy = y - (dy+0.5*h);
            let dxy = (_dx.powi(2) + _dy.powi(2)).sqrt();
            let theta = _dy.atan2(_dx);

            {
                let displacement = 3.0*ICON + signal(time, 0.5) / 10.0;
                ctx.save();
                ctx.translate(0.5*w, 0.5*h).unwrap();

                Cursor::ticks(&ctx, (time / 10000.0), 8, 1.1*ICON, 1.3*ICON);
                Cursor::ticks(&ctx, (time / 10000.0), 16, rad - 0.5 * ICON, rad - 0.25 * ICON);
                Cursor::ticks(&ctx, -(time / 30000.0), 16, rad - 0.5 * ICON, rad - 0.75 * ICON);
                Cursor::keyring(&ctx, displacement, ICON, 6, completeness * PI * 2.0);

                ctx.save();
                ctx.rotate(theta).unwrap();

                let sig = signal(time, 2.0);

                for ii in 0..PULSE_RINGS {
                    ctx.begin_path();
                    const RADIANS: f64 = 2.0 * PI;
                    const OFFSET: f64 = 0.0;

                    let radius = rad + ICON * sig * (ii as f64).log(3.0);
                    let gap: f64;
                    let delta = dxy - radius;
                    if delta.abs() < ICON {
                        gap = (2.0*ICON*(0.5*PI - delta/ICON).sin()/radius).asin();
                    } else {
                        gap = 0.0;
                    }
                    ctx.arc(0.0, 0.0, radius, gap/2.0, RADIANS-gap/2.0).unwrap();
                    ctx.stroke();
                }
                ctx.restore();

                ctx.restore();
            }
        }
    }

    #[wasm_bindgen]
    pub struct Spring {
        k: f64,
        // spring constant
        pub x: f64,
        // displacement
        v: f64,
        // relative velocity
        l: f64,
        // zero position
        stop: f64,
        // distance at which the spring behaves as a rigid rod
        p: f64  // probability of dropout during physics loop
    }

    #[wasm_bindgen]
    impl Spring {
        #[wasm_bindgen(constructor)]
        pub fn new(k: f64, x: f64, v: f64, l: f64, stop: f64, p: f64) -> Spring {
            Spring { k, x, v, l, stop, p }
        }

        pub fn potential_energy(&self) -> f64 {
            0.5 * self.k * self.x * self.x
        }

        pub fn force(&self) -> f64 {
            -2.0 * self.k.sqrt() * self.v - self.k * (self.x - self.l)
        }

        pub fn drop(&self) -> bool {
            let sqrt2 = (2 as f64).sqrt();
            js_sys::Math::random() > self.p * (sqrt2 - self.x) / sqrt2
        }

        pub fn update(&mut self, distance: f64) {
            self.x = distance.max(self.stop);
            self.v = distance - self.x;
        }

        pub fn size(&self, s: f64) -> f64 {
            s / self.x
        }
    }

    #[wasm_bindgen]
    pub struct Link {
        spring: Spring,
        vec: Vec<f64>
    }

    #[wasm_bindgen]
    impl Link {
        #[wasm_bindgen(constructor)]
        pub fn new(p: f64) -> Link {
            Link {
                spring: Spring { k: 0.002, x: 0.0, v: 0.0, l: 0.2, stop: 0.1, p },
                vec: vec![0.0, 0.0, 0.0]
            }
        }
//
//        #[wasm_bindgen]
//        pub fn update(&mut self, neighbor: &mut Agent, count: usize) {
//
//            let mut dist = 0.0;
//            for dim in 0..3 {
//                dist += link.vec[dim];
//            }
//            dist = dist.sqrt();
//            self.spring.update(dist);
//
//            let force = link.spring.force();
//            state.energy.potential += link.spring.potential_energy();
//
//            let mut scaled: Vec<f64> = vec![];
//            for ii in 0..3 {
//                let delta = k / dist * force / count as f64;
//                self.velocity[ii] += delta;
//                neighbor.velocity[ii] -= delta;
//                let val = self.coordinates[ii] - neighbor.coordinates[index];
//                scaled.push(val * scale);
//            }
//        }
    }

    #[wasm_bindgen]
    pub struct Agent {
        heading: Vec<f64>,
        coordinates: Vec<f64>,
        velocity: Vec<f64>,
        links: Vec<Link>,
    }

    #[wasm_bindgen]
    impl Agent {
        #[wasm_bindgen(constructor)]
        pub fn new (x: f64, y: f64, z: f64) -> Agent {
            Agent {
                heading: vec![0.0, 0.0, 0.0],
                coordinates: vec![x, y, z],
                velocity: vec![0.0, 0.0, 0.0],
                links: vec![]
            }
        }

        #[wasm_bindgen]
        pub fn push_link(&mut self, p: f64) {
            self.links.push(Link::new(p))
        }


        #[wasm_bindgen]
        pub fn clamp_motion(&mut self, speed: f64, bounce: f64, pad: f64, tx: f64, ty: f64, tz: f64) {

            let torque = vec![tx, ty, tz];

            for kk in 0..3 {
                self.velocity[kk] += torque[kk];
                self.coordinates[kk] += self.velocity[kk];
                if self.coordinates[kk] > 1.0 - pad {
                    self.coordinates[kk] -= 2.0*(self.coordinates[kk] - 1.0 - pad);
                    self.velocity[kk] *= -bounce;
                } else if self.coordinates[kk] < pad {
                    self.coordinates[kk] -= 2.0*(self.coordinates[kk] - pad);
                    self.velocity[kk] *= -bounce;
                }
                if speed > 0.00001 {
                    self.heading[kk] = self.velocity[kk] / speed;
                }
            }

        }
        
        #[wasm_bindgen]
        pub fn draw_agent(ctx: &CanvasRenderingContext2d, _n: u32, w: f64, h: f64, x: f64, y: f64, z: f64, u: f64, v: f64, fade: f64, scale: f64, color: JsValue) {

            ctx.set_global_alpha((1.0 - fade * z).powf(2.0));
            ctx.set_fill_style(&color);
            ctx.set_stroke_style(&color);

            // Draw entity
            ctx.begin_path();
            if let Err(e) = ctx.arc(x * w, y * h, scale, 0.0, std::f64::consts::PI*2.0) {
                ctx.close_path();
                panic!("Problem drawing agent, probably negative scale value");
            }
            ctx.move_to(x * w, y * h);
            ctx.line_to(x * w + u * scale, y * h + v * scale);
            ctx.stroke();
            ctx.close_path();
        }
    }

    #[wasm_bindgen]
    pub struct Group {
        particles: Vec<Agent>
    }

    #[wasm_bindgen]
    impl Group {
        #[wasm_bindgen(constructor)]
        pub fn new() -> Group {
            Group {
                particles: vec![]
            }
        }

    }

}