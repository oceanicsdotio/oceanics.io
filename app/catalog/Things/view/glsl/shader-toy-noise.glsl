#define NUM_OCTAVES 6
#define TIME_SCALE 1.0
#define AMPLITUDE 0.5  // 0.5 is default, higher saturates
#define LACUNARITY 2.0  // 2.0 is default, lower is smooth, higher introduces speckling
#define GAIN 0.4

float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm ( in vec2 st) {
    float v = 0.0;
    
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += AMPLITUDE * pow(GAIN, float(i)) * noise(st);
        st = rot * st * LACUNARITY;
    }
    return v;
}

float quilez_pattern( in vec2 p, float time )
{
    vec2 q = vec2( fbm( p + vec2(0.0,0.0) ),
                   fbm( p + vec2(5.2,1.3) ) );

    vec2 r = vec2( fbm( p + 4.0*q + vec2(1.7,9.2) + time ),
                   fbm( p + 4.0*q + vec2(8.3,2.8) + time) );

    return fbm( p + 4.0*r );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    vec2 st = fragCoord.xy / vec2(32, 32) * 3.0;
    float time = iTime * TIME_SCALE;

    float f = quilez_pattern(st, time);

    fragColor = vec4(f*0.8, f*0.9, 0.8*f, f);
}