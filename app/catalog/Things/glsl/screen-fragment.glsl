precision mediump float;

/**
 * Texture sampler handle, passed in from JavaScript
 */
uniform sampler2D u_screen;  

/**
 * Blending constant for interleaving the frames.
 * Set externally from JavaScript.
 */
uniform float u_opacity;  

/**
 * Texture sample position calculated in the vertex shader `quad-vertex.glsl`.
 */
varying vec2 v_tex_pos;

/*
 * Sample a 2D texture to determine the color.
 * 
 * Texture sample position set in vertex shader `quad-vertex.glsl`.
 */
void main() {
    gl_FragColor = texture2D(u_screen, 1.0 - v_tex_pos) * u_opacity;
}