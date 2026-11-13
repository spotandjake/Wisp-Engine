// Import the engine module for the primitives helpers and types
import super::engine::{ 
  renderer,
  apply_fragment_processing
};

// Bind our uniforms
@group(1) @binding(0)
var<uniform> model: Model;

/** The attributes of the model itself. */
struct Model {
  /** The model matrix in world space. */
  modelMatrix: mat4x4<f32>,
  /** The normal matrix in world space. */
  normalMatrix: mat3x3<f32>
};

// Setup our vertex shader
/** The input to the vertex shader. */
struct VertexInput {
  /** The position of the vertex in object space. */
  @location(0) position: vec3<f32>,
  /** The normal of the vertex in object space. */
  @location(1) normal: vec3<f32>,
  /** An optional vertex color */
  @location(2) color: vec4<f32>,
  /** An optional vertex uv */
  @location(3) uv: vec2<f32>,
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
  @location(2) color: vec4<f32>,
  /** The uv coordinates of the vertex. */
  @location(3) uv: vec2<f32>,
};

/** The vertex shader, takes a VertexInput and returns a VertexOutput. */
@vertex
fn vertex_main(input: VertexInput) -> VertexOutput {
  // Compute the position
  let world_position = model.modelMatrix * vec4<f32>(input.position, 1.0);
  let clip_position = renderer.view_projection * world_position;
  let normal = normalize(model.normalMatrix * input.normal);
  // Pack our output 
  var output: VertexOutput;
  output.position = clip_position;
  output.worldPosition = world_position.xyz;
  output.normal = normal;
  output.color = input.color;
  output.uv = input.uv;

  return output;
}

/** The fragment shader, takes a VertexOutput and returns a color. */
@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4<f32> {
  return apply_fragment_processing(
    input.worldPosition,
    input.normal,
    input.uv,
    input.color
  );
}