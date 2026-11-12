// NOTE: While this logic could be on gameObject separating it provides more flexibility.
import type { Vec3, Mat4 } from "mv-redux";
import type { RendererContext } from "../renderer";
import type { Geometry } from "../geometry";
import { vec3 } from "mv-redux";
import { EmptyGeometryError, InvalidGeometryError } from "../internal/errors";
import GameObject from "./gameObject";
import type Light from "../primitives/light";

import EngineShaderABI from "../shaders/engine";
import DefaultShaderABI from "../shaders/default";

import Shader from "../shaders/default.wesl?static";

type RenderableGameObjectContextIndices = {
  indexBuffer: GPUBuffer;
  indexCount: number;
  indexFormat: GPUIndexFormat;
}
type RenderableGameObjectContext = {
  /** The GPU render pipeline for the game object. */
  gpuRenderPipeline: GPURenderPipeline;
  /** Model Buffers */
  modelBuffer: {
    /** The number of vertices in the model. */
    vertexCount: number;
    /** The vertex buffer for the model. */
    vertexBuffer: GPUBuffer;
    /** The normal buffer for the model. */
    normalBuffer: GPUBuffer;
    /** The color buffer for the model. */
    colorBuffer: GPUBuffer;
    /** The texture coordinate buffer for the model. */
    uvBuffer: GPUBuffer;
    /** The index buffer for the model. */
    indices?: RenderableGameObjectContextIndices;
  };
  /** The engine bind group info for the game object. */
  engineShaderABI: EngineShaderABI;
  /** The default bind group info for the game object. */
  defaultShaderABI: DefaultShaderABI;
};

/** A game object that can be rendered. */
class RenderableGameObject extends GameObject {
  /** A flag indicating if the game object is clean and doesn't need to be re-initialized. */
  protected clean: boolean = true;
  /** A cache for the rendering context of the game object. */
  private _renderContext?: RenderableGameObjectContext;

  constructor(position: Vec3, rotation: Vec3, scale: Vec3) {
    super(position, rotation, scale);
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
    throw new EmptyGeometryError("Method not implemented.");
  }

