#extension GL_ARB_shader_texture_lod : enable
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
#ifdef TERRAIN
varying vec4 texCoordAM;
varying vec2 localCoord;
#endif

#if defined TERRAIN && defined POM && defined PBR_NORMALS
#define PARALLAX
vec2 atlasCoord(vec2 local) { return fract(local) * texCoordAM.zw + texCoordAM.xy; }

// LabPBR height lives in the normal map's alpha: 1 = surface, 0 = 25% of a block deep.
float heightAt(vec2 local, vec2 dx, vec2 dy) {
    return texture2DGradARB(normals, atlasCoord(local), dx, dy).a;
}
#endif

void main() {
    vec2 uv = texcoord;
    float pomShadow = 1.0;
#ifdef PARALLAX
    vec2 dx = dFdx(texcoord), dy = dFdy(texcoord);
    float dist = length(viewPos);
    float depthScale = 0.25 * POM_DEPTH * (1.0 - smoothstep(POM_DISTANCE * 0.7, POM_DISTANCE, dist));
    bool foliage = blockId > 10000.5 && blockId < 10005.5;
    vec3 T = normalize(tangent), B = normalize(binormal), Nv = normalize(normal);
    vec3 tView = vec3(dot(T, viewPos), dot(B, viewPos), dot(Nv, viewPos)) / max(dist, 1e-4);
    if (depthScale > 0.001 && !foliage && tView.z < -0.02 && texCoordAM.z > 0.0) {
        // March down the view ray until it passes under the height field.
        const float layers = float(POM_SAMPLES);
        vec2 delta = tView.xy / -tView.z * depthScale / layers;
        vec2 coord = localCoord;
        float rayH = 1.0;
        float h = heightAt(coord, dx, dy);
        for (int i = 0; i < POM_SAMPLES; i++) {
            if (h >= rayH) break;
            coord += delta;
            rayH -= 1.0 / layers;
            h = heightAt(coord, dx, dy);
        }
        // Linear refinement between the last two steps.
        vec2 prev = coord - delta;
        float after = h - rayH;
        float before = heightAt(prev, dx, dy) - (rayH + 1.0 / layers);
        float w = clamp(after / (after - before + 1e-5), 0.0, 1.0);
        coord = mix(coord, prev, w);
        uv = atlasCoord(coord);

#if defined POM_SHADOWS && !defined NETHER && !defined END
        // March from the hit toward the light; anything taller blocks it.
        vec3 Lv = normalize(shadowLightPosition);
        vec3 tLight = vec3(dot(T, Lv), dot(B, Lv), dot(Nv, Lv));
        if (tLight.z > 0.0) {
            float h0 = heightAt(coord, dx, dy);
            vec2 sdelta = tLight.xy / tLight.z * depthScale / layers;
            float sh = h0;
            float blocked = 0.0;
            vec2 sc = coord;
            for (int i = 0; i < POM_SAMPLES / 2; i++) {
                sc += sdelta;
                sh += 1.0 / layers;
                if (sh >= 1.0) break;
                blocked = max(blocked, clamp((heightAt(sc, dx, dy) - sh) * layers * 0.5, 0.0, 1.0));
            }
            pomShadow = 1.0 - blocked;
        }
#endif
    }
#define TEX(s) texture2DGradARB(s, uv, dx, dy)
#else
#define TEX(s) texture2D(s, uv)
#endif

    vec4 tex = TEX(texture) * tint;
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
    vec4 nm = TEX(normals);
    vec2 nxy = nm.xy * 2.0 - 1.0;
    if (dot(nxy, nxy) > 1e-5) {
        vec3 tn = vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.0)));
        mat3 tbn = mat3(normalize(tangent), normalize(binormal), geoN);
        N = normalize(tbn * tn);
    }
    m.ao = nm.b > 0.0 ? nm.b : 1.0;
#endif
#ifdef PBR_SPECULAR
    applySpecularMap(m, TEX(specular));
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
    shadow *= pomShadow;
#endif

    vec3 col = shadeSurface(m, viewPos, N, geoN, lmcoord, shadow);

    /* DRAWBUFFERS:01 */
    gl_FragData[0] = vec4(col, tex.a);
    gl_FragData[1] = vec4(N.xy * 0.5 + 0.5, 0.0, 1.0);
}
