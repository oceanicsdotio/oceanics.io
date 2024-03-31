use serde::Deserialize;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use web_sys::{
    console, CanvasRenderingContext2d, HtmlCanvasElement, HtmlImageElement, WebGlBuffer,
    WebGlFramebuffer, WebGlProgram, WebGlRenderingContext, WebGlShader, WebGlTexture,
    WebGlUniformLocation,
};

struct Program {
    program: WebGlProgram,
    uniforms: HashMap<String, WebGlUniformLocation>,
    attributes: HashMap<String, i32>,
}

impl Program {
    /// Compile the shaders and link them to a program,
    /// returning the pointer to the executable
    /// in GPU memory.
    ///
    /// This is the high-level routine called directly from JavaScript.
    /// Create a map of GPU attribute names and addresses.
    /// These are used to mount and update values. They
    /// normally have a name prefixed with `a_` by glsl
    /// convention, but this may not always be true.
    pub fn new(
        webgl: &WebGlRenderingContext,
        vertex: &str,
        fragment: &str,
    ) -> Result<Program, String> {
        let vert_shader = Self::compile_shader(webgl, WebGlRenderingContext::VERTEX_SHADER, vertex)?;
        let frag_shader = Self::compile_shader(webgl, WebGlRenderingContext::FRAGMENT_SHADER, fragment);
        if frag_shader.is_err() {
            console::log_1(&JsValue::from_str(fragment));
            return Err(frag_shader.err().unwrap());
        }
        let program = webgl.create_program().unwrap();
        webgl.attach_shader(&program, &vert_shader);
        webgl.attach_shader(&program, &frag_shader.unwrap());
        webgl.link_program(&program);
        let status = webgl.get_program_parameter(&program, WebGlRenderingContext::LINK_STATUS);
        if !status.as_bool().unwrap() {
            let info = webgl.get_program_info_log(&program).unwrap();
            return Err(info);
        }
        let count = webgl.get_program_parameter(&program, WebGlRenderingContext::ACTIVE_UNIFORMS);
        let count: u32 = serde_wasm_bindgen::from_value(count).unwrap();
        let mut uniforms = HashMap::new();
        for index in 0..count {
            let uniform = webgl.get_active_uniform(&program, index).unwrap();
            let name = uniform.name();
            let location = webgl.get_uniform_location(&program, &name);
            uniforms.insert(name, location.unwrap());
        }
        let count = webgl.get_program_parameter(&program, WebGlRenderingContext::ACTIVE_ATTRIBUTES);
        let count: u32 = serde_wasm_bindgen::from_value(count).unwrap();
        let mut attributes = HashMap::new();
        for index in 0..count {
            let uniform = webgl.get_active_attrib(&program, index).unwrap();
            let name = uniform.name();
            let location = webgl.get_attrib_location(&program, &name);
            attributes.insert(name, location);
        }
        Ok(Program {
            program,
            uniforms,
            attributes,
        })
    }

