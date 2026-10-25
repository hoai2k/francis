// Shadow map pass.

#include "/lib/settings.glsl"
#include "/lib/common.glsl"
#include "/lib/distort.glsl"

attribute vec4 mc_Entity;
attribute vec2 mc_midTexCoord;

uniform mat4 shadowModelView;
uniform mat4 shadowModelViewInverse;
uniform mat4 shadowProjection;

varying vec2 texcoord;
varying vec4 tint;

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    tint = gl_Color;
#if defined NETHER || defined END
    gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
    return;
#endif
    // Water casts no shadow; its surface is lit through the composite pass instead.
    if (mc_Entity.x == 10003.0) {
        gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
        return;
    }
    vec4 player = shadowModelViewInverse * (gl_ModelViewMatrix * gl_Vertex);
    vec3 world = player.xyz + cameraPosition;
    bool topVertex = gl_MultiTexCoord0.t < mc_midTexCoord.t;
#ifdef WAVING_PLANTS
    if ((mc_Entity.x == 10001.0 && topVertex) || mc_Entity.x == 10004.0)
        player.xyz += windOffset(world, mc_Entity.x == 10004.0 && topVertex ? 1.6 : 1.0);
#endif
#ifdef WAVING_LEAVES
    if (mc_Entity.x == 10002.0)
        player.xyz += windOffset(world, 0.45);
#endif
    gl_Position = shadowProjection * (shadowModelView * player);
    gl_Position.xyz = distortShadow(gl_Position.xyz);
}
