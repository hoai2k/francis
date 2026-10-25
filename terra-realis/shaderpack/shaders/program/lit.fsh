#include "/lib/settings.glsl"
#include "/lib/common.glsl"
#include "/lib/lighting.glsl"

uniform sampler2D texture;
uniform sampler2D normals;
uniform sampler2D specular;
#ifdef ENTITIES
uniform vec4 entityColor;
#endif

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 tint;
varying vec3 viewPos;
varying vec3 normal;
varying vec3 tangent;
varying vec3 binormal;
varying float blockId;

void main() {
    vec4 tex = texture2D(texture, texcoord) * tint;
    if (tex.a < 0.1) discard;
#ifdef ENTITIES
    tex.rgb = mix(tex.rgb, entityColor.rgb, entityColor.a);
#endif

    Material m = defaultMaterial(toLinear(tex.rgb));
    vec3 geoN = normalize(normal);
    if (!gl_FrontFacing) geoN = -geoN;
    vec3 N = geoN;

#if defined TERRAIN || defined BLOCK || defined ENTITIES
#ifdef PBR_NORMALS
    vec4 nm = texture2D(normals, texcoord);
    vec2 nxy = nm.xy * 2.0 - 1.0;
    if (dot(nxy, nxy) > 1e-5) {
        vec3 tn = vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.0)));
        mat3 tbn = mat3(normalize(tangent), normalize(binormal), geoN);
        N = normalize(tbn * tn);
    }
    m.ao = nm.b > 0.0 ? nm.b : 1.0;
#endif
#ifdef PBR_SPECULAR
    applySpecularMap(m, texture2D(specular, texcoord));
#endif
#endif

#ifdef TERRAIN
    // Light-emitting blocks without an emission map glow by brightness.
    if (blockId == 10005.0 && m.emission == 0.0)
        m.emission = smoothstep(0.35, 0.9, luma(tex.rgb)) * 0.6;
    // Foliage without an SSS map still lets light through.
    if ((blockId == 10001.0 || blockId == 10002.0 || blockId == 10004.0) && m.sss == 0.0)
        m.sss = 0.6;
#endif

    vec3 playerPos = viewToPlayer(viewPos);
    vec3 worldGeoN = mat3(gbufferModelViewInverse) * geoN;

#if defined TERRAIN && defined RAIN_PUDDLES && !defined NETHER && !defined END
    // Wet surfaces: darker albedo, near-mirror smoothness on upward faces.
    float wetUp = smoothstep(0.7, 0.95, worldGeoN.y) * smoothstep(0.85, 0.95, lmcoord.y);
    float puddle = smoothstep(0.45, 0.75, 1.0 - m.ao + 0.55 * sin((playerPos.x + cameraPosition.x) * 0.31) * sin((playerPos.z + cameraPosition.z) * 0.27));
    float wet = wetness * mix(0.45, 1.0, puddle) * wetUp;
    m.albedo *= 1.0 - 0.45 * wet;
    m.roughness = mix(m.roughness, 0.03, wet);
    m.F0 = mix(m.F0, max(m.F0, vec3(0.02)), wet);
    N = normalize(mix(N, geoN, wet * puddle));
#endif

    float shadow = 1.0;
#if !defined NETHER && !defined END
    vec3 L = normalize(shadowLightPosition);
    float NdotL = dot(geoN, L);
    if (NdotL > 0.0 || m.sss > 0.0)
        shadow = getShadow(playerPos, worldGeoN, clamp(NdotL, 0.0, 1.0));
#endif

    vec3 col = shadeSurface(m, viewPos, N, geoN, lmcoord, shadow);

    /* DRAWBUFFERS:01 */
    gl_FragData[0] = vec4(col, tex.a);
    gl_FragData[1] = vec4(N.xy * 0.5 + 0.5, 0.0, 1.0);
}
