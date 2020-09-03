pub mod agent_system {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;
    use std::collections::HashMap;
    use web_sys::{CanvasRenderingContext2d, CanvasGradient, HtmlCanvasElement};
    use std::f64::consts::PI;
    use serde::Deserialize;

    use crate::vec3::vec3::Vec3;
    use crate::triangular_mesh::triangular_mesh::{VertexArray, EdgeIndex};
    use crate::cursor::cursor_system::SimpleCursor;

    
    #[derive(Copy, Clone)]
    struct Spring {
        k: f64,
        // spring constant
        x: f64,
        // displacement
        v: f64,
        // relative velocity
        l: f64,
        // zero position
        stop: f64,
        // distance at which the spring behaves as a rigid rod
        p: f64  // probability of dropout during physics loop
    }

    impl Spring {

        pub fn new(p: f64) -> Spring {
            Spring { k: 0.002, x: 0.0, v: 0.0, l: 0.2, stop: 0.1, p }
        }
        
        fn potential_energy(&self) -> f64 {
            /*
            Energy conservation is used to constrain some simulations to realistic
            physics, and to classify configurations of agents
            */
            0.5 * self.k * self.x.powi(2)
        }

        fn force(&self) -> f64 {
            /*
            Basic spring force for calculating the acceleration
            on objects
            */
            -2.0 * self.k.sqrt() * self.v - self.k * (self.x - self.l)
        }

        fn drop(&self) -> bool {
            /*
            Use the spring extension and intrinsic dropout probability
            to determine whether the spring instance should contribute
            to this iteration of force calculations.
            
            The bounding box is used to normalize. The effect is that
            long springs create a small RHS in the comparison, so it is
            more likely that they dropout.

            Higher drop rates speed up the animation loop, but make 
            N-body calculations less deterministic. 
            */
            let max_distance = (3 as f64).sqrt();
            rand::random::<f64>() > self.p * (max_distance - self.x) / max_distance
        }

        fn update(&mut self, distance: f64) {
            /*
            If the distance is too close, the spring behaves as a rod.
            */
            self.x = distance.max(self.stop);
            self.v = distance - self.x;
        }
    }

    
    #[derive(Clone, Copy)]
    pub struct Edge {
        spring: Spring,
        vec: Vec3
    }

    impl Edge {
        pub fn new(l: f64, stop: f64, p: f64) -> Edge {
            Edge {
                spring: Spring { k: 0.002, x: 0.0, v: 0.0, l, stop, p },
                vec: Vec3{ value: [0.0, 0.0, 0.0]}
            }
        }
       
        pub fn update(&mut self, new_vec: Vec3) -> Vec3 {

            let distance = new_vec.magnitude();
            self.spring.update(distance);
            let mut delta = Vec3{ value: [0.0; 3]};
           
            for dim in 0..3 {
                if distance > 0.00001 {
                    delta.value[dim] = self.vec.value[dim] / distance * self.spring.force();
                } 
                self.vec.value[dim] = new_vec.value[dim];         
            };

            delta
        }

        fn colormap_rgba(&self, z: f32, fade: f32) -> String {
            /*
            Colormap a value in (-inf, inf). 
            
            - Negative values are blue
            - Positive values are red
            - Alpha is 255 in front, and (0,1) in
    
            */
            let force = self.spring.force() as f32;
            let mut color: String = "rgba(".to_owned();
            let alpha = (1.0 - fade * z) * (force.abs().sqrt() * 10.0).min(1.0);

            if force < 0.0 {
                color.push_str("0, 0, 255,");
            } else {
                color.push_str("255, 0, 0,");
            }

            color.push_str(&format!("{alpha:.*})", 2, alpha=alpha));
    
            return color;
        }

        fn gradient(&self, ctx: &CanvasRenderingContext2d, xyz: &Vec3, target: &Vec3, fade: f32) -> CanvasGradient {

            let gradient: CanvasGradient = ctx.create_linear_gradient(xyz.x(), xyz.y(), target.x(), target.y());
            
            assert!(gradient.add_color_stop(0.0, &self.colormap_rgba(xyz.z() as f32, fade)).is_ok());
            assert!(gradient.add_color_stop(1.0, &self.colormap_rgba(target.z() as f32, fade)).is_ok());

            return gradient
        }
    }

    pub struct Agent {
        /*
        External position, but velocity and heading are stored
        locally
        */
        heading: Vec3,
        velocity: Vec3
    }

    impl Agent {
        
        pub fn new () -> Agent {
            /*
            Safe to not set heading or velocity initially,
            and allow them to be computed on first iteration
            */
            Agent {
                heading: Vec3 {value: [1.0, 0.0, 0.0]},
                velocity: Vec3 {value: [0.0, 0.0, 0.0]},
            }
        }

        fn update_velocity(&mut self, delta: &Vec3) {
            self.velocity = self.velocity + *delta;
        }

        pub fn calculate_new_position(&self, coordinates: Vec3, drag: f64, bounce: f64) -> [Vec3; 3] {
            /*
            Update the agent position from velocity.

            The environmental effects are:
            - drag: lose velocity over time
            - bounce: lose velocity on interaction
            */
            let speed: f64 = self.velocity.magnitude();
            let mut new_v: Vec3 = self.velocity.clone();
            let mut new_c: Vec3 = coordinates.clone();
            let mut new_h: Vec3 = coordinates.clone();

            for dim in 0..3 {
                new_v.value[dim] *= 1.0 - drag;
                new_c.value[dim] += self.velocity.value[dim];
                if new_c.value[dim] > 1.0 {
                    new_c.value[dim] -= 2.0*(new_c.value[dim] - 1.0);
                    new_v.value[dim] *= -bounce;
                } else if new_c.value[dim] < 0.0 {
                    new_c.value[dim] -= 2.0*new_c.value[dim];
                    new_v.value[dim] *= -bounce;
                }
            }

            let speed: f64 = self.velocity.magnitude();
            if speed > 0.00001 {
                new_h = self.heading / speed;
            }

            [new_c, new_v, new_h]

        }

    }


    struct Group {
        vertex_array: VertexArray,
        particles: HashMap<u16,Agent>,
        edges: HashMap<EdgeIndex,Edge>
    }

    impl Group {
        #[allow(unused_unsafe)]
        fn new(count: u16, zero: f64, stop: f64) -> Group {
            let mut group = Group {
                vertex_array: VertexArray::with_capacity(count as usize),
                particles: HashMap::with_capacity(count as usize),
                edges: HashMap::with_capacity((count * count) as usize)
            };

            for ii in 0..count {
                unsafe {
                    let coordinates: Vec3 =  Vec3{value:[
                        js_sys::Math::random(),
                        js_sys::Math::random(),
                        js_sys::Math::random()
                    ]};
                    group.insert_agent(ii, coordinates);
                }
            }
            
            for ii in 0..count {
                for jj in (ii+1)..count {
                    group.insert_edge([ii, jj], zero, stop, 1.0);
                }
            }
            return group;
        }

        fn insert_agent(&mut self, index: u16, coordinates: Vec3) {
          
            self.vertex_array.insert_point(index, coordinates);
            self.particles.insert(index, Agent::new());
            
        }

        fn insert_edge(&mut self, index: [u16; 2], zero: f64, stop: f64,dropout: f64) {
            /*
            Take an unordered array of point indices, and 
            */
            self.edges.insert(
                EdgeIndex::new(index[0], index[1]),
                Edge::new(zero, stop, dropout)
            );
        }
    }


    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct Style {
        pub background_color: String, 
        pub overlay_color: String, 
        pub line_width: f64,
        pub font_size: f64, 
        pub tick_size: f64, 
        pub label_padding: f64
    }


    #[wasm_bindgen]
    pub struct InteractiveGroup {
        group: Group,
        cursor: SimpleCursor,
        frames: u32
    }

    #[wasm_bindgen]
    impl InteractiveGroup {
        #[wasm_bindgen(constructor)]
        pub fn new(count: u16, zero: f64, stop: f64) -> InteractiveGroup {
            InteractiveGroup {
                group: Group::new(count, zero, stop),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0
            }
        }

        pub fn update_cursor(&mut self, x: f64, y: f64) {
            self.cursor.update(x, y);
        }

        pub fn update_links_and_positions(&mut self, drag: f64, bounce: f64) {
            /*
            Update link forces and vectors. 

            Have to split Vec<Agents>, because each index op of `self.particles` will attempt 
            to borrow and collide. This works for current implementation, because
            the graph is initialized by linking only other particles with a greater
            index. 
            */
            for (index, edge) in self.group.edges.iter_mut() {
                let [ii, jj] = index.items();
                let delta = self.group.vertex_array.vector(ii, jj);
               
                edge.update(delta);
                self.group.particles.get_mut(ii).unwrap().update_velocity(&delta);
                self.group.particles.get_mut(jj).unwrap().update_velocity(&(delta*1.0));
            }

            for (index, particle) in self.group.particles.iter_mut() {
                let coords = self.group.vertex_array.get_mut(index).unwrap();
                let [new_c, new_v, new_h] = particle.calculate_new_position(coords.clone(), drag, bounce);
                coords.clone_from(&new_c);
                particle.heading = new_h;
                particle.velocity = new_v;
            }
        }
        
        pub fn draw_agents(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, fade: f64, scale: f64, color: &JsValue) -> u32 {
            /*
            Render the current state of single Agent to HTML canvas. The basic
            representation includes a scaled circle indicating the position, 
            and a heading indicator for the current direction of travel.
            */
            ctx.set_stroke_style(&color);
        
            for (index, agent) in self.group.particles.iter() {

                let coordinates = self.group.vertex_array.get(index).unwrap();
                let uv = &agent.heading;

                // let alpha = 1.0 - fade * coordinates.z();
                let radius = scale * (1.0 - 0.0*coordinates.z());
                let xw = coordinates.x() * w;
                let yh = coordinates.y() * h;
                
                ctx.begin_path();
                // ctx.set_global_alpha(alpha);
                if let Err(_e) = ctx.arc(xw, yh, radius, 0.0, PI*2.0) {
                    panic!("Problem drawing agent, probably negative scale value");
                }
                ctx.move_to(xw, yh);
                ctx.line_to(xw + uv.x() * radius, yh + uv.y() * radius);
                ctx.stroke();
            }
            self.group.particles.len() as u32
            
           
        }

        pub fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, radius: f64, fade: f64) -> u32 {
            /*
            Edges are rendered as rays originating at the linked particle, and terminating
            at a point defined by the source plus the `vec` attribute of Edge.

            Display size for agents is used to calculate an offset, so that the ray begins
            on the surface of a 3D sphere, projected into the X,Y plane.
            */
            
            ctx.begin_path();

            let mut count = 0;
            for (index, edge) in self.group.edges.iter() {
                
                let [ii, jj] = index.items();
                let offset = -2.0 * radius; // this scalar might just be for retina display???
               
                let a = self.group.vertex_array.get(ii).unwrap();
                let b = self.group.vertex_array.get(jj).unwrap();
                let vec = b - a;

                let gradient = edge.gradient(ctx, &a, b, fade as f32);
                ctx.set_stroke_style(&gradient);
                
                ctx.move_to(
                    a.x() * w + offset * vec.x(), 
                    a.y() * h + offset * vec.y()
                );
                ctx.line_to(
                    b.x() * w - offset * vec.x(), 
                    b.y() * h - offset * vec.y()
                );
                ctx.stroke(); 
                count += 1;
            }   
            count
        }

        pub fn draw(&mut self, canvas: HtmlCanvasElement, time: f64, style: JsValue) {
            /*
            Compose a data-driven interactive canvas for the triangular network. 
            */

            let rstyle: Style = style.into_serde().unwrap();
            let bg = JsValue::from_str(&rstyle.background_color);
            let overlay = JsValue::from_str(&rstyle.overlay_color);

            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", rstyle.font_size);
            let inset = rstyle.tick_size * 0.5;

            crate::clear_rect_blending(ctx, w, h, bg);
            let edges = self.draw_edges(ctx, w, h, 0.0, 0.0);
            let agents = self.draw_agents(ctx, w, h, 0.0, 16.0, &overlay);
            self.cursor.draw(ctx, w, h, &overlay, rstyle.font_size, rstyle.line_width, rstyle.tick_size, 0.0, rstyle.label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 {

                let caption = format!(
                    "Group, Agents: {}/{}, Edges: {}/{})", 
                    agents,
                    self.group.particles.len(),
                    edges,
                    self.group.edges.len()
                );
                crate::draw_caption(ctx, caption, inset, h-inset, &overlay, font.clone());
            
                crate::draw_caption(
                    &ctx,
                    format!("{:.0} fps", fps),
                    inset,
                    rstyle.font_size + inset, 
                    &overlay,
                    font
                );
            }
            
            self.frames += 1;
        }
    }
}