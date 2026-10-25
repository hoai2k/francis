// Particles, rain/snow, beacon beams, glints and other simple textured geometry.

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 tint;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord = clamp(((gl_TextureMatrix[1] * gl_MultiTexCoord1).xy - 0.03125) * 1.06667, 0.0, 1.0);
    tint = gl_Color;
    gl_Position = ftransform();
}
