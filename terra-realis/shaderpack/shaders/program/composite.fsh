// Water depth absorption, reflections, atmospheric fog and godrays.

/*
const int colortex0Format = RGBA16F;
const int colortex1Format = RGBA16;
const bool colortex1Clear = true;
const vec4 colortex1ClearColor = vec4(0.5, 0.5, 0.0, 1.0);
*/

#include "/lib/settings.glsl"
#include "/lib/common.glsl"

uniform sampler2D colortex0;
uniform sampler2D colortex1;
uniform sampler2D depthtex0;
uniform sampler2D depthtex1;

varying vec2 texcoord;

vec3 decodeNormal(vec2 e) {
    vec2 xy = e * 2.0 - 1.0;
    return vec3(xy, sqrt(max(1.0 - dot(xy, xy), 0.0)));
}

vec2 viewToScreen(vec3 v) {
    vec4 c = gbufferProjection * vec4(v, 1.0);
    return c.xy / c.w * 0.5 + 0.5;
}

#ifdef REFLECTIONS
// Screen-space ray march against the opaque depth buffer.
bool traceReflection(vec3 start, vec3 dir, out vec2 hitUV) {
    float stepLen = 0.25 + 0.02 * length(start);
    vec3 pos = start + dir * stepLen * ign(gl_FragCoord.xy + 7.0);
    for (int i = 0; i < 28; i++) {
        vec3 prev = pos;
        pos += dir * stepLen;
        stepLen *= 1.28;
        vec2 uv = viewToScreen(pos);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 || pos.z > -near) return false;
        float d = texture2D(depthtex1, uv).r;
        if (d >= 1.0) continue;
        float sceneZ = screenToView(uv, d).z;
        if (pos.z < sceneZ && sceneZ - pos.z < stepLen * 1.5 + 0.5) {
            // refine
            vec3 a = prev, b = pos;
            for (int j = 0; j < 5; j++) {
                vec3 m = (a + b) * 0.5;
                vec2 muv = viewToScreen(m);
                float mz = screenToView(muv, texture2D(depthtex1, muv).r).z;
                if (m.z < mz) b = m; else a = m;
            }
            hitUV = viewToScreen(b);
            return true;
        }
    }
    return false;
}
#endif

