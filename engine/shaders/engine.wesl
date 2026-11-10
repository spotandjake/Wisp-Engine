// This file contains shader attributes and structs that are shared between every shader in the engine.
// These are separated into their own file so that we can easily include them in every shader without having to copy and paste them into every shader file.

// NOTE: This shader expects the following assumptions from the host application:
@group(0) @binding(0)
var<uniform> renderer: Renderer;
@group(0) @binding(1)
var<uniform> world: World;
@group(0) @binding(2)
var<storage, read> lightBuffer: LightBuffer;

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
  // Padding to get 16 byte alignment
  _padding0: u32,
  _padding1: u32,
  _padding2: u32,
  // The lights themselves
  lights: array<Light>,
};

// Renderer related datatypes
// =========================
/** Common renderer related attributes. */
struct Renderer {
  /** The ambient light in the scene. */
  ambient_light: vec3<f32>,
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
 * A basic implementation of Lambertian diffuse lighting.
 * 
 * If a consumer want's to add lighting to their fragment shader they can call this function and multiply 
 * the result by their fragment color to get a basic lighting effect.
 * 
 * @param worldPosition The world position of the fragment.
 * @param normal The normal of the fragment.
 * @returns The lighting color to apply to the fragment.
 */
fn apply_fragment_lighting(worldPosition: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
  // NOTE: This is a very basic implementation, and does not take into account many factors such as specular highlights, shadows, etc.
  // NOTE: This also isn't the most performant way todo lighting as we need to iterate over all the lights in the scene for every fragment, but this is a good starting point for a basic lighting implementation.

  // This is the base amount of ambient light in our scene.
  var lighting = renderer.ambient_light;

  // Go through all the lights in our scene and apply their lighting to the fragment.
  for (var i = 0u; i < lightBuffer.count; i++) {
    // Get the light from the light buffer
    let light = lightBuffer.lights[i];

    var direction: vec3<f32>;
    var attenuation = 1.0;

    switch (light.light_type) {
      case LIGHT_TYPE_DIRECTIONAL: {
        // The light direction is the opposite of the light's direction, as we want to know where the light is coming from.
        direction = normalize(-light.direction);
      }
      case LIGHT_TYPE_POINT: {
        // Compute the distance from the light to the fragment, and use that to compute the attenuation of the light's intensity based on the distance.
        let offset = light.position - worldPosition;
        let distance = length(offset);

        // The light direction is the direction from the fragment to the light, as we want to know where the light is coming from.
        direction = normalize(offset);
        // TODO: Protect against divide by zero

        // We apply a falloff to the light's intensity based on the distance from the light to the fragment, using a simple squared falloff. This is a very basic implementation, and can be improved upon in many ways.
        attenuation = pow(
          max(1.0 - distance / light.range, 0.0),
          2.0
        );
      }
      // Default case, we don't know what type of light this is, so we just skip it.
      default: {
        continue;
      }
    }

    // Compute the specific diffuse lighting for this light, based on the Lambertian reflectance model.
    // https://en.wikipedia.org/wiki/Lambertian_reflectance
    let diffuse = max(dot(normal, direction), 0.0);

    // Apply the lighting from this light to the total lighting for this fragment, taking into account the light's color, intensity, and attenuation.
    lighting += light.color * light.intensity * diffuse * attenuation;
  }
  
  // Ensure that the lighting is clamped between 0 and 1, as we don't want to have negative lighting or lighting that is too bright.
  return clamp(lighting, vec3<f32>(0.0, 0.0, 0.0), vec3<f32>(1.0, 1.0, 1.0));
}