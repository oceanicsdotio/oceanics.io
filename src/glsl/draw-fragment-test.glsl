precision mediump float;
uniform sampler2D u_wind, u_color_ramp;
uniform vec2 u_wind_min, u_wind_max;
varying vec2 v_particle_pos;



/**
 * Sample the fragment color from the wind texture using the particle position.
 *
 * 
 */
void main() {

    float speed_t = length(mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg)) / 
        length(u_wind_max);

    // color ramp is decoded from a 16x16 texture
    // gl_FragColor = texture2D(
    //     u_color_ramp, 
    //     vec2(fract(16.0 * speed_t), floor(16.0 * speed_t) / 16.0)
    // );

    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
}