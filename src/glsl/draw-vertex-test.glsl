precision mediump float;

/**
 * Particle positions vertex array buffer
 */
attribute float a_index;

/**
 * Handle to particle positions encoded as color texture
 */
uniform sampler2D u_particles;

/**
 * Size of points
 */
uniform float u_point_size;

/**
 * Number of particles, set from JavaScript
 */
uniform float u_particles_res;

/**
 * Particle position available to fragment shader.
 */
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

    gl_PointSize = u_point_size;
    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);
}