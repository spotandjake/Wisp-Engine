// Import the engine module for the primitives helpers and types
import super::engine::{ 
  renderer,
  world,
  material,
  base_texture,
  base_sampler,
  apply_fragment_lighting
};

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
  let world_model_position = world.matrix * model.matrix;
  let world_position = world_model_position * vec4<f32>(input.position, 1.0);
  let clip_position = renderer.view_projection * world_position;
  let normal = normalize(world_model_position * vec4<f32>(input.normal, 0.0)).xyz;
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
  // Use the engine to compute the lighting
  let lighting = apply_fragment_lighting(
    input.worldPosition, 
    normalize(input.normal)
  );
  // Get the texture color if needed
  var texture_color = vec4<f32>(1.0);
  if (material.has_texture == 1u) {
    texture_color = textureSample(
      base_texture,
      base_sampler,
      input.uv
    );
  }

  // Compute the final color of the fragment based on the material properties
  let color = material.base_color * input.color * texture_color;
 
  // Apply the lighting
  let final_color = color * vec4<f32>(lighting, 1.0);
  // Apply the lighting to the scene
  return final_color;
}