// Generic utilities and constants for gpu communication
import type { Mat4, Vec3, Vec2 } from "mv-redux";

// Types
// =========================
export abstract class ShaderABI {
  public abstract BindGroup: GPUBindGroup;
  public abstract BindGroupLayout: GPUBindGroupLayout;
  constructor(device: GPUDevice) {}
}

// Constants
// =========================

/** The size of a 32-bit float in bytes. */
export const F32_SIZE = 4; // Size of a 32-bit float in bytes
/** The size of a vec2 in bytes. */
export const VEC2_SIZE = 8;
/** The size of a vec3 in bytes. */
export const VEC3_SIZE = 12;
/** The size of a mat4 in bytes. */
export const MAT4_SIZE = 64;

// Encoding and decoding utilities
// =========================

/** Encodes a vec2 into an ArrayBuffer. */
export const writeVec2 = (vec: Vec2, buffer: ArrayBuffer, offset: number): void => {
  const view = new Float32Array(buffer, offset, 2);
  view.set(vec.flat());
}


/** Encodes a vec3 into an ArrayBuffer. */
export const writeVec3 = (vec: Vec3, buffer: ArrayBuffer, offset: number): void => {
  const view = new Float32Array(buffer, offset, 3);
  view.set(vec.flat());
}

/** Encodes a 4x4 matrix into an ArrayBuffer. */
export const writeMat4 = (mat: Mat4, buffer: ArrayBuffer, offset: number): void => {
  const view = new Float32Array(buffer, offset, 16);
  view.set(mat.flat());
}