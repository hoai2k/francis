// Defines: UNLIT (emissive, e.g. spider eyes, beacon beam, glint), WEATHER.
#include "/lib/settings.glsl"
#include "/lib/common.glsl"

uniform sampler2D texture;

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 tint;

void main() {
    vec4 tex = texture2D(texture, texcoord) * tint;
    if (tex.a < 0.01) discard;
    vec3 albedo = toLinear(tex.rgb);
    vec3 col;
#ifdef UNLIT
    col = albedo * 3.0;
#else
    vec3 light = vec3(1.0, 0.56, 0.24) * 2.2 * TORCH_BRIGHTNESS * pow(lmcoord.x, 2.6) + vec3(0.02);
  #if defined NETHER
    light += toLinear(fogColor) * 0.6 + 0.06;
  #elif defined END
    light += vec3(0.12, 0.10, 0.16);
  #else
    light += (skyAmbientColor() + directLightColor() * 0.35) * lmcoord.y * lmcoord.y;
  #endif
    col = albedo * light;
#endif
#ifdef WEATHER
    tex.a *= 0.45;
#endif
    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(col, tex.a);
}
