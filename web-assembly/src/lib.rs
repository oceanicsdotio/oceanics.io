use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{WebGlProgram, WebGlRenderingContext, WebGlShader, CanvasRenderingContext2d, ImageData, WebGlBuffer, WebGlTexture};
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use std::f32::consts::{PI};
use std::fmt;
use std::slice;
use std::mem;
use std::os::raw::c_void;


const SERVICE: &str = "api/";
const HOST: &str = "http://localhost/";
const MAPBOX_KEY: &str =
    "pk.eyJ1Ijoib2NlYW5pY3Nkb3RpbyIsImEiOiJjazMwbnRndWkwMGNxM21wYWVuNm1nY3VkIn0.5N7C9UKLKHla4I5UdbOi2Q";


#[wasm_bindgen]
pub fn alloc(size: usize) -> *mut c_void {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    return ptr as *mut c_void;
}

#[wasm_bindgen]
pub fn dealloc(ptr: *mut c_void, cap: usize) {
    unsafe  {
        let _buf = Vec::from_raw_parts(ptr, 0, cap);
    }
}


//#[wasm_bindgen]
//pub fn menu() {
//    /*
//    Generate an entity expansion menu from a database query.
//    */
//    let p = document.getElementById("sub-menu");
//
//    let entries = ["."];
//    let methods = [entity("sub-menu", '${this.url("Ingress", 0)}')`];
//    p.appendChild(list(p, entries, methods, "tool-link"));
//
//    let data = await Context.query(this.host + this.service + "?extension=sensing");
//    p.appendChild(this.dropdown(data));
//}


//#[wasm_bindgen]
//pub fn url(cls: String, identity: String) -> String {
//    /*
//    Convenience method to create basic formatted URL for getting a collection of single resource
//     */
//    let url: String = HOST + &SERVICE + &cls;
//    if identity.len() != 0 {
//        return url + "(" + &identity + ")";
//    } else {
//        return url;
//    }
//}

#[wasm_bindgen]
pub fn tile_url(longitude: f32, latitude: f32, zoom: i8) {
    web_sys::console::log_1(&format!(
        "https://api.mapbox.com/v4/mapbox.satellite/{}/{}/{}{}.pngraw?access_token={}",
        zoom,
        lon_tile(longitude, zoom),
        lat_tile(latitude, zoom),
        "@2x",
        MAPBOX_KEY
    ).into())
}

fn lon_tile(lon: f32, zoom: i8) -> i8 {
    return ((lon + 180.0 ) / 360.0 * 2_f32.powf(zoom as f32)) as i8;
}

fn lat_tile(lat: f32, zoom: i8) -> i8 {
    return ((1.0 - ((lat*PI/180.0).tan() + 1.0 / (lat*PI/180.0).cos()).ln() / PI) / 2.0 * 2_f32.powf(zoom as f32)) as i8;
}


#[wasm_bindgen]
pub fn mouse_move(x: f64, y: f64) {
//    web_sys::console::log_1(&format!("{}, {}", x, y).into());
}

