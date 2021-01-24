precision highp float;

/**
 * Handle for particle data texture
 */
uniform sampler2D u_particles;

/**
 * Handle for forcing data texture
 */
uniform sampler2D wind;

/**
 * Size of wind image
 */
uniform vec2 u_wind_res;

/**
 * Minimum wind speed, set from JavaScript.
 * Used to calcualte true range
 */
uniform vec2 u_wind_min;

/**
 * Maximum wind speed, set from JavaScript.
 * Used to calcualte true range
 */
uniform vec2 u_wind_max;

/**
 * Seed for random number generation
 */
uniform float seed;

/**
 * Speed scale set from JavaScript
 */
uniform float speed;

/**
 * Diffusion constant set from JavaScript
 */
uniform float diffusivity;

/**
 * Probability of particle randomly re-initializing location
 */
uniform float drop;


/**
 * Texture lookup coordinates set in vertex.
 */
varying vec2 v_tex_pos;

/**
 * Generate a pseudo random number, not really possible
 * in GPU
 */
float rand(const vec2 co) {
    const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}


vec2 decode(vec4 color) {
    return color.rg / 255.0 + color.ba;
}

/**
 * bilinear, 4 adjacent pixels
 */
vec2 lookup_wind(const vec2 pos) {
    //  return texture2D(wind, uv).rg; // lower-res hardware filtering
   vec2 px = 1.0 / u_wind_res;
   vec2 vc = (floor(pos * u_wind_res)) * px;
   vec2 f = fract(pos * u_wind_res);
   vec2 tl = texture2D(wind, vc).rg;
   vec2 tr = texture2D(wind, vc + vec2(px.x, 0)).rg;
   vec2 bl = texture2D(wind, vc + vec2(0, px.y)).rg;
   vec2 br = texture2D(wind, vc + px).rg;
   return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

/**
 * Caclulate motion of particles
 */
void main() {
   
    vec2 pos = decode(texture2D(u_particles, v_tex_pos));
    vec2 rand_vec = (pos + v_tex_pos) * seed;

    // take EPSG:4236 distortion into account for calculating where the particle moved
    vec2 distortion = vec2(1.0/cos(radians(pos.y * 180.0 - 90.0)), -1.0);
    vec2 advection = speed * mix(u_wind_min, u_wind_max, lookup_wind(pos));
    vec2 diffusion = diffusivity * (2.0 * vec2(
        rand(rand_vec),
        rand(rand_vec + 1.7)
    ) - 1.0);
    
    pos = fract(1.0 + pos + (diffusion + advection)*distortion) * 255.0;  // wrap
 
    gl_FragColor = vec4(
        fract(pos),
        floor(pos) / 255.0
    );
}