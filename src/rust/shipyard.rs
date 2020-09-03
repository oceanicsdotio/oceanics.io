pub mod shipyard {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;
    use web_sys::CanvasRenderingContext2d;
    use std::f64::consts::PI;

    use crate::agent::agent_system::Vec3;
    use crate::triangular_mesh::triangular_mesh::{TriangularMesh};
    use crate::primitive::primitive::{Primitive};

    const PI_RADIANS: f64 = 180.0;

    
    #[wasm_bindgen]
    pub struct Model {
        mesh: TriangularMesh,
        vert: Vec<Vec3>,
        norf: Vec<Vec3>,
        neighbors: Vec<Vec<usize>>
    }

    impl std::ops::Add<Model> for Model {
        type Output = Model;
        fn add(self, _rhs: Model) -> Model {
            let mut working_copy = self.copy();
            for vertex in &_rhs.vert {
                working_copy.insert_vertex(vertex);
            }
            for (index, cell) in &_rhs.mesh.topology.cells {
                // TODO: these need to be re-indexed?
                working_copy.mesh.topology.insert_cell(index, cell);
            }
            working_copy
        }
    }

    impl std::ops::DivAssign<usize> for Model {
        
        fn div_assign(&mut self, rhs: usize) {

            /*
            Divide the number of faces
            */
            let faces_at_start = self.face.len();
            
            for ii in 0..faces_at_start {
              
                for jj in 0..3 {
                    let ai: usize = self.face[ii].indices[jj] as usize;
                    let a: Vec3 = self.vert[ai].copy();
                    let mut bi = 0;
                    if jj < 2 {
                        bi += jj+1;
                    }
                    
                    let b = self.vert[bi].copy();
                    let midpoint: Vec3 = (&a + &b) * 0.5;
                    self.vert.push(&midpoint * (0.5 * (a.magnitude() + b.magnitude()) / midpoint.magnitude()));
                    let nv = self.vert.len();
                    if jj < 1 {
                        self.face.push(Face::new(vec![ai as i32, nv as i32, (nv+2) as i32]));
                    } else {
                        self.face.push(Face::new(vec![ai as i32, nv as i32, (nv-1) as i32]));
                    }
                    
                }
                let nv = self.vert.len();
                self.face.push(Face::new(vec![(nv-3) as i32, (nv-2) as i32, (nv-1) as i32]));
            }
        }
    }

    #[wasm_bindgen]
    impl Model {
        #[wasm_bindgen(constructor)]
        pub fn new() -> Model {
            Model {
                vertex_array: VertexArray::new(),
                vert: vec![],
                norf: vec![],
                face: vec![],
                neighbors: vec![]
            }
        }

        // #[wasm_bindgen]
        // pub fn normal_form(&mut self) {

        //     let mut maximum = 0.0;
        //     for vert in &self.vert {
        //         if vert.magnitude() > maximum {
        //             maximum = vert.magnitude();
        //         }
        //     }
        //     for vert in &mut self.vert {
        //         vert = vert / maximum
        //     }
        // }

        

        #[wasm_bindgen]
        pub fn draw_edges(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: JsValue, _time: f64, line_width: f64, point_size: f64) -> usize {

            
            ctx.set_stroke_style(&color);
            ctx.set_fill_style(&color);
            ctx.set_line_width(line_width);
            let mut triangles: usize = 0;

            // let rotated = self.rotate(&45.0, &Vec3{value: [1.0,1.0,1.0]});

            if point_size > 0.01 {
                for vert in &self.vert {
                    let target = vert.normal_form();
                    ctx.fill_rect(w*target.x()-point_size/2.0, h*target.y()-point_size/2.0, point_size, point_size);
                }
            }
            
            for face in &self.face {

                let mut origin: bool = true;
                ctx.begin_path();

                for ii in face.copy().indices {

                    if ii >= self.vert.len() as i32 {
                        // break;
                        panic!("(`draw_edges`) Index exceeds vertex array length");
                    } else if ii < 0 {
                        panic!("(`draw_edges`) Vertex array index is negative");
                    }
                    let target = self.vert[ii as usize].normal_form();
                    if origin {
                        ctx.move_to(w*target.x(), h*target.y());
                        origin = !origin;
                    } else {
                        ctx.line_to(w*target.x(), h*target.y());
                    }
                }
                
                ctx.close_path();
                ctx.stroke();

                triangles += 1;
            }

            triangles // for metadata
        }

        
    }
    
    impl Model {

       
        pub fn extrude (n_rings: &usize, radius: &Vec<f64>, offset: &Vec<f64>, p: &Primitive, close_state: &bool) -> Model {
            
            
            let np: usize = p.vert.len();
            let nv = np * n_rings;
            // let nTriangles = 2 * np * (n_rings-1);
            let mut model = Model::new();


            for ii in 0..(*n_rings) { // loop through rings
                let start = np * ii;
                for jj in 0..np {  // loop through points in shape
                    let index = ii * np + jj;
                    model.vert.push(Vec3{value:[
                        radius[ii] * p.vert[jj].x(),
                        radius[ii] * p.vert[jj].y(),
                                     p.vert[jj].z() + offset[ii]
                    ]}); 

                    if ii >= (n_rings - 1) {continue};
                    
                    let v1i = index;
                    let v4i = index + np;
                    let v2i: usize;
                    let v3i: usize;

                    if jj < (np - 1) {
                        v2i = index + 1;
                        v3i = index + np + 1;
                    } else {
                        v2i = start;
                        v3i = start + np;
                    }

                    model.face.push(Face::new(vec![v3i as i32, v2i as i32, v1i as i32]));
                    model.face.push(Face::new(vec![v4i as i32, v3i as i32, v1i as i32]));
                    
                }
            }
            if *close_state {
                
                for ii in 0..np-2 {
                    model.face.push(Face::new(vec![
                        0, (ii + 1) as i32, (ii + 2) as i32
                    ]));
                    
                    model.face.push(Face::new(vec![
                        (nv - np + ii + 2) as i32, 
                        (nv - np + ii + 1) as i32, 
                        (nv - np) as i32
                    ]));
                    
                }

            }
            model

        }


        pub fn extrude_planar (n_arcs: &usize, radius: &Vec<f64>, offset: &Vec<f64>, p: &Primitive) -> Model {
            
            let mut model = Model::new();

            let np = p.vert.len();
            // let nVertices = p.vert.len() * n_arcs;
            // let nTriangles = 2 * (np-1) * (n_arcs-1);

        
            for ii in 0..(*n_arcs) {
                for jj in 0..np {
                    let index = ii * np + jj;
                    model.vert.push(Vec3{value:[
                        radius[ii] * p.vert[jj].x(),
                        radius[ii] * p.vert[jj].y(),
                        p.vert[jj].z() + offset[ii]
                    ]});
                    
                    if (ii<(n_arcs-1)) && (jj<(np-1)) {
                        let v1i = index;
                        let v2i = index + np;
                        let v3i = index + np + 1;
                        let v4i = index + 1;

                        model.face.push(Face::new(vec![v1i as i32,v2i as i32,v3i as i32]));
                        model.face.push(Face::new(vec![v1i as i32,v3i as i32,v4i as i32]));
                    }
                }
            }

            model
        }


        pub fn stitch (outer: &Primitive, inner: &Primitive) -> Model {

            let mut model = Model::new();
            
            let mut minimum = -1.0;
            let lines_per_vertex = (inner.vert.len() as f64 / outer.vert.len() as f64).floor() as usize;

            let mut start_index = 0;
            for ii in 0..inner.vert.len() {
                let dx = outer.vert[0].x() - inner.vert[ii].x();
                let dy = outer.vert[0].y() - inner.vert[ii].y();
                let distance = (dx*dx + dy*dy).sqrt();
                if ii == 0 || minimum < 0.0 || distance < minimum {
                    start_index = ii;
                    minimum = distance;
                }
            }

            for ii in 0..(outer.vert.len() + inner.vert.len()) {
                if ii < outer.vert.len() {
                    model.vert.push(outer.vert[ii].copy());
                } else {
                    model.vert.push(inner.vert[ii - outer.vert.len()].copy());
                }
            }

            let mut inner_index = start_index as i32 - (0.5 * (lines_per_vertex as f64-1.0)).floor() as i32;

            for ii in 0..outer.vert.len() {
                for jj in 0..lines_per_vertex+1 {
                    if inner_index >= inner.vert.len() as i32 {
                        inner_index -= inner.vert.len() as i32;
                    }
                    if inner_index < 0 {
                        inner_index += inner.vert.len() as i32;
                    }
                    
                    if jj == lines_per_vertex {     
                        let mut b = ii + 1;
                        if (ii+1)>=outer.vert.len() {
                            b -= outer.vert.len();
                        }
                        model.face.push(Face::new(vec![ii as i32, b as i32, (outer.vert.len() as i32 + inner_index) as i32]));
                        
                    } else {
                        let mut b = outer.vert.len() as i32 + inner_index + 1;
                        if (inner_index+1) >= inner.vert.len() as i32 {
                            b -= inner.vert.len() as i32;
                        }
                        model.face.push(Face::new(vec![ii as i32, b as i32, (outer.vert.len() as i32 + inner_index) as i32]));

                        inner_index += 1;
                    }
                }
            }
            model
        }         
    }

    pub struct Component {
        /*
        Components are mechanical assemblies or spatial graphs with an 
        assigned appearance. 
        */
        model: Model,
        color: String,
    }

    impl Component {
        /*
        Components simply act as zero cost containers for holding metadata
        and visualization information for a model
        */
        pub fn new(model: Model, color: String) -> Component {
            Component {
                model, 
                color
            }
        }

        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, time: f64, line_width: f64, point_size: f64) -> usize {
            /*
            Draw the component's model using the stored color to identify it 
            as a distinct sub-graph.
            */
            self.model.draw_edges(ctx, w, h, JsValue::from(&self.color), time, line_width, point_size)
        }

        pub fn thruster(color: &String) -> Component {
            
            let mut model = Model::new();
            let t_radius = vec![0.6, 0.75, 1.0, 1.0, 0.75, 0.6];
            let t_offset = vec![-0.75, -0.75, -0.5, 0.5, 0.75, 0.75];
        
            let temp_mod = Model::extrude(&6, &t_radius, &t_offset, &Primitive::rectangle(0.5, 0.8), &Shipyard::OPEN)
                .shift(-0.5, 0.0, 0.0);
            
                model.append(&temp_mod.copy());
                model.append(&temp_mod.reflect(1));
            
            Component { model, color: color.clone() }
        }

        pub fn engine(res: usize, a: f64, b: f64, c: f64, color: &String) -> Component {

            /*
            The engine component provides fixed directional thrust.
            */
            
            let mut model = Model::new();
            let poly = Primitive::regular_polygon(res, Vec3::ZAXIS);
            
            model.append(&Model::extrude(
                &9, 
                &vec![0.03, 0.2, 0.3, 0.3, 0.25, 0.25, 0.3, 0.3, 0.2], 
                &vec![-1.2, -1.2, -1.1, -0.4, -0.3, 0.1, 0.2, 0.5, 0.5], 
                &poly, 
                &Shipyard::OPEN
            ));
            
            model.append(&Model::extrude(
                &6, 
                &vec![0.03, 0.03, 0.1, 0.1, 0.3, 0.3], 
                &vec![-1.2, 0.3, 0.3, 0.4, 0.6, 0.7], 
                &poly, 
                &Shipyard::OPEN
            ));
            
            Component {
                model: model
                    .shift(0.0, 0.0, 1.2)
                    .shift(a, b, c),
                color: color.clone()
            }
        
        }
    }

    #[wasm_bindgen]
    pub struct Shipyard {
        /*
        Shipyards create components and control the rendering pipeline or scene graph for
        visualizing the data.

        There are multiple implementations, for methods accessibile from JavaScript,
        and for local methods in Rust/WASM. 
        */
        components: Vec<Component>
    }

    impl Shipyard {

        const CLOSE: bool = true;  // convenient short hand for reducing ambiguity
        const OPEN: bool = false;

        fn build_drone (res: usize) -> Model {
           
            const NP: i32 = 49;

            let mut radius: Vec<f64> = vec![];
            let mut offset: Vec<f64> = vec![];
            let mut slope = 0.0;

            for ii in 0..res {
                radius.push((ii as f64*90.0/res as f64*PI_RADIANS).sin());
                offset.push((ii as f64*90.0/res as f64*PI_RADIANS).cos());
            }
            for ii in res..res+6 {
                radius.push((ii as f64*90.0/res as f64*PI_RADIANS).sin());
                offset.push((ii as f64*90.0/res as f64*PI_RADIANS).cos());
                if ii==res+5 {
                    slope = (radius[ii]-radius[ii-1])/(offset[ii]-offset[ii-1]);
                }
            }
            for ii in res+6..2*res {
                offset[ii] = offset[ii-1] - 1.0/(res-6) as f64;
                radius[ii] = radius[ii-1] - slope*1.0/(res - 6) as f64;
            }

            let rot_inc = -1.0 * 120.0 / (NP-1) as f64 * PI_RADIANS; // rotation increment
            let position = Vec3{value:[1.0, 0.0, 0.0]}; // initial point
           
         
            // copy points to polygon
            let mut polygon = Primitive::new(0);// copy point to polygon
            
            for ii in 0..NP {
                let inc = (3.0 * ii as f64 * rot_inc / 2.0).sin();
                let srad = 1.0 + 0.3*inc.powi(8);

                polygon.vert.push(position.rotate(&(rot_inc * ii as f64), &Vec3::ZAXIS) * srad);
            }

            Model::extrude_planar(&(2*res), &radius, &offset, &polygon)
                .deduplicate(0.001)
            
        }


        fn open_tubes(model: Model, id: i32, dtheta: f64) -> Model {
            
            model
                .rotate(&90.0, &Vec3::ZAXIS)
                .rotate(&-90.0, &Vec3::XAXIS)
                .shift(-1.2, 0.0, 2.0)
                .rotate(&((-id) as f64 * 120.0-180.0), &Vec3::ZAXIS)
                .shift(0.0, -0.25, 0.0)
                .rotate(&dtheta, &Vec3::XAXIS)
                .shift(0.0, 0.25, 0.0)
                .rotate(&(id as f64 * 120.0 + 180.0), &Vec3::ZAXIS)
                .shift(1.2, 0.0, -2.0)
                .rotate(&90.0, &Vec3::XAXIS)
                .rotate(&-90.0, &Vec3::ZAXIS)
        }


        // fn closeTubes(sbModel *M, int id, float dTheta) {
        //     rotateModel(90, ZAXIS, M);
        //     rotateModel(-90, XAXIS, M);
        //     shift(-1.2, 0.0, 2.0, M);
        //     rotateModel(float(-id)*120.0-180.0, ZAXIS, M);
        //     shift(0.0, -0.25, 0.0, M);
        //     rotateModel(-dTheta, XAXIS, M);
        //     shift(0.0, 0.25, 0.0, M);
        //     rotateModel(float(id)*120.0+180.0, ZAXIS, M);
        //     shift(1.2, 0.0, -2.0, M);
        //     rotateModel(90, XAXIS, M);
        //     rotateModel(-90, ZAXIS, M);
        // }
    }

    #[wasm_bindgen]
    impl Shipyard {
      
        // fn dock (slope, ringNum) {

        //     pointCount = 9;
        //     float D, C, H;
        //     float Y[pointCount], Z[pointCount];

        //     if (ringNum == 1)
        //     {
        //         Y = {0.50, 1.00, 1.00, 1.75, 2.25, 2.25, 1.50, 1.50, 0.50};
        //         Z = {1.25, 1.25, 1.50, 1.50, 0.50, 0.00, 0.00, 0.25, 0.75};
        //     }
        //     if (ringNum == 2)
        //     {
        //         D = 1.5 - slope*0.75;
        //         Y = {0.50, 1.00, 1.00, 1.75, 2.25, 2.25, 1.00, 1.00, 0.50};
        //         Z = {1.25, 1.25, 1.50,   D , 0.50, 0.00, 0.00, 0.25, 0.75};
        //     }
        //     if (ringNum ==3)
        //     {
        //         D = 1.5 - slope*0.75;
        //         C = 1.25;
        //         H = 0.75;
        //         Y = {0.50, 1.00, 1.00, 1.75, 2.25, 2.25, 1.00, 1.00, 0.50};
        //         Z = {1.25, 1.25, C   , D   , 0.50, 0.00, 0.00, H   , 0.75};
        //     }
        // }

        #[wasm_bindgen(constructor)]
        pub fn new() -> Shipyard {
            Shipyard {
                components: vec![]
            }
        }

        #[wasm_bindgen]
        pub fn rotate_in_place(&mut self, angle: f64, ax: f64, ay: f64, az: f64) {
            for ii in 0..self.components.len() {
                self.components[ii].model.rotate_in_place(angle, ax, ay, az);
            }
        }

        #[wasm_bindgen]
        pub fn shift(&mut self, dx: f64, dy: f64, dz: f64) {
            for ii in 0..self.components.len() {
                self.components[ii].model = self.components[ii].model.shift(dx, dy, dz);
            }
        }

        #[wasm_bindgen]
        pub fn scale(&mut self, sx: f64, sy: f64, sz: f64) {
            for ii in 0..self.components.len() {
                self.components[ii].model = self.components[ii].model.scale(sx, sy, sz);
            }
        }

        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, time: f64, line_width: f64, point_size: f64) -> usize {
            let mut triangles: usize = 0;
            for component in &self.components {
                triangles += component.draw(ctx, w, h, time, line_width, point_size);
            }
            triangles
        }
    

        #[wasm_bindgen]
        pub fn build_ship (&mut self, res: usize) {
           
            let mut ship_model = Model::new();
            
            let mut models: Vec<Model> = vec![];
            let mut offset = vec![0.0, 1.0];
            let mut radius = vec![1.0, 1.0];

            {
                /*
                Add individual components for rotating thrusters that can be individually
                controlled to apply torque
                */
                let color = "#FFFF00FF".to_string();
                let mut component = Component::thruster(&color);
                component.model = component.model.shift(2.75,0.0, 0.0);
                let reflection = component.model.reflect(0);
                self.components.push(component);
                self.components.push(Component {
                    model: reflection,
                    color: color.clone()
                });           
            }

            {
                // let mut temp_model = Model::new();
                // let mut component_model = Model::new();


                // smaller engines
                // let engine = Component::engine(res, 0.6, 0.70, 2.75/2.0);

                let engine = Component::engine(res, 0.0, 0.0, 0.0, &"#FFFF00FF".to_string());

                
                // temp_model.append(&engine);
                // temp_model.append(&engine.reflect(1));
                // temp_model.append(&Component::engine(res, 0.2, 1.2, 0.0, 2.75/2.0)); //large engines x2
                
                // component_model.append(&temp_model);
                // component_model.append(&temp_model.reflect(0));

                self.components.push(engine);

            }

  
            {
                let mut temp_model = Model::new();
                let mut component_model = Model::new();

                let body = Shipyard::build_body();
                let arm = Shipyard::build_arm();
               

                temp_model.append(&body);
                temp_model.append(&body.reflect(1));

                temp_model.append(&arm);
                temp_model.append(&arm.reflect(1));

                component_model.append(&temp_model);
                component_model.append(&temp_model.reflect(0));

                self.components.push(Component::new(component_model, "#33CCFF44".to_string()));

            }
            
            {
                let test_offset = 0.0;
                let tube_scale = 0.25;
                let lr_shift = tube_scale*(2.0/3.0 as f64).sqrt();

                for ii in 0..3 {
                    ship_model.append(
                        &Shipyard::build_tube(res, tube_scale, lr_shift, 0.0, 0.0) // missile tubes
                        .rotate(&(ii as f64 * 120.0 + 180.0), &Vec3::ZAXIS)
                        .shift(test_offset+1.2, 0.0, -2.0)
                    );
                    
                    ship_model.append(
                        &Shipyard::build_tube_cover(res, tube_scale, lr_shift, 0.0, 0.0) // tube cover
                        .shift(0.0, -tube_scale, 0.0)
                        .rotate(&0.0, &Vec3::XAXIS)
                        .shift(0.0, tube_scale, 0.0)
                        .rotate(&(ii as f64 * 120.0 + 180.0), &Vec3::ZAXIS)
                        .shift(test_offset+1.2, 0.0, -2.0)
                    );

    
                    offset[1] = 0.5;

                    ship_model.append(
                        &Model::extrude(&2, &radius, &offset, &Primitive::rectangle(0.5, 0.5), &Shipyard::CLOSE)
                        .rotate(&-45.0, &Vec3::ZAXIS)
                        .scale(lr_shift*(2.0 as f64).sqrt(), (2.0 as f64).sqrt()/2.0, (2.0 as f64).sqrt()/2.07)
                        .shift(lr_shift, 0.0, 0.0)
                        .rotate(&(ii as f64 * 120.0), &Vec3::ZAXIS)
                        .shift(test_offset+1.2, 0.0, -2.0,)
                    );
                }

                // Skirt
                radius = vec![2.0*tube_scale*2.0/(3.0 as f64).sqrt(), 2.0*1.25*tube_scale*2.0/(3.0 as f64).sqrt()];
                offset = vec![0.0, 0.1];
                models.push(
                    Model::extrude(&2, &radius, &offset, &Primitive::regular_polygon(6, Vec3::ZAXIS), &Shipyard::OPEN)
                    .shift(test_offset+1.2, 0.0, -2.0)
                );
                
                // Pipe
                radius = vec![0.025, 0.025];
                offset = vec![-2.0, 0.0];
                ship_model.append(
                    &Model::extrude(&2, &radius, &offset, &Primitive::regular_polygon(6, Vec3::ZAXIS), &Shipyard::OPEN)
                    .shift(test_offset+1.2, 0.0, 0.0)
                );
                
                // Loader
                let theta_a = 30.0;
                radius = vec![1.0, 1.0];
                offset = vec![-1.0, -0.8];
                

                {
                    /*
                    
                    */
                    let mut temp_model = Model::new();
                    let polygon = Primitive::shell(16, 90.0, 180.0, 1.0, 1.0, 0.25, 0.25);
                    let mut direction = 1.0;
                    let clamp_offset = test_offset + 1.2 - tube_scale;
                    let sxy = 0.75 * tube_scale;

                    let clamp = Model::extrude(&2, &radius, &offset, &polygon, &Shipyard::OPEN) 
                        .scale(tube_scale, tube_scale, 1.0);

                    for dz in vec![0.0, 0.25, 0.5] {
                        temp_model.append(
                            &clamp
                            .rotate(&(direction*theta_a), &Vec3::ZAXIS)
                            .shift(clamp_offset, 0.0, dz)
                        );
                        direction *= -1.0;
                    }

                    temp_model.extend(vec![

                        &Model::extrude(&2, &radius, &vec![-0.25, -0.2], &Primitive::regular_polygon(res, Vec3::ZAXIS), &Shipyard::CLOSE)
                        .scale(sxy, sxy, 1.0)
                        .shift(clamp_offset, 0.0, 0.0),

                        &Model::extrude(&2, &radius, &vec![-1.0, -0.25], &Primitive::regular_polygon(3, Vec3::ZAXIS), &Shipyard::OPEN)
                        .scale(sxy, sxy, 1.0)
                        .shift(clamp_offset, 1.0, 0.0),

                    ]);
                
                    self.components.push(Component {
                        model: temp_model,
                        color: "#FF3366FF".to_string()
                    });
                }

                
                // plunger
                {
                    
                    ship_model.append(
                        &Model::extrude(&2, &radius, &vec![-0.25, -0.2], &Primitive::regular_polygon(res, Vec3::ZAXIS), &Shipyard::CLOSE)
                        .scale(0.75*tube_scale, 0.75*tube_scale, 1.0)
                        .shift(test_offset+1.2-tube_scale, 0.0, 0.0)
                    );
                
                    ship_model.append(
                        &Model::extrude(&2, &radius, &vec![-1.0, -0.25], &Primitive::regular_polygon(3, Vec3::ZAXIS), &Shipyard::OPEN)
                        .scale(0.75*tube_scale, 0.75*tube_scale, 1.0)
                        .shift(test_offset+1.2-tube_scale, 1.0, 0.0)
                    );
                }
                
                self.components.push(Component::new(ship_model, "#FFFFFF33".to_string()));
            }

        }


        #[wasm_bindgen]
        pub fn build_body() -> Model {

            
            let mut result = Model::new();

            // bridges
            let mut radius = vec![1.0, 1.0];
            let mut offset = vec![0.0, 0.75];
 
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::rectangle(0.5, 0.25), &Shipyard::CLOSE)
                .shift(0.0, 1.5, 0.0)
            );

            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::parallelogram(0.5,0.25,0.0, -0.25), &Shipyard::CLOSE)
                .shift(0.5, 1.5, 0.0)
            );

            result.append(
                &result.copy()
                .shift(0.0, 0.0, -2.0)
            );

            // fore block
            offset[1] = 2.75;        
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::rectangle(0.25, 0.75), &Shipyard::CLOSE)
                .shift(2.0, 0.0, -2.0)
            );

            // forward shell
            offset[1] = 2.75;
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::shell(8, 90.0, 90.0, 1.25, 0.75, 0.25, 0.25), &Shipyard::OPEN)
                .shift(1.0, 0.75, -2.0)
            );

            radius = vec![0.75, 1.0];
            offset = vec![0.0, 0.0];
            result.append(
                    &Model::extrude_planar(&2, &radius, &offset, &Primitive::arc(8, 90.0, 90.0, 1.0))
                .scale(1.25, 0.75, 1.0)
                .shift(1.0, 0.75, -2.0)
            );

            result

        }

        #[wasm_bindgen]
        pub fn build_arm () -> Model {
           
            let mut result = Model::new();
            let mut offset = vec![0.0, 1.0];
            let mut radius = vec![1.0, 1.0];

            // ARM+SHIELD
            // main panels
           
            offset[1] = 1.75;
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::parallelogram(1.25, 0.25, 0.0, -1.0), &Shipyard::CLOSE)
                    .shift(1.0, 1.25, 0.75)
            );

            offset[1] = 2.25;
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::parallelogram(1.25, 0.25, 0.0, -1.0), &Shipyard::CLOSE)
                    .shift(1.0, 1.25, 3.0)
            );

           
            offset[1] = 0.5;
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::parallelogram(1.0, 0.25, 0.0, -0.8), &Shipyard::OPEN)
                    .shift(1.0, 1.25, 2.5)
            );

            //lower joiner
            offset[1] = 1.75;
            result.append(
                &Model::extrude (&2, &radius, &offset, &Primitive::rectangle (0.25, 0.5), &Shipyard::CLOSE)
                    .shift(2.0, 0.0, 0.75)
            );

            // upper overhangs
            
            offset[1] = 2.5;
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::rectangle(0.5, 0.25), &Shipyard::CLOSE)
                    .shift(0.5, 1.25, 0.0)
            );

            offset[1] = 0.5;
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::rectangle(0.5, 0.25), &Shipyard::CLOSE)
                    .shift(0.5, 1.25, 3.0)
            );

            offset[1] = 0.5;
            result.append(
                &Model::extrude(&2, &radius, &offset, &Primitive::rectangle(0.5, 0.25), &Shipyard::CLOSE)
                    .shift(0.5, 1.25, 3.75)
            );

            // Pipe

            radius = vec![0.1, 0.1];
            offset[1] = 3.5;
            let pipe_primitive = Primitive::regular_polygon(10, Vec3::ZAXIS);
            let pipe= &Model::extrude(&2, &radius, &offset, &pipe_primitive, &Shipyard::OPEN);
            
            result.append(&pipe.shift(0.65, 1.35, 0.25));
            result.append(&pipe.shift(0.85, 1.35, 0.25));
            result
        }

        

        


        
        pub fn build_tube (res: usize, s: f64, a: f64, b: f64, c: f64) -> Model {


            let mut result = Model::new();
  
            let tube_length = 3.0;
            let radius = vec![1.0, 1.0];
            let mut offset = vec![0.0, tube_length];

            let hexagon = Primitive::regular_polygon(6, Vec3::ZAXIS) // hexagon
                .scale((2.0/3.0 as f64).sqrt(), (2.0/3.0 as f64).sqrt(), 1.0);
            
            let tube = Primitive::regular_polygon(res, Vec3::ZAXIS) // tube poly
                .scale(0.75, 0.75, 1.0)
                .shift(0.0, 0.0, 0.5); // depth of funnel, shift tube
            
            let temp_mod = Model::stitch(&hexagon, &tube); // create front funnel
            result.append(&temp_mod.copy()); // add to model
           
            result.append(
                &temp_mod
                    .reflect(2)
                    .shift(0.0, 0.0, tube_length+0.5)
            ); // create back
 
            result.append(
                &Model::extrude (&2, &radius, &offset, &tube, &Shipyard::OPEN) // inner tube
            );

            offset = vec![0.0, 3.5];
            
            result.append(
                &Model::extrude (&2, &radius, &offset, &hexagon, &Shipyard::OPEN) // inner tube
            );
            
            result.scale(s, s, s).shift(a, b, c)

        }

        #[wasm_bindgen]
        pub fn build_tube_cover (res: usize, s: f64, a: f64, b: f64, c: f64) -> Model {

            let mut result = Model::new();
            let radius = vec![1.0, 1.0];
            let offset = vec![0.0, 0.0];
            

            let outer = Primitive::regular_polygon(6, Vec3::ZAXIS)
                .scale((2.0/3.0 as f64).sqrt(), (2.0/3.0 as f64).sqrt(), 1.0);
            
            
            let inner = Primitive::regular_polygon(res, Vec3::ZAXIS)
                .scale(0.75, 0.75, 1.0)
                .shift(0.0, 0.0, 0.5);
            
            let temp_mod = Model::stitch (&outer, &inner);
            result.append(&temp_mod);
            
            result.append(
                &Model::extrude(&2, &radius, &offset, &outer, &Shipyard::CLOSE)
            );
            
            result.append(
                &Model::extrude (&2, &radius, &offset, &inner, &Shipyard::CLOSE)
            );
            
            result.scale(s, s, s).shift(a, b, c)

        }

        
    }
}