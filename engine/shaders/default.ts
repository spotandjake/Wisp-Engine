// This file contains the code for talking to the default shader on the gpu, it's located here so it's close to the definitions in `default.wesl` as it must stay in sync with it.
import type { Mat4 } from "mv-redux";
import { ShaderABI, MAT4_SIZE, writeMat4 } from "./generic";

/** This class is responsible for managing the binary interface with the GPU. */
export default class DefaultShaderABI extends ShaderABI {
  public BindGroup: GPUBindGroup;
  public BindGroupLayout: GPUBindGroupLayout;

  public modelBuffer: GPUBuffer;

  constructor(device: GPUDevice) {
    super(device);
    // Create our buffers
    const modelBuffer = device.createBuffer({
      size: MAT4_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Construct our bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        // Renderer
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform',
          },
        }
      ],
    });
    // Construct our actual bind group
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: modelBuffer },
        }
      ],
    });

    // Store the bind group and layout in the class
    this.BindGroup = bindGroup;
    this.BindGroupLayout = bindGroupLayout;
    
    // Store the buffers in the class
    this.modelBuffer = modelBuffer;
  }

  public passData(
    device: GPUDevice,
    pass: GPURenderPassEncoder,
    modelMatrix: Mat4
  ): void {
    // Pack the model matrix and send it to the GPU
    const rawModelBuffer = new ArrayBuffer(MAT4_SIZE);
    writeMat4(modelMatrix, rawModelBuffer, 0);
    device.queue.writeBuffer(this.modelBuffer, 0, rawModelBuffer);

    // Bind the bindGroup to the pass
    pass.setBindGroup(1, this.BindGroup);
  }
}