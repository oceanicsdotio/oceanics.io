precision mediump float;
attribute float a_index;
uniform sampler2D u_particles;
uniform float u_particles_res;
varying vec2 v_particle_pos;


/**
 * Decode color to position
 */
vec2 decode(vec4 color) {
    return color.rg / 255.0 + color.ba;
}

/**
 * Sample the colors from the particles texture and decode them into 
 * a vertex position.
 */
void main() {
    vec4 color = texture2D(u_particles, vec2(
        fract(a_index / u_particles_res),
        floor(a_index / u_particles_res) / u_particles_res
    ));

    v_particle_pos = decode(color);

    gl_PointSize = 0.5;
    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);
}