    /// Take a rendering context, and shader definition and compile
    /// the rendering pipeline stage into a program in GPU memory.
    fn compile_shader(
        context: &WebGlRenderingContext,
        shader_type: u32,
        source: &str,
    ) -> Result<WebGlShader, String> {
        let shader = context.create_shader(shader_type).unwrap();
        context.shader_source(&shader, source);
        context.compile_shader(&shader);

        if context
            .get_shader_parameter(&shader, WebGlRenderingContext::COMPILE_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(shader)
        } else {
            Err(context
                .get_shader_info_log(&shader)
                .unwrap_or_else(|| String::from("Unknown error creating shader")))
        }
    }
    pub fn bind_attribute(
        &self,
        webgl: &WebGlRenderingContext,
        buffer: &WebGlBuffer,
        name: &str,
        count: i32,
    ) {
        let location = webgl.get_attrib_location(&self.program, &name) as u32;
        webgl.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, Some(buffer));
        webgl.enable_vertex_attrib_array(location);
        webgl.vertex_attrib_pointer_with_i32(
            location,
            count,
            WebGlRenderingContext::FLOAT,
            false,
            0,
            0,
        );
    }

    pub fn mount(
        &self,
        webgl: &WebGlRenderingContext,
        width: i32,
        height: i32,
        framebuffer: &WebGlFramebuffer,
        texture: &WebGlTexture,
    ) {
        webgl.viewport(0, 0, width, height);
        webgl.bind_framebuffer(WebGlRenderingContext::FRAMEBUFFER, Some(framebuffer));
        webgl.framebuffer_texture_2d(
            WebGlRenderingContext::FRAMEBUFFER,
            WebGlRenderingContext::COLOR_ATTACHMENT0,
            WebGlRenderingContext::TEXTURE_2D,
            Some(texture),
            0,
        );
        webgl.use_program(Some(&self.program));
    }

    pub fn offscreen(&self, webgl: &WebGlRenderingContext, width: i32, height: i32) {
        webgl.viewport(0, 0, width, height);
        webgl.bind_framebuffer(WebGlRenderingContext::FRAMEBUFFER, None);
        webgl.framebuffer_texture_2d(
            WebGlRenderingContext::FRAMEBUFFER,
            WebGlRenderingContext::COLOR_ATTACHMENT0,
            WebGlRenderingContext::TEXTURE_2D,
            None,
            0,
        );
        webgl.use_program(Some(&self.program));
    }

    pub fn set_uniform(
        &self,
        webgl: &WebGlRenderingContext,
        key: &str,
        data_type: &str,
        value: Vec<f32>,
    ) {
        if self.uniforms.contains_key(key) {
            let handle = self.uniforms.get(key);
            match (value.len(), data_type) {
                (1, "f") => webgl.uniform1f(handle, value[0]),
                (2, "f") => webgl.uniform2f(handle, value[0], value[1]),
                (1, "i") => webgl.uniform1i(handle, value[0].floor() as i32),
                (2, "i") => {
                    webgl.uniform2i(handle, value[0].floor() as i32, value[1].floor() as i32)
                }
                _ => {}
            }
        }
    }
}
/// Known programs. Honestly, just easier than the configurable route.
struct Programs {
    update: Program,
    screen: Program,
    draw: Program,
    noise: Program,
}
/// Known textures.
struct Textures {
    screen: WebGlTexture,
    back: WebGlTexture,
    previous: WebGlTexture,
    state: WebGlTexture,
    color: Option<WebGlTexture>,
    velocity: Option<WebGlTexture>,
}
struct Attributes {
    a_pos: WebGlBuffer,
    a_index: WebGlBuffer
}

struct Uniforms {
    u_screen: i32,
    u_opacity: f32,
    u_wind: i32,
    u_particles: i32,
    u_color_ramp: i32,
    u_particle_res: i32,
    u_point_size: i32,
    u_speed: f32,
    u_diffusivity: f32,
    u_drop: f32,
    u_seed: f32, 
    u_wind_max: Vec<f32>,
    u_wind_min: Vec<f32>,
    u_wind_res: Vec<f32>,
    u_time: f32,
    u_bump: f32
}

#[wasm_bindgen]
struct WebGl {
    programs: Programs,
    webgl: WebGlRenderingContext,
    textures: Textures,
    framebuffer: Option<WebGlFramebuffer>,
    uniforms: Uniforms,
    attributes: Attributes,
}

#[derive(Deserialize)]
struct Shaders {
    pub vertex: String,
    pub fragment: String,
}
#[derive(Deserialize)]
struct Attribute {
    name: String,
    order: i32,
    data: Vec<f32>,
}
#[derive(Deserialize)]
struct Texture {
    shape: Vec<i32>,
    data: WebGlBuffer,
    name: String,
}

