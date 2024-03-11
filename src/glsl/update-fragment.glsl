precision highp float;
uniform sampler2D u_particles;
uniform sampler2D wind;
uniform vec2 u_wind_res;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform float seed;
uniform float speed;
uniform float drop;
uniform float bump;
varying vec2 v_tex_pos;

const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float rand(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}
// bilinear, 4 adjacent pixels
vec2 lookup_wind(const vec2 uv) {
     return texture2D(wind, uv).rg; // lower-res hardware filtering
//    vec2 px = 1.0 / u_wind_res;
//    vec2 vc = (floor(uv * u_wind_res)) * px;
//    vec2 f = fract(uv * u_wind_res);
//    vec2 tl = texture2D(wind, vc).rg;
//    vec2 tr = texture2D(wind, vc + vec2(px.x, 0)).rg;
//    vec2 bl = texture2D(wind, vc + vec2(0, px.y)).rg;
//    vec2 br = texture2D(wind, vc + px).rg;
//    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

void main() {
    vec4 color = texture2D(u_particles, v_tex_pos);
    vec2 pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a
    );
    vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(pos));
    float distortion = cos(radians(pos.y * 180.0 - 90.0));  // take EPSG:4236 distortion into account for calculating where the particle moved
    vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * speed;
    pos = fract(1.0 + pos + offset);

    vec2 seed = (pos + v_tex_pos) * seed;
    float drop = step(1.0 - (drop + length(velocity) / length(u_wind_max) * bump), rand(seed));
    vec2 random_pos = vec2(
        rand(seed + 1.3),
        rand(seed + 2.1)
    );
    pos = mix(pos, random_pos, drop) * 255.0;
    gl_FragColor = vec4(
        fract(pos),
        floor(pos) / 255.0
    );
}