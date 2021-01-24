precision mediump float;

/**
 * Texture handles set in JavaScript with WebGL
 */
uniform sampler2D u_wind, u_color_ramp;

/**
 * Metadata to calculate true range, passed in from JavaScript
 */

uniform vec2 u_wind_min, u_wind_max;  
/**
 * Particle position set in vertex shader
 */
varying vec2 v_particle_pos; 

/**
 * Sample the fragment color from the wind texture using the particle position.
 *
 * Color ramp is decoded from a 16x16 texture
 */
void main() {

    float speed_t = length(mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg)) / 
        length(u_wind_max);
        
    gl_FragColor = texture2D(
        u_color_ramp, 
        vec2(fract(16.0 * speed_t), floor(16.0 * speed_t) / 16.0)
    );
}