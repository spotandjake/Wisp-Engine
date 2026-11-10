// This file contains the code for talking to the engine shader on the gpu, it's located here so it's close to the definitions in `engine.wesl` as it must stay in sync with it.


// TODO: I think we need to clean up this file and make it more clear what is going on here
import type { Mat4, Vec3 } from "mv-redux";
import type Light from "../primitives/light";
import type { LightType } from "../primitives/light";
import type { ShaderInterface, BindGroupInfo } from "./generic";
import { MAT4_SIZE, VEC3_SIZE, writeVec3, writeMat4 } from "./generic";

export interface EngineBindGroupInfo extends BindGroupInfo {
  buffers: {
    rendererBuffer: GPUBuffer;
    worldBuffer: GPUBuffer;
    lightBuffer: GPUBuffer;
  }
}

export interface EngineShaderInterface extends ShaderInterface {
  setupBindGroup(device: GPUDevice): EngineBindGroupInfo;
  passData(
    device: GPUDevice,
    pass: GPURenderPassEncoder,
    engineBindGroupSetup: EngineBindGroupInfo,
    lights: [Light, Vec3, Vec3][],
    renderer: RendererData,
    worldMat: Mat4,
  ): void;
}
// TODO: Is this the best place for this to live
export type RendererData = {
  ambientLight: Vec3;
  viewProjection: Mat4;
}

/** The byte size of the light struct. */
const LIGHT_STRUCT_BYTE_SIZE = 64;
/** The byte size of the light buffer header. */
const LIGHT_BUFFER_HEADER_SIZE = 16;
/** The maximum number of lights that can be in the light buffer. */
const MAX_LIGHTS = 64;
/** The size of the light buffer. */
const LIGHT_BUFFER_SIZE = LIGHT_BUFFER_HEADER_SIZE + LIGHT_STRUCT_BYTE_SIZE * MAX_LIGHTS;
/** The size of the renderer buffer. */
const RENDERER_BUFFER_SIZE = 16 + MAT4_SIZE; // ambient_light (16 bytes) + viewProjection (64 bytes)
/** The size of the world buffer. */
const WORLD_BUFFER_SIZE = MAT4_SIZE; // 4x4 matrix of 4 byte values

/** Encodes the light type into a uint32. */
const encodeLightType = (type: LightType): number => {
  switch (type) {
    case "directional":
      return 0;
    case "point":
      return 1;
  }
};

/** Packs the light data into a light buffer */
const packLightData = (lights: [Light, Vec3, Vec3][]): ArrayBuffer => {
  // Construct our buffer
  // NOTE: We use a max_lights here because we want to be able to quickly update the light buffer without having to reallocate it every frame.
  const lightBuffer = new ArrayBuffer(LIGHT_BUFFER_SIZE);
  const view = new DataView(lightBuffer);

  // Write the header
  view.setUint32(0, lights.length, true);
  
  // Write each light to the buffer (up to MAX_LIGHTS)
  for (let i = 0; i < Math.min(lights.length, MAX_LIGHTS); i++) {
    const [light, worldPosition, worldRotation] = lights[i];
    // Compute the byte offset
    let offset = LIGHT_BUFFER_HEADER_SIZE + i * LIGHT_STRUCT_BYTE_SIZE;

    // Write the data to the buffer
    view.setUint32(offset, encodeLightType(light.type), true); // light_type
    view.setFloat32(offset += 4, light.falloff, true); // range
    view.setFloat32(offset += 4, light.intensity, true); // intensity
    offset += 4; // Padding

    // Write the position
    writeVec3(worldPosition, lightBuffer, offset += 4);
    // Write the color
    writeVec3(light.color, lightBuffer, offset += VEC3_SIZE);
    // Write the direction
    writeVec3(worldRotation, lightBuffer, offset += VEC3_SIZE);
  }

  return lightBuffer;
}

/** Packs the renderer data into a buffer. */
const packRendererData = (renderer: RendererData): ArrayBuffer => {
  // Create a buffer for the renderer data
  const buffer = new ArrayBuffer(RENDERER_BUFFER_SIZE);
  const view = new DataView(buffer);

  let offset= 0;
  // Write the ambient light
  view.setFloat32(offset, renderer.ambientLight[0], true);
  view.setFloat32(offset += 4, renderer.ambientLight[1], true);
  view.setFloat32(offset += 4, renderer.ambientLight[2], true);
  // Write the viewProjection matrix
  const viewProjection = renderer.viewProjection.flat();
  for (let i = 0; i < 16; i++) {
    // TODO: Compute these offsets better
    view.setFloat32(16 + i * 4, viewProjection[i], true);
  }

  return buffer;
}

/** Passes the data to the GPU. */
const passData = (
  // WebGPU Context
  device: GPUDevice,
  pass: GPURenderPassEncoder,
  engineBindGroupSetup: EngineBindGroupInfo,
  // Dynamic Data
  lights: [Light, Vec3, Vec3][],
  renderer: RendererData,
  worldMat: Mat4,
) => {
  const { bindGroup, buffers: { rendererBuffer, worldBuffer, lightBuffer } } = engineBindGroupSetup;

  // Pack the renderer data and send it to the GPU
  const rawRendererBuffer = packRendererData(renderer);
  device.queue.writeBuffer(rendererBuffer, 0, rawRendererBuffer);
  // Pack the world matrix and send it to the GPU
  const rawWorldBuffer = new ArrayBuffer(WORLD_BUFFER_SIZE);
  writeMat4(worldMat, rawWorldBuffer, 0);
  device.queue.writeBuffer(worldBuffer, 0, rawWorldBuffer);
  // Pack the light data and send it to the GPU
  const rawLightBuffer = packLightData(lights);
  device.queue.writeBuffer(lightBuffer, 0, rawLightBuffer);

  // Bind the bindGroup to the pass
  pass.setBindGroup(0, bindGroup);
}

/** Sets up the bind group for the GPU. */
const setupBindGroup = (device: GPUDevice): EngineBindGroupInfo => {
  // Create our buffers
  const rendererBuffer = device.createBuffer({
    size: RENDERER_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const worldBuffer = device.createBuffer({
    size: WORLD_BUFFER_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const lightBuffer = device.createBuffer({
    size: LIGHT_BUFFER_SIZE,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Construct our bind group layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      // Renderer
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
        },
      },
      // World
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
        buffer: {
          type: 'uniform',
        },
      },
      // Light Buffer
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
        buffer: {
          type: 'read-only-storage',
        },
      },
    ],
  });
  // Construct our actual bind group
  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: rendererBuffer },
      },
      {
        binding: 1,
        resource: { buffer: worldBuffer },
      },
      {
        binding: 2,
        resource: { buffer: lightBuffer },
      },
    ],
  });

  return {
    bindGroup,
    bindGroupLayout,
    buffers: {
      rendererBuffer,
      worldBuffer,
      lightBuffer,
    }
  };
}

const shaderInterface: EngineShaderInterface = {
  setupBindGroup,
  passData,
}
export default shaderInterface; 