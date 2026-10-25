// Terra Realis Shaders - user settings (shown in the in-game shader options)

// ---- Shadows ----
const int shadowMapResolution = 2048; // [1024 2048 3072 4096 6144 8192]
const float shadowDistance = 128.0; // [64.0 96.0 128.0 160.0 192.0 256.0]
const float shadowDistanceRenderMul = 1.0;
const bool shadowHardwareFiltering = true;
const float sunPathRotation = -30.0; // [-45.0 -40.0 -30.0 -20.0 -10.0 0.0 10.0 20.0 30.0]
const float ambientOcclusionLevel = 0.65; // [0.0 0.25 0.5 0.65 0.8 1.0]
const float drynessHalfLife = 50.0;
const float wetnessHalfLife = 300.0;

#define SHADOW_SOFTNESS 1.0 // [0.5 1.0 1.5 2.0 3.0]
#define SHADOW_DISTORT 0.85

// ---- Materials ----
#define PBR_NORMALS          // LabPBR normal maps
#define PBR_SPECULAR         // LabPBR specular maps (smoothness, F0, metals, SSS, emission)
#define POM                  // parallax occlusion mapping: real-looking depth from the height map
#define POM_DEPTH 1.0 // [0.5 0.75 1.0 1.25 1.5 2.0]
#define POM_SAMPLES 32 // [16 24 32 48 64]
#define POM_DISTANCE 24.0 // [12.0 16.0 24.0 32.0 48.0]
#define POM_SHADOWS          // the relief casts small shadows on itself
#define RAIN_PUDDLES         // surfaces turn wet and glossy in rain
#define WAVING_PLANTS
#define WAVING_LEAVES
#define WAVE_SPEED 1.0 // [0.5 0.75 1.0 1.5 2.0]

// ---- Water ----
#define WATER_WAVES
#define WATER_WAVE_HEIGHT 1.0 // [0.25 0.5 0.75 1.0 1.5 2.0]
#define WATER_ALPHA 0.2 // [0.1 0.15 0.2 0.3 0.5 0.7]
#define REFLECTIONS          // screen-space reflections on water and glass
#define WATER_REFRACTION     // the bottom wobbles through the waves
#define WATER_CAUSTICS       // moving light patterns on the bed
#define WATER_FOAM           // foam where water meets the shore

// ---- Atmosphere ----
#define GODRAYS
#define GODRAY_STRENGTH 1.0 // [0.25 0.5 0.75 1.0 1.5 2.0]
#define FOG_DENSITY 1.0 // [0.0 0.5 1.0 1.5 2.0 3.0]
#define SUN_BRIGHTNESS 1.0 // [0.5 0.75 1.0 1.25 1.5 2.0]
#define TORCH_BRIGHTNESS 1.0 // [0.5 0.75 1.0 1.25 1.5 2.0]

// ---- Camera ----
#define BLOOM
#define BLOOM_STRENGTH 1.0 // [0.0 0.5 1.0 1.5 2.0 3.0]
#define EXPOSURE 1.0 // [0.5 0.7 0.85 1.0 1.2 1.4 1.7 2.0]
#define SATURATION 1.05 // [0.8 0.9 1.0 1.05 1.1 1.2 1.3]
#define VIGNETTE 0.25 // [0.0 0.15 0.25 0.4 0.6]
