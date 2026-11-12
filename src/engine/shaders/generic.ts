// Generic types for shaders and shader ABIs.
import type { ShaderDataDefinitions, StructuredView } from "webgpu-utils";

/** The standard input for a shader ABI. */
export interface StandardShaderAbiInput {
  /** The GPU device to use for rendering. */
  device: GPUDevice;
  /** The definitions for the shader data. */
  defs: ShaderDataDefinitions;
  /** The layouts for the bind groups. */
  layouts: GPUBindGroupLayout[];
  /** The render pass to use for the engine shader. */
  pass: GPURenderPassEncoder;
}

/** A structured view of a specific shader data type. */
export type StructView<T> = Omit<StructuredView, "set"> & {
  set: (data: T) => void;
};
