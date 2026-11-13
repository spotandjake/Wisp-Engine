// NOTE: While this logic could be on gameObject separating it provides more flexibility.
import type { Vec3 } from "mv-redux";
import type { Arrays, ShaderDataDefinitions } from "webgpu-utils";
import type { PassRendererContext } from "../renderer";
import type { Geometry } from "../geometry";
import Material from "./material";

import { normalMatrix, mult } from "mv-redux";
import { EmptyGeometryError } from "../internal/errors";
import {
  makeShaderDataDefinitions,
  createBuffersAndAttributesFromArrays,
  makeBindGroupLayoutDescriptors,
} from "webgpu-utils";
import GameObject from "./gameObject";

import engineShaderAbi from "../shaders/engine";
import defaultShaderAbi from "../shaders/default";

import Shader from "../shaders/default.wesl?static";

// Memoized lazy shader and definition initialization, so we can share across objects
let shaderCache:
  | {
      device: GPUDevice;
      shaderModule: GPUShaderModule;
      defs: ShaderDataDefinitions;
    }
  | undefined = undefined;
const getShaderModuleAndDefs = (
  device: GPUDevice,
): { shaderModule: GPUShaderModule; defs: ShaderDataDefinitions } => {
  if (shaderCache !== undefined && device === shaderCache.device)
    return shaderCache;
  const shaderModule = device.createShaderModule({ code: Shader });
  const defs = makeShaderDataDefinitions(Shader);
  shaderCache = { device, shaderModule, defs };
  return shaderCache;
};

/** A game object that can be rendered. */
class RenderableGameObject extends GameObject {
  private material: Material;

  constructor(position: Vec3, rotation: Vec3, scale: Vec3, material: Material) {
    super(position, rotation, scale);
    this.material = material;
  }
  // Abstract methods
  /**
   * Returns the geometry of the game object.
   * NOTE: This method must be implemented by subclasses to provide the geometry data for the object.
   *
   * @returns The geometry of the game object.
   *
   * @throws {EmptyGeometryError} If the geometry has no implementation.
   */
  protected getGeometry(): Geometry {
    // Sadly because we are using a prototype class we cannot abstract the method, so we just make it clear that this method must be implemented by subclasses.
    throw new EmptyGeometryError("Method not implemented.");
  }

  /**
   * Renders the game object, using the default shader.
   *
   * NOTE: If you want to use a custom shader, you should override this method in a subclass.
   *
   * @param passRenderContext - The context for the current render pass
   */
  public render({
    webgpu,
    pass,
    viewProjectionMatrix,
    cameraPosition,
    worldMatrix,
    sceneAmbient,
    lights,
    textureStore,
  }: PassRendererContext): void {
    // Get the geometry
    const geometry = this.getGeometry();
    const vertexCount = geometry.positions.length / 3;

    // Compile the shader and get our definitions
    const { shaderModule, defs } = getShaderModuleAndDefs(webgpu.device);

    // Construct our attribute layout from shader data definitions
    let attributeBuffers: Arrays = {
      positions: geometry.positions,
      normals: geometry.normals,
      colors:
        geometry.colors !== undefined
          ? geometry.colors
          : new Float32Array(vertexCount * 4).fill(1),
      uvs:
        geometry.uvs !== undefined
          ? geometry.uvs
          : new Float32Array(vertexCount * 2),
    };
    if (geometry.indices !== undefined)
      attributeBuffers = { ...attributeBuffers, indices: geometry.indices };
    const attributes = createBuffersAndAttributesFromArrays(
      webgpu.device,
      attributeBuffers,
    );

    // Construct our pipeline
    const pipelineDesc = {
      vertex: {
        module: shaderModule,
        // The entry point for the vertex shader in the shader code.
        entryPoint: "vertex_main",
        // The parameters of the vertex shader, including the vertex buffer layouts.
        buffers: attributes.bufferLayouts,
      },
      fragment: {
        module: shaderModule,
        // The entry point for the fragment shader in the shader code.
        entryPoint: "fragment_main",
        targets: [{ format: webgpu.format }],
      },
    };
    // Create the bind group layouts and pipeline layout
    const descriptors = makeBindGroupLayoutDescriptors(defs, pipelineDesc);
    const groupLayouts = descriptors.map((desc) =>
      webgpu.device.createBindGroupLayout(desc),
    );
    const pipelineLayout = webgpu.device.createPipelineLayout({
      bindGroupLayouts: groupLayouts,
    });
    // Create the render pipeline
    const pipeline = webgpu.device.createRenderPipeline({
      layout: pipelineLayout,
      ...pipelineDesc,
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
      primitive: {
        topology: "triangle-list",
        frontFace: "ccw",
        cullMode: "back",
      },
    });

    // Record the draw commands.
    pass.setPipeline(pipeline);

    // Pass the data to the GPU using our shader ABIs.
    const baseShaderAbiInput = {
      device: webgpu.device,
      defs,
      layouts: groupLayouts,
      pass,
    };
    engineShaderAbi(baseShaderAbiInput, {
      textureStore,
      lights,
      material: this.material,
      renderer: {
        sceneAmbient: sceneAmbient,
        cameraPosition: cameraPosition,
        viewProjection: viewProjectionMatrix,
      },
    });

    const modelMatrix = mult(worldMatrix, this.getModelMatrix());
    defaultShaderAbi(baseShaderAbiInput, {
      modelMatrix: modelMatrix,
      normalMatrix: normalMatrix(modelMatrix, true),
    });

    // Bind the vertex shader attributes
    pass.setVertexBuffer(0, attributes.buffers[0]);
    pass.setVertexBuffer(1, attributes.buffers[1]);
    pass.setVertexBuffer(2, attributes.buffers[2]);
    pass.setVertexBuffer(3, attributes.buffers[3]);

    // Draw geometry.
    if (
      attributes.indexBuffer !== undefined &&
      attributes.indexFormat !== undefined &&
      attributes.numElements !== undefined
    ) {
      // If we have an index buffer, use it to draw the geometry.
      pass.setIndexBuffer(attributes.indexBuffer, attributes.indexFormat);
      pass.drawIndexed(attributes.numElements);
    } else {
      // Otherwise draw the geometry using the vertex count.
      pass.draw(vertexCount);
    }
  }
}

export default RenderableGameObject;
