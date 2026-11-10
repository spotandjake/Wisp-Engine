import { type Vec3, type Mat4, vec3, mult, mat4 } from "mv-redux";
import { WebGpuUnavailableError } from "./internal/errors";
import type GameObject from "./prototypes/gameObject";
import RenderableGameObject from "./prototypes/renderableGameObject";
import Camera from "./primitives/camera";

import Light from "./primitives/light";

// Constants for the renderer
const LIGHT_SIZE = 64;
const LIGHT_HEADER_SIZE = 16;
const INITIAL_LIGHT_CAPACITY = 8;

/** The context for the renderer. */
export type RendererContext = {
  /** The WebGPU canvas context. */
  context: GPUCanvasContext;
  /** The WebGPU device. */
  device: GPUDevice;
  /** The WebGPU texture format. */
  format: GPUTextureFormat;
  /** A shared WebGPU camera buffer. */
  cameraBuffer: GPUBuffer;
  /** A shared WebGPU buffer of light data. */
  lightBuffer: GPUBuffer;
  /** The shared WebGPU depth texture. */
  depthTexture: GPUTexture;
};
/** The internal context for the renderer. */
type InternalRendererContext =
  // Lock based on initialization state
  { initialized: false } | { initialized: true; context: RendererContext };

/** A custom event for engine updates. */
export class RendererUpdateEvent extends Event {
  /** The deltaTime between the last update and the current update. */
  public readonly deltaTime: number;
  /** The timestamp of the current update. */
  public readonly timeStamp: number;
  constructor(deltaTime: number, timeStamp: number) {
    super("engineUpdate");
    this.deltaTime = deltaTime;
    this.timeStamp = timeStamp;
  }
}

/**
 * The main WebGPU renderer class.
 *
 * This is the main controller / orchestrator of our rendering.
 */
class Renderer extends EventTarget {
  /** The context for the renderer. */
  private context: InternalRendererContext = { initialized: false };
  /** The canvas element to render to. */
  private canvas: HTMLCanvasElement;
  /** The camera we are rendering from. */
  private camera: Camera;
  /** The world we are rendering. */
  private scene: GameObject | null = null;
  /** The last timestamp we rendered at. */
  private lastTimeStamp: number = 0;
  /** The sky color for the renderer. */
  private skyColor: Vec3;

  constructor(canvas: HTMLCanvasElement, skyColor: Vec3 = vec3(0.5, 0.7, 1.0)) {
    super();
    // Check if WebGPU is available in the browser.
    if (!navigator.gpu)
      throw new WebGpuUnavailableError(
        "WebGPU is not supported in this browser.",
      );

    // Store our canvas element for later use.
    this.canvas = canvas;
    // Store our sky color for later use.
    this.skyColor = skyColor;

    // Create a default camera for the renderer to use if one is not set.
    this.camera = new Camera(
      vec3(0, 0, 5),
      vec3(0, 0, 0),
      canvas.width / canvas.height,
    );
  }

