precision mediump float;
uniform sampler2D u_wind;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform sampler2D u_color_ramp;
varying vec2 v_particle_pos;

void main() {
    vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg);
    float speed_t = length(velocity) / length(u_wind_max);
    // color ramp is encoded in a 16x16 texture

    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
}

// #ifdef GL_ES
// precision mediump float;
// #endif

// void main() {
// 	gl_FragColor = vec4(1.0,0.0,1.0,1.0);
// }