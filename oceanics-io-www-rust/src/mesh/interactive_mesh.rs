pub mod interactive_mesh {
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;
    use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

    use std::collections::HashMap;
    use std::f64::consts::PI;
    use crate::vec3::vec3::Vec3;  // 3-D graphics primitive
    use crate::cursor::cursor_system::SimpleCursor;  // custom cursor behavior
    use crate::mesh::triangular_mesh::triangular_mesh::TriangularMesh;
    use crate::mesh::style::style::Style;
    use crate::mesh::mesh::{color_map_z, next_state};

    /**
     * Container for mesh that also contains cursor and rendering target information.
     */
    #[wasm_bindgen]
    pub struct InteractiveMesh{
        mesh: TriangularMesh,
        cursor: SimpleCursor,
        frames: usize,
        velocity: HashMap<u16,Vec3>
    }

    #[wasm_bindgen]
    impl InteractiveMesh {
        /**
         * By default create a simple RTIN graph and initial the cursor
         */
        #[wasm_bindgen(constructor)]
        pub fn new(nx: usize, ny: usize) -> InteractiveMesh {
            InteractiveMesh {
                mesh: TriangularMesh::from_rectilinear_shape(nx, ny),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0,
                velocity: HashMap::with_capacity(0)
            }
        }

        /**
         * Initialize a fully connected topological network with random initial positions
         */
        #[allow(dead_code)]
        fn from_random_positions(count: u16, length: f64, spring_constant: f64, length_variability: f64) -> InteractiveMesh {

            let mut mesh = InteractiveMesh {
                mesh: TriangularMesh::new(String::from("Swarm"), 0, count as u32, 36),
                cursor: SimpleCursor::new(0.0, 0.0),
                frames: 0,
                velocity: HashMap::with_capacity(count as usize)
            };

            for ii in 0..count {
                let coordinates: Vec3 =  Vec3{value:[
                    js_sys::Math::random().powi(2),
                    js_sys::Math::random().powi(2),
                    js_sys::Math::random()
                ]};
                mesh.mesh.insert_point(ii, coordinates);
                mesh.insert_agent(ii);
            }
            
            for ii in 0..count {
                for jj in (ii+1)..count {
                    let random_length = length + js_sys::Math::random()*length_variability;
                    mesh.mesh.topology.insert_edge([ii, jj], random_length, spring_constant);
                    
                }
            }

            mesh
        }


        /**
         * Adding an agent to the system requires inserting the coordinates
         * into the `vertex_array` mapping, and a state object into the
         * `particles` mapping.
         */
        #[allow(dead_code)]
        fn insert_agent(&mut self, index: u16) {
            if !self.mesh.vertex_array.contains_key(&index) {
                panic!("Attempted to create Agent on non-existent index ({})", index);
            }
            self.velocity.insert(index, Vec3{value:[0.0, 0.0, 0.0]});    
        }
        
        /**
         * Render the current state of single Agent to HTML canvas. The basic
         * representation includes a scaled circle indicating the position, 
         * and a heading indicator for the current direction of travel.
         */
        #[allow(dead_code)]
        fn draw_nodes(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, style: &Style) -> u16 {

            let mut count: u16 = 0;
            for (index, vert) in self.mesh.vertex_array.points.iter() {
                for dim in vert.value.iter() {
                    if dim.is_sign_negative() { panic!("Negative z-coordinate: {}", dim); }
                }

                ctx.set_stroke_style(&JsValue::from(color_map_z(vert.z(), &style.fade)));
                ctx.begin_path();

                let radius = style.radius * (1.0 - style.fade * vert.z());
                let scaled = vert * Vec3{value:[w, h, 1.0]};
                let inverted_y: f64 = h - scaled.y(); 
                if let Err(_e) = ctx.arc(scaled.x(), inverted_y, radius, 0.0, PI*2.0) {
                    panic!("Problem drawing agent, probably negative scale value");
                }

                if self.velocity.contains_key(index) {
                    let heading_vec: Vec3 = scaled + self.velocity[index].normalized() * radius;
                    ctx.move_to(scaled.x(), inverted_y);
                    ctx.line_to(heading_vec.x(), h - heading_vec.y());
                }
                ctx.stroke();
                
                count += 1;
            }
            count
        } 
 

        /**
         * Edges are rendered as rays originating at the linked particle, and terminating
         * at a point defined by the source plus the `vec` attribute of Edge.
         * 
         * Display size for agents is used to calculate an offset, so that the ray begins
         * on the surface of a 3D sphere, projected into the X,Y plane.
         */
        fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, style: &Style) -> u16 {
            
            ctx.set_line_width(style.line_width);

            let mut count: u16 = 0;

            for (index, edge) in self.mesh.topology.edges.iter() {

                let [ii, jj] = index.items();
              
                let a = self.mesh.vertex_array.get(ii).expect(&format!("Source point missing {}", ii));
                let b = self.mesh.vertex_array.get(jj).expect(&format!("Target point missing {}", jj));
                let vec = &(b - a);
                let rescale = &Vec3{value:[w, h, 1.0]};

                let c: Vec3 = a * rescale;
                let d: Vec3 = b * rescale;

        
                // let _offset = -2.0 * radius; // this scalar might just be for retina display???
                
                let extension = vec.magnitude();
                let gradient = ctx.create_linear_gradient(c.x(), h-c.y(), d.x(), h-d.y()); 

                if self.velocity.contains_key(ii) && self.velocity.contains_key(jj) {
                    let predicted: f64 = ((a + &self.velocity[jj]) - (b + &self.velocity[ii])).magnitude();
                    let differential = predicted - extension;
                    let force = edge.force(extension, differential, 2.0*style.radius);
                    let max_distance = ((3.0 as f64).sqrt() - edge.length).abs();
                    let max_force = edge.force(max_distance, differential, 2.0*style.radius).abs();
                    let _force_frac = force / max_force;

                    // let a_color = format!(
                    //     "rgba({},{},{},{:.2}", 
                    //     255 * (force > 0.0) as u16,
                    //     0,
                    //     255 * (force <= 0.0) as u16,
                    //     force_frac.abs()*(1.0 - fade * a.z()) // * (force.abs().sqrt() * 10.0).min(1.0);
                    // );

                    // let b_color = format!(
                    //     "rgba({},{},{},{:.2}", 
                    //     255 * (force > 0.0) as u16,
                    //     0,
                    //     255 * (force <= 0.0) as u16,
                    //     force_frac.abs()*(1.0 - fade * b.z()) // * (force.abs().sqrt() * 10.0).min(1.0);
                    // );
                } 
            
                {     
                    gradient.add_color_stop(0.0, &color_map_z(a.z(), &style.fade)).unwrap();
                    gradient.add_color_stop(1.0, &color_map_z(b.z(), &style.fade)).unwrap();
                    ctx.set_stroke_style(&gradient);
                }

                ctx.begin_path();
                ctx.move_to(c.x(), h-c.y());
                ctx.line_to(d.x(), h-d.y());
                   
                count += 1;
                ctx.stroke();
            } 
            count
        }

        /**
         * Compose a data-driven interactive canvas for the triangular network. 
         */
        pub fn draw(&mut self, canvas: HtmlCanvasElement, time: f64, style: JsValue) {

            let rstyle: Style = style.into_serde().unwrap();
            let overlay = JsValue::from(&rstyle.overlay_color);
          
            let ctx: &CanvasRenderingContext2d = &crate::context2d(&canvas);
            let w = canvas.width() as f64;
            let h = canvas.height() as f64;
            let font = format!("{:.0} Arial", &rstyle.font_size);
            let inset = &rstyle.tick_size * 0.5;

            crate::clear_rect_blending(ctx, w, h, JsValue::from(&rstyle.background_color));
            
            let edges = self.draw_edges(ctx, w, h, &rstyle);
            let nodes = self.draw_nodes(ctx, w, h, &rstyle);

            self.cursor.draw(ctx, w, h, &overlay, rstyle.font_size, rstyle.line_width, rstyle.tick_size, 0.0, rstyle.label_padding);
            
            let fps = (1000.0 * (self.frames + 1) as f64).floor() / time;
   
            if time < 10000.0 || fps < 55.0 {

                let caption = format!(
                    "Network, Nodes: {}/{}, Cells: 0/{}, Edges: {}/{})", 
                    nodes,
                    self.mesh.vertex_array.points.len(), 
                    self.mesh.topology.cells.len(), 
                    edges,
                    self.mesh.topology.edges.len()
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


        /**
         * Update link forces and vectors. 
         * 
         * First use the edges to apply forces vectors to each particle, incrementally
         * updating the velocity.
         */
        #[wasm_bindgen(js_name=updateState)]
        pub fn update_links_and_positions(&mut self, drag: f64, bounce: f64, dt: f64, collision_threshold: f64) {
            
            for (index, edge) in self.mesh.topology.edges.iter() {
                let [ii, jj] = index.items();

                // vector from ii to jj, and it's magnitude
                let delta = self.mesh.vertex_array.vector(ii, jj);
                let extension = delta.magnitude();
              
                // predicted delta at next integration step, positive along (jj-ii) vector
                let predicted: f64 = (
                    (self.mesh.vertex_array.get(jj).unwrap() + &self.velocity[jj] * dt) - 
                    (self.mesh.vertex_array.get(ii).unwrap() + &self.velocity[ii] * dt)
                ).magnitude();

                let acceleration: Vec3 = delta.normalized() * edge.force(
                    extension, 
                    (predicted-extension)/dt,
                    collision_threshold
                );

                for particle in index.items().iter() {
                    let velocity = self.velocity.get_mut(particle).unwrap();
                    velocity.value = (velocity.clone() + acceleration).value;
                }
            }

            for (index, velocity) in self.velocity.iter_mut() {
                let coords = self.mesh.vertex_array.get_mut(index).unwrap();
                let [new_c, new_v] = next_state(coords, velocity, drag, bounce, dt);
                coords.value = new_c;
                velocity.value = new_v;
            }
        }
        

        /**
         * Hoisting function for cursor updates from JavaScript. 
         * Prevents null references in some cases
         */
        #[wasm_bindgen(js_name = "updateCursor")]
        pub fn update_cursor(&mut self, x: f64, y: f64) {
            self.cursor.update(x, y);
        }

        /**
         * Rotate the mesh in place
         */
        #[wasm_bindgen]
        pub fn rotate(&mut self, angle: f64, ax: f64, ay: f64, az: f64) {
            self.mesh.rotate(&angle, &Vec3{value:[ax,ay,az]});
            
        }
    }
}