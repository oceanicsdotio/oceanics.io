precision mediump float;

attribute vec2 a_pos; // receive position from array buffer
varying vec2 v_tex_pos; // pass position to paired fragment shader

/**
 * Vertex shader takes a position vector `a_pos` with both
 * x and y in (0.0, 1.0) and scales and flips it to (-1.0, 1.0)
 */
void main() {
    v_tex_pos = a_pos; // used in fragment shader
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
}