// This file contains shader attributes and structs that are shared between every shader in the engine.
// These are separated into their own file so that we can easily include them in every shader without having to copy and paste them into every shader file.

// NOTE: This shader expects the following assumptions from the host application:
@group(0) @binding(0)
var<uniform> renderer: Renderer;
@group(0) @binding(1)
var<uniform> world: World;
@group(0) @binding(2)
var<storage, read> lightBuffer: LightBuffer;
@group(0) @binding(3)
var<uniform> material: Material;

// Lighting datatype's
// =========================
/** The type of a light in our scene. */
alias Light_Type = u32; // 0 = directional, 1 = point
const LIGHT_TYPE_DIRECTIONAL: u32 = 0u;
const LIGHT_TYPE_POINT: u32 = 1u;
/** A specific light within our scene. */
struct Light {
  /** The specific type of the light, modifies the behavior of the light */
  light_type: Light_Type,
  /** The range of the light (for point lights) */
  range: f32,
  /** The intensity of the light (for point lights) */
  intensity: f32,
  /** We have padding here to ensure that the struct is aligned to 16 bytes, as required by WebGPU. */
  _padding: f32,

  /** The position of the light in world space (for point lights) */
  position: vec3<f32>,
  /** The color/hue of our light */
  color: vec3<f32>,
  /** The direction of the light (for directional lights) */
  direction: vec3<f32>,
}
/** A buffer containing all the lights in the scene. */
struct LightBuffer {
  // How many lights exist
  count: u32,
  // The lights themselves
  lights: array<Light, 64>,
};

/**
 * A material for a 3D object.
 * 
 * NOTE: If both `use_vertex_colors` and `use_base_color_texture` are true then the vertex colors 
 * will be multiplied by the base color texture to get the final color of the fragment.
 * NOTE: If neither `use_vertex_colors` or `use_base_color_texture` are true then the fragment color 
 * will be white (1, 1, 1, 1) and the object will be lit by the lights in the scene.
 */
struct Material {
  // Blinn-Phong properties
  shininess: f32,
  /** Whether to use vertex colors. (1 = true, 0 = false) */
  use_vertex_colors: u32,
  /** Whether to use a base color texture. (1 = true, 0 = false) */
  use_base_color_texture: u32,
}

// Renderer related datatypes
// =========================
/** Common renderer related attributes. */
struct Renderer {
  /** The ambient light in the scene. */
  ambient_light: vec3<f32>,
  /** The position of the camera in the scene. */
  camera_position: vec3<f32>,
  /** The view projection matrix of the camera. */
  view_projection: mat4x4<f32>,
}

// World related datatypes
// =========================
/** The world attributes for the scene. */
struct World {
  /** The world matrix for the scene (accumulated transforms of all parent objects) */
  matrix: mat4x4<f32>,
}

/**
 * A basic implementation of Blinn-Phong diffuse lighting.
 * 
 * If a consumer want's to add lighting to their fragment shader they can call this function and multiply 
 * the result by their fragment color to get a basic lighting effect.
 * 
 * @param worldPosition The world position of the fragment.
 * @param normal The normal of the fragment.
 * @returns The lighting factor to apply to the fragment color, in the range [0, 1].
 */
fn apply_fragment_lighting(
  worldPosition: vec3<f32>,
  normal: vec3<f32>
) -> vec3<f32> {
  // NOTE: This is a very basic implementation of Blinn-Phong lighting, and does not take into account many factors such as specular highlights, shadows, material properties, etc.
  var lighting = renderer.ambient_light;

  // Normalize our normal and compute the view direction from the camera to the fragment.
  let N = normalize(normal);
  let V = normalize(renderer.camera_position - worldPosition);

  // Iterate over the lights in the scene
  for (var i = 0u; i < lightBuffer.count; i++) {
    // Get the light from the buffer
    let light = lightBuffer.lights[i];

    var L: vec3<f32>;
    var attenuation = 1.0;

    // Compute the light direction and attenuation based on the light type
    switch (light.light_type) {
      // Directional lights have a direction, but no position, and do not attenuate with distance.
        case LIGHT_TYPE_DIRECTIONAL: {
          L = normalize(-light.direction);
        }
        case LIGHT_TYPE_POINT: {
          // Point lights have a position, and attenuate with distance.
          let offset = light.position - worldPosition;
          let distance = length(offset);
          // If the distance is very small, we can skip this light to avoid division by zero and other artifacts.
          if (distance < 0.0001) {
            continue;
          }

          // Compute the light direction from the fragment to the light, and normalize it.
          L = offset / distance;

          // Compute the attenuation based on the distance from the light to the fragment, using a simple squared falloff.
          // NOTE: Different curves can be used for different effects, such as linear falloff, inverse square falloff, etc. This is a very basic implementation, and can be improved upon in many ways.
          attenuation = pow(
            max(1.0 - distance / light.range, 0.0),
            2.0
          );
        }
        // If we do not recognize the light type we just skip it for now, as we don't know how to handle it.
        default: {
          continue;
        }
    }
    // Compute the diffuse and specular lighting for this light, based on the Blinn-Phong reflection model.
    // https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_reflection_model
    let ndotl = max(dot(N, L), 0.0);
    let diffuse = ndotl;
    var specular = 0.0;
    if (ndotl > 0.0) {
      // Only compute the specular lighting if the light is actually hitting the surface, as we don't want to have specular highlights on the back side of objects.
      let H = normalize(L + V);

      specular = pow(
        max(dot(N, H), 0.0),
        material.shininess
      );
    }

    lighting += light.color * light.intensity * attenuation * (diffuse + specular);
  }

  // Clamp the lighting to the range [0, 1] to avoid over-brightening the scene.
  return clamp(lighting, vec3<f32>(0.0), vec3<f32>(1.0));
}