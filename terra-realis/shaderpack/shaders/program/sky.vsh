// Sky dome (gbuffers_skybasic): replaces the vanilla gradient with an analytic sky.

varying vec4 starColor;
varying float isStar;

void main() {
    starColor = gl_Color;
    isStar = float(gl_Color.r == gl_Color.g && gl_Color.g == gl_Color.b && gl_Color.r > 0.0);
    gl_Position = ftransform();
}
