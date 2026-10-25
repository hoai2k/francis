// Shadow mapping and the PBR surface model. Include after common.glsl.

uniform sampler2DShadow shadowtex0;
uniform mat4 shadowModelView;
uniform mat4 shadowProjection;

#include "/lib/distort.glsl"

const vec2 poisson[12] = vec2[12](
    vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457),
    vec2(-0.203, 0.621), vec2(0.962, -0.195), vec2(0.473, -0.480),
    vec2(0.519, 0.767), vec2(0.185, -0.893), vec2(0.507, 0.064),
    vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598)
);

// playerPos: camera-relative world position. worldN: geometric world normal.
float getShadow(vec3 playerPos, vec3 worldN, float NdotL) {
    float dist = length(playerPos);
    float fade = smoothstep(shadowDistance * 0.8, shadowDistance * 0.98, dist);
    if (fade >= 1.0) return 1.0;

    vec4 clip = shadowProjection * (shadowModelView * vec4(playerPos, 1.0));
    float f = distortFactor(clip.xy);
    // normal offset, sized to the (distorted) shadow texel at this spot
    float texel = 2.0 * shadowDistance / float(shadowMapResolution) * f;
    vec3 offsetPos = playerPos + worldN * texel * (1.2 + 1.5 * (1.0 - NdotL));
    clip = shadowProjection * (shadowModelView * vec4(offsetPos, 1.0));
    vec3 sp = distortShadow(clip.xyz) * 0.5 + 0.5;
    sp.z -= 0.00008;

    float radius = SHADOW_SOFTNESS * 1.6 / float(shadowMapResolution) / max(f, 0.15);
    float a = ign(gl_FragCoord.xy) * 2.0 * PI;
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    float s = 0.0;
    for (int i = 0; i < 12; i++) {
        vec2 o = rot * poisson[i] * radius;
        s += shadow2D(shadowtex0, vec3(sp.xy + o, sp.z)).r;
    }
    s /= 12.0;
    return mix(s, 1.0, fade);
}

vec3 fresnelSchlick(float cosT, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosT, 5.0);
}

float ggxSpecular(vec3 N, vec3 V, vec3 L, float roughness) {
    vec3 H = normalize(V + L);
    float NdotH = max(dot(N, H), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float NdotV = max(dot(N, V), 0.001);
    float a2 = roughness * roughness;
    float d = NdotH * NdotH * (a2 - 1.0) + 1.0;
    float D = a2 / (PI * d * d);
    float k = roughness * 0.5;
    float G = (NdotL / (NdotL * (1.0 - k) + k)) * (NdotV / (NdotV * (1.0 - k) + k));
    return D * G / max(4.0 * NdotL * NdotV, 0.001);
}

vec3 metalF0(float id, vec3 albedo) {
    if (id < 230.5) return vec3(0.56, 0.57, 0.58);  // iron
    if (id < 231.5) return vec3(1.00, 0.71, 0.29);  // gold
    if (id < 232.5) return vec3(0.91, 0.92, 0.92);  // aluminium
    if (id < 233.5) return vec3(0.55, 0.56, 0.55);  // chrome
    if (id < 234.5) return vec3(0.95, 0.64, 0.54);  // copper
    if (id < 235.5) return vec3(0.63, 0.63, 0.63);  // lead
    if (id < 236.5) return vec3(0.67, 0.64, 0.60);  // platinum
    if (id < 237.5) return vec3(0.95, 0.93, 0.88);  // silver
    return albedo;
}

struct Material {
    vec3 albedo;     // linear
    float roughness;
    vec3 F0;
    float metal;
    float ao;
    float sss;
    float emission;
};

Material defaultMaterial(vec3 albedo) {
    Material m;
    m.albedo = albedo;
    m.roughness = 0.85;
    m.F0 = vec3(0.04);
    m.metal = 0.0;
    m.ao = 1.0;
    m.sss = 0.0;
    m.emission = 0.0;
    return m;
}

// Decode the LabPBR 1.3 specular map.
void applySpecularMap(inout Material m, vec4 s) {
    m.roughness = clamp(pow(1.0 - s.r, 2.0), 0.02, 1.0);
    float g = s.g * 255.0;
    if (g > 229.5) {
        m.metal = 1.0;
        m.F0 = metalF0(g, m.albedo);
    } else {
        m.F0 = vec3(s.g);
    }
    float b = s.b * 255.0;
    m.sss = b > 64.5 ? (b - 65.0) / 190.0 : 0.0;
    float e = s.a * 255.0;
    m.emission = e < 254.5 ? e / 254.0 : 0.0;
}

vec3 torchColor() { return vec3(1.0, 0.56, 0.24) * 2.2 * TORCH_BRIGHTNESS; }

// N: shading normal (view), geoN: vertex normal (view), lm: block/sky light 0..1
vec3 shadeSurface(Material m, vec3 viewPos, vec3 N, vec3 geoN, vec2 lm, float shadowAmount) {
    vec3 V = -normalize(viewPos);
    vec3 up = normalize(upPosition);
    vec3 diffuseAlbedo = m.albedo * (1.0 - m.metal);
    vec3 col = vec3(0.0);

#if defined NETHER
    vec3 amb = toLinear(fogColor) * 0.6 + vec3(0.06, 0.045, 0.035);
    col += diffuseAlbedo * amb * m.ao;
#elif defined END
    col += diffuseAlbedo * vec3(0.10, 0.08, 0.14) * m.ao;
#else
    vec3 L = normalize(shadowLightPosition);
    float NdotL = max(dot(N, L), 0.0);
    float geoL = smoothstep(-0.02, 0.12, dot(geoN, L));
    vec3 light = directLightColor() * shadowAmount * smoothstep(0.0, 0.25, lm.y + 0.05);

    // direct diffuse + specular
    vec3 F = fresnelSchlick(max(dot(normalize(V + L), V), 0.0), m.F0);
    col += diffuseAlbedo * (1.0 - F) * NdotL * geoL * light;
    col += F * ggxSpecular(N, V, L, max(m.roughness, 0.04)) * NdotL * geoL * light;

    // subsurface (leaves, grass, snow): light passing through thin surfaces
    float back = pow(max(dot(-V, L), 0.0), 6.0);
    col += diffuseAlbedo * m.sss * light * (0.25 + 1.5 * back) * 0.5;

    // sky ambient with a little directionality
    float skyL = lm.y * lm.y;
    float hemi = 0.55 + 0.45 * dot(N, up);
    vec3 skyAmb = skyAmbientColor() * skyL * hemi;
    col += diffuseAlbedo * skyAmb * m.ao;
    // cheap ambient specular so glossy and metal surfaces pick up the sky
    vec3 Fa = fresnelSchlick(max(dot(N, V), 0.0), m.F0);
    col += Fa * skyAmb * 1.4 * (1.0 - m.roughness) * m.ao;
#endif

    // block light (torches etc.) and a faint floor so caves are never pitch black
    float bl = pow(lm.x, 2.6);
    col += diffuseAlbedo * torchColor() * bl * m.ao;
    col += diffuseAlbedo * vec3(0.012, 0.012, 0.016) * m.ao;
    col += m.albedo * m.emission * 6.0;
    return col;
}
