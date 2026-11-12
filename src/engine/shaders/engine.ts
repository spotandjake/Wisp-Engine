// This file contains the default shader ABI, which is used to interface with the engine shader. It provides a way to set up the necessary data and resources for rendering objects in the scene, we keep it next to the shader code so that we can keep it in sync with the shader code.
import type { Mat4, Vec3, Vec4 } from "mv-redux";
import type { StructuredView } from "webgpu-utils";
import type { TextureReference } from "../renderer";
import type { StandardShaderAbiInput, StructView } from "./generic";
import type Light from "../primitives/light";
import type Material from "../prototypes/material";

import { makeStructuredView } from "webgpu-utils";

// The bind group index for the engine shader's bind group.
const BIND_GROUP = 0;

// Engine Types
// ============================
export type RendererData = {
  /** The ambient light in the scene. */
  ambient_light: Vec3;
  /** The position of the camera in the scene. */
  camera_position: Vec3;
  /** The view projection matrix of the camera. */
  view_projection: Mat4;
};

type GpuMaterial = {
  /** The base color the material itself. */
  base_color: Vec4;
  /** Weather or not the material has a texture. */
  has_texture: number;
  /** How shiny the material is. */
  shininess: number;
};

type GpuLightData = {
  light_type: number;
  range: number;
  intensity: number;
  position: Vec3;
  color: Vec3;
  direction: Vec3;
};
type GpuLightBufferData = {
  count: number;
  lights: GpuLightData[];
};

// Engine Shader ABI
// ============================
/** The input for the engine shader ABI. */
export interface EngineShaderAbiInput {
  /** The textures to use for the engine shader. */
  textures: Map<TextureReference, GPUTexture>;
  /** The lights in the scene. */
  lights: [Light, Vec3, Vec3][];
  /** The material to use for the engine shader. */
  material: Material;
  /** The renderer data to use for the engine shader. */
  // TODO: It would be nice if we just passed the renderer in????
  renderer: RendererData;
  /** The world matrix to use for the engine shader. */
  worldMat: Mat4;
}
/** The interface for the engine shader ABI. */
export default (
  { device, defs, layouts, pass }: StandardShaderAbiInput,
  { textures, lights, material, renderer, worldMat }: EngineShaderAbiInput,
) => {
  // Get the material texture if it has one
  const materialTexture = material.Texture !== null ? textures.get(material.Texture) : null;
  if (materialTexture === undefined && material.Texture !== null) {
    throw new Error("Material texture not found in textures map.");
  }

  // Create our structured views
  const rendererStructView = makeStructuredView(
    defs.uniforms.renderer,
  ) as StructView<RendererData>;
  const worldStructView = makeStructuredView(
    defs.uniforms.world,
  ) as StructView<{ matrix: Mat4 }>;
  const lightStructView = makeStructuredView(
    defs.storages.lightBuffer,
  ) as StructView<GpuLightBufferData>;
  const materialStructView = makeStructuredView(
    defs.uniforms.material,
  ) as StructView<GpuMaterial>;

  // Create our buffers
  const getViewSize = (view: StructuredView) => view.arrayBuffer.byteLength;
  const defaultUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
  const rendererStructBuffer = device.createBuffer({
    size: getViewSize(rendererStructView),
    usage: defaultUsage,
  });
  const worldStructBuffer = device.createBuffer({
    size: getViewSize(worldStructView),
    usage: defaultUsage,
  });
  const lightStructBuffer = device.createBuffer({
    size: getViewSize(lightStructView),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const materialStructBuffer = device.createBuffer({
    size: getViewSize(materialStructView),
    usage: defaultUsage,
  });

  // Create our texture and sampler for the material
  const texture = materialTexture !== null && materialTexture !== undefined ? materialTexture : device.createTexture({
    size: {
      width: 1,
      height: 1,
    },
    format: "rgba8unorm",
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
  });

  // Construct the actual bind group
  const bindings = [
    rendererStructBuffer,
    worldStructBuffer,
    lightStructBuffer,
    materialStructBuffer,
  ];
  const bindGroup = device.createBindGroup({
    layout: layouts[BIND_GROUP],
    entries: [
      // Pass our buffers
      ...bindings.map((b, i) => ({ binding: i, resource: { buffer: b } })),
      // Pass our sampler and texture
      { binding: bindings.length, resource: texture.createView() },
      { binding: bindings.length + 1, resource: sampler },
    ],
  });

  const getBuff = (view: StructuredView) => view.arrayBuffer;
  // Set the renderer data in the structured view and write it to the GPU buffer
  rendererStructView.set({
    ambient_light: renderer.ambient_light,
    camera_position: renderer.camera_position,
    view_projection: renderer.view_projection,
  });
  device.queue.writeBuffer(
    rendererStructBuffer,
    0,
    getBuff(rendererStructView),
  );
  // Set the world matrix in the structured view and write it to the GPU buffer
  worldStructView.set({ matrix: worldMat });
  device.queue.writeBuffer(worldStructBuffer, 0, getBuff(worldStructView));
  // Set the light data in the structured view and write it to the GPU buffer
  const gpuLights = lights
    .slice(0, lightStructView.views.lights.length)
    .map(([light, position, direction]): GpuLightData => ({
      light_type: light.type,
      range: light.range,
      intensity: light.intensity,
      position,
      color: light.color,
      direction,
    }));
  lightStructView.set({ count: gpuLights.length, lights: gpuLights });
  device.queue.writeBuffer(lightStructBuffer, 0, getBuff(lightStructView));
  // Set the material data in the structured view and write it to the GPU buffer
  materialStructView.set({
    base_color: material.BaseColor,
    has_texture: material.Texture !== null ? 1 : 0,
    shininess: material.Shininess,
  });
  device.queue.writeBuffer(
    materialStructBuffer,
    0,
    getBuff(materialStructView),
  );

  // Bind the bind group to the render pass
  pass.setBindGroup(BIND_GROUP, bindGroup);
};
