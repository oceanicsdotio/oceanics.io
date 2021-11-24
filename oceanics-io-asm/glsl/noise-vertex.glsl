precision mediump float;

attribute vec2 a_pos;

void main() {
    /*
    ...
    */
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
}