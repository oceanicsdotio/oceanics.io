pub mod graphics_system {

    use wasm_bindgen::prelude::*;
    use web_sys::{
        WebGlProgram, WebGlRenderingContext, WebGlShader, ImageData, WebGlBuffer, WebGlTexture
    };


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


    fn link_program(
        context: &WebGlRenderingContext,
        vert_shader: &WebGlShader,
        frag_shader: &WebGlShader,
    ) -> Result<WebGlProgram, String> {
        let program = context
            .create_program()
            .ok_or_else(|| String::from("Unable to create shader object"))?;

        context.attach_shader(&program, vert_shader);
        context.attach_shader(&program, frag_shader);
        context.link_program(&program);

        if context
            .get_program_parameter(&program, WebGlRenderingContext::LINK_STATUS)
            .as_bool()
            .unwrap_or(false)
        {
            Ok(program)
        } else {
            Err(context
                .get_program_info_log(&program)
                .unwrap_or_else(|| String::from("Unknown error creating program object")))
        }
    }

    #[wasm_bindgen]
    pub fn create_program(ctx: &WebGlRenderingContext, vertex: &str, fragment: &str) -> WebGlProgram {
        let vert_shader = compile_shader(
            ctx,
            WebGlRenderingContext::VERTEX_SHADER,
            vertex,
        ).unwrap();
        let frag_shader = compile_shader(
            ctx,
            WebGlRenderingContext::FRAGMENT_SHADER,
            fragment,
        ).unwrap();
        return link_program(ctx, &vert_shader, &frag_shader).unwrap();
    }


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


    #[wasm_bindgen]
    pub fn bind_texture (ctx: &WebGlRenderingContext, texture: WebGlTexture, unit: u32) {
        ctx.active_texture(WebGlRenderingContext::TEXTURE0 + unit);
        ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, Some(&texture));
    }

    #[wasm_bindgen]
    pub fn create_texture (ctx: &WebGlRenderingContext, data: &ImageData, filter: u32, _width: i32, _height: i32) -> WebGlTexture {
        let texture = ctx.create_texture();
        ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, texture.as_ref());
        ctx.tex_parameteri(WebGlRenderingContext::TEXTURE_2D, WebGlRenderingContext::TEXTURE_WRAP_S, WebGlRenderingContext::CLAMP_TO_EDGE as i32);
        ctx.tex_parameteri(WebGlRenderingContext::TEXTURE_2D, WebGlRenderingContext::TEXTURE_WRAP_T, WebGlRenderingContext::CLAMP_TO_EDGE as i32);
        ctx.tex_parameteri(WebGlRenderingContext::TEXTURE_2D, WebGlRenderingContext::TEXTURE_MIN_FILTER, filter as i32);
        ctx.tex_parameteri(WebGlRenderingContext::TEXTURE_2D, WebGlRenderingContext::TEXTURE_MAG_FILTER, filter as i32);
        ctx.tex_image_2d_with_u32_and_u32_and_image_data(
            WebGlRenderingContext::TEXTURE_2D,
            0,
            WebGlRenderingContext::RGBA as i32,
            WebGlRenderingContext::RGBA as u32,
            WebGlRenderingContext::UNSIGNED_BYTE,
            data
        ).unwrap();
        ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, None);
        return texture.unwrap();
    }
}