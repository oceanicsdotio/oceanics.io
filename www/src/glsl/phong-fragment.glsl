#version 120


varying vec3 normal, lightDir0, lightDir1, ray;
varying vec4 color_base, color_light;

void main() {

    vec3 N = normalize(normal);
    vec4 final_color = (gl_FrontLightModelProduct.sceneColor * color_base);

    final_color += (gl_LightSource[0].ambient * color_base);
    vec3 L0=normalize(lightDir0);
    float lambertTerm0=dot(normal, L0);
    if (lambertTerm0 > 0.0) {

        final_color += gl_LightSource[0].diffuse * color_light * lambertTerm0;
        vec3 E = normalize(ray);
        vec3 R = reflect(-L0, N);
        float specular = pow(max(dot(R, E), 0.0), gl_FrontMaterial.shininess);
        final_color += gl_LightSource[0].specular * gl_FrontMaterial.specular * specular;
    };

    gl_FragColor = final_color;
}



