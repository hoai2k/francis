#include "/lib/settings.glsl"
#include "/lib/common.glsl"

uniform sampler2D texture;

varying vec2 texcoord;
varying vec4 tint;
varying vec3 viewPos;
varying vec3 normal;

void main() {
    vec4 tex = texture2D(texture, texcoord) * tint;
    if (tex.a < 0.01) discard;
    vec3 L = normalize(shadowLightPosition);
    vec3 V = normalize(viewPos);
    float sunH = sunHeight();
    float lit = 0.55 + 0.45 * max(dot(normalize(normal), L), 0.0);
    float silver = pow(max(dot(V, L), 0.0), 8.0);
    vec3 col = directLightColor() * (lit * 0.45 + silver * 0.9) + skyAmbientColor() * 1.4;
    col *= mix(vec3(1.0), vec3(0.55), rainStrength);
    // fade into the sky with distance
    vec3 dir = normalize(mat3(gbufferModelViewInverse) * V);
    float fade = smoothstep(far * 2.5, far * 0.8, length(viewPos));
    vec3 sky = skyColorAt(dir, worldSunDir());
    col = mix(sky, col, fade);
    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(col, tex.a * 0.85);
}
