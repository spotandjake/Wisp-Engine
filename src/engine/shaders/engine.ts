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
  sceneAmbient: Vec3;
  /** The position of the camera in the scene. */
  cameraPosition: Vec3;
  /** The view projection matrix of the camera. */
  viewProjection: Mat4;
};

/** The material struct we pass to the gpu. */
type GpuMaterial = {
  /** The ambient color of the material. */
  ambientColor: Vec4;
  /** The diffuse color of the material. */
  diffuseColor: Vec4;
  /** The specular color of the material. */
  specularColor: Vec4;
  /** How shiny the material is. */
  shininess: number;
  /** Weather or not the material has a texture. */
  hasTexture: number;
};

type GpuLightData = {
  /** The specific type of the light, modifies the behavior of the light */
  lightType: number;
  /** The range of the light (for point lights) */
  range: number;
  /** The intensity of the light (for point lights) */
  intensity: number;
  /** The ambient color of the light */
  ambientColor: Vec4;
  /** The diffuse color of the light */
  diffuseColor: Vec4;
  /** The specular color of the light */
  specularColor: Vec4;

  /** The position of the light in world space (for point lights) */
  position: Vec3;
  /** The direction of the light (for directional lights) */
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
  textureStore: Map<TextureReference, GPUTexture>;
  /** The lights in the scene. */
  lights: [Light, Vec3, Vec3][];
  /** The material to use for the engine shader. */
  material: Material;
  /** The renderer data to use for the engine shader. */
  renderer: RendererData;
}
/** The interface for the engine shader ABI. */
export default (
  { device, defs, layouts, pass }: StandardShaderAbiInput,
  { textureStore, lights, material, renderer }: EngineShaderAbiInput,
) => {
  // Get the material texture if it has one
  const materialTexture =
    material.Texture !== null ? textureStore.get(material.Texture) : null;
  if (materialTexture === undefined && material.Texture !== null) {
    throw new Error("Material texture not found in texture store.");
  }

  // Create our structured views
  const rendererStructView = makeStructuredView(
    defs.uniforms.renderer,
  ) as StructView<RendererData>;
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
  const lightStructBuffer = device.createBuffer({
    size: getViewSize(lightStructView),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const materialStructBuffer = device.createBuffer({
    size: getViewSize(materialStructView),
    usage: defaultUsage,
  });

  // Create our texture and sampler for the material
  const texture =
    materialTexture !== null && materialTexture !== undefined
      ? materialTexture
      : device.createTexture({
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
    sceneAmbient: renderer.sceneAmbient,
    cameraPosition: renderer.cameraPosition,
    viewProjection: renderer.viewProjection,
  });
  device.queue.writeBuffer(
    rendererStructBuffer,
    0,
    getBuff(rendererStructView),
  );
  // Set the light data in the structured view and write it to the GPU buffer
  const gpuLights = lights
    .slice(0, lightStructView.views.lights.length)
    .map(([light, position, direction]): GpuLightData => ({
      lightType: light.Type,
      range: light.Range,
      intensity: light.Intensity,
      ambientColor: light.AmbientColor,
      diffuseColor: light.DiffuseColor,
      specularColor: light.SpecularColor,
      position: position,
      direction: direction,
    }));
  lightStructView.set({ count: gpuLights.length, lights: gpuLights });
  device.queue.writeBuffer(lightStructBuffer, 0, getBuff(lightStructView));
  // Set the material data in the structured view and write it to the GPU buffer
  materialStructView.set({
    ambientColor: material.AmbientColor,
    diffuseColor: material.DiffuseColor,
    specularColor: material.SpecularColor,
    shininess: material.Shininess,
    hasTexture: materialTexture !== null ? 1 : 0,
  });
  device.queue.writeBuffer(
    materialStructBuffer,
    0,
    getBuff(materialStructView),
  );

  // Bind the bind group to the render pass
  pass.setBindGroup(BIND_GROUP, bindGroup);
};
