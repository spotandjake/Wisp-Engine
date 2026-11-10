// TODO: Document and improve this shader.

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

@group(0) @binding(0)
var<uniform> camera: Camera;

@group(1) @binding(0)
var<uniform> world: World;

@group(2) @binding(0)
var<uniform> model: Model;

struct VertexInput {
  @location(0) position: vec3<f32>,
};

@vertex
fn vertex_main(input: VertexInput) -> @builtin(position) vec4<f32> {
  return camera.viewProjection *
          world.matrix *
          model.matrix *
          vec4<f32>(input.position, 1.0);
}

@fragment
fn fragment_main() -> @location(0) vec4<f32> {
  // TODO: Add some basic lighting (maybe also add the ability to have dynamic lights in the scene)
  return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}