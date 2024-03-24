use std::collections::HashMap;
use serde::Deserialize;
use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use web_sys::HtmlCanvasElement;
use web_sys::WebGlFramebuffer;
use web_sys::WebGlUniformLocation;
use web_sys::{
    CanvasRenderingContext2d, HtmlImageElement, ImageData, WebGlBuffer, WebGlProgram,
    WebGlRenderingContext, WebGlShader, WebGlTexture,
};

/**
 * Take a rendering context, and shader definition and compile
 * the rendering pipeline stage into a program in GPU memory.
 */
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

struct Program {
    program: WebGlProgram,
    uniforms: HashMap<String, WebGlUniformLocation>,
    attributes: HashMap<String, i32>,
}

impl Program {
    /**
     * Compile the shaders and link them to a program,
     * returning the pointer to the executable
     * in GPU memory.
     *
     * This is the high-level routine called directly from JavaScript.
     * Create a map of GPU attribute names and addresses.
     * These are used to mount and update values. They
     * normally have a name prefixed with `a_` by glsl
     * convention, but this may not always be true.
     */
    pub fn new(webgl: &WebGlRenderingContext, vertex: &str, fragment: &str) -> Result<Program, String> {
        let vert_shader =
            compile_shader(webgl, WebGlRenderingContext::VERTEX_SHADER, vertex)?;
        let frag_shader =
            compile_shader(webgl, WebGlRenderingContext::FRAGMENT_SHADER, fragment)?;
        let program = webgl.create_program().unwrap();
        webgl.attach_shader(&program, &vert_shader);
        webgl.attach_shader(&program, &frag_shader);
        webgl.link_program(&program);
        let status = webgl.get_program_parameter(&program, WebGlRenderingContext::LINK_STATUS);
        if !status.as_bool().unwrap() {
            let info = webgl.get_program_info_log(&program).unwrap();
            return Err(info)
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
struct Programs {
    update: Program,
    screen: Program,
    draw: Program,
    noise: Program,
}

#[wasm_bindgen]
struct WebGl {
    programs: Programs,
    webgl: WebGlRenderingContext,
    textures: HashMap<String, WebGlTexture>,
    framebuffer: Option<WebGlFramebuffer>,
    uniforms: HashMap<String, (String, Vec<f32>)>,
}

#[derive(Deserialize)]
struct Shaders {
    pub vertex: String,
    pub fragment: String,
}

#[wasm_bindgen]
impl WebGl {
    #[wasm_bindgen(constructor)]
    pub fn new(
        canvas: &HtmlCanvasElement,
        update: JsValue,
        screen: JsValue,
        draw: JsValue,
        noise: JsValue,
    ) -> Result<WebGl, JsValue> {
        let webgl = (*canvas)
            .get_context("webgl")
            .unwrap()
            .unwrap()
            .dyn_into::<WebGlRenderingContext>()
            .unwrap();
        let framebuffer = webgl.create_framebuffer();
        let update: Shaders = serde_wasm_bindgen::from_value(update).unwrap();
        let screen: Shaders = serde_wasm_bindgen::from_value(screen).unwrap();
        let draw: Shaders = serde_wasm_bindgen::from_value(draw).unwrap();
        let noise: Shaders = serde_wasm_bindgen::from_value(noise).unwrap();
        let update = Program::new(&webgl, &update.vertex, &update.fragment)?;
        let screen = Program::new(&webgl, &screen.vertex, &screen.vertex)?;
        let draw = Program::new(&webgl, &draw.vertex, &draw.fragment)?;
        let noise = Program::new(&webgl, &noise.vertex, &noise.fragment)?;
        let programs = Programs {
            update,
            screen,
            draw,
            noise,
        };
        Ok(WebGl {
            webgl,
            programs,
            textures: HashMap::new(),
            framebuffer,
            uniforms: HashMap::new(),
        })
    }
    pub fn bind_texture(&self, texture: &str, unit: u32) {
        let texture = self.textures.get(texture).unwrap();
        bind_texture(&self.webgl, texture, unit)
    }

    pub fn set_uniform(&mut self, name: String, data_type: String, value: Vec<f32>) {
        self.uniforms.insert(name, (data_type, value)).unwrap();
    }

    pub fn screen(
        &self,
        parameters: Vec<String>,
        width: i32,
        height: i32,
        buffer: &WebGlBuffer,
        time: f32,
    ) {
        let key = "screen";
        let texture = self.textures.get(key).unwrap();
        self.programs.screen.mount(
            &self.webgl,
            width,
            height,
            self.framebuffer.as_ref().unwrap(),
            texture,
        );
        self.bind_texture(&"uv", 0);
        self.bind_texture(&"state", 1);
        self.bind_texture(&"back", 2);
        self.programs
            .screen
            .bind_attribute(&self.webgl, buffer, &"quad", 6);
        self.programs
            .screen
            .set_uniform(&self.webgl, &"u_time", &"i", vec![time]);

        for param in &parameters {
            let (data_type, value) = self.uniforms.get(param).unwrap();
            self.programs
                .screen
                .set_uniform(&self.webgl, param, data_type, value.clone());
        }
        self.webgl
            .draw_arrays(WebGlRenderingContext::TRIANGLES, 0, 6);
    }

    pub fn draw(
        &self,
        parameters: Vec<String>,
        width: i32,
        height: i32,
        buffer: &WebGlBuffer,
        time: f32,
        res: i32,
    ) {
        let key = "draw";
        let texture = self.textures.get("screen").unwrap();
        self.programs.draw.mount(
            &self.webgl,
            width,
            height,
            self.framebuffer.as_ref().unwrap(),
            texture,
        );
        self.bind_texture(&"color", 2);
        self.programs
            .draw
            .bind_attribute(&self.webgl, buffer, &"index", res * res * 4);
        self.programs
            .draw
            .set_uniform(&self.webgl, &"u_time", &"i", vec![time]);

        for param in &parameters {
            let (data_type, value) = self.uniforms.get(param).unwrap();
            self.programs
                .draw
                .set_uniform(&self.webgl, param, data_type, value.clone());
        }
        self.webgl
            .draw_arrays(WebGlRenderingContext::POINTS, 0, res * res);
    }

    pub fn offscreen(
        &self,
        parameters: Vec<String>,
        width: i32,
        height: i32,
        buffer: &WebGlBuffer,
        time: f32,
    ) {
        self.programs.screen.offscreen(&self.webgl, width, height);
        self.bind_texture("screen", 2);
        self.programs
            .screen
            .bind_attribute(&self.webgl, buffer, &"quad", 6);
        self.programs
            .screen
            .set_uniform(&self.webgl, &"u_time", &"i", vec![time]);
        for param in &parameters {
            let (data_type, value) = self.uniforms.get(param).unwrap();
            self.programs
                .screen
                .set_uniform(&self.webgl, param, data_type, value.clone());
        }
        self.webgl
            .draw_arrays(WebGlRenderingContext::TRIANGLES, 0, 6);
    }

    pub fn update(
        &self,
        parameters: Vec<String>,
        width: i32,
        height: i32,
        buffer: &WebGlBuffer,
        time: f32,
        res: i32
    ) {
        let texture = self.textures.get("previous").unwrap();
        self.programs
            .update
            .mount(&self.webgl, res, res, self.framebuffer.as_ref().unwrap(), texture);
        self.bind_texture("color", 2);
        self.programs
            .update
            .bind_attribute(&self.webgl, buffer, &"quad", 6);
        self.programs
            .update
            .set_uniform(&self.webgl, &"u_time", "f", vec![time]);

        for param in &parameters {
            let (data_type, value) = self.uniforms.get(param).unwrap();
            self.programs
                .update
                .set_uniform(&self.webgl, param, data_type, value.clone());
        }
        self.webgl
            .draw_arrays(WebGlRenderingContext::TRIANGLES, 0, 6);
    }

    pub fn swap_textures(&mut self, first: &str, second: &str) {
        let (first, temp) = self.textures.remove_entry(first).unwrap();
        let temp = self.textures.insert(second.to_string(), temp).unwrap();
        self.textures.insert(first, temp);
    }

    /**
     * Define a 2D array in GPU memory, and bind it for GL operations.
     */
    #[wasm_bindgen]
    pub fn texture_from_color_map(
        &mut self,
        ctx: &CanvasRenderingContext2d,
        res: u32,
        colors: Vec<String>,
        name: String,
    ) -> Result<(), JsValue> {
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
        self.textures.insert(name, texture.unwrap());
        Ok(())
    }

    /**
     * Define a 2D array in GPU memory, and bind it for GL operations.
     */
    #[wasm_bindgen]
    pub fn texture_from_image(
        &mut self,
        preview: &HtmlCanvasElement,
        data: &HtmlImageElement,
        name: String,
    ) -> Result<(), JsValue> {
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
        self.textures.insert(name, texture.unwrap());
        Ok(())
    }
}


/**
 * Memory buffers are used to store array data for visualization.
 *
 * This could be colors, or positions, or offsets, or velocities.
 */
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

/**
 * Activate the chosen texture so that GL operations on textures will target it. The
 * texture number is [0,...) and can be accessed sequentially by offset.  
 *
 * Currently we only support 2D textures, which can be stacked to emulate 3D.
 */
#[wasm_bindgen]
pub fn bind_texture(ctx: &WebGlRenderingContext, texture: &WebGlTexture, unit: u32) {
    ctx.active_texture(WebGlRenderingContext::TEXTURE0 + unit);
    ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, Some(texture));
}

#[wasm_bindgen]
pub fn texture_from_u8_array(
    webgl: &WebGlRenderingContext,
    width: i32,
    height: i32,
    data: &[u8],
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

#[wasm_bindgen]
pub struct Texture2D {
    size: (usize, usize),
}

#[wasm_bindgen]
impl Texture2D {
    pub fn fill_canvas(ctx: &CanvasRenderingContext2d, _w: f64, _h: f64, _frame: f64, time: f64) {
        let mut image_data = Vec::new();
        for _ in 0..(_w as usize) {
            for _ in 0..(_h as usize) {
                image_data.push((255.0 * (time % 2000.0) / 2000.0) as u8);
                image_data.push(0 as u8);
                image_data.push((255.0 * (time % 6000.0) / 6000.0) as u8);
                image_data.push(122);
            }
        }
        ctx.put_image_data(
            &ImageData::new_with_u8_clamped_array(Clamped(&mut image_data), _w as u32).unwrap(),
            0.0,
            0.0,
        )
        .unwrap();
    }
}