#[wasm_bindgen]
impl WebGl {
    #[allow(dead_code)]
    #[wasm_bindgen(constructor)]
    pub fn new(
        canvas: &HtmlCanvasElement,
        attributes: JsValue,
        uniforms: JsValue,
        update: JsValue,
        screen: JsValue,
        draw: JsValue,
        noise: JsValue,
        u_opacity: f32,
        u_point_size: i32,
        u_speed: f32, 
        u_diffusivity: f32, 
        u_drop: f32, 
        u_seed: f32, 
        u_wind_max: Vec<f32>, 
        u_wind_min: Vec<f32>, 
        u_wind_res: Vec<f32>
    ) -> Result<WebGl, JsValue> {
        let webgl = (*canvas)
            .get_context("webgl")
            .unwrap()
            .unwrap()
            .dyn_into::<WebGlRenderingContext>()
            .unwrap();
        let width = canvas.width() as i32;
        let height = canvas.height() as i32;
        let framebuffer = webgl.create_framebuffer();
        let update: Shaders = serde_wasm_bindgen::from_value(update).unwrap();
        let screen: Shaders = serde_wasm_bindgen::from_value(screen).unwrap();
        let draw: Shaders = serde_wasm_bindgen::from_value(draw).unwrap();
        let noise: Shaders = serde_wasm_bindgen::from_value(noise).unwrap();
        let update = Program::new(&webgl, &update.vertex, &update.fragment)?;
        let screen = Program::new(&webgl, &screen.vertex, &screen.fragment)?;
        let draw = Program::new(&webgl, &draw.vertex, &draw.fragment)?;
        let noise = Program::new(&webgl, &noise.vertex, &noise.fragment)?;
        let programs = Programs {
            update,
            screen,
            draw,
            noise,
        };

        let a_pos: [f32; 6] = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0];
        let a_pos = js_sys::Float32Array::view(&a_pos);
        let a_index: Vec<f32> = Vec::with_capacity((width * height * 4) as usize);
        let attributes = Attributes { 
            a_pos, 
            a_index
        };
        let res = 16;
        let screen = Vec::with_capacity((width * height * 4) as usize).as_slice();
        let back = Vec::with_capacity((width * height * 4) as usize).as_slice();
        let previous = Vec::with_capacity((res * res * 4) as usize).as_slice();
        let state = Vec::with_capacity((res * res * 4) as usize).as_slice();
        let textures = Textures{
            screen: Self::texture_from_u8_array(&webgl, width, height, screen)?,
            back: Self::texture_from_u8_array(&webgl, width, height, back)?,
            previous: Self::texture_from_u8_array(&webgl, res, res, previous)?,
            state: Self::texture_from_u8_array(&webgl, res, res, state)?,
            color: None,
            velocity: None
        };
        let uniforms = Uniforms { 
            u_screen: 2, 
            u_opacity, 
            u_wind: 0, 
            u_particles: 1, 
            u_color_ramp: 2, 
            u_particle_res: res as i32, 
            u_point_size, 
            u_speed, 
            u_diffusivity, 
            u_drop, 
            u_seed, 
            u_wind_max, 
            u_wind_min, 
            u_wind_res,
            u_time: 0.0,
            u_bump: 1.0
        };
        let webgl = WebGl {
            webgl,
            programs,
            framebuffer,
            textures,
            uniforms,
            attributes,
        };
        Ok(webgl)
    }

    pub fn bind_texture(&self, texture: &WebGlTexture, unit: u32) {
        self.webgl
            .active_texture(WebGlRenderingContext::TEXTURE0 + unit);
        self.webgl
            .bind_texture(WebGlRenderingContext::TEXTURE_2D, Some(texture));
    }

    pub fn screen(&self, width: i32, height: i32, time: f32) -> Result<(), JsValue> {
        let key = "screen";
        let program = self.programs.screen;
        program.mount(
            &self.webgl,
            width,
            height,
            self.framebuffer.as_ref().unwrap(),
            &self.textures.screen,
        );
        self.bind_texture(&self.textures.velocity.unwrap(), 0);
        self.bind_texture(&self.textures.state, 1);
        self.bind_texture(&self.textures.back, 2);
        program.bind_attribute(&self.webgl, &self.attributes.a_pos, &"quad", 6);
        self.webgl.uniform1f(program.uniforms.get("u_time"), time);
        self.webgl.uniform1f(program.uniforms.get("u_opacity"), self.uniforms.u_opacity);
        self.webgl.uniform1i(program.uniforms.get("u_screen"), self.uniforms.u_screen);
        self.webgl.draw_arrays(WebGlRenderingContext::TRIANGLES, 0, 6);
        Ok(())
    }

    pub fn draw(&self, width: i32, height: i32, time: f32, res: i32) -> Result<(), JsValue> {
        let program = self.programs.draw;
        program.mount(
            &self.webgl,
            width,
            height,
            self.framebuffer.as_ref().unwrap(),
            &self.textures.screen,
        );
        self.bind_texture(&self.textures.color.unwrap(), 2);
        program.bind_attribute(&self.webgl, &self.attributes.a_index, &"index", res * res * 4);
        self.webgl.uniform1f(program.uniforms.get("u_time"), time);
        self.webgl.uniform1i(program.uniforms.get("u_particles_res"), self.uniforms.u_particle_res);
        self.webgl.uniform1i(program.uniforms.get("u_particles"), self.uniforms.u_particles);
        self.webgl.uniform1i(program.uniforms.get("u_point_size"), self.uniforms.u_point_size);
        self.webgl.uniform1i(program.uniforms.get("u_wind"), self.uniforms.u_wind);
        self.webgl.uniform1i(program.uniforms.get("u_color_ramp"), self.uniforms.u_color_ramp);
        self.webgl.uniform2f(program.uniforms.get("u_wind_max"), self.uniforms.u_wind_max[0], self.uniforms.u_wind_max[1]);
        self.webgl.uniform2f(program.uniforms.get("u_wind_min"), self.uniforms.u_wind_min[0], self.uniforms.u_wind_min[1]);
        self.webgl.draw_arrays(WebGlRenderingContext::POINTS, 0, res * res);
        Ok(())
    }

    pub fn offscreen(&self, width: i32, height: i32, time: f32) -> Result<(), JsValue> {
        let program = self.programs.screen;
        program.offscreen(&self.webgl, width, height);
        self.bind_texture(&self.textures.screen, 2);
        program.bind_attribute(&self.webgl, &self.attributes.a_pos, &"quad", 6);
        program.set_uniform(&self.webgl, &"u_time", &"i", vec![time]);
        self.webgl.uniform1f(program.uniforms.get("u_time"), time);
        self.webgl.uniform1f(program.uniforms.get("u_opacity"), self.uniforms.u_opacity);
        self.webgl.uniform1i(program.uniforms.get("u_screen"), self.uniforms.u_screen);
        self.webgl.draw_arrays(WebGlRenderingContext::TRIANGLES, 0, 6);
        Ok(())
    }

    pub fn update(&self, time: f32, res: i32) -> Result<(), JsValue> {
        let program = self.programs.update;
        program.mount(
            &self.webgl,
            res,
            res,
            self.framebuffer.as_ref().unwrap(),
            &self.textures.previous,
        );
        self.bind_texture(&self.textures.color.unwrap(), 2);
        program.bind_attribute(&self.webgl, &self.attributes.a_pos, &"quad", 6);
        self.webgl.uniform1f(program.uniforms.get("u_time"), time);
        self.webgl.uniform1f(program.uniforms.get("u_seed"), self.uniforms.u_seed);
        self.webgl.uniform1f(program.uniforms.get("u_speed"), self.uniforms.u_speed);
        self.webgl.uniform1f(program.uniforms.get("u_drop"), self.uniforms.u_drop);
        self.webgl.uniform1f(program.uniforms.get("u_bump"), self.uniforms.u_bump);
        self.webgl.uniform1i(program.uniforms.get("u_particles"), self.uniforms.u_particles);
        self.webgl.uniform1i(program.uniforms.get("u_wind"), self.uniforms.u_wind);
        self.webgl.uniform2f(program.uniforms.get("u_wind_max"), self.uniforms.u_wind_max[0], self.uniforms.u_wind_max[1]);
        self.webgl.uniform2f(program.uniforms.get("u_wind_min"), self.uniforms.u_wind_min[0], self.uniforms.u_wind_min[1]);
        self.webgl.uniform2f(program.uniforms.get("u_wind_res"), self.uniforms.u_wind_res[0], self.uniforms.u_wind_res[1]);
        self.webgl.draw_arrays(WebGlRenderingContext::TRIANGLES, 0, 6);
        Ok(())
    }
    /// Memory buffers are used to store array data for visualization.
    #[wasm_bindgen]
    pub fn create_buffer(ctx: &WebGlRenderingContext, data: &[f32]) -> WebGlBuffer {
        let buffer = ctx.create_buffer();
        ctx.bind_buffer(WebGlRenderingContext::ARRAY_BUFFER, buffer.as_ref());
        unsafe {
            ctx.buffer_data_with_array_buffer_view(
                WebGlRenderingContext::ARRAY_BUFFER,
                &js_sys::Float32Array::view(data),
                WebGlRenderingContext::STATIC_DRAW,
            );
        }
        return buffer.unwrap();
    }
    /// Define a 2D array in GPU memory, and bind it for GL operations.
    pub fn texture_from_color_map(
        &mut self,
        ctx: &CanvasRenderingContext2d,
        res: u32,
        colors: Vec<String>,
        name: String,
    ) -> Result<WebGlTexture, JsValue> {
        let webgl = &self.webgl;
        let color_map_size = res * res;
        let gradient = ctx.create_linear_gradient(0.0, 0.0, color_map_size as f64, 0.0);
        ctx.set_fill_style(&gradient);
        for (index, color) in colors.iter().enumerate() {
            gradient.add_color_stop(index as f32 / (colors.len() - 1) as f32, color)?
        }
        ctx.fill_rect(0.0, 0.0, color_map_size as f64, res as f64);
        let buffer = ctx.get_image_data(0.0, 0.0, color_map_size as f64, 1.0)?;

        let texture = webgl.create_texture();
        webgl.bind_texture(WebGlRenderingContext::TEXTURE_2D, texture.as_ref());
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_S,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_T,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MIN_FILTER,
            WebGlRenderingContext::LINEAR as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MAG_FILTER,
            WebGlRenderingContext::LINEAR as i32,
        );
        webgl.tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array(
            WebGlRenderingContext::TEXTURE_2D,
            0,
            WebGlRenderingContext::RGBA as i32,
            16,
            16,
            0,
            WebGlRenderingContext::RGBA as u32,
            WebGlRenderingContext::UNSIGNED_BYTE,
            Some(&buffer.data()),
        )?;
        webgl.bind_texture(WebGlRenderingContext::TEXTURE_2D, None);
        Ok(texture.unwrap())
    }
    /// Define a 2D array in GPU memory, and bind it for GL operations.
    pub fn texture_from_image(
        &mut self,
        preview: &HtmlCanvasElement,
        data: &HtmlImageElement,
        name: String,
    ) -> Result<WebGlTexture, JsValue> {
        let ctx = crate::context2d(preview);
        ctx.draw_image_with_html_image_element(data, 0.0, 0.0)?;
        let webgl = &self.webgl;
        let texture = webgl.create_texture();
        webgl.bind_texture(WebGlRenderingContext::TEXTURE_2D, texture.as_ref());
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_S,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_T,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MIN_FILTER,
            WebGlRenderingContext::LINEAR as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MAG_FILTER,
            WebGlRenderingContext::LINEAR as i32,
        );
        webgl.tex_image_2d_with_u32_and_u32_and_image(
            WebGlRenderingContext::TEXTURE_2D,
            0,
            WebGlRenderingContext::RGBA as i32,
            WebGlRenderingContext::RGBA as u32,
            WebGlRenderingContext::UNSIGNED_BYTE,
            data,
        )?;
        webgl.bind_texture(WebGlRenderingContext::TEXTURE_2D, None);
        Ok(texture.unwrap())
    }
    /// Texture from raw vertex data
    fn texture_from_u8_array(
        webgl: &WebGlRenderingContext,
        width: i32,
        height: i32,
        data: &[u8]
    ) -> Result<WebGlTexture, JsValue> {
        let texture = webgl.create_texture();
        webgl.bind_texture(WebGlRenderingContext::TEXTURE_2D, texture.as_ref());
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_S,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_T,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MIN_FILTER,
            WebGlRenderingContext::NEAREST as i32,
        );
        webgl.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MAG_FILTER,
            WebGlRenderingContext::NEAREST as i32,
        );
        webgl.tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array(
            WebGlRenderingContext::TEXTURE_2D,
            0,
            WebGlRenderingContext::RGBA as i32,
            width,
            height,
            0,
            WebGlRenderingContext::RGBA as u32,
            WebGlRenderingContext::UNSIGNED_BYTE,
            Some(data),
        )?;
        webgl.bind_texture(WebGlRenderingContext::TEXTURE_2D, None);
        Ok(texture.unwrap())
    }
}
