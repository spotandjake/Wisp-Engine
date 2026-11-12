// Generic utilities and constants for gpu communication
import type { ShaderDataDefinitions } from "webgpu-utils";

/** The base class for all shader ABIs. */
export abstract class ShaderABI {
  protected abstract BindGroup: GPUBindGroup;
  constructor(
    device: GPUDevice,
    defs: ShaderDataDefinitions,
    layouts: GPUBindGroupLayout[],
  ) {}
  // NOTE: Sadly I don't have a good way of enforcing passData because each shader ABI will have different data to pass, so we just leave it up to the implementer to ensure they are passing the correct data.
}
