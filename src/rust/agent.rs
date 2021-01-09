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
    struct Edge {
        spring_constant: f64, // spring constant
        length: f64, // zero position length
    }

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
    impl Edge {
        /**
        Basic spring force for calculating the acceleration on objects.
        Distance from current X to local zero of spring reference frame.

        May be positive or negative in the range (-sqrt(3),sqrt(3)).

        If the sign is positive, the spring is overextended, and exerts
        a positive force on the root object.
        Force is along the (jj-ii) vector
        */
        fn force(&self, extension: f64, velocity_differential: f64, collision: f64) -> f64 {
           
            let mass = 1.0;
            let k1 = self.spring_constant;
            -2.0 * (mass * k1).sqrt() * velocity_differential + k1 * (extension - self.length - 2.0*collision) / mass
        }
    }

    struct Group {
        vertex_array: VertexArray,
        velocity: HashMap<u16,Vec3>,
        edges: HashMap<EdgeIndex,Edge>
    }

    impl Group {
        #[allow(unused_unsafe)]
        fn new(count: u16, length: f64, spring_constant: f64, length_variability: f64) -> Group {
            let mut group = Group {
                vertex_array: VertexArray::new("".to_string(), 0, count as u32, 36),
                velocity: HashMap::with_capacity(count as usize),
                edges: HashMap::with_capacity((count * count) as usize)
            };

            for ii in 0..count {
                unsafe {
                    let coordinates: Vec3 =  Vec3{value:[
                        js_sys::Math::random().powi(2),
                        js_sys::Math::random().powi(2),
                        js_sys::Math::random()
                    ]};
                    group.insert_agent(ii, coordinates);
                }
            }
            
            for ii in 0..count {
                for jj in (ii+1)..count {
                    unsafe {
                        let random_length = length + js_sys::Math::random()*length_variability;
                        group.insert_edge([ii, jj], random_length, spring_constant);
                    }
                }
            }
            return group;
        }

        /*
         * Update the agent position from velocity. 
         * 
         * The environmental effects are:
         * - drag: lose velocity over time
         * - bounce: lose velocity on interaction
         */      
        pub fn next_state(coordinates: &Vec3, velocity: &Vec3, drag: f64, bounce: f64, dt: f64) -> [[f64; 3]; 2] {
            
            
            let mut new_v: Vec3 = velocity * (1.0 - drag);
            let mut new_c: Vec3 = coordinates + new_v * dt;

            for dim in 0..3 {
                let val = new_c.value[dim];
                if val > 1.0 {
                    let delta = val - 1.0;
                    new_c.value[dim] -= 2.0*delta;
                    
                    new_v.value[dim] *= -bounce;
                } else if val < 0.0 {
                    new_c.value[dim] -= 2.0*val;
                    new_v.value[dim] *= -bounce;
                }
            }

            [new_c.value, new_v.value]
        }
    
        /**
         * Adding an agent to the system requires inserting the coordinates
         * into the `vertex_array` mapping, and a state object into the
         * `particles` mapping.
         */
        fn insert_agent(&mut self, index: u16, coordinates: Vec3) {
           
            if self.vertex_array.contains_key(&index) {
                panic!("Attempted to create Agent with duplicate index ({})", index);
            }
            self.vertex_array.insert_point(index, coordinates);
            self.velocity.insert(index, Vec3{value:[0.0,0.0,0.0]});
            
        }


        /**
         * Take an unordered pair of point indices, create an ordered and unique `EdgeIndex`, 
         * calculate the length of the edge, and insert into the `edges` map.
         */
        fn insert_edge(&mut self, index: [u16; 2], length: f64, spring_constant: f64) {
           
            let [a, b] = index;
            let edge_index = EdgeIndex::new(a, b);
            
            if self.edges.contains_key(&edge_index) {
                panic!("Attempted to create Edge with duplicate index ({},{})", a.min(b), a.max(b));
            }

            self.edges.insert(
                edge_index,
                Edge {
                    spring_constant, 
                    length
                }
            );
        }
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Style {
        pub background_color: String, 
        pub overlay_color: String, 
        pub line_width: f64,
        pub font_size: f64, 
        pub tick_size: f64, 
        pub label_padding: f64,
        pub fade: f64,
        pub radius: f64,
        pub particle_color: String
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
        pub fn new(count: u16, length: f64, spring_constant: f64, length_variability: f64) -> InteractiveGroup {
            InteractiveGroup {
                group: Group::new(count, length, spring_constant, length_variability),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0
            }
        }

        /**
         * Hoist cursor setter to JavaScript interface.
         */
        #[wasm_bindgen(js_name=updateCursor)]
        pub fn update_cursor(&mut self, x: f64, y: f64) {
            self.cursor.update(x, y);
        }

        /**
         * Update link forces and vectors. 
         * 
         * First use the edges to apply forces vectors to each particle, incrementally
         * updating the velocity.
         */
        #[wasm_bindgen(js_name=updateState)]
        pub fn update_links_and_positions(&mut self, drag: f64, bounce: f64, dt: f64, collision_threshold: f64) {
            
            for (index, edge) in self.group.edges.iter_mut() {
                let [ii, jj] = index.items();

                // vector from ii to jj, and it's magnitude
                let delta = self.group.vertex_array.vector(ii, jj);
                let extension = delta.magnitude();
              
                // predicted delta at next integration step, positive along (jj-ii) vector
                let predicted: f64 = (
                    (self.group.vertex_array.get(jj).unwrap() + &self.group.velocity[jj] * dt) - 
                    (self.group.vertex_array.get(ii).unwrap() + &self.group.velocity[ii] * dt)
                ).magnitude();

                let acceleration: Vec3 = delta.normalized() * edge.force(
                    extension, 
                    (predicted-extension)/dt,
                    collision_threshold
                );

                for particle in index.items().iter() {
                    let velocity = self.group.velocity.get_mut(particle).unwrap();
                    velocity.value = (velocity.clone() + acceleration).value;
                }
            }

            for (index, velocity) in self.group.velocity.iter_mut() {
                let coords = self.group.vertex_array.get_mut(index).unwrap();
                let [new_c, new_v] = Group::next_state(coords, velocity, drag, bounce, dt);
                coords.value = new_c;
                velocity.value = new_v;
            }
        }
        
        /**
         * Render the current state of single Agent to HTML canvas. The basic
         * representation includes a scaled circle indicating the position, 
         * and a heading indicator for the current direction of travel.
         */
        fn draw_agents(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, fade: f64, scale: f64, color: &JsValue) -> u32 {
           
            ctx.set_stroke_style(&color);
        
            for (index, velocity) in self.group.velocity.iter() {

                let coordinates = self.group.vertex_array.get(index).unwrap();

                for dim in coordinates.value.iter() {
                    if dim.is_sign_negative() { panic!("Negative z-coordinate: {}", dim); }
                }
                
                let alpha = 1.0 - fade * coordinates.z();
                let radius = (scale * (1.0 - 0.5 * coordinates.z())).min(scale).max(0.0); // sometimes things go wrong...
                let scaled = coordinates * Vec3{value:[w, h, 1.0]};
                let heading_vec: Vec3 = scaled + velocity.normalized() * radius;
                
                ctx.begin_path();
                ctx.set_global_alpha(alpha);
                if let Err(_e) = ctx.arc(scaled.x(), scaled.y(), radius, 0.0, PI*2.0) {
                    panic!("Problem drawing agent, probably negative scale value");
                }
                ctx.move_to(scaled.x(), scaled.y());
                ctx.line_to(heading_vec.x(), heading_vec.y());
                ctx.stroke();
            }
            self.group.velocity.len() as u32
        }


        /**
         * Edges are rendered as rays originating at the linked particle, and terminating
         * at a point defined by the source plus the `vec` attribute of Edge.
         * 
         * Display size for agents is used to calculate an offset, so that the ray begins
         * on the surface of a 3D sphere, projected into the X,Y plane.
         */
        fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, radius: f64, fade: f64, _color: &JsValue, collision: f64) -> u16 {
           
            
            let mut count: u16 = 0;
            for (index, edge) in self.group.edges.iter() {
                
                let [ii, jj] = index.items();
                let _offset = -2.0 * radius; // this scalar might just be for retina display???
               
                let a = self.group.vertex_array.get(ii).expect(&format!("Source point missing {}", ii));
                let b = self.group.vertex_array.get(jj).expect(&format!("Target point missing {}", jj));
                let vec = b - a;
                let extension = vec.magnitude();
                let predicted: f64 = ((a + &self.group.velocity[jj]) - (b + &self.group.velocity[ii])).magnitude();
                let differential = predicted - extension;
                let force = edge.force(extension, differential, collision);
                let max_distance = ((3.0 as f64).sqrt() - edge.length).abs();
                let max_force = edge.force(max_distance, differential, collision).abs();
                let force_frac = force / max_force;

            
                let a_color = format!(
                    "rgba({},{},{},{:.2}", 
                    255 * (force > 0.0) as u16,
                    0,
                    255 * (force <= 0.0) as u16,
                    force_frac.abs()*(1.0 - fade * a.z()) // * (force.abs().sqrt() * 10.0).min(1.0);
                );

                let b_color = format!(
                    "rgba({},{},{},{:.2}", 
                    255 * (force > 0.0) as u16,
                    0,
                    255 * (force <= 0.0) as u16,
                    force_frac.abs()*(1.0 - fade * b.z()) // * (force.abs().sqrt() * 10.0).min(1.0);
                );
        
                let gradient = ctx.create_linear_gradient(a.x(), a.y(), b.x(), b.y());
                    
                if !(gradient.add_color_stop(0.0, &a_color).is_ok() &&
                    gradient.add_color_stop(0.0, &b_color).is_ok()) {
                    ctx.set_stroke_style(&gradient);
                } else {
                    let a_color = format!(
                        "rgba({},{},{},{:.2}", 
                        255 * (force_frac > 0.0) as u16,
                        255,
                        255 * (force_frac <= 0.0) as u16,
                        force_frac.abs()
                    );
                    ctx.set_stroke_style(&JsValue::from_str(&a_color));
                };
               
                
                ctx.begin_path();
                ctx.move_to(
                    a.x() * w, // + offset * vec.x(), 
                    a.y() * h // + offset * vec.y()
                );
                ctx.line_to(
                    b.x() * w, // - offset * vec.x(), 
                    b.y() * h //- offset * vec.y()
                );
                ctx.stroke(); 
                count += 1;
            }   
            count
        }

        /**
         * Compose a data-driven interactive canvas for the triangular network. 
         */
        pub fn draw(&mut self, canvas: HtmlCanvasElement, time: f64, collision: f64, style: JsValue) {
            

            let rstyle: Style = style.into_serde().unwrap();
            let bg = JsValue::from_str(&rstyle.background_color);
            let overlay = JsValue::from_str(&rstyle.overlay_color);
            let color = JsValue::from_str(&rstyle.particle_color);

            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", rstyle.font_size);
            let inset = rstyle.tick_size * 0.5;
            
            crate::clear_rect_blending(ctx, w, h, bg);
            let edges = self.draw_edges(ctx, w, h, rstyle.radius, rstyle.fade, &overlay, collision);
            let agents = self.draw_agents(ctx, w, h, rstyle.fade, rstyle.radius, &color);
            self.cursor.draw(ctx, w, h, &overlay, rstyle.font_size, rstyle.line_width, rstyle.tick_size, 0.0, rstyle.label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 {

                let caption = format!(
                    "Group, Agents: {}/{}, Edges: {}/{})", 
                    agents,
                    self.group.velocity.len(),
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