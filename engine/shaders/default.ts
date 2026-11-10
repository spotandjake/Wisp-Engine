// This file contains the code for talking to the default shader on the gpu, it's located here so it's close to the definitions in `default.wesl` as it must stay in sync with it.
import type { Mat4 } from "mv-redux";
import type { ShaderInterface, BindGroupInfo } from "./generic";
import { MAT4_SIZE, writeMat4 } from "./generic";

export interface DefaultBindGroupInfo extends BindGroupInfo {
  buffers: {
    modelBuffer: GPUBuffer;
  }
}

export interface DefaultShaderInterface extends ShaderInterface {
  setupBindGroup(device: GPUDevice): DefaultBindGroupInfo;
  passData(
    device: GPUDevice,
    pass: GPURenderPassEncoder,
    defaultBindGroupSetup: DefaultBindGroupInfo,
    modelMatrix: Mat4
  ): void;
}

/** Passes the data to the GPU. */
const passData = (
  // WebGPU Context
  device: GPUDevice,
  pass: GPURenderPassEncoder,
  defaultBindGroupData: DefaultBindGroupInfo,
  // Dynamic Data
  modelMatrix: Mat4
) => {
  const { bindGroup, buffers: { modelBuffer } } = defaultBindGroupData;

  // Pack the model matrix and send it to the GPU
  const rawModelBuffer = new ArrayBuffer(MAT4_SIZE);
  writeMat4(modelMatrix, rawModelBuffer, 0);
  device.queue.writeBuffer(modelBuffer, 0, rawModelBuffer);

  // Bind the bindGroup to the pass
  pass.setBindGroup(1, bindGroup);
}

/** Sets up the bind group for the GPU. */
const setupBindGroup = (device: GPUDevice): DefaultBindGroupInfo => {
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

  return {
    bindGroup,
    bindGroupLayout,
    buffers: {
      modelBuffer
    }
  };
}

const shaderInterface: DefaultShaderInterface = {
  setupBindGroup,
  passData
}
export default shaderInterface; 