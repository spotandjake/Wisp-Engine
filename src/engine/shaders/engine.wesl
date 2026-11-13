// This file contains shader attributes and structs that are shared between every shader in the engine.
// These are separated into their own file so that we can easily include them in every shader without having to copy and paste them into every shader file.

// NOTE: This shader expects the following assumptions from the host application:
@group(0) @binding(0)
var<uniform> renderer: Renderer;
@group(0) @binding(1)
var<storage, read> lightBuffer: LightBuffer;
@group(0) @binding(2)
var<uniform> material: Material;
@group(0) @binding(3)
var base_texture: texture_2d<f32>;
@group(0) @binding(4)
var base_sampler: sampler;

// Renderer
// =========================
/** Common renderer related attributes. */
struct Renderer {
  /** The ambient light in the scene. */
  scene_ambient: vec3<f32>,
  /** The position of the camera in the scene. */
  camera_position: vec3<f32>,
  /** The view projection matrix of the camera. */
  view_projection: mat4x4<f32>,
}


// Lighting
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
  /** The ambient color of the light */
  ambient_color: vec4<f32>,
  /** The diffuse color of the light */
  diffuse_color: vec4<f32>,
  /** The specular color of the light */
  specular_color: vec4<f32>,

  /** The position of the light in world space (for point lights) */
  position: vec3<f32>,
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

/** A material for a 3D object. */
struct Material {
  /** The ambient color of the material. */
  ambient_color: vec4<f32>,
  /** The diffuse color of the material. */
  diffuse_color: vec4<f32>,
  /** The specular color of the material. */
  specular_color: vec4<f32>,
  /** How shiny the material is. */
  shininess: f32,
   /** Weather or not the material has a texture. */
  has_texture: u32,
};

struct LightingComponents {
  diffuse_light: vec3<f32>,
  specular_light: vec3<f32>,
}


fn compute_lighting(material: Material, worldPosition: vec3<f32>, normal: vec3<f32>) -> LightingComponents {
  let viewPosition = renderer.camera_position;

  // Blinn-Phong lighting model
  var diffuseLighting = renderer.scene_ambient * material.ambient_color.rgb;
  var specularLighting = vec3<f32>(0.0);
  let n = normalize(normal);                          // Surface normal
  let v = normalize(viewPosition - worldPosition);   // Position -> View
  for (var i = 0u; i < lightBuffer.count; i++) {
    let light = lightBuffer.lights[i];

    var l: vec3<f32> = vec3<f32>(0.0); // Light direction
    var attenuation = 1.0;
    // Different light types have different properties, so we need to handle them differently.
    switch (light.light_type) {
      // Directional lights have a direction but no distance falloff.
      case LIGHT_TYPE_DIRECTIONAL: {
        l = normalize(-light.direction);
        attenuation = light.intensity;
      }
      // Point lights have a position, and attenuate with distance.
      case LIGHT_TYPE_POINT: {
        let offset = light.position - worldPosition;
        let distanceSquared = max(dot(offset, offset), 0.01);
        let distance = sqrt(distanceSquared);
        // Compute the light direction from the fragment to the light, and normalize it.
        l = offset / distance;
        // Compute the attenuation based on the distance to the light, and the light's intensity.
        let normalizedDistance = distance / light.range;
        let rangeFalloff = max(1.0 - normalizedDistance * normalizedDistance, 0.0);
        attenuation = light.intensity * rangeFalloff / distanceSquared;
      }
      default: {
        // If the light type is not recognized, we can skip this light to avoid artifacts.
        continue;
      }
    }

    // Compute the diffuse and specular lighting for this light, based on the Blinn-Phong reflection model.
    let Kd = max(dot(l, n), 0.0);
    let ambient = light.ambient_color.rgb * material.ambient_color.rgb;
    let diffuse = Kd * light.diffuse_color.rgb;
    var specular = vec3<f32>(0.0);
    if (Kd > 0.0) {
      let h = normalize(l + v);
      let Ks = pow(max(dot(h, n), 0.0), material.shininess);
      specular = Ks * light.specular_color.rgb * material.specular_color.rgb;
    }

    diffuseLighting += attenuation * (ambient + diffuse);
    specularLighting += attenuation * specular;
  }

  var lightingComponents: LightingComponents;
  lightingComponents.diffuse_light = diffuseLighting;
  lightingComponents.specular_light = specularLighting;

  return lightingComponents;
}

/**
 * A basic fragment processing function that correctly applies lighting and tone mapping to 
 * a fragment. This function is intended to be used by consumers of the engine who want to
 *  add lighting to their fragment shader without having to implement their own lighting 
 * model.
 * 
 * @param worldPosition The world position of the fragment.
 * @param normal The normal of the fragment.
 * @returns The lighting factor to apply to the fragment color, in the range [0, 1].
 */
fn apply_fragment_processing(
  worldPosition: vec3<f32>,
  normal: vec3<f32>,
  uv: vec2<f32>,
  vertexColor: vec4<f32>,
) -> vec4<f32> {
  // Compute the lighting
  let lighting = compute_lighting(material, worldPosition, normal);
  // Get the texture color if needed
  var textureColor = vec4<f32>(1.0);
  if (material.has_texture == 1u) {
    textureColor = textureSample(base_texture, base_sampler, uv);
  }

  // Compute the final color of the fragment based on the material properties
  let surfaceColor = material.diffuse_color * vertexColor * textureColor;
  let hdrColor = surfaceColor.rgb * lighting.diffuse_light + lighting.specular_light;

  // Apply tone mapping to the final color
  let mappedRgb = hdrColor / (hdrColor + vec3<f32>(1.0));
  return vec4<f32>(mappedRgb, surfaceColor.a);
}