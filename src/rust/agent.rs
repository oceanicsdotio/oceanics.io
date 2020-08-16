#[allow(dead_code)]
pub mod agent_system {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue};
    use std::collections::HashMap;
    use web_sys::{CanvasRenderingContext2d};
    use std::f64::consts::{PI};
    use std::i64;

    fn signal (time: f64, period: f64) -> f64 {
        let _period = period * 1000.0;
        return (time % _period) / _period;
    }

    fn alpha (color: &JsValue) -> i64 {

        let cstring = color.as_string().unwrap();
        if cstring.len() == 9 {
            let alpha_string = &cstring[7..9].to_lowercase();
            i64::from_str_radix(alpha_string, 16).unwrap()
        } else {
            255 as i64
        }
    }

    fn magnitude (vector: &Vec<f64>) -> f64 {
        let mut sum = 0.0;
        for ii in 0..vector.len() {
            sum += vector[ii]*vector[ii];
        }
        sum.powf(0.5)
    }


    fn rgba (force: f64, z: f64, fade: f64) -> String {
        let mut color: String = "rgba(".to_owned();
        if force < 0.0 {
            color.push_str("0, 0, 255,");
        } else {
            color.push_str("255, 0, 0,");
        }
        color.push_str(&format!("{alpha:.*})", 2, alpha=(1.0 - fade * z)));
        return color;
    }

    #[allow(dead_code)]
    struct CoordinatesXY {
        x: f64,
        y: f64
    }

    #[allow(dead_code)]
    struct CoordinatesUV {
        u: f64,
        v: f64
    }

    #[allow(dead_code)]
    struct Target {
        active: bool
    }

    #[allow(dead_code)]
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

                Cursor::ticks(&ctx, time / 10000.0, 8, 1.1*ICON, 1.3*ICON);
                Cursor::ticks(&ctx, time / 10000.0, 16, rad - 0.5 * ICON, rad - 0.25 * ICON);
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
            }
        }
    }

    #[wasm_bindgen]
    #[derive(Copy, Clone)]
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
            unsafe {
                js_sys::Math::random() > self.p * (sqrt2 - self.x) / sqrt2
            }
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

        #[wasm_bindgen]
        pub fn update(&mut self, dx: f64, dy: f64, dz: f64) -> Vec<f64> {

            let new_vec = vec![dx, dy, dz];

            let dist = magnitude(&new_vec);
            self.spring.update(dist);

            let force = self.spring.force();
            let mut delta: Vec<f64> = vec![];
           
            for dim in 0..3 {

                if dist > 0.00001 {
                    delta.push(self.vec[dim] / dist * force);
                    
                } else {
                    delta.push(0.0);
                }
                
                self.vec[dim] = new_vec[dim];         
            };

            delta

        }

        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, ax: f64, ay: f64, az: f64, radius: f64, fade: f64, force: f64, color: &JsValue) {
                        
            let bx = ax + self.vec[0];
            let by  = ay + self.vec[1];
            // let grad = ctx.create_linear_gradient(ax, ay, bx, by);
            let offset = 4.0*radius;
            
            // assert!(grad.add_color_stop(0.0, &rgba(force, az, fade)).is_ok());
            // assert!(grad.add_color_stop(1.0, &rgba(force, az + self.vec[2], fade)).is_ok());
            
            // ctx.set_stroke_style(&grad);
            ctx.set_stroke_style(&color);
            
            ctx.set_global_alpha(1.0);
            ctx.begin_path();
            ctx.move_to(ax - offset*self.vec[0], ay - offset*self.vec[1]);
            ctx.line_to(bx + offset*self.vec[0], by + offset*self.vec[1]);
            ctx.stroke();
        }

    //    #[wasm_bindgen]
    //    pub fn update(&mut self, neighbor: &mut Agent, count: usize) {

    //        let mut dist = 0.0;
    //        for dim in 0..3 {
    //            dist += link.vec[dim];
    //        }
    //        dist = dist.sqrt();
    //        self.spring.update(dist);

    //        let force = link.spring.force();
    //        state.energy.potential += link.spring.potential_energy();

    //        let mut scaled: Vec<f64> = vec![];
    //        for ii in 0..3 {
    //            let delta = k / dist * force / count as f64;
    //            self.velocity[ii] += delta;
    //            neighbor.velocity[ii] -= delta;
    //            let val = self.coordinates[ii] - neighbor.coordinates[index];
    //            scaled.push(val * scale);
    //        }
    //    }
    }

    #[wasm_bindgen]
    pub struct Agent {
        heading: Vec<f64>,
        coordinates: Vec<f64>,
        velocity: Vec<f64>,
        links: HashMap<usize,Link>,
    }

    #[wasm_bindgen]
    impl Agent {
        #[wasm_bindgen(constructor)]
        pub fn new (x: f64, y: f64, z: f64) -> Agent {
            Agent {
                heading: vec![0.0, 0.0, 1.0],
                coordinates: vec![x, y, z],
                velocity: vec![0.0, 0.0, 0.0],
                links: HashMap::new()
            }
        }

        pub fn update_position(&mut self) {

            let padding = 0.0;
            let drag = 0.0;
            let bounce = 0.5;

            for dim in 0..3 {
                let mut coord = self.coordinates[dim];
                
                self.velocity[dim] *= 1.0 - drag;
                coord += self.velocity[dim];
                if coord > 1.0 - padding {
                    coord -= 2.0*(coord - 1.0 - padding);
                    self.velocity[dim] *= -bounce;
                } else if coord < padding {
                    coord -= 2.0*(coord - padding);
                    self.velocity[dim] *= -bounce;
                }
                if magnitude(&self.velocity) > 0.00001 {
                    self.heading[dim] = self.velocity[dim]
                }
                self.coordinates[dim] = coord;
            }

        }

        
        #[wasm_bindgen]
        pub fn draw(ctx: &CanvasRenderingContext2d, _n: u32, w: f64, h: f64, x: f64, y: f64, z: f64, u: f64, v: f64, fade: f64, scale: f64, color: &JsValue) {

            ctx.set_global_alpha((1.0 - fade * z).powf(2.0));
            ctx.set_fill_style(&color);
            ctx.set_stroke_style(&color);

            // Draw entity
            ctx.begin_path();
            if let Err(_e) = ctx.arc(x * w, y * h, scale, 0.0, std::f64::consts::PI*2.0) {
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
        pub fn new(count: usize) -> Group {
            let mut group = Group {
                particles: vec![]
            };

            unsafe {
                for _ii in 0..count {
                    group.particles.push(
                        Agent::new(
                            js_sys::Math::random(),
                            js_sys::Math::random(),
                            js_sys::Math::random()
                        )
                    )
                }
            }
            for ii in 0..count {
                for jj in (ii+1)..count {
                    let mut vec = vec![0.0, 0.0, 0.0];
                    for dim in 0..3 {
                        vec[dim] = group.particles[ii].coordinates[dim] - group.particles[jj].coordinates[dim];
                    }
                    
                    group.particles[ii].links.insert(jj, Link{
                        vec: vec,
                        spring: Spring::new(0.002, 0.0, 0.0, 0.0, 0.4, 1.0)
                    });
                }
            }

            return group;
        }


        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, fade: f64, scale: f64, color: JsValue) {
            
            /*
            Draw the entire group of particles to an HTML canvas using the 2D context.
            */
            let count = self.particles.len();
            
            for ii in 0..count {
                let xyz = &self.particles[ii].coordinates;
                let uv = &self.particles[ii].heading;
                
                Agent::draw(ctx, count as u32, w, h, xyz[0], xyz[1], xyz[2], uv[0], uv[1], fade, scale, &color);
            }
        }

        #[wasm_bindgen]
        pub fn update_and_draw_links(&self, ctx: &CanvasRenderingContext2d, width: f64, height: f64, depth: f64, fade: f64, radius: f64, color: JsValue) {
            /*
            Update link forces and vectors. 
            */
            for particle in &self.particles {
                for (_jj, link) in &particle.links {

                    // let mut newVec = vec![];
                    // for dim in 0..3 {
                    //     newVec.push(self.particles[ii].coordinates[dim] - self.particles[*jj].coordinates[dim]);
                    // }

                    // let delta = link.update(newVec[0], newVec[1], newVec[2]);
                    // let scale = link.spring.size(1.0);
                    // let mut scaled = vec![];

                    // for dim in 0..3 {
                    //     scaled.push(link.vec[dim] * scale);
                    //     self.particles[ii].velocity[dim] += delta[dim];
                    //     self.particles[*jj].velocity[dim] -= delta[dim];
                    // }
                    
                    // let start = self.particles[ii].coordinates.map((v, k) => v * shape[k] - scaled[k]);
                    // let end = positions[jj].coordinates.map((v, k) => v * shape[k] + scaled[k]);
                
                    let x = particle.coordinates[0] * width;
                    let y = particle.coordinates[1] * height;
                    let z = particle.coordinates[2] * depth;

                    link.draw(ctx, x, y, z, radius, fade, link.spring.force(), &color);
                }

                // self.particles[ii].update_position();

            }
        }
    }
}