// TODO: Document and improve this shader.
// TODO: Thought, why don't we have a `struct RendererInput` which contains all the inputs from the renderer, we can then provide some basic functions for instance computing the lighting from the RendererInput. This would make the shader system far more modular. We can require that this is always bound in group 0 for instance as well and then we can make the lifetimes of the group bindings be something that the renderer itself manages rather than renderable, this should improve performance quite a bit.

struct Camera {
  // NOTE: This is the pre multiplied projectionMatrix * viewMatrix
  viewProjection: mat4x4<f32>,
};

struct World {
  // NOTE: This is the world matrix for the scene (accumulated transforms of all parent objects)
  matrix: mat4x4<f32>,
};

struct Model {
  // NOTE: This is the model matrix (the transform of the object itself)
  matrix: mat4x4<f32>,
};

// Lights within our scene
struct Light {
  // This is the type of light, where 0 = directional, 1 = point
  lightType: u32,
  // The range of the light (for point lights)
  range: f32,
  // The intensity of the light (for point lights)
  intensity: f32,
  // We have padding here to ensure that the struct is aligned to 16 bytes, as required by WebGPU.
  _padding: f32,

  // The position of the light in world space (for point lights)
  position: vec3<f32>,
  color: vec3<f32>,
  direction: vec3<f32>,
};
struct LightBuffer {
  // How many lights exist
  count: u32,
  // The lights themselves
  lights: array<Light>,
};

@group(0) @binding(0)
var<uniform> camera: Camera;

@group(1) @binding(0)
var<uniform> world: World;

@group(2) @binding(0)
var<uniform> model: Model;

@group(3) @binding(0)
var<storage, read> lightBuffer: LightBuffer;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPosition: vec3<f32>,
  @location(1) normal: vec3<f32>,
};

@vertex
fn vertex_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = camera.viewProjection *
                    world.matrix *
                    model.matrix *
                    vec4<f32>(input.position, 1.0);
  output.worldPosition = (world.matrix * model.matrix * vec4<f32>(input.position, 1.0)).xyz;
  output.normal = (world.matrix * model.matrix * vec4<f32>(input.position, 1.0)).xyz;
  return output;
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
  var lighting = vec3<f32>(0.1, 0.1, 0.1);
  var objectColor = vec3<f32>(1.0, 0.0, 0.0);

  // TODO: Better document this
  for (var i = 0u; i < lightBuffer.count; i++) {
    let light = lightBuffer.lights[i];

    var direction: vec3<f32>;
    var attenuation = 1.0;

    switch light.lightType {
      // Directional light
      case 0u: {
        direction = normalize(-light.direction);
      }

      // Point light
      case 1u: {
        let offset = light.position - input.worldPosition;
        let distance = length(offset);

        direction = normalize(offset);
        attenuation = max(1.0 - distance / light.range, 0.0);
      }

      default: {
        continue;
      }
    }

    let diffuse = max(dot(normalize(input.normal), direction), 0.0);

    lighting += light.color * light.intensity * diffuse * attenuation;
  }
  return vec4<f32>(objectColor * lighting, 1.0);
}