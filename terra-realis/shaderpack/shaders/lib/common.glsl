// Shared uniforms, colour helpers, sky model and wind/wave functions.

uniform mat4 gbufferModelView;
uniform mat4 gbufferModelViewInverse;
uniform mat4 gbufferProjection;
uniform mat4 gbufferProjectionInverse;
uniform vec3 cameraPosition;
uniform vec3 sunPosition;
uniform vec3 shadowLightPosition;
uniform vec3 upPosition;
uniform vec3 fogColor;
uniform float rainStrength;
uniform float wetness;
uniform float frameTimeCounter;
uniform float viewWidth;
uniform float viewHeight;
uniform float near;
uniform float far;
uniform int isEyeInWater;
uniform ivec2 eyeBrightnessSmooth;

const float PI = 3.14159265;

vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float ign(vec2 p) {
    // interleaved gradient noise, used to dither sample patterns
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 viewToPlayer(vec3 v) { return mat3(gbufferModelViewInverse) * v + gbufferModelViewInverse[3].xyz; }

vec3 screenToView(vec2 uv, float depth) {
    vec4 v = gbufferProjectionInverse * vec4(vec3(uv, depth) * 2.0 - 1.0, 1.0);
    return v.xyz / v.w;
}

// Sun height: 1 at noon, 0 at the horizon, -1 at midnight.
float sunHeight() { return dot(normalize(sunPosition), normalize(upPosition)); }
float dayFactor(float sunH) { return smoothstep(-0.06, 0.18, sunH); }

vec3 sunlightColor(float sunH) {
    vec3 low = vec3(1.0, 0.42, 0.14);
    vec3 high = vec3(1.0, 0.92, 0.80);
    vec3 c = mix(low, high, smoothstep(0.0, 0.45, sunH));
    return c * 3.2 * SUN_BRIGHTNESS * smoothstep(-0.02, 0.10, sunH);
}

vec3 moonlightColor(float sunH) {
    return vec3(0.42, 0.55, 0.85) * 0.10 * smoothstep(0.02, -0.10, sunH);
}

// Colour of the light that casts the shadow map (sun by day, moon by night).
vec3 directLightColor() {
    float sunH = sunHeight();
    vec3 c = sunH > 0.0 ? sunlightColor(sunH) : moonlightColor(sunH);
    return c * (1.0 - rainStrength * 0.88);
}

vec3 skyAmbientColor() {
    float sunH = sunHeight();
    float day = dayFactor(sunH);
    vec3 dayC = vec3(0.30, 0.42, 0.62) * 0.95;
    vec3 night = vec3(0.020, 0.028, 0.050);
    vec3 c = mix(night, dayC, day);
    c = mix(c, vec3(luma(c)) * 0.75, rainStrength * 0.7);
    return c;
}

// Physically-inspired analytic sky. dir and sunDir are world-space unit vectors.
vec3 skyColorAt(vec3 dir, vec3 sunDir) {
    float sunH = sunDir.y;
    float day = dayFactor(sunH);
    float up = max(dir.y, 0.0);
    float horizon = pow(1.0 - up, 4.0);

    vec3 zenithDay = vec3(0.10, 0.27, 0.72);
    vec3 horizonDay = vec3(0.58, 0.74, 0.98);
    vec3 zenithNight = vec3(0.003, 0.006, 0.016);
    vec3 horizonNight = vec3(0.010, 0.016, 0.032);
    vec3 col = mix(mix(zenithNight, horizonNight, horizon), mix(zenithDay, horizonDay, horizon) * 1.5, day);

    float sd = max(dot(dir, sunDir), 0.0);
    float twilight = 1.0 - smoothstep(0.0, 0.32, abs(sunH + 0.03));
    vec3 sunsetCol = vec3(1.25, 0.42, 0.10);
    col += sunsetCol * twilight * pow(1.0 - up, 5.0) * (0.25 + 0.75 * pow(sd, 3.0)) * 1.6;
    col += sunlightColor(max(sunH, 0.0)) * (pow(sd, 10.0) * 0.18 + pow(sd, 120.0) * 0.6) * smoothstep(-0.1, 0.05, sunH);

    // ground below the horizon
    float below = smoothstep(0.0, -0.25, dir.y);
    col = mix(col, col * vec3(0.35, 0.36, 0.38), below);

    float g = luma(col);
    col = mix(col, vec3(g) * vec3(0.9, 0.95, 1.0) * 0.65, rainStrength * 0.85);
    return col;
}

vec3 worldSunDir() { return normalize(mat3(gbufferModelViewInverse) * sunPosition); }

// Wind sway for plants and leaves (world-space position in, offset out).
vec3 windOffset(vec3 wp, float amount) {
    float t = frameTimeCounter * WAVE_SPEED;
    float gust = 0.6 + 0.4 * sin(t * 0.35 + wp.x * 0.05 + wp.z * 0.04);
    float strength = amount * gust * (1.0 + rainStrength * 1.5);
    vec3 o;
    o.x = sin(t * 1.7 + wp.x * 0.6 + wp.z * 0.3) * 0.55 + sin(t * 3.3 + wp.x * 1.4 + wp.y * 0.8) * 0.2;
    o.z = sin(t * 1.3 + wp.z * 0.7 + wp.x * 0.25) * 0.45 + sin(t * 2.9 + wp.z * 1.2 + wp.y) * 0.2;
    o.y = sin(t * 2.1 + wp.x + wp.z) * 0.08;
    return o * strength * 0.07;
}

// Sum of directional waves; returns height in roughly -1..1.
float waterHeight(vec2 p) {
    float t = frameTimeCounter;
    float h = 0.0;
    h += sin(dot(p, vec2(0.82, 0.57)) * 0.85 + t * 1.10) * 0.50;
    h += sin(dot(p, vec2(-0.48, 0.88)) * 1.45 + t * 1.55) * 0.30;
    h += sin(dot(p, vec2(0.97, -0.24)) * 2.70 + t * 2.10) * 0.16;
    h += sin(dot(p, vec2(-0.21, -0.98)) * 4.30 + t * 2.70) * 0.09;
    h += sin(dot(p, vec2(0.66, 0.75)) * 7.10 + t * 3.60) * 0.05;
    h += sin(dot(p, vec2(-0.90, 0.43)) * 11.3 + t * 4.40) * 0.03;
    return h;
}

vec3 waterNormal(vec2 p, float strength) {
    const float e = 0.04;
    float dx = (waterHeight(p + vec2(e, 0.0)) - waterHeight(p - vec2(e, 0.0))) / (2.0 * e);
    float dz = (waterHeight(p + vec2(0.0, e)) - waterHeight(p - vec2(0.0, e))) / (2.0 * e);
    return normalize(vec3(-dx * strength, 1.0, -dz * strength));
}