  /**
   * Initializes the rendering resources for the game object.
   *
   * Called by `render` lazily to initialize the rendering resources for the game object.
   *
   * @param context The renderer context.
   */
  private initialize(context: RendererContext): RenderableGameObjectContext {
    // Check if our pipeline cache is still valid
    if (this._renderContext !== undefined && this.clean) return this._renderContext;

    // Get the geometry
    const geometry = this.getGeometry();
    // Validate basic properties of the geometry
    if (geometry.positions.length === 0)
      throw new InvalidGeometryError("Geometry must have positions.");
    if (geometry.positions.length % 3 !== 0)
      throw new InvalidGeometryError("Positions must be a multiple of 3.");
    if (geometry.normals.length !== geometry.positions.length)
      throw new InvalidGeometryError(
        "Normals must have the same number of components as positions.",
      );
    
    // Compute the vertex count
    const vertexCount = geometry.positions.length / 3;
    
    // Create the vertex buffer
    const vertexBuffer = context.device.createBuffer({
      size: geometry.positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    context.device.queue.writeBuffer(vertexBuffer, 0, geometry.positions);
    // Create the normal buffer
    const normalBuffer = context.device.createBuffer({
      size: geometry.normals.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    context.device.queue.writeBuffer(normalBuffer, 0, geometry.normals);
    // Create the index buffer (if we have indices)
    let indices: RenderableGameObjectContextIndices | undefined = undefined;
    if (geometry.indices !== undefined) {
      const indexBuffer = context.device.createBuffer({
        size: geometry.indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });
      context.device.queue.writeBuffer(indexBuffer, 0, geometry.indices);
      // Compute the index count
      const indexCount = geometry.indices.length;
      // Compute the index format
      const indexFormat =
        geometry.indices instanceof Uint16Array ? "uint16" : "uint32";

      indices = {
        indexCount,
        indexFormat,
        indexBuffer,
      };
    }
    // Create the color buffer
    let colorBuffer: GPUBuffer;
    if (geometry.colors !== undefined) {
      colorBuffer = context.device.createBuffer({
        size: geometry.colors.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      context.device.queue.writeBuffer(colorBuffer, 0, geometry.colors);
    } else {
      colorBuffer = context.device.createBuffer({ size: 0, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    }
    // Create the uv buffer
    let uvBuffer: GPUBuffer;
    if (geometry.uvs !== undefined) {
      uvBuffer = context.device.createBuffer({
        size: geometry.uvs.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      context.device.queue.writeBuffer(uvBuffer, 0, geometry.uvs);
    } else {
      uvBuffer = context.device.createBuffer({ size: 0, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    }

    // Compile the shader
    // TODO: Consider if this should be in a global shader cache for performance reasons???
    const shaderModule = context.device.createShaderModule({ code: Shader, });

    // Create the model's uniform buffer and bind group
    const defaultShaderABI = new DefaultShaderABI(context.device);
    // Create the engine's uniforms and bind groups
    const engineShaderABI = new EngineShaderABI(context.device);

    // Construct our pipeline layout
    const pipelineLayout = context.device.createPipelineLayout({
      bindGroupLayouts: [
        // Engine bindings
        engineShaderABI.BindGroupLayout,
        // User supplied bindings
        defaultShaderABI.BindGroupLayout,
      ],
    });

    // Create the render pipeline
    const pipeline = context.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        // The entry point for the vertex shader in the shader code.
        entryPoint: "vertex_main",
        // The parameters of the vertex shader, including the vertex buffer layouts.
        buffers: [
          // Position vector layout
          {
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
            ],
          },
          // Normal vector layout
          {
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 1,
                offset: 0,
                format: "float32x3",
              },
            ],
          },
          // Color vector
          {
            arrayStride: 4 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 2,
                offset: 0,
                format: "float32x4",
              },
            ],
          },
          // Uv vector
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 3,
                offset: 0,
                format: "float32x2",
              },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        // The entry point for the fragment shader in the shader code.
        entryPoint: "fragment_main",
        // TODO: We may need to refactor this for canvas resizing.
        targets: [{ format: context.format }],
      },
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

    // Build the render context for this object.
    const renderContext: RenderableGameObjectContext = {
      gpuRenderPipeline: pipeline,
      modelBuffer: {
        vertexCount,
        vertexBuffer,
        normalBuffer,
        colorBuffer,
        uvBuffer,
        indices: indices,
      },
      engineShaderABI: engineShaderABI,
      defaultShaderABI: defaultShaderABI,
    };
    // Caches
    this._renderContext = renderContext;
    this.clean = true;
    // Return the render context for this object.
    return renderContext;
  }

  /**
   * Renders the game object, using the default shader.
   *
   * NOTE: If you want to use a custom shader, you should override this method in a subclass.
   *
   * @param context The renderer context.
   * @param pass The render pass encoder.
   * @param worldMatrix The world transformation matrix for the object.
   */
  public render(
    context: RendererContext,
    pass: GPURenderPassEncoder,
    worldMatrix: Mat4,
    lights: [Light, Vec3, Vec3][],
    viewProjectionMatrix: Mat4,
    cameraPosition: Vec3
  ): void {
    const renderContext = this.initialize(context);
    const model = this.getModelMatrix();

    // Record the draw commands.
    pass.setPipeline(renderContext.gpuRenderPipeline);

    // Pass the data to the GPU using the engine shader ABI.
    renderContext.engineShaderABI.passData(
      context.device,
      pass,
      lights,
      // TODO: We should make this a property of the geometry???
      {
        shininess: 32.0,
        use_vertex_colors: renderContext.modelBuffer.colorBuffer.size > 0,
        use_base_color_texture: false,
      },
      // TODO: Move this to the renderer and pass it in as a parameter
      {
        ambientLight: vec3(0.2, 0.2, 0.2),
        cameraPosition: cameraPosition,
        viewProjection: viewProjectionMatrix,
      },
      worldMatrix
    );
    // Pass the data to the GPU using the default shader ABI.
    renderContext.defaultShaderABI.passData(
      context.device,
      pass,
      model
    );

    // Bind the vertex shader parameters
    pass.setVertexBuffer(0, renderContext.modelBuffer.vertexBuffer);
    pass.setVertexBuffer(1, renderContext.modelBuffer.normalBuffer);
    pass.setVertexBuffer(2, renderContext.modelBuffer.colorBuffer);
    pass.setVertexBuffer(3, renderContext.modelBuffer.uvBuffer);

    // Draw geometry.
    if (
      renderContext.modelBuffer.indices !== undefined
    ) {
      const { indexBuffer, indexCount, indexFormat } = renderContext.modelBuffer.indices;
      // If we have an index buffer, use it to draw the geometry.
      pass.setIndexBuffer(indexBuffer, indexFormat);
      pass.drawIndexed(indexCount);
    } else {
      // Otherwise draw the geometry using the vertex count.
      pass.draw(renderContext.modelBuffer.vertexCount);
    }
  }
}

export default RenderableGameObject;
