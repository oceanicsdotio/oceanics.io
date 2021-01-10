precision mediump float;
uniform sampler2D u_screen;  // texture sampler handle
uniform float u_opacity;  // blending constant for interleaving the frames
varying vec2 v_tex_pos; // texture sample position


/*
 * Sample a 2D texture to determine the color.
 * 
 * Texture sample position set from attribute in vertex shader `quad-vertex.glsl`.
 */
void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);
    gl_FragColor = color * u_opacity;
}