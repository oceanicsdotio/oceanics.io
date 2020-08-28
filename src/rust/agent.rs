#[allow(dead_code)]
pub mod agent_system {

    use wasm_bindgen::prelude::*;
    use wasm_bindgen::{JsValue};
    use std::collections::HashMap;
    use web_sys::{CanvasRenderingContext2d, CanvasGradient};
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

    fn quaternion(U: [f64;4], V: [f64;4]) -> [f64;4] {
            
        //Quaternion Multiplication
           
       let mut R = [0.0;4];

       R[0] = U[0]*V[0] - U[1]*V[1] - U[2]*V[2] - U[3]*V[3];   // A*B - dotProduct(U,V)
       R[1] = U[2]*V[3] - U[3]*V[2] + U[0]*V[1] + V[0]*U[1];   // crossProduct(U,V) + A*V + B*U;
       R[2] = U[3]*V[1] - U[1]*V[3] + U[0]*V[2] + V[0]*U[2];
       R[3] = U[1]*V[2] - U[2]*V[1] + U[0]*V[3] + V[0]*U[3];

       R
   }


    pub struct Vec3 {
        pub value: [f64; 3]
    }


    impl Vec3 {

        pub fn normal_form(&self) -> Vec3 {

            let [a,b,c] = self.value;

            Vec3 {
                value: [0.5*(a+1.0), 0.5*(b+1.0), 0.5*(c+1.0)]
            }
        }

        pub fn copy(&self) -> Vec3 {
            Vec3 {
                value: self.value
            }
        }

        pub fn magnitude(&self) -> f64 {
            let mut sum = 0.0;
            for ii in 0..3 {
                sum += self.value[ii]*self.value[ii];
            }
            sum.powf(0.5)
        }

        pub fn x(&self) -> f64 { self.value[0] }

        pub fn y(&self) -> f64 { self.value[1] }

        pub fn z(&self) -> f64 { self.value[2] }

        pub fn normalized(&self) -> Vec3 {

            let mag = self.magnitude();

            Vec3 { value: [
                self.x() / mag,
                self.y() / mag,
                self.z() / mag
            ]}
        }

        fn sum(&self) -> f64 {
            let mut sum = 0.0;
            for val in &self.value{
                sum += val;
            }
            sum
        }

    
        pub fn rotate(&self, angle: &f64, axis: &Vec3) -> Vec3 {

        
            // normalize rotation axis
            let rot_axis = axis.normalized();
            let memo = (angle/2.0).sin();
    
            let rot_quaternion = [ (angle/2.0).cos(),  rot_axis.x()*memo,  rot_axis.y()*memo,  rot_axis.z()*memo ];
            let conj_quaternion = [ (angle/2.0).cos(), -rot_axis.x()*memo, -rot_axis.y()*memo, -rot_axis.z()*memo ];
            let mut pos_quaternion = [0.0, self.x(), self.y(), self.z()];
            let new_quaternion = quaternion(rot_quaternion, pos_quaternion);
            pos_quaternion = quaternion( new_quaternion, conj_quaternion);
    
            Vec3{
                value: [pos_quaternion[1], pos_quaternion[2], pos_quaternion[3]]
            }
        }

        pub fn dot_product(u: &Vec3, v: &Vec3) -> f64 {
            (u*v).sum()
        }


        pub fn vec_angle (u: &Vec3, v: &Vec3) -> f64 {
            let yy = Vec3::dot_product(u, v) / (u.magnitude() * v.magnitude());
            if yy <= 1.0 && yy >= -1.0 {
                yy.acos()
            } else {
                0.0
            }
        }

        pub fn cross_product (u: &Vec3, v: &Vec3) -> Vec3{
            Vec3{
                value: [
                    u.y()*v.z() - u.z()*v.y(),
                    u.z()*v.x() - u.x()*v.z(),
                    u.x()*v.y() - u.y()*v.x()
                ]
            }
        }
        
        
        pub const XAXIS: Vec3 = Vec3{value: [1.0, 0.0, 0.0]};
        pub const YAXIS: Vec3 = Vec3{value: [0.0, 1.0, 0.0]};
        pub const ZAXIS: Vec3 = Vec3{value: [0.0, 0.0, 1.0]};
        pub const ORIGIN: Vec3 = Vec3{value: [0.0, 0.0, 0.0]};

    }

    impl std::ops::Add<Vec3> for Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Add<f64> for Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs;
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Sub<Vec3> for Vec3 {
        type Output = Vec3;
        fn sub(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] - _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Sub<&Vec3> for &Vec3 {
        type Output = Vec3;
        fn sub(self, _rhs: &Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] - _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Add<&Vec3> for &Vec3 {
        type Output = Vec3;
        fn add(self, _rhs: &Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] + _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Mul<Vec3> for Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Div<f64> for Vec3 {
        type Output = Vec3;
        fn div(self, rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] / rhs;
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::MulAssign<f64> for Vec3 {
        fn mul_assign(&mut self, rhs: f64) {
            for ii in 0..3 {
                self.value[ii] *= rhs;
            }
        }
    }

    impl std::ops::Mul<&Vec3> for &Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: &Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs.value[ii];
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Mul<f64> for Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs;
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Mul<f64> for &Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: f64) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs;
            }
            Vec3{ value: v }
        }
    }

