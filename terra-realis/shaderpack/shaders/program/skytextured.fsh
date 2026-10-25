#include "/lib/settings.glsl"
#include "/lib/common.glsl"

uniform sampler2D texture;

varying vec2 texcoord;
varying vec4 tint;
varying vec3 viewPos;

void main() {
    vec4 tex = texture2D(texture, texcoord) * tint;
    vec3 col = toLinear(tex.rgb);
#if !defined NETHER && !defined END
    bool isSun = dot(normalize(viewPos), normalize(sunPosition)) > 0.9;
    col *= (isSun ? 14.0 * SUN_BRIGHTNESS : 1.6) * (1.0 - rainStrength);
#endif
    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(col, tex.a);
}
