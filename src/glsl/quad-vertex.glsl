precision mediump float;

/**
 * Receive position from array buffer
 */
attribute vec2 a_pos;

/**
 * Pass position to paired fragment shader
 */
varying vec2 v_tex_pos; 

/**
 * Vertex shader takes a position vector `a_pos` with both
 * x and y in (0.0, 1.0) and scales and flips it to (-1.0, 1.0)
 */
void main() {
    v_tex_pos = a_pos;
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
}