#[wasm_bindgen]
pub fn modify_canvas(ptr: *mut u8, height: usize, width: usize, time: f64) {

    let byte_size = width * height * 4;
    let sl = unsafe { slice::from_raw_parts_mut(ptr, byte_size) };

    let length = sl.len();
    let x = width / 2;
    let y = height / 2;

    for ij in 0..byte_size {
        if ij % 4 == 3 {
            let dx = ij / 4 % width - x;
            let dy = ij / 4 / width - y;

            let distance = ((dx * dx + dy * dy) as f32).sqrt();
            let alpha = (255.0 - distance) / 255.0;
            if distance < 500.0 {
                sl[ij * 4 + 3] = (alpha * alpha * 255.0) as u8;
            } else {
                sl[ij * 4 + 3] = 0;
            }
        }
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

//
//pub fn program_wrapper (ctx: &WebGlRenderingContext, program: &WebGlProgram) -> Object {
//    let wrapper = {program: program};
//    for i in 0..ctx.get_program_parameter(program, WebGlRenderingContext::ACTIVE_ATTRIBUTES) {
//        let attribute = ctx.get_active_attrib(program, i);
//        wrapper[attribute.name] = ctx.get_attrib_location(program, attribute.name);
//    }
//
//    for i in 0..ctx.get_program_parameter(program, WebGlRenderingContext::ACTIVE_UNIFORMS) {
//        let uniform = ctx.get_active_uniform(program, i);
//        wrapper[uniform.name] = ctx.get_uniform_location(program, uniform.name);
//    }
//    return wrapper;
//}


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
pub fn create_texture (ctx: &WebGlRenderingContext, data: &ImageData, filter: u32, width: i32, height: i32) -> WebGlTexture {
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
    );
//    ctx.bind_texture(WebGlRenderingContext::TEXTURE_2D, null);
    return texture.unwrap();
}


//#[wasm_bindgen]
//pub fn create_buffers(ctx: &WebGlRenderingContext, particles: int) -> [WebGlBuffer] {
//    let quad = create_buffer(ctx, &[0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]);
//    let frame = ctx.create_frame_buffer();
//    let index = create_buffer(ctx, (0..particles));
//    return (quad, frame, index)
//}

#[wasm_bindgen]
pub fn triangle(element_id: &str, program: &WebGlProgram) -> Result<(), JsValue> {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(element_id).unwrap();
    let canvas: web_sys::HtmlCanvasElement = canvas.dyn_into::<web_sys::HtmlCanvasElement>()?;

    let ctx = canvas
        .get_context("webgl")?
        .unwrap()
        .dyn_into::<WebGlRenderingContext>()?;

    ctx.use_program(Some(&program));
    let vertices = create_shape();

    let angle = 0.0;
    let radians = angle * PI / 180.0;
    let rotation = (radians.sin(), radians.cos());
    let scale = [1.0, 1.0];
    let width = 2;

    let buffer = create_buffer(&ctx, &vertices);

    {
        let handle = ctx.get_attrib_location(&program, "position");
        ctx.vertex_attrib_pointer_with_i32(handle as u32, 3, WebGlRenderingContext::FLOAT, false, 0, 0);
        ctx.enable_vertex_attrib_array(handle as u32);

        ctx.clear_color(0.0, 0.0, 0.0, 1.0);
        ctx.clear(WebGlRenderingContext::COLOR_BUFFER_BIT);

        ctx.draw_arrays(
            WebGlRenderingContext::TRIANGLES,
            0,
            (vertices.len() / 3) as i32,
        );
    }

    Ok(())
}



fn create_shape() -> [f32; 9] {
    return [-0.7, -0.7, 0.0, 0.7, -0.7, 0.0, 0.0, 0.7, 0.0];
}


#[wasm_bindgen]
pub fn random_series(np: i32) -> Vec<f64> {
    let mut series = vec![0.0; np as usize];
    for ii in 0..np {
        series[ii as usize] = 1.0;
    }
    return series
}


#[wasm_bindgen]
pub fn make_vertex_array (series: Vec<f64>) -> Vec<f64> {

    let mut vertices: Vec<f64> = vec![];
    let points: usize = series.len();
    for (ii, value) in series.iter().enumerate() {
        vertices.push( 2.0 * ii as f64 / (points-1) as f64 - 1.0 ); // x
        vertices.push( *value ); // y
    }
    return vertices;
}


// Creates a 3D torus in the XY plane
fn make_torus(r: f32, sr: f32, k: i32, n: i32, sn: i32) -> Vec<f32> {
    let mut tv: Vec<f32> = vec![];
    for i in 0..n {
        for j in 0..(sn + 1*((i==n) as i32 - 1)) {
            for v in 0..2 {
                let a: f32 =  2.0*PI*((i+j/(sn+k)*v) as f32)/(n as f32);
                let sa: f32 = 2.0*PI*(j as f32)/(sn as f32);
                tv.push((r + sr * sa.cos()) * a.cos());
                tv.push((r + sr * sa.cos()) * a.sin());
                tv.push(sr * sa.sin());
            }
        }
    }
    return tv
}


fn rotate(angle: f32, delta: f32) -> f32 {
    return ((angle + delta) % 360.0) * 2.0*PI/360.0;
}

// Returns a transformation matrix as a flat array with 16 components
fn transformation_matrix (ox: f32, oy: f32, oz: f32, rx: f32, ry: f32, rz: f32, s: f32, d: f32, f: f32, n: f32, ar: f32) -> [f32; 16] {

    let cx = rx.cos();
    let sx = rx.sin();
    let cy = ry.cos();
    let sy = ry.sin();
    let cz = rz.cos();
    let sz = rz.sin();
    let A= d;
    let B= (n+f+2.0*d)/(f-n);
    let C= -(d*(2.0*n+2.0*f)+2.0*f*n+2.0*d*d)/(f-n);

    return [
        (cy*cz*s*A)/ar, cy*s*sz*A, -s*sy*B, -s*sy,
        (s*(cz*sx*sy-cx*sz)*A)/ar, s*(sx*sy*sz+cx*cz)*A, cy*s*sx*B, cy*s*sx,
        (s*(sx*sz+cx*cz*sy)*A)/ar, s*(cx*sy*sz-cz*sx)*A, cx*cy*s*B, cx*cy*s,
        (s*(cz*((-oy*sx-cx*oz)*sy-cy*ox)-(oz*sx-cx*oy)*sz)*A)/ar,
        s*(((-oy*sx-cx*oz)*sy-cy*ox)*sz+cz*(oz*sx-cx*oy))*A,
        C+(s*(ox*sy+cy*(-oy*sx-cx*oz))+d)*B, s*(ox*sy+cy*(-oy*sx-cx*oz))+d
    ];
}

fn calculate_rotation(ax: f32, ay: f32, az: f32, dx: f32, dy: f32, dz: f32, aspect: f32) -> [f32; 16] {

    let ax = rotate(ax, dx);
    let ay = rotate(ay, dy);
    let az = rotate(az, dz);
    let ox = 0.0;
    let oy = 0.0;
    let oz = 0.0;
    let s = 0.75;
    let d = 3.0;
    let f = 2.0;
    let n = -1.0;

    return transformation_matrix(ox, oy, oz, ax, ay, az, s, d, f, n, aspect);
}


pub fn make_triangle() -> [f32; 9] {
    return [
        -0.7, -0.7, 0.0,
        0.7, -0.7, 0.0,
        0.0, 0.7, 0.0
    ];
}

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
