/**
The `graphics_system` module provides generic methods for working with
WebGL and GLSL shaders from inside Rust/WASM
*/
pub mod webgl {

    use wasm_bindgen::prelude::*;
    use web_sys::{
        ImageData, 
        WebGlBuffer, 
        WebGlProgram, 
        WebGlRenderingContext, 
        WebGlShader, 
        WebGlTexture,
    };

    /**
    Take a rendering context, and shader definition and compile 
    the rendering pipeline stage into a program in GPU memory.
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

    /**
    Bind shaders to the program to set the dataflow in hardware
    processing. 

    This is maintained as a standalone singleton function called by
    `create_program` so that it can be used directly from JavaScript
    if needed without refactoring. 
    */
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

    /**
    Compile the shaders and link them to a program, returning the pointer to the executable
    in GPU memory. 

    This is the high-level routine called directly from JavaScript. 
    */
    #[allow(dead_code)]
    #[wasm_bindgen]
    pub fn create_program(
        ctx: &WebGlRenderingContext,
        vertex: &str,
        fragment: &str,
    ) -> WebGlProgram {
       
        let vert_shader =
            compile_shader(ctx, WebGlRenderingContext::VERTEX_SHADER, vertex).unwrap();
        let frag_shader =
            compile_shader(ctx, WebGlRenderingContext::FRAGMENT_SHADER, fragment).unwrap();
        return link_program(ctx, &vert_shader, &frag_shader).unwrap();
    }

    /**
    Memory buffers are used to store array data for visualization.

    This could be colors, or positions, or offsets, or velocities. 
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
    Activate the chosen texture so that GL operations on textures will target it. The
    texture number is [0,...) and can be accessed sequentially by offset.  

    Currently we only support 2D textures, which can be stacked to emulate 3D.
    */
    #[allow(dead_code)]
    #[wasm_bindgen]
    pub fn bind_texture(ctx: &WebGlRenderingContext, texture: WebGlTexture, unit: u32) {
       
        ctx.active_texture(WebGlRenderingContext::TEXTURE0 + unit);
        ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, Some(&texture));
    }

    /**
    Define a 2D array in GPU memory, and bind it for GL operations. 
    */
    #[wasm_bindgen]
    pub fn create_texture(
        ctx: &WebGlRenderingContext,
        data: &ImageData,
        filter: u32,
        _width: i32,
        _height: i32,
    ) -> WebGlTexture {
       
        let texture = ctx.create_texture();
        ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, texture.as_ref());
        ctx.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_S,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        ctx.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_WRAP_T,
            WebGlRenderingContext::CLAMP_TO_EDGE as i32,
        );
        ctx.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MIN_FILTER,
            filter as i32,
        );
        ctx.tex_parameteri(
            WebGlRenderingContext::TEXTURE_2D,
            WebGlRenderingContext::TEXTURE_MAG_FILTER,
            filter as i32,
        );
        ctx.tex_image_2d_with_u32_and_u32_and_image_data(
            WebGlRenderingContext::TEXTURE_2D,
            0,
            WebGlRenderingContext::RGBA as i32,
            WebGlRenderingContext::RGBA as u32,
            WebGlRenderingContext::UNSIGNED_BYTE,
            data,
        )
        .unwrap();
        ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, None);
        return texture.unwrap();
    }
}
