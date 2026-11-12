// This file contains the code for talking to the engine shader on the gpu, it's located here so it's close to the definitions in `engine.wesl` as it must stay in sync with it.

// TODO: I think we need to clean up this file and make it more clear what is going on here
import type { Mat4, Vec3 } from "mv-redux";
import type { ShaderDataDefinitions, StructuredView } from "webgpu-utils";
import type Light from "../primitives/light";

import { makeStructuredView } from "webgpu-utils";

import { ShaderABI } from "./generic";

// Constants
// TODO: Try and derive this from the array value???
/** The maximum number of lights that can be in the light buffer. */
const MAX_LIGHTS = 64;

// Encoding

// TODO: Is this the best place for this to live
export type RendererData = {
  ambientLight: Vec3;
  cameraPosition: Vec3;
  viewProjection: Mat4;
};

// TODO: Is this the best place for this to live
export type MaterialData = {
  shininess: number;
  use_vertex_colors: boolean;
  use_base_color_texture: boolean;
};

export type GpuLightData = {
  light_type: number;
  range: number;
  intensity: number;
  _padding: number;
  position: Vec3;
  color: Vec3;
  direction: Vec3;
};

/** This class is responsible for managing the binary interface with the GPU. */
export default class EngineShaderABI extends ShaderABI {
  /** A structured view for the gpu's renderer struct. */
  private RendererView: Omit<StructuredView, "set"> & {
    set: (data: {
      ambient_light: Vec3;
      camera_position: Vec3;
      view_projection: Mat4;
    }) => void;
  };
  /** A structured view for the gpu's world struct. */
  private WorldView: Omit<StructuredView, "set"> & {
    set: (data: { matrix: Mat4 }) => void;
  };
  /** A structured view for the gpu's light struct. */
  private LightView: Omit<StructuredView, "set"> & {
    set: (data: { count: number; lights: GpuLightData[] }) => void;
  };
  /** A structured view for the gpu's light struct. */
  private MaterialView: Omit<StructuredView, "set"> & {
    set: (data: {
      shininess: number;
      use_vertex_colors: number;
      use_base_color_texture: number;
    }) => void;
  };

  /** The binding group of the engine shader. */
  protected BindGroup: GPUBindGroup;

  /** The buffer for the renderer struct. */
  private RendererBuffer: GPUBuffer;
  /** The buffer for the world struct. */
  private WorldBuffer: GPUBuffer;
  /** The buffer for the light struct. */
  private LightBuffer: GPUBuffer;
  /** The buffer for the material struct. */
  private MaterialBuffer: GPUBuffer;

  constructor(
    device: GPUDevice,
    defs: ShaderDataDefinitions,
    layouts: GPUBindGroupLayout[],
  ) {
    super(device, defs, layouts);
    // Create our views
    this.RendererView = makeStructuredView(defs.uniforms.renderer);
    this.WorldView = makeStructuredView(defs.uniforms.world);
    this.LightView = makeStructuredView(defs.storages.lightBuffer);
    this.MaterialView = makeStructuredView(defs.uniforms.material);

    // Create our buffers
    this.RendererBuffer = device.createBuffer({
      size: this.RendererView.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.WorldBuffer = device.createBuffer({
      size: this.WorldView.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.LightBuffer = device.createBuffer({
      size: this.LightView.arrayBuffer.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.MaterialBuffer = device.createBuffer({
      size: this.MaterialView.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Construct our actual bind group
    this.BindGroup = device.createBindGroup({
      layout: layouts[0],
      entries: [
        {
          binding: 0,
          resource: { buffer: this.RendererBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this.WorldBuffer },
        },
        {
          binding: 2,
          resource: { buffer: this.LightBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.MaterialBuffer },
        },
      ],
    });
  }

  public passData(
    device: GPUDevice,
    pass: GPURenderPassEncoder,
    lights: [Light, Vec3, Vec3][],
    material: MaterialData,
    renderer: RendererData,
    worldMat: Mat4,
  ): void {
    // Set the renderer data in the structured view and write it to the GPU buffer
    this.RendererView.set({
      ambient_light: renderer.ambientLight,
      camera_position: renderer.cameraPosition,
      view_projection: renderer.viewProjection,
    });
    device.queue.writeBuffer(
      this.RendererBuffer,
      0,
      this.RendererView.arrayBuffer,
    );
    // Set the world matrix in the structured view and write it to the GPU buffer
    this.WorldView.set({ matrix: worldMat });
    device.queue.writeBuffer(this.WorldBuffer, 0, this.WorldView.arrayBuffer);
    // Set the light data in the structured view and write it to the GPU buffer
    const gpuLights = lights
      .slice(0, MAX_LIGHTS)
      .map(([light, position, direction]) => ({
        light_type: light.type,
        range: light.range,
        intensity: light.intensity,
        _padding: 0,
        position,
        color: light.color,
        direction,
      }));
    this.LightView.set({ count: gpuLights.length, lights: gpuLights });
    device.queue.writeBuffer(this.LightBuffer, 0, this.LightView.arrayBuffer);
    // Set the material data in the structured view and write it to the GPU buffer
    this.MaterialView.set({
      shininess: material.shininess,
      use_vertex_colors: material.use_vertex_colors ? 1 : 0,
      use_base_color_texture: material.use_base_color_texture ? 1 : 0,
    });
    device.queue.writeBuffer(
      this.MaterialBuffer,
      0,
      this.MaterialView.arrayBuffer,
    );

    // Bind the bind group to the render pass
    pass.setBindGroup(0, this.BindGroup);
  }
}