void main() {
    vec3 col = texture2D(colortex0, texcoord).rgb;
    float depth0 = texture2D(depthtex0, texcoord).r;
    float depth1 = texture2D(depthtex1, texcoord).r;
    vec4 data = texture2D(colortex1, texcoord);

    vec3 view0 = screenToView(texcoord, depth0);
    vec3 dirView = normalize(view0);
    vec3 dirWorld = normalize(mat3(gbufferModelViewInverse) * dirView);
    float dist0 = length(view0);

#if !defined NETHER && !defined END
    vec3 sunDir = worldSunDir();
#endif

    float mask = data.b;
    bool water = mask > 0.55;
    bool glass = !water && mask > 0.15;

    // ---- water body: refraction, caustics, absorption over depth, shore foam ----
    if (water && isEyeInWater == 0) {
        float skyLight = clamp((mask - 0.6) / 0.4, 0.0, 1.0);
        vec2 uv = texcoord;
#ifdef WATER_REFRACTION
        {
            // bend the view by how far the wave normal leans from flat water
            vec3 N = decodeNormal(data.rg);
            vec3 flatN = normalize(upPosition);
            if (abs(dot(N, flatN)) < 0.5) flatN = N;
            vec2 lean = (N - flatN * sign(dot(N, flatN))).xy;
            float d1 = depth1 >= 1.0 ? far : length(screenToView(texcoord, depth1));
            float th = clamp((d1 - dist0) * 0.4, 0.0, 1.0);
            vec2 ruv = texcoord + lean * 0.06 * th / max(1.0, dist0 * 0.06);
            if (ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0 && texture2D(colortex1, ruv).b > 0.55
                && texture2D(depthtex1, ruv).r > depth0)
                uv = ruv;
        }
        col = texture2D(colortex0, uv).rgb;
#endif
        float d1uv = texture2D(depthtex1, uv).r;
        vec3 view1 = screenToView(uv, d1uv);
        float dist1 = d1uv >= 1.0 ? far : length(view1);
        float thickness = max(dist1 - dist0, 0.0);
        vec3 absorb = exp(-thickness * vec3(0.55, 0.20, 0.16));
#if defined NETHER || defined END
        vec3 deepCol = vec3(0.005, 0.02, 0.025);
        vec3 surfLight = vec3(0.12);
#else
        vec3 deepCol = vec3(0.004, 0.03, 0.04) * (skyAmbientColor() * 2.0 + directLightColor() * 0.1) * skyLight;
        vec3 surfLight = skyAmbientColor() * skyLight * 1.2 + directLightColor() * 0.45 * skyLight;
#ifdef WATER_CAUSTICS
        if (d1uv < 1.0) {
            // Sunlight reaching the bed: dimmed and tinted by the water above it,
            // focused into a moving caustic net.
            vec3 surfW = viewToPlayer(view0) + cameraPosition;
            vec3 bedW = viewToPlayer(view1) + cameraPosition;
            vec3 Lw = normalize(mat3(gbufferModelViewInverse) * shadowLightPosition);
            float dh = max(surfW.y - bedW.y, 0.0);
            float path = dh / max(Lw.y, 0.25);
            vec3 lightT = exp(-path * vec3(0.45, 0.12, 0.09));
            float c = caustics(bedW.xz + Lw.xz * path);
            float sunVis = clamp(luma(directLightColor()) * 0.6, 0.0, 1.0) * skyLight;
            col *= mix(vec3(1.0), lightT * (0.4 + 1.8 * c * exp(-dh * 0.15)), 0.75 * sunVis);
        }
#endif
#endif
        col = col * absorb + deepCol * (1.0 - absorb);
#ifdef WATER_FOAM
        {
            vec3 w0 = viewToPlayer(view0) + cameraPosition;
            float edge = smoothstep(0.7, 0.0, thickness);
            float fn = vnoise(w0.xz * 3.0 + frameTimeCounter * 0.25) * 0.6 + vnoise(w0.xz * 9.0 - frameTimeCounter * 0.4) * 0.4;
            float foam = edge * smoothstep(0.55, 0.75, fn + edge * 0.45);
            col = mix(col, vec3(0.85) * surfLight, foam * 0.9);
        }
#endif
    }

    // ---- reflections on water and glass ----
    if ((water || glass) && isEyeInWater == 0 && depth0 < 1.0) {
        vec3 N = decodeNormal(data.rg);
        vec3 R = reflect(dirView, N);
        float skyLight = water ? clamp((mask - 0.6) / 0.4, 0.0, 1.0) : clamp((mask - 0.2) / 0.2, 0.0, 1.0);
        float F0 = water ? 0.02 : 0.04;
        float fres = F0 + (1.0 - F0) * pow(1.0 - clamp(dot(N, -dirView), 0.0, 1.0), 5.0);
#if defined NETHER || defined END
        vec3 refl = toLinear(fogColor) * 0.5;
#else
        vec3 Rw = normalize(mat3(gbufferModelViewInverse) * R);
        Rw.y = abs(Rw.y);
        vec3 refl = skyColorAt(Rw, sunDir) * smoothstep(0.0, 0.6, skyLight);
#endif
#ifdef REFLECTIONS
        vec2 hit;
        if (traceReflection(view0, R, hit)) {
            vec2 e = smoothstep(0.0, 0.08, hit) * smoothstep(1.0, 0.92, hit);
            refl = mix(refl, texture2D(colortex0, hit).rgb, e.x * e.y);
        }
#endif
        col = mix(col, refl, fres * (glass ? 0.6 : 1.0));
    }

    // ---- fog ----
    if (isEyeInWater == 1) {
#if defined WATER_CAUSTICS && !defined NETHER && !defined END
        if (depth0 < 1.0) {
            vec3 wp = viewToPlayer(view0) + cameraPosition;
            float sunVis = clamp(luma(directLightColor()) * 0.6, 0.0, 1.0) * (eyeBrightnessSmooth.y / 240.0);
            col *= 1.0 + caustics(wp.xz) * 0.8 * sunVis * exp(-dist0 * 0.05);
        }
#endif
        vec3 waterFog = vec3(0.01, 0.06, 0.08) * (eyeBrightnessSmooth.y / 240.0 * 0.9 + 0.1);
#if !defined NETHER && !defined END
        waterFog *= skyAmbientColor() * 2.5 + directLightColor() * 0.2;
#endif
        float d = depth0 >= 1.0 ? far : dist0;
        float f = 1.0 - exp(-d * 0.085);
        col = col * exp(-d * vec3(0.20, 0.06, 0.05)) * (1.0 - f) + waterFog * f;
    } else if (isEyeInWater == 2) {
        col = mix(col, vec3(1.5, 0.35, 0.05), 1.0 - exp(-dist0 * 0.9));
    } else if (depth0 < 1.0) {
#if defined NETHER
        vec3 fogC = toLinear(fogColor) * 0.6;
        float f = 1.0 - exp(-dist0 * 0.012 * FOG_DENSITY);
        f = max(f, smoothstep(far * 0.5, far, dist0));
#elif defined END
        vec3 fogC = vec3(0.04, 0.03, 0.06);
        float f = 1.0 - exp(-dist0 * 0.006 * FOG_DENSITY);
#else
        vec3 fogC = skyColorAt(dirWorld, sunDir);
        float eyeSky = eyeBrightnessSmooth.y / 240.0;
        float density = (0.0022 + rainStrength * 0.012) * FOG_DENSITY;
        // thicker haze in the lowlands, thinner up high
        float h = (viewToPlayer(view0).y + cameraPosition.y);
        density *= mix(1.6, 0.6, smoothstep(62.0, 140.0, h));
        float f = (1.0 - exp(-dist0 * density)) * mix(0.25, 1.0, eyeSky);
        f = max(f, smoothstep(far * 0.72, far, dist0));
#endif
        col = mix(col, fogC, clamp(f, 0.0, 1.0));
    }

#if defined GODRAYS && !defined NETHER && !defined END
    // ---- crepuscular rays: march toward the light, counting open sky ----
    vec4 lightClip = gbufferProjection * vec4(shadowLightPosition, 1.0);
    if (lightClip.w > 0.0 && isEyeInWater != 2) {
        vec2 lightUV = lightClip.xy / lightClip.w * 0.5 + 0.5;
        const int STEPS = 20;
        vec2 delta = (lightUV - texcoord) / float(STEPS);
        float jitter = ign(gl_FragCoord.xy);
        float open = 0.0;
        for (int i = 0; i < STEPS; i++) {
            vec2 uv = texcoord + delta * (float(i) + jitter);
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
            open += step(1.0, texture2D(depthtex0, uv).r);
        }
        open /= float(STEPS);
        vec2 aspect = vec2(viewWidth / viewHeight, 1.0);
        float falloff = exp(-length((texcoord - lightUV) * aspect) * 2.2);
        float facing = max(dot(dirView, normalize(shadowLightPosition)), 0.0);
        vec3 rays = directLightColor() * open * falloff * (0.25 + 0.75 * facing) * 0.32 * GODRAY_STRENGTH;
        if (isEyeInWater == 1) rays *= vec3(0.2, 0.7, 0.8);
        col += rays * (1.0 - rainStrength * 0.7);
    }
#endif

    /* DRAWBUFFERS:0 */
    gl_FragData[0] = vec4(col, 1.0);
}
