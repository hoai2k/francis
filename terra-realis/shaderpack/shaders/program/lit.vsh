// Opaque lit geometry: terrain, entities, block entities, hand.
// Wrapper defines one of: TERRAIN, ENTITIES, BLOCK, HAND.

#include "/lib/settings.glsl"
#include "/lib/common.glsl"

attribute vec4 mc_Entity;
attribute vec4 at_tangent;
attribute vec2 mc_midTexCoord;

varying vec2 texcoord;
varying vec2 lmcoord;
varying vec4 tint;
varying vec3 viewPos;
varying vec3 normal;
varying vec3 tangent;
varying vec3 binormal;
varying float blockId;
#ifdef TERRAIN
varying vec4 texCoordAM;   // xy: tile origin in the atlas, zw: tile size
varying vec2 localCoord;   // 0..1 across the tile, for parallax
#endif

void main() {
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord = clamp(((gl_TextureMatrix[1] * gl_MultiTexCoord1).xy - 0.03125) * 1.06667, 0.0, 1.0);
    tint = gl_Color;
    blockId = mc_Entity.x;
#ifdef TERRAIN
    vec2 midCoord = (gl_TextureMatrix[0] * vec4(mc_midTexCoord, 0.0, 1.0)).st;
    vec2 texMinMid = texcoord - midCoord;
    texCoordAM.zw = abs(texMinMid) * 2.0;
    texCoordAM.xy = min(texcoord, midCoord - texMinMid);
    localCoord = sign(texMinMid) * 0.5 + 0.5;
#endif

    normal = normalize(gl_NormalMatrix * gl_Normal);
    tangent = normalize(gl_NormalMatrix * at_tangent.xyz);
    binormal = normalize(gl_NormalMatrix * cross(at_tangent.xyz, gl_Normal) * sign(at_tangent.w + 0.0001));

    vec4 vp = gl_ModelViewMatrix * gl_Vertex;

#ifdef TERRAIN
    vec3 player = (gbufferModelViewInverse * vp).xyz;
    vec3 world = player + cameraPosition;
    bool topVertex = gl_MultiTexCoord0.t < mc_midTexCoord.t;
#ifdef WAVING_PLANTS
    if ((mc_Entity.x == 10001.0 && topVertex) || mc_Entity.x == 10004.0)
        player += windOffset(world, mc_Entity.x == 10004.0 && topVertex ? 1.6 : 1.0);
#endif
#ifdef WAVING_LEAVES
    if (mc_Entity.x == 10002.0)
        player += windOffset(world, 0.45);
#endif
    vp = gbufferModelView * vec4(player, 1.0);
#endif

    viewPos = vp.xyz;
    gl_Position = gl_ProjectionMatrix * vp;
}
