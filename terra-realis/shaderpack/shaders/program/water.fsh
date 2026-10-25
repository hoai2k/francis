#include "/lib/settings.glsl"
#include "/lib/common.glsl"
#include "/lib/lighting.glsl"

uniform sampler2D texture;
uniform sampler2D normals;
uniform sampler2D specular;

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 tint;
varying vec3 viewPos;
varying vec3 normal;
varying vec3 tangent;
varying vec3 binormal;
varying float isWater;

void main() {
    vec3 geoN = normalize(normal);
    if (!gl_FrontFacing) geoN = -geoN;
    vec3 playerPos = viewToPlayer(viewPos);
    vec3 worldGeoN = mat3(gbufferModelViewInverse) * geoN;
    vec3 V = -normalize(viewPos);

    vec3 col;
    float alpha;
    vec3 N = geoN;
    float mask;

    if (isWater > 0.5) {
#ifdef WATER_WAVES
        if (abs(worldGeoN.y) > 0.5) {
            vec2 wp = playerPos.xz + cameraPosition.xz;
            float strength = 0.11 * WATER_WAVE_HEIGHT * exp(-length(playerPos) * 0.012);
            vec3 wn = waterNormal(wp, strength);
            wn.y *= sign(worldGeoN.y);
            N = normalize(mat3(gbufferModelView) * wn);
        }
#endif
        vec3 waterTint = toLinear(tint.rgb);
        vec3 scatter = waterTint * vec3(0.30, 0.55, 0.55) + vec3(0.0, 0.02, 0.025);
        vec3 ambient = vec3(0.0);
#if defined NETHER || defined END
        ambient = vec3(0.08);
#else
        ambient = skyAmbientColor() * lmcoord.y * lmcoord.y + directLightColor() * 0.06 * lmcoord.y;
#endif
        ambient += torchColor() * pow(lmcoord.x, 2.6);
        col = scatter * ambient * 0.5;
        alpha = WATER_ALPHA;

        vec3 spec = vec3(0.0);
#if !defined NETHER && !defined END
        vec3 L = normalize(shadowLightPosition);
        float NdotL = max(dot(N, L), 0.0);
        if (NdotL > 0.0) {
            float shadow = getShadow(playerPos, worldGeoN, NdotL);
            vec3 F = fresnelSchlick(max(dot(normalize(V + L), V), 0.0), vec3(0.02));
            spec = F * ggxSpecular(N, V, L, 0.05) * NdotL * directLightColor() * shadow;
        }
#endif
        // premultiplied: the blend multiplies by alpha, so the highlight stays full strength
        col += min(spec, vec3(60.0)) / alpha;
        mask = 0.6 + 0.4 * lmcoord.y;
    } else {
        vec4 tex = texture2D(texture, texcoord) * tint;
        if (tex.a < 0.01) discard;
        Material m = defaultMaterial(toLinear(tex.rgb));
#ifdef PBR_NORMALS
        vec4 nm = texture2D(normals, texcoord);
        vec2 nxy = nm.xy * 2.0 - 1.0;
        if (dot(nxy, nxy) > 1e-5) {
            mat3 tbn = mat3(normalize(tangent), normalize(binormal), geoN);
            N = normalize(tbn * vec3(nxy, sqrt(max(1.0 - dot(nxy, nxy), 0.0))));
        }
#endif
#ifdef PBR_SPECULAR
        applySpecularMap(m, texture2D(specular, texcoord));
#endif
        m.roughness = min(m.roughness, 0.3);
        float shadow = 1.0;
#if !defined NETHER && !defined END
        vec3 L = normalize(shadowLightPosition);
        float NdotL = dot(geoN, L);
        if (NdotL > 0.0) shadow = getShadow(playerPos, worldGeoN, NdotL);
#endif
        col = shadeSurface(m, viewPos, N, geoN, lmcoord, shadow);
        alpha = tex.a;
        mask = 0.2 + 0.2 * lmcoord.y;
    }

    /* DRAWBUFFERS:01 */
    gl_FragData[0] = vec4(col, alpha);
    gl_FragData[1] = vec4(N.xy * 0.5 + 0.5, mask, 1.0);
}
