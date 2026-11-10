// NOTE: While this logic could be on gameObject separating it provides more flexibility.
import type { Vec3, Mat4 } from "mv-redux";
import type { RendererContext } from "./renderer";
import { EmptyGeometryError, InvalidGeometryError } from "./errors";
import type { Geometry } from "./geometry";
import GameObject from "./gameObject";

import Shader from "./default.wgsl";

type RenderableGameObjectContext = {
  /** The GPU render pipeline for the game object. */
  gpuRenderPipeline: GPURenderPipeline;
  /** The GPU vertex buffer for the game object. */
  vertexBuffer: GPUBuffer;
  /** The GPU index buffer for the game object. */
  indexBuffer?: GPUBuffer;
  /** The GPU world buffer for the game object. */
  worldBuffer: GPUBuffer;
  /** The GPU model buffer for the game object. */
  modelBuffer: GPUBuffer;
  /** The GPU bind group for the camera. */
  cameraBindGroup: GPUBindGroup;
  /** The GPU bind group for the world. */
  worldBindGroup: GPUBindGroup;
  /** The GPU bind group for the object. */
  objectBindGroup: GPUBindGroup;
  /** The number of vertices to draw. */
  vertexCount: number;
  /** The number of indices to draw. */
  indexCount?: number;
  /** The format of the index buffer. */
  indexFormat?: GPUIndexFormat;
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

    // Get the geometry data
    const geometry = this.getGeometry();
    // Validate the geometry data
    if (geometry.positions.length === 0)
      throw new InvalidGeometryError("Geometry must have positions.");
    if (geometry.positions.length % 3 !== 0)
      throw new InvalidGeometryError("Positions must be a multiple of 3.");
    // Compute the vertex count
    const vertexCount = geometry.positions.length / 3;

    // Compile the shader.
    // TODO: Maybe this should be hoisted to a global shader cache so we don't compile the same shader multiple times.
    const shaderModule = context.device.createShaderModule({
      code: Shader,
    });

    // Construct our vertex buffer
    const vertexBuffer = context.device.createBuffer({
      size: geometry.positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    context.device.queue.writeBuffer(vertexBuffer, 0, geometry.positions);
    // Construct our index buffer (if we have indices)
    let indexBuffer: GPUBuffer | undefined = undefined;
    let indexCount: number | undefined = undefined;
    let indexFormat: GPUIndexFormat | undefined = undefined;
    if (geometry.indices !== undefined) {
      indexBuffer = context.device.createBuffer({
        size: geometry.indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      });
      context.device.queue.writeBuffer(indexBuffer, 0, geometry.indices);

      indexCount = geometry.indices.length;
      indexFormat =
        geometry.indices instanceof Uint16Array ? "uint16" : "uint32";
    }
    // Construct our world uniform buffer
    const worldBuffer = context.device.createBuffer({
      size: 64, // 4x4 matrix of 4-byte floats 4x4x4 = 64 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Construct our model uniform buffer
    const modelBuffer = context.device.createBuffer({
      size: 64, // 4x4 matrix of 4-byte floats 4x4x4 = 64 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Construct our camera bind group layout
    // NOTE: This matches the `var<uniform> camera: Camera;` in the shader code.
    const cameraBindGroupLayout = context.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });
    // Construct our world bind group layout
    // NOTE: This matches the `var<uniform> world: World;` in the shader code.
    const worldBindGroupLayout = context.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    // Construct our camera bind group layout
    // NOTE: This matches the `var<uniform> model: Model;` in the shader code.
    const modelBindGroupLayout = context.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    // Create the camera bind group itself.
    const cameraBindGroup = context.device.createBindGroup({
      layout: cameraBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: context.cameraBuffer },
        },
      ],
    });
    // Create the world bind group itself.
    const worldBindGroup = context.device.createBindGroup({
      layout: worldBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: worldBuffer },
        },
      ],
    });
    // Create the model bind group itself.
    const modelBindGroup = context.device.createBindGroup({
      layout: modelBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: modelBuffer },
        },
      ],
    });

    // Construct our pipeline layout.
    // TODO: Figure out exactly what this is and how it works
    const pipelineLayout = context.device.createPipelineLayout({
      bindGroupLayouts: [
        cameraBindGroupLayout, worldBindGroupLayout, modelBindGroupLayout
      ],
    });
    // Construct our actual render pipeline.
    const pipeline = context.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        // The entry point for the vertex shader in the shader code.
        entryPoint: "vertex_main",
        buffers: [
          {
            arrayStride: 3 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              // The position attribute we pass in
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
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
      vertexBuffer: vertexBuffer,
      indexBuffer: indexBuffer,
      worldBuffer: worldBuffer,
      modelBuffer: modelBuffer,
      cameraBindGroup: cameraBindGroup,
      worldBindGroup: worldBindGroup,
      objectBindGroup: modelBindGroup,
      vertexCount: vertexCount,
      indexCount: indexCount,
      indexFormat: indexFormat,
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
  ): void {
    const objectContext = this.initialize(context);

    // Update the world matrix.
    context.device.queue.writeBuffer(
      objectContext.worldBuffer,
      0,
      new Float32Array(worldMatrix.flat()),
    );
    // Update the model matrix.
    const model = this.getModelMatrix();
    context.device.queue.writeBuffer(
      objectContext.modelBuffer,
      0,
      new Float32Array(model.flat()),
    );

    // Record the draw commands.
    pass.setPipeline(objectContext.gpuRenderPipeline);
    // NOTE: The 0, 1 and 2 here correspond to the bind group indices in the shader code.
    pass.setBindGroup(0, objectContext.cameraBindGroup);
    pass.setBindGroup(1, objectContext.worldBindGroup);
    pass.setBindGroup(2, objectContext.objectBindGroup);
    pass.setVertexBuffer(0, objectContext.vertexBuffer);

    // TODO: Ensure we handle other properties on the geometry.

    // Draw geometry.
    if (
      objectContext.indexBuffer !== undefined &&
      objectContext.indexCount !== undefined &&
      objectContext.indexFormat !== undefined
    ) {
      // If we have an index buffer, use it to draw the geometry.
      pass.setIndexBuffer(
        objectContext.indexBuffer,
        objectContext.indexFormat,
      );
      pass.drawIndexed(objectContext.indexCount);
    } else {
      // Otherwise draw the geometry using the vertex count.
      pass.draw(objectContext.vertexCount);
    }
  }
}

export default RenderableGameObject;
