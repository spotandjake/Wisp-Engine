// This file contains the code for talking to the default shader on the gpu, it's located here so it's close to the definitions in `default.wesl` as it must stay in sync with it.
import type { Mat4 } from "mv-redux";
import type { ShaderDataDefinitions, StructuredView } from "webgpu-utils";
import { makeStructuredView } from "webgpu-utils";
import { ShaderABI } from "./generic";

/** This class is responsible for managing the binary interface with the GPU. */
export default class DefaultShaderABI extends ShaderABI {
  /** A structured view for the gpu's model struct. */
  private ModelView: Omit<StructuredView, "set"> & {
    set: (data: { matrix: Mat4 }) => void;
  };
  /** The binding group of the default shader. */
  protected BindGroup: GPUBindGroup;
  /** The buffer for the model struct. */
  private ModelBuffer: GPUBuffer;

  constructor(
    device: GPUDevice,
    defs: ShaderDataDefinitions,
    layouts: GPUBindGroupLayout[],
  ) {
    super(device, defs, layouts);
    // Construct our model view
    this.ModelView = makeStructuredView(defs.uniforms.model);
    // Create our buffer
    this.ModelBuffer = device.createBuffer({
      size: this.ModelView.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Construct our actual bind group
    this.BindGroup = device.createBindGroup({
      layout: layouts[1],
      entries: [
        {
          binding: 0,
          resource: { buffer: this.ModelBuffer },
        },
      ],
    });
  }

  public passData(
    device: GPUDevice,
    pass: GPURenderPassEncoder,
    modelMatrix: Mat4,
  ): void {
    // Set the model matrix in the structured view and write it to the GPU buffer
    this.ModelView.set({ matrix: modelMatrix });
    device.queue.writeBuffer(this.ModelBuffer, 0, this.ModelView.arrayBuffer);
    pass.setBindGroup(1, this.BindGroup);
  }
}
