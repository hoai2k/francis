// Shadow map distortion: more resolution near the player.

float distortFactor(vec2 p) {
    return (1.0 - SHADOW_DISTORT) + length(p) * SHADOW_DISTORT;
}

vec3 distortShadow(vec3 p) {
    return vec3(p.xy / distortFactor(p.xy), p.z * 0.25);
}