  /**
   * Initialize the renderer.
   * NOTE: This method should be called after the renderer is created.
   */
  public async initialize(): Promise<void> {
    // If the renderer is already initialized, we don't need to do anything.
    if (this.context.initialized) return;

    // Get the WebGPU device adapter
    const adapter: GPUAdapter | null = await navigator.gpu.requestAdapter();
    // TODO: Should this have a more specific error type?
    if (adapter === null)
      throw new WebGpuUnavailableError("No WebGPU adapter available.");
    const device: GPUDevice = await adapter.requestDevice();
    // TODO: What are these errors?????
    device.addEventListener("uncapturederror", (event) =>
      console.error("Uncaptured WebGPU error:", event.error),
    );

    // Setup our canvas and configure it for WebGPU rendering.
    const context: GPUCanvasContext = this.canvas.getContext(
      "webgpu",
    ) as GPUCanvasContext;
    const format: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat();
    // TODO: What happens if the canvas is resized?
    context.configure({ device, format, alphaMode: "opaque" });

    // Construct our camera buffer
    const cameraBuffer = device.createBuffer({
      size: 64, // 4x4 matrix of 4-byte floats 4x4x4 = 64 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Construct our light buffer
    const lightBuffer = device.createBuffer({
      size: LIGHT_HEADER_SIZE + INITIAL_LIGHT_CAPACITY * LIGHT_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Construct our depth texture
    const depthTexture = device.createTexture({
      size: {
        // TODO: Should we allow the user to change the size of the depth texture?
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Store our rendering context for later use.
    this.context = {
      initialized: true,
      context: {
        context,
        device,
        format,
        cameraBuffer,
        lightBuffer,
        depthTexture,
      },
    };

    // Begin our render loop
    this.update(0);
  }

  /** The main update loop for the renderer. */
  private update(timeStamp: number): void {
    // Compute the delta time since the last update
    const deltaTime = this.lastTimeStamp === 0 ? 0 : (timeStamp - this.lastTimeStamp) / 1000;
    this.lastTimeStamp = timeStamp;
    // Emit an update event so the world can update all the objects in the scene.
    this.dispatchEvent(new RendererUpdateEvent(deltaTime, timeStamp));
    // Render the world
    if (this.scene !== null) this.render(this.scene);
    // Request the next frame to be rendered.
    window.requestAnimationFrame(this.update.bind(this));
  }

  /** Collect lights from the scene. */
  private getLightData(scene: GameObject): ArrayBuffer {
    // Collect the lights from the scene
    const lights: [Light, Mat4][] = [];
    const collect = (obj: GameObject, worldMatrix: Mat4) => {
      const worldPosition = mult(worldMatrix, obj.getModelMatrix());
      // TODO: We need to track the transform of the light in the scene.
      if (obj instanceof Light) lights.push([obj, worldPosition]);
      for (const child of obj.children) collect(child, worldPosition);
    };
    collect(scene, mat4());
    // TODO: Quickly check if the light is too far away
    // Pack the lights
    const buffer = new ArrayBuffer(LIGHT_HEADER_SIZE + lights.length * LIGHT_SIZE); 
    const view = new DataView(buffer);

    // NOTE: This matches the LightBuffer & Light struct in the ./prototypes/default.wgsl shader
    view.setUint32(0, lights.length, true);
    for (let i = 0; i < lights.length; i++) {
      const [lightObj, worldMatrix] = lights[i];

      const offset = LIGHT_HEADER_SIZE + i * LIGHT_SIZE;
      // TODO: Validate this part
      view.setUint32(offset, lightObj.type == "directional" ? 0 : 1, true);
      view.setFloat32(offset + 4, lightObj.falloff, true);
      view.setFloat32(offset + 8, lightObj.intensity, true);

      // Get the position of the light in world space
      const position = vec3(worldMatrix[3][0], worldMatrix[3][1], worldMatrix[3][2]);
      view.setFloat32(offset + 16, position.x, true);
      view.setFloat32(offset + 20, position.y, true);
      view.setFloat32(offset + 24, position.z, true);
      console.log("Light position:", position);

      // Get the color of the light
      view.setFloat32(offset + 32, lightObj.color.x, true);
      view.setFloat32(offset + 36, lightObj.color.y, true);
      view.setFloat32(offset + 40, lightObj.color.z, true);

      // Get the direction of the light in world space
      const direction = vec3(worldMatrix[0][2], worldMatrix[1][2], worldMatrix[2][2]);
      view.setFloat32(offset + 48, direction.x, true);
      view.setFloat32(offset + 52, direction.y, true);
      view.setFloat32(offset + 56, direction.z, true);
    }

    return buffer;
  }

  /** Render an object in the scene. */
  private renderObject(
    context: RendererContext,
    pass: GPURenderPassEncoder,
    worldMatrix: Mat4,
    gameObject: GameObject,
  ): void {
    // Render the object itself
    if (gameObject instanceof RenderableGameObject) {
      gameObject.render(context, pass, worldMatrix);
    }
    // Render the object's children
    const modelMatrix = gameObject.getModelMatrix();
    const childWorldMatrix = mult(worldMatrix, modelMatrix);
    for (const child of gameObject.children) {
      // NOTE: We handle nested transformations by using the parent as the world.
      this.renderObject(context, pass, childWorldMatrix, child);
    }
  }

  /** Renders the given scene. */
  private render(scene: GameObject): void {
    if (!this.context.initialized)
      throw new Error("Renderer is not initialized.");
    const context = this.context.context;
    // Get the camera's view and projection matrices
    const viewMatrix: Mat4 = this.camera.getViewMatrix();
    const projectionMatrix: Mat4 = this.camera.getProjectionMatrix();
    // Compute the combined view-projection matrix
    const viewProjectionMatrix: Mat4 = mult(projectionMatrix, viewMatrix);

    // Update the camera buffer with the view-projection matrix
    context.device.queue.writeBuffer(
      context.cameraBuffer,
      0,
      new Float32Array(viewProjectionMatrix.flat()),
    );

    // Update the lighting buffer
    const lightData: ArrayBuffer = this.getLightData(scene);
    context.device.queue.writeBuffer(
      context.lightBuffer,
      0,
      lightData,
    );

    // TODO: Document these better
    // Create the command encoder.
    const encoder = context.device.createCommandEncoder();
    // Begin the render pass.
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.context.getCurrentTexture().createView(),
          // The clear color for the render pass (sky color)
          clearValue: { r: this.skyColor.x, g: this.skyColor.y, b: this.skyColor.z, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        // TODO: We may need to refactor this for canvas resizing.
        view: context.depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    // Render the scene, (use the viewProjectionMatrix as the initial worldMatrix for the root object)
    this.renderObject(context, pass, mat4(), scene);

    // End the render pass and submit the commands to the GPU.
    pass.end();
    // Submit the commands to the GPU.
    context.device.queue.submit([encoder.finish()]);
  }


  // Public api
  /** Sets the camera the renderer will render from. */
  public setCamera(camera: Camera): void {
    this.camera = camera;
  }
  /** Sets the scene to render. */
  public setScene(scene: GameObject): void {
    this.scene = scene;
  }
}

export default Renderer;
