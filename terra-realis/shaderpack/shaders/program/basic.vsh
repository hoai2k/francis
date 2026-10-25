// Untextured geometry: block selection outline, leads, debug lines.

varying vec4 tint;
varying vec2 lmcoord;

void main() {
    tint = gl_Color;
    lmcoord = clamp(((gl_TextureMatrix[1] * gl_MultiTexCoord1).xy - 0.03125) * 1.06667, 0.0, 1.0);
    gl_Position = ftransform();
}