    impl std::ops::Mul<Vec3> for &Vec3 {
        type Output = Vec3;
        fn mul(self, _rhs: Vec3) -> Vec3 {
            let mut v = [0.0; 3];
            for ii in 0..3 {
                v[ii] = self.value[ii] * _rhs.value[ii];
            }
            Vec3{ value: v }
        }
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
    pub struct ContextCursor {
        x: f64,
        y: f64
    }

    #[wasm_bindgen]
    impl ContextCursor {

        #[wasm_bindgen(constructor)]
        pub fn new(x: f64, y: f64) -> ContextCursor {
            ContextCursor {x, y}
        }

        #[wasm_bindgen]
        pub fn ticks (ctx: &CanvasRenderingContext2d, theta: f64, n: u32, a: f64, b: f64) {
            /*
            Draw radial ticks
             - theta: angle of rotation for set of all ticks
             - n: the number of ticks
             - a, b: the inner and outer radiuses
            */
            let inc: f64 = 2.0 * PI / n as f64;

            ctx.save();
            ctx.rotate(theta).unwrap();
            
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
        pub fn update(&mut self, x: f64, y: f64) {
            self.x = x;
            self.y = y;
        }

        #[wasm_bindgen]
        pub fn draw (&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, color: JsValue, time: f64, line_width: f64) {

            const PULSE_RINGS: usize = 7;
            const ICON: f64 = 16.0;
            const RADIANS: f64 = 2.0 * PI;
            const OFFSET: f64 = PI - 0.5 * RADIANS;
            
            let dx = 0.0;
            let dy = 0.0;
            let x = self.x;
            let y = self.y;

        
            let _dx = x - (dx+0.5*w);
            let _dy = y - (dy+0.5*h);
            let dxy = (_dx.powi(2) + _dy.powi(2)).sqrt();
            // let theta = _dy.atan2(_dx);
            let displacement = 3.0*ICON + signal(time, 0.5) / 10.0;
            let radians = signal(time, 2.0) * PI * 2.0;
            let sig = signal(time, 2.0);

            // ctx.set_global_alpha((alpha(&color) as f64)/255.0);
            ctx.set_stroke_style(&color);
            ctx.set_line_width(line_width);
            ctx.set_line_cap("round");

            ctx.save();
            ctx.translate(self.x, self.y).unwrap();
            ctx.begin_path();
            ctx.arc(0.0, 0.0, ICON, OFFSET, RADIANS).unwrap();  // inner circle
            ctx.stroke();


            for ii in 0..PULSE_RINGS {
                ctx.begin_path();
                const RADIANS: f64 = 2.0 * PI;
                const OFFSET: f64 = 0.0;

                let radius = 4.5*ICON + ICON * sig * (ii as f64).log(3.0);
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
           
            
            ContextCursor::ticks(&ctx, time / 10000.0, 8, 1.1*ICON, 1.3*ICON);
            ContextCursor::ticks(&ctx, -(time / 40000.0), 16, 1.4 * ICON, 1.5 * ICON);
            ContextCursor::ticks(&ctx, time / 10000.0, 16, 1.6 * ICON, 1.7 * ICON);
            
           
            for _ in 0..6 {
                ctx.rotate(2.0 * PI / 6 as f64).unwrap();
                ctx.begin_path();
                let offset = PI - radians / 2.0;
                ctx.arc(displacement, 0.0, ICON, -offset, radians).unwrap();
                ctx.stroke();
            }

            ctx.restore();
            
           
        
        }
    }

    struct Action {
        active: bool,
        timer: usize
    }

    impl Action {
        fn new() -> Action {
            Action {
                active: false,
                timer: 60
            }
        }
    }

    struct Message {
        coordinates: Vec3,
        heading: Vec3
    }

    struct Rotation {
        velocity: f64,
        axis: Vec3
    }

    impl Rotation {
        fn new() -> Rotation {
            Rotation {
                velocity: 0.0,
                axis: Vec3::ZAXIS
            }
        }
    }


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

    impl Spring {
        
        pub fn potential_energy(&self) -> f64 {
            /*
            Energy conservation is used to constrain some simulations to realistic
            physics, and to classify configurations of agents
            */
            0.5 * self.k * self.x.powi(2)
        }

        pub fn force(&self) -> f64 {
            /*
            Basic spring force for calculating the acceleration
            on objects
            */
            -2.0 * self.k.sqrt() * self.v - self.k * (self.x - self.l)
        }

        pub fn drop(&self) -> bool {
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

        pub fn update(&mut self, distance: f64) {
            /*
            If the distance is too close, the spring behaves as a rod.
            */
            self.x = distance.max(self.stop);
            self.v = distance - self.x;
        }
    }

    pub struct Link {
        spring: Spring,
        vec: Vec3
    }

    impl Link {
       
        pub fn update(&mut self, new_vec: Vec3) -> Vec3 {

            let distance = new_vec.magnitude();
            self.spring.update(distance);
            let force = self.spring.force();
            let mut delta = Vec3{ value: [0.0; 3]};
           
            for dim in 0..3 {
                if distance > 0.00001 {
                    delta.value[dim] = self.vec.value[dim] / distance * force;
                } 
                self.vec.value[dim] = new_vec.value[dim];         
            };

            delta

        }
    }

    impl Link {
        
        pub fn new(p: f64) -> Link {
            Link {
                spring: Spring { k: 0.002, x: 0.0, v: 0.0, l: 0.2, stop: 0.1, p },
                vec: Vec3{ value: [0.0, 0.0, 0.0]}
            }
        }

        fn rgba (&self, z: f64, fade: f64) -> String {
            /*
            Colormap a value in (-inf, inf). 
            
            - Negative values are blue
            - Positive values are red
            - Alpha is 255 in front, and (0,1) in
    
            */
            let mut color: String = "rgba(".to_owned();
            let force = self.spring.force();
            let alpha = (1.0 - fade * z) * (force.abs().sqrt() * 10.0).min(1.0);

            if force < 0.0 {
                color.push_str("0, 0, 255,");
            } else {
                color.push_str("255, 0, 0,");
            }

            color.push_str(&format!("{alpha:.*})", 2, alpha=alpha));
    
            return color;
        }


        fn gradient(&self, ctx: &CanvasRenderingContext2d, xyz: &Vec3, target: &Vec3, fade: f64) -> CanvasGradient {

            let gradient: CanvasGradient = ctx.create_linear_gradient(xyz.x(), xyz.y(), target.x(), target.y());
            
            assert!(gradient.add_color_stop(0.0, &self.rgba(xyz.z(), fade)).is_ok());
            assert!(gradient.add_color_stop(1.0, &self.rgba(target.z(), fade)).is_ok());

            return gradient
        }

        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h: f64, xyz: &Vec3, radius: f64, fade: f64) {
            /*
            Links are rendered as rays originating at the linked particle, and terminating
            at a point defined by the source plus the `vec` attribute of Link.

            Display size for agents is used to calculate an offset, so that the ray begins
            on the surface of a 3D sphere, projected into the X,Y plane.
            */
            
            let target = xyz - &self.vec;
            let offset = -2.0 * radius; // this scalar might just be for retina display???
           
            let gradient = self.gradient(ctx, &xyz, &target, fade);
            ctx.set_stroke_style(&gradient);
            ctx.begin_path();
            ctx.move_to(
                xyz.x() * w + offset * self.vec.x(), 
                xyz.y() * h + offset * self.vec.y()
            );
            ctx.line_to(
                target.x() * w - offset * self.vec.x(), 
                target.y() * h - offset * self.vec.y()
            );
            ctx.stroke();
        }
    }

    
    pub struct Agent {
        heading: Vec3,
        coordinates: Vec3,
        velocity: Vec3,
        links: HashMap<usize,Link>,
    }

   
    impl Agent {
        
        pub fn new (x: f64, y: f64, z: f64) -> Agent {
            Agent {
                heading: Vec3 {value: [1.0, 0.0, 0.0]},
                coordinates: Vec3 {value: [x, y, z]},
                velocity: Vec3 {value: [0.0, 0.0, 0.0]},
                links: HashMap::new()
            }
        }



        pub fn response(&mut self, msg: Message) -> Message {

            let alignment = msg.heading;
            let offset = &self.coordinates - &msg.coordinates;
            let repulsor: Vec3;

            if offset.magnitude() < 0.5 { 
                repulsor = offset.normalized();
            } else {
                repulsor = Vec3{value:[0.0, 0.0, 0.0]};
            }

            let attractor = offset.normalized() * -1.0;
            let total = alignment + attractor + repulsor;

            let angleOffset = Vec3::vec_angle(&self.heading, &total); // angleOffset reaches NaN
            let normal = Vec3::cross_product(&self.heading, &total);
            let rot_v = normal.z().signum()*0.5*angleOffset;  // critically damped oscillator
            
            // self.heading = self.heading.rotate(rot_v * PI_RADIANS, &rotaxis);
            // self.model = self.model.rotate(&rot_v, &rotaxis);

            Message{
                coordinates: self.coordinates.copy(), 
                heading: self.heading.copy()
            }
        

        }

        pub fn message(&self) -> Message {
            return Message{
                coordinates: self.coordinates.copy(), 
                heading: self.heading.copy()
            };
        }

        pub fn update_position(&mut self, padding: f64, drag: f64, bounce: f64) {

        
            let speed = self.velocity.magnitude();

            for dim in 0..3 {
                let mut coord = self.coordinates.value[dim];
                
                self.velocity.value[dim] *= 1.0 - drag;
                coord += self.velocity.value[dim];
                if coord > 1.0 - padding {
                    coord -= 2.0*(coord - 1.0 - padding);
                    self.velocity.value[dim] *= -bounce;
                } else if coord < padding {
                    coord -= 2.0*(coord - padding);
                    self.velocity.value[dim] *= -bounce;
                }
                if speed > 0.00001 {
                    self.heading.value[dim] = self.velocity.value[dim] / self.velocity.magnitude();
                }
                self.coordinates.value[dim] = coord;
            }

        }

        
        pub fn draw(ctx: &CanvasRenderingContext2d, _n: u32, w: f64, h: f64, x: f64, y: f64, z: f64, u: f64, v: f64, fade: f64, scale: f64, color: &JsValue) {
            /*
            Render the current state of single Agent to HTML canvas. The basic
            representation includes a scaled circle indicating the position, 
            and a heading indicator for the current direction of travel.
            */
            ctx.set_global_alpha(1.0 - fade * z);
            ctx.set_fill_style(&color);
            ctx.set_stroke_style(&color);

            let radius = scale * (1.0 - 0.5*z);

            ctx.begin_path();
            if let Err(_e) = ctx.arc(x * w, y * h, radius, 0.0, std::f64::consts::PI*2.0) {
                ctx.close_path();
                panic!("Problem drawing agent, probably negative scale value");
            }
            ctx.move_to(x * w, y * h);
            ctx.line_to(x * w + u * radius, y * h + v * radius);
            ctx.stroke();
            ctx.close_path();
        }
    }

    #[wasm_bindgen]
    pub struct Group {
        particles: Vec<Agent>,
        center: Vec3,
        heading: Vec3
    }

   

    #[wasm_bindgen]
    impl Group {
        #[wasm_bindgen(constructor)]
        #[allow(unused_unsafe)]
        pub fn new(count: usize, zero: f64, stop: f64) -> Group {
            let mut group = Group {
                particles: vec![],
                heading: Vec3::ORIGIN,
                center: Vec3::ORIGIN
            };

            for _ii in 0..count {
                unsafe {
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
                    let vec = &group.particles[jj].coordinates - &group.particles[ii].coordinates;
                    
                    group.particles[ii].links.insert(jj, Link{
                        vec: vec,
                        spring: Spring{k: 0.002, x: 0.0, v: 0.0, l: zero, stop, p: 1.0}
                    });
                }
            }

            return group;
        }

        fn message(&self) -> Message {
            Message{
                coordinates: self.center.copy(),
                heading: self.heading.copy()
            }
        }

        fn response(&self, msg: Message) -> Message {

            // self.heading += msg.heading / self.particles.len();
            // self.center += msg.coordinates / self.particles.len();
            Message{
                coordinates: self.center.copy(), 
                heading: self.heading.copy()
            }
        }
   

        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, width: f64, height: f64, fade: f64, scale: f64, color: JsValue) {
            
            /*
            Draw the entire group of particles to an HTML canvas using the 2D context.
            */ 
            // let count = self.particles.len();
            let count: u32 = 1;
            for particle in &self.particles {
                let [x,y, z] = particle.coordinates.value;
                let [u, v, _w] = particle.heading.value;
                Agent::draw(ctx, count as u32, width, height, x, y, z, u, v, fade, scale, &color);

                for link in particle.links.values() {
                    link.draw(ctx, width, height, &particle.coordinates, scale, fade); 
                }
            }

        }

        #[wasm_bindgen]
        pub fn update_links(&mut self, padding: f64, drag: f64, bounce: f64) {
            /*
            Update link forces and vectors. 

            Have to split Vec<Agents>, because each index op of `self.particles` will attempt 
            to borrow and collide. This works for current implementation, because
            the graph is initialized by linking only other particles with a greater
            index. 
            */
            for ii in 0..self.particles.len() {

                let (head, tail) = self.particles.split_at_mut(ii + 1);
                let particle = &mut head[ii];
                
                for (jj, link) in &mut particle.links {
                    
                    let mut neighbor = &mut tail[jj - ii - 1];
                    let delta = link.update(&particle.coordinates - &neighbor.coordinates);
                    
                    particle.velocity = &particle.velocity + &delta;
                    neighbor.velocity = &neighbor.velocity - &delta;
                }
                particle.update_position(padding, drag, bounce);
            }
        }
    }

}