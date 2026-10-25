uniform sampler2D texture;

varying vec2 texcoord;
varying vec4 tint;

void main() {
    vec4 c = texture2D(texture, texcoord) * tint;
    if (c.a < 0.1) discard;
    gl_FragData[0] = c;
}
