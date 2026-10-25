#include "/lib/settings.glsl"
#include "/lib/common.glsl"

varying vec4 tint;
varying vec2 lmcoord;

void main() {
    if (tint.a < 0.01) discard;
    vec3 col = toLinear(tint.rgb) * (0.3 + max(lmcoord.x, lmcoord.y));
    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(col, tint.a);
}
