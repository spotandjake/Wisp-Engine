// Import the engine module for the primitives helpers and types
import super::engine::{ renderer, world, apply_fragment_lighting };

// Bind our uniforms
@group(1) @binding(0)
var<uniform> model: Model;

/** The attributes of the model itself. */
struct Model {
  /** The model matrix (the transform of the object itself) */
  matrix: mat4x4<f32>
};

// Setup our vertex shader
/** The input to the vertex shader. */
struct VertexInput {
  /** The position of the vertex in object space. */
  @location(0) position: vec3<f32>,
  /** The normal of the vertex in object space. */
  @location(1) normal: vec3<f32>,
};
/** The output of the vertex shader. */
struct VertexOutput {
  /** The position of the vertex in clip space. */
  @builtin(position) position: vec4<f32>,
  /** The position of the vertex in world space (for lighting)). */
  @location(0) worldPosition: vec3<f32>,
  /** The normalized normal of the vertex (for lighting). */
  @location(1) normal: vec3<f32>,
  /** The color of the vertex. */
  @location(2) color: vec3<f32>,
};

/** The vertex shader, takes a VertexInput and returns a VertexOutput. */
@vertex
fn vertex_main(input: VertexInput) -> VertexOutput {
  // TODO: Consider moving some of this stuff to a function in the engine to avoid duplication across shaders.
  // Compute the position
  let world_model_position = world.matrix * model.matrix;
  let world_position = world_model_position * vec4<f32>(input.position, 1.0);
  let clip_position = renderer.view_projection * world_position;
  let normal = normalize(world_model_position * vec4<f32>(input.normal, 0.0)).xyz;
  // Pack our output 
  var output: VertexOutput;
  output.position = clip_position;
  output.worldPosition = world_position.xyz;
  output.normal = normal;
  output.color = vec3<f32>(1.0, 0.5, 1.0);

  return output;
}

/** The fragment shader, takes a VertexOutput and returns a color. */
@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
  // Use the engine to compute the lighting
  let lighting = apply_fragment_lighting(input.worldPosition, normalize(input.normal));
  // Apply the lighting to the scene
  return vec4<f32>(input.color * lighting, 1.0);
}