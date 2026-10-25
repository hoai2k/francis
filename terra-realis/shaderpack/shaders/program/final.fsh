// Bloom, exposure, filmic tonemapping and grading.

/*
const bool colortex0MipmapEnabled = true;
*/

#include "/lib/settings.glsl"
#include "/lib/common.glsl"

uniform sampler2D colortex0;

varying vec2 texcoord;

vec3 acesFilm(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
    vec3 col = texture2D(colortex0, texcoord).rgb;

#ifdef BLOOM
    // Blurred mip levels: wide, soft glow around bright light.
    vec2 px = 1.0 / vec2(viewWidth, viewHeight);
    vec3 bloom = vec3(0.0);
    float wsum = 0.0;
    for (int i = 2; i <= 6; i++) {
        float lod = float(i);
        vec2 o = px * exp2(lod) * 0.75;
        vec3 b = texture2D(colortex0, texcoord + vec2(o.x, o.y), lod).rgb
               + texture2D(colortex0, texcoord + vec2(-o.x, o.y), lod).rgb
               + texture2D(colortex0, texcoord + vec2(o.x, -o.y), lod).rgb
               + texture2D(colortex0, texcoord + vec2(-o.x, -o.y), lod).rgb;
        float w = 1.0 / (1.0 + float(i - 2) * 0.5);
        bloom += b * 0.25 * w;
        wsum += w;
    }
    bloom /= wsum;
    col += (max(bloom - 0.8, 0.0) * 0.10 + bloom * 0.012) * BLOOM_STRENGTH;
#endif

    // Exposure: brighten nights and caves a little, like an eye adapting.
    float eyeSky = eyeBrightnessSmooth.y / 240.0;
    float day = dayFactor(sunHeight());
#if defined NETHER || defined END
    float exposure = 1.6;
#else
    float exposure = mix(3.0, 1.0, eyeSky * mix(0.35, 1.0, day));
    exposure *= mix(1.0, 1.6, rainStrength * eyeSky);
#endif
    col *= exposure * EXPOSURE;

    col = acesFilm(col);
    col = pow(col, vec3(1.0 / 2.2));

    float l = luma(col);
    col = mix(vec3(l), col, SATURATION);

    vec2 c = texcoord - 0.5;
    col *= 1.0 - dot(c, c) * VIGNETTE * 1.6;

    col += (ign(gl_FragCoord.xy) - 0.5) / 255.0;  // dither out banding
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
