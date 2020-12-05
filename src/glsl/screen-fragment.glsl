precision mediump float;
uniform sampler2D u_screen;  // texture sampler handle
uniform float u_opacity;  // blending value for interleaving the frames
varying vec2 v_tex_pos; 

void main() {
    /*
    Sample a 2D texture to determine the color

    TODO: multiply only alpha channel by opacity uniform.
    */
    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
}