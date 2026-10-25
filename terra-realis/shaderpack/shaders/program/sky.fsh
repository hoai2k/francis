#include "/lib/settings.glsl"
#include "/lib/common.glsl"

varying vec4 starColor;
varying float isStar;

void main() {
    vec2 uv = gl_FragCoord.xy / vec2(viewWidth, viewHeight);
    vec3 view = normalize(screenToView(uv, 1.0));
    vec3 dir = normalize(mat3(gbufferModelViewInverse) * view);
    vec3 col;
#if defined NETHER || defined END
    col = toLinear(fogColor);
#else
    col = skyColorAt(dir, worldSunDir());
    if (isStar > 0.5) {
        float night = 1.0 - dayFactor(sunHeight());
        col += vec3(0.8, 0.85, 1.0) * starColor.r * 3.0 * night * (1.0 - rainStrength);
    }
#endif
    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(col, 1.0);
}
