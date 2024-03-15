#version 120

varying vec3 normal, ray;
varying vec4 color_base, color_light;
varying vec3 lightDir0;


void main() {

    color_base = vec4(3.0*gl_Vertex[2], 0, 5.0*gl_Vertex[2], 1.0);
    color_light = vec4(5.0*gl_Vertex[2], 0, 3.0*gl_Vertex[2], 1.0);
    normal = gl_NormalMatrix * gl_Normal;

    vec3 view_vertex = vec3(gl_ModelViewMatrix * gl_Vertex);
    lightDir0 = vec3(gl_LightSource[0].position.xyz - view_vertex);

    ray = -view_vertex;
    gl_Position = gl_ProjectionMatrix * gl_ModelViewMatrix * gl_Vertex;

